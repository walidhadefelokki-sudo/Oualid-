import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Role } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { getJwtSecret } from "../utils/jwt";
import { getFrontendUrl, getGoogleConfigError, isGoogleOAuthConfigured } from "../config/oauth";
import { findOrCreateUserFromGoogle, GoogleIdentity } from "../services/oauth.service";
import { getRecruiterPlan } from "../middleware/tier.middleware";

const STATE_COOKIE = "dl_oauth_state";
const HANDOFF_COOKIE = "dl_oauth_handoff";
const isProduction = () => process.env.NODE_ENV === "production";

/**
 * SameSite must be "lax", not "strict": the browser arrives back from
 * accounts.google.com as a cross-site top-level navigation, and a strict
 * cookie would not be sent, breaking every login. Lax still withholds the
 * cookie from cross-site POSTs, which is what protects the exchange below.
 */
const cookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax" as const,
  maxAge: maxAgeMs,
  path: "/",
});

/** Redirect to the frontend with a machine-readable error code, never a stack. */
const failRedirect = (res: Response, code: string) =>
  res.redirect(`${getFrontendUrl()}/auth/callback?error=${encodeURIComponent(code)}`);

/**
 * GET /api/auth/google — start the flow.
 *
 * Carries two things through Google and back: the role the visitor chose
 * before leaving, and a nonce. Both live in a signed, 10-minute state token;
 * the nonce is also set as a cookie, and the callback requires the two to
 * match. That binds the callback to the browser that started it, which is
 * what stops an attacker replaying their own callback into a victim's session.
 */
export const googleAuthStart = (req: Request, res: Response, next: NextFunction) => {
  if (!isGoogleOAuthConfigured()) {
    return next(new AppError(getGoogleConfigError() ?? "Google sign-in is unavailable.", 503));
  }

  // The frontend sends ?role=employer when the visitor picked the recruiter
  // path. Anything else is treated as a candidate — the role is never taken
  // from Google, and never widened here.
  const requestedRole: Role = req.query.role === "employer" ? "RECRUITER" : "CANDIDATE";

  const nonce = crypto.randomBytes(24).toString("hex");
  const state = jwt.sign({ nonce, role: requestedRole }, getJwtSecret(), { expiresIn: "10m" });

  res.cookie(STATE_COOKIE, nonce, cookieOptions(10 * 60 * 1000));

  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    state,
  })(req, res, next);
};

/**
 * GET /api/auth/google/callback — Google returns here.
 *
 * Ends by redirecting to the frontend with no token in the URL. The session
 * JWT is placed in a short-lived HttpOnly cookie instead, which the frontend
 * trades for the token via the exchange endpoint below. A JWT in a query
 * string would land in browser history, server logs and any Referer header.
 */
export const googleAuthCallback = (req: Request, res: Response, next: NextFunction) => {
  if (!isGoogleOAuthConfigured()) {
    return failRedirect(res, "not_configured");
  }

  // Validate state BEFORE handing off to passport. Passport's first act is to
  // exchange the authorization code with Google, so checking afterwards would
  // mean doing that work for a request already known to be forged — and would
  // report the code-exchange failure rather than the real reason.
  const stateToken = typeof req.query.state === "string" ? req.query.state : "";
  const cookieNonce = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: "/" });

  let stateRole: Role = "CANDIDATE";
  try {
    const decoded = jwt.verify(stateToken, getJwtSecret()) as { nonce: string; role: Role };
    if (!cookieNonce || decoded.nonce !== cookieNonce) {
      console.warn("Google OAuth: state nonce mismatch — possible CSRF, rejecting");
      return failRedirect(res, "invalid_state");
    }
    stateRole = decoded.role === "RECRUITER" ? "RECRUITER" : "CANDIDATE";
  } catch {
    console.warn("Google OAuth: state token invalid or expired, rejecting");
    return failRedirect(res, "invalid_state");
  }

  passport.authenticate(
    "google",
    { session: false },
    async (err: Error | null, identity: GoogleIdentity | false, info: { message?: string } | undefined) => {
      try {
        if (err) {
          console.error("Google OAuth: provider error —", err.message);
          return failRedirect(res, "provider_error");
        }

        // Passport reports a user-cancelled consent screen as no identity.
        if (!identity) {
          console.warn("Google OAuth: no identity returned —", info?.message ?? "cancelled by user");
          return failRedirect(res, info?.message ? "no_email" : "cancelled");
        }

        // State was verified above, before the code exchange; `stateRole` is
        // the role the visitor chose, carried through Google unmodified.
        const { user, outcome } = await findOrCreateUserFromGoogle(identity, stateRole);

        console.info(
          `Google OAuth: ${outcome} — user ${user.id} (${user.role})`
        );

        // The application's existing session token. Identical to what a
        // password login produces — nothing downstream can tell them apart.
        const token = jwt.sign({ id: user.id, role: user.role }, getJwtSecret(), {
          expiresIn: "30d",
        });

        res.cookie(HANDOFF_COOKIE, token, cookieOptions(60 * 1000));
        return res.redirect(`${getFrontendUrl()}/auth/callback`);
      } catch (error: any) {
        // Account-linking refusals carry a message meant for the user; anything
        // else stays generic so database detail never reaches the browser.
        const isLinkingRefusal = error?.message?.includes("already exists with this email");
        console.error("Google OAuth: callback failed —", error?.message);
        return failRedirect(res, isLinkingRefusal ? "email_in_use" : "server_error");
      }
    }
  )(req, res, next);
};

/**
 * POST /api/auth/google/session — trade the handoff cookie for the JWT.
 *
 * Called once by the frontend callback page. The cookie is HttpOnly, so a
 * script on another origin cannot read it, and SameSite=lax keeps it off
 * cross-site POSTs. The cookie is cleared on use, so it cannot be replayed.
 */
export const googleAuthSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[HANDOFF_COOKIE];
    res.clearCookie(HANDOFF_COOKIE, { path: "/" });

    if (!token) {
      return next(new AppError("No pending Google sign-in. Please try again.", 401));
    }

    let decoded: { id: string; role: string };
    try {
      decoded = jwt.verify(token, getJwtSecret()) as { id: string; role: string };
    } catch {
      return next(new AppError("Your sign-in expired. Please try again.", 401));
    }

    const prisma = (await import("../utils/prisma")).default;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return next(new AppError("Account no longer exists.", 401));
    }

    const recruiterTier =
      user.role === "RECRUITER" ? await getRecruiterPlan(user.id) : undefined;

    res.status(200).json({
      status: "success",
      token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          recruiterTier:
            recruiterTier === "PREMIUM"
              ? "paid"
              : recruiterTier === "CORPORATE"
              ? "corporate"
              : recruiterTier
              ? "free"
              : undefined,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/google/status — is Google sign-in usable on this deployment? */
export const googleAuthStatus = (_req: Request, res: Response) => {
  const reason = getGoogleConfigError();
  res.status(200).json({
    status: "success",
    data: { googleSignInReady: reason === null, reason },
  });
};
