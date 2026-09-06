// GENERATED FILE - DO NOT EDIT. Run: npm run build:api
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/utils/prisma.ts
var prisma_exports = {};
__export(prisma_exports, {
  default: () => prisma_default
});
import { PrismaClient } from "@prisma/client";
var globalForPrisma, prisma, prisma_default;
var init_prisma = __esm({
  "server/utils/prisma.ts"() {
    globalForPrisma = globalThis;
    prisma = globalForPrisma.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prisma;
    }
    prisma_default = prisma;
  }
});

// server/app.ts
import express4 from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv3 from "dotenv";
import cookieParser from "cookie-parser";

// server/config/passport.ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// server/config/oauth.ts
import dotenv from "dotenv";
dotenv.config();
var getFrontendUrl = () => (process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");
var getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (!clientId || !clientSecret || !callbackUrl) {
    return null;
  }
  return { clientId, clientSecret, callbackUrl };
};
var getGoogleConfigError = () => {
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"].filter((key) => !process.env[key]?.trim());
  if (missing.length === 0) return null;
  return `Google sign-in is not configured: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set.`;
};
var isGoogleOAuthConfigured = () => getGoogleOAuthConfig() !== null;

// server/config/passport.ts
function configureGoogleStrategy() {
  const config = getGoogleOAuthConfig();
  if (!config) {
    return false;
  }
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackUrl,
        // Only what is needed to identify the person (§10). No Drive, Gmail,
        // Contacts or Calendar.
        scope: ["profile", "email"]
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false, {
              message: "Google did not provide an email address for this account."
            });
          }
          const emailVerified = profile.emails?.[0]?.verified === true || profile._json?.email_verified === true;
          const identity = {
            providerAccountId: profile.id,
            email: email.toLowerCase(),
            emailVerified,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value
          };
          return done(null, identity);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  return true;
}
var passport_default = passport;

// server/routes/auth.routes.ts
import { Router } from "express";

// server/controllers/auth.controller.ts
init_prisma();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// server/middleware/error.middleware.ts
var errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`[Error] ${err.message}`);
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : void 0
  });
};
var AppError = class extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
};

// server/utils/email.ts
import { Resend } from "resend";
import nodemailer from "nodemailer";
import dotenv2 from "dotenv";
dotenv2.config();
var resendApiKey = process.env.RESEND_API_KEY?.trim();
var resend = resendApiKey ? new Resend(resendApiKey) : null;
var smtpHost = process.env.SMTP_HOST?.trim();
var smtpPort = Number(process.env.SMTP_PORT) || 465;
var smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;
var transporter = smtpHost ? nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}) : nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
var emailTransportName = resend ? "resend" : smtpHost ? `smtp:${smtpHost}:${smtpPort}` : "gmail";
var APP_URL = process.env.APP_URL || "https://www.darlemploi.dz";
var FROM_ADDRESS = process.env.EMAIL_FROM || process.env.EMAIL_USER;
var FROM_NAME = "Dar L'emploi";
var BRAND = {
  navy: "#173E7D",
  orange: "#F68D58",
  ink: "#2B3442",
  muted: "#6B7686",
  rule: "#E4E8EE",
  ground: "#F5F7FA"
};
var layout = (heading, body) => `
<div style="margin:0;padding:0;background:${BRAND.ground};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.ground};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.rule};border-radius:12px;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

          <tr>
            <td style="background:${BRAND.navy};padding:28px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.2px;">Dar L'emploi</p>
              <p style="margin:4px 0 0;color:#AFC3E4;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Plateforme de recrutement</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;color:${BRAND.navy};font-size:22px;font-weight:700;line-height:1.3;">${heading}</h1>
              ${body}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;background:#FAFBFC;border-top:1px solid ${BRAND.rule};">
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
                Dar L'emploi &middot; Saint Jean, Constantine, Alg&eacute;rie<br>
                <a href="tel:+213542982346" style="color:${BRAND.muted};text-decoration:none;">+213 (0)542 98 23 46</a>
              </p>
              <p style="margin:10px 0 0;color:#9BA5B4;font-size:11px;">
                &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Dar L'emploi. Tous droits r&eacute;serv&eacute;s.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>`;
var button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:${BRAND.navy};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">${label}</a>
    </td>
  </tr>
</table>`;
var paragraph = (text) => `<p style="margin:0 0 14px;color:${BRAND.ink};font-size:15px;line-height:1.65;">${text}</p>`;
var sendEmail = async (to, subject, html) => {
  if (resend) {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to,
      subject,
      html
    });
    if (error) {
      console.error(
        `Email to ${to} was NOT sent (Resend ${error.name}): ${error.message}`
      );
      return;
    }
    console.log("Message sent via Resend: %s", data?.id);
    return;
  }
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("--- Email simulation (no RESEND_API_KEY, no EMAIL_USER/EMAIL_PASS) ---");
      console.log(`From: ${FROM_NAME} <${FROM_ADDRESS ?? "unset"}>`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("----------------------------------------------------------------------");
      return;
    }
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject,
      html
    });
    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error(`Email to ${to} was NOT sent:`, error);
  }
};
var sendWelcomeEmail = async (email, name, role) => {
  const isRecruiter = role === "RECRUITER";
  const accountLabel = isRecruiter ? "Recruteur" : "Candidat";
  const nextSteps = isRecruiter ? `
      <li style="margin-bottom:8px;">Compl&eacute;tez le profil de votre entreprise (logo, secteur, description).</li>
      <li style="margin-bottom:8px;">Publiez votre premi&egrave;re offre d'emploi.</li>
      <li style="margin-bottom:8px;">Consultez les candidatures et les analyses IA.</li>` : `
      <li style="margin-bottom:8px;">Compl&eacute;tez votre profil et t&eacute;l&eacute;versez votre CV.</li>
      <li style="margin-bottom:8px;">Enregistrez votre pr&eacute;sentation vid&eacute;o en arabe.</li>
      <li style="margin-bottom:8px;">Explorez les offres et postulez en un clic.</li>`;
  const body = `
    ${paragraph(`Bonjour <strong>${name}</strong>,`)}
    ${paragraph(
    `Votre compte Dar L'emploi a bien &eacute;t&eacute; cr&eacute;&eacute;. Vous rejoignez la plateforme de recrutement qui met l'intelligence artificielle au service des talents et des entreprises en Alg&eacute;rie.`
  )}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:#F7F9FC;border:1px solid ${BRAND.rule};border-radius:10px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;color:${BRAND.muted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Votre compte</p>
          <p style="margin:0;color:${BRAND.ink};font-size:14px;line-height:1.8;">
            <strong style="color:${BRAND.navy};">Email</strong> &nbsp;${email}<br>
            <strong style="color:${BRAND.navy};">Type de compte</strong> &nbsp;${accountLabel}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;color:${BRAND.navy};font-size:15px;font-weight:700;">Pour bien commencer</p>
    <ul style="margin:0 0 4px;padding-left:20px;color:${BRAND.ink};font-size:15px;line-height:1.6;">
      ${nextSteps}
    </ul>

    ${button(APP_URL, "Acc&eacute;der &agrave; mon espace")}

    ${paragraph(
    `<span style="color:${BRAND.muted};font-size:13px;">Vous n'&ecirc;tes pas &agrave; l'origine de cette inscription&nbsp;? Ignorez simplement ce message ou r&eacute;pondez-y pour nous en informer.</span>`
  )}`;
  await sendEmail(email, `Bienvenue sur Dar L'emploi, ${name}`, layout("Bienvenue sur Dar L'emploi", body));
};
var sendJobMatchEmail = async (email, jobTitle, company, jobId) => {
  const body = `
    ${paragraph(`Une nouvelle offre correspond &agrave; votre profil&nbsp;:`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#F7F9FC;border:1px solid ${BRAND.rule};border-radius:10px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0;color:${BRAND.navy};font-size:17px;font-weight:700;">${jobTitle}</p>
          <p style="margin:6px 0 0;color:${BRAND.muted};font-size:14px;">${company}</p>
        </td>
      </tr>
    </table>

    ${button(`${APP_URL}/jobs/${jobId}`, `Voir l'offre`)}`;
  await sendEmail(
    email,
    `Nouvelle offre : ${jobTitle} chez ${company}`,
    layout("Une offre pour vous", body)
  );
};

// server/middleware/tier.middleware.ts
init_prisma();
var TIER_ORDER = ["FREE", "PREMIUM", "CORPORATE"];
async function getRecruiterPlan(userId) {
  const membership = await prisma_default.companyMember.findFirst({
    where: { recruiter: { userId } },
    include: { company: true },
    orderBy: { createdAt: "asc" }
  });
  return membership?.company.plan ?? "FREE";
}
var requireRecruiterTier = (minimumPlan) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError("Not authorized to access this route", 401));
      }
      if (req.user.role === "ADMIN") {
        return next();
      }
      if (req.user.role !== "RECRUITER") {
        return next(new AppError("Recruiters only.", 403));
      }
      const plan = await getRecruiterPlan(req.user.id);
      if (TIER_ORDER.indexOf(plan) < TIER_ORDER.indexOf(minimumPlan)) {
        return next(
          new AppError(
            `This feature requires the ${minimumPlan} plan or higher.`,
            403
          )
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// server/controllers/auth.controller.ts
import crypto2 from "crypto";

// server/utils/jwt.ts
import crypto from "crypto";
var devSecret = null;
function getJwtSecret() {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.trim().length > 0) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify tokens with a default secret in production \u2014 set JWT_SECRET in the environment."
    );
  }
  if (!devSecret) {
    devSecret = crypto.randomBytes(48).toString("hex");
    console.warn(
      "\u26A0\uFE0F  JWT_SECRET is not set. Using a random per-process secret for development \u2014 every restart invalidates existing sessions. Set JWT_SECRET in your .env to keep sessions across restarts."
    );
  }
  return devSecret;
}

// server/controllers/auth.controller.ts
var signToken = (id, role) => {
  return jwt.sign({ id, role }, getJwtSecret(), {
    expiresIn: "30d"
  });
};
var mapPlanToTier = (plan) => {
  switch (plan) {
    case "PREMIUM":
      return "paid";
    case "CORPORATE":
      return "corporate";
    default:
      return "free";
  }
};
var slugify = (name) => {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const suffix = crypto2.randomBytes(3).toString("hex");
  return `${base || "company"}-${suffix}`;
};
var createCompanyForRecruiter = async (recruiterProfileId, companyName) => {
  await prisma_default.company.create({
    data: {
      name: companyName,
      slug: slugify(companyName),
      plan: "FREE",
      members: {
        create: {
          role: "OWNER",
          recruiter: { connect: { id: recruiterProfileId } }
        }
      }
    }
  });
};
var register = async (req, res, next) => {
  try {
    const { email, password, role, firstName, lastName, companyName, plan } = req.body;
    const existingUser = await prisma_default.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.password === null) {
        return next(
          new AppError(
            "This email is already registered with Google. Please continue with Google.",
            400
          )
        );
      }
      return next(new AppError("Email already in use", 400));
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma_default.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
        candidateProfile: role === "CANDIDATE" ? { create: {} } : void 0,
        recruiterProfile: role === "RECRUITER" ? { create: {} } : void 0
      },
      include: {
        candidateProfile: true,
        recruiterProfile: true
      }
    });
    if (role === "RECRUITER" && user.recruiterProfile) {
      await createCompanyForRecruiter(user.recruiterProfile.id, companyName || "My Company");
    }
    const name = firstName ? `${firstName} ${lastName || ""}`.trim() : email;
    await sendWelcomeEmail(email, name, user.role);
    const token = signToken(user.id, user.role);
    res.status(201).json({
      status: "success",
      token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }
    const user = await prisma_default.user.findUnique({ where: { email } });
    if (user && user.password === null) {
      return next(
        new AppError(
          "This account uses Google sign-in. Please continue with Google.",
          401
        )
      );
    }
    if (!user || !await bcrypt.compare(password, user.password)) {
      return next(new AppError("Incorrect email or password", 401));
    }
    const token = signToken(user.id, user.role);
    const recruiterTier = user.role === "RECRUITER" ? mapPlanToTier(await getRecruiterPlan(user.id)) : void 0;
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
          recruiterTier
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var getMe = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("User not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
        avatar: true
      }
    });
    if (!user) return next(new AppError("User not found", 404));
    const recruiterTier = user.role === "RECRUITER" ? mapPlanToTier(await getRecruiterPlan(user.id)) : void 0;
    res.status(200).json({
      status: "success",
      data: { user: { ...user, recruiterTier } }
    });
  } catch (err) {
    next(err);
  }
};
var updateMyAvatar = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file?.path) {
      return next(new AppError("Please upload an image.", 400));
    }
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user) {
      return next(new AppError("User not found.", 404));
    }
    const avatarAsset = await prisma_default.fileAsset.create({
      data: {
        url: file.path,
        provider: "cloudinary",
        publicId: file.filename,
        mimeType: file.mimetype,
        size: file.size
      }
    });
    const previousAvatarId = user.avatarId;
    const updatedUser = await prisma_default.user.update({
      where: { id: user.id },
      data: { avatarId: avatarAsset.id },
      include: { avatar: true }
    });
    if (previousAvatarId && previousAvatarId !== avatarAsset.id) {
      await prisma_default.fileAsset.delete({ where: { id: previousAvatarId } }).catch(() => null);
    }
    res.status(200).json({
      status: "success",
      data: {
        avatarUrl: updatedUser.avatar?.url
      }
    });
  } catch (err) {
    next(err);
  }
};

// server/controllers/googleAuth.controller.ts
import crypto4 from "crypto";
import jwt2 from "jsonwebtoken";
import passport2 from "passport";

// server/services/oauth.service.ts
init_prisma();
import crypto3 from "crypto";
var PROVIDER = "google";
var slugify2 = (name) => {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "company"}-${crypto3.randomBytes(3).toString("hex")}`;
};
async function findOrCreateUserFromGoogle(identity, requestedRole) {
  const existingAccount = await prisma_default.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId
      }
    },
    include: { user: true }
  });
  if (existingAccount) {
    return { user: existingAccount.user, outcome: "returning" };
  }
  const existingUser = await prisma_default.user.findUnique({
    where: { email: identity.email }
  });
  if (existingUser) {
    if (!identity.emailVerified) {
      throw new Error(
        "An account already exists with this email. Sign in with your password, or verify this address with Google before linking."
      );
    }
    await prisma_default.account.create({
      data: {
        userId: existingUser.id,
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId,
        providerEmail: identity.email
      }
    });
    return { user: existingUser, outcome: "linked_existing" };
  }
  const user = await prisma_default.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: identity.email,
        // No local password: the column is nullable precisely so this stays
        // honest rather than storing an unusable placeholder hash.
        password: null,
        role: requestedRole,
        status: "ACTIVE",
        emailVerified: identity.emailVerified,
        firstName: identity.firstName || void 0,
        lastName: identity.lastName || void 0,
        candidateProfile: requestedRole === "CANDIDATE" ? { create: {} } : void 0,
        recruiterProfile: requestedRole === "RECRUITER" ? { create: {} } : void 0
      },
      include: { recruiterProfile: true }
    });
    await tx.account.create({
      data: {
        userId: created.id,
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId,
        providerEmail: identity.email
      }
    });
    if (requestedRole === "RECRUITER" && created.recruiterProfile) {
      await tx.company.create({
        data: {
          name: "My Company",
          slug: slugify2("My Company"),
          plan: "FREE",
          members: {
            create: { role: "OWNER", recruiter: { connect: { id: created.recruiterProfile.id } } }
          }
        }
      });
    }
    return created;
  });
  return { user, outcome: "created" };
}

// server/controllers/googleAuth.controller.ts
var STATE_COOKIE = "dl_oauth_state";
var HANDOFF_COOKIE = "dl_oauth_handoff";
var isProduction = () => process.env.NODE_ENV === "production";
var cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax",
  maxAge: maxAgeMs,
  path: "/"
});
var failRedirect = (res, code) => res.redirect(`${getFrontendUrl()}/auth/callback?error=${encodeURIComponent(code)}`);
var googleAuthStart = (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return next(new AppError(getGoogleConfigError() ?? "Google sign-in is unavailable.", 503));
  }
  const requestedRole = req.query.role === "employer" ? "RECRUITER" : "CANDIDATE";
  const nonce = crypto4.randomBytes(24).toString("hex");
  const state = jwt2.sign({ nonce, role: requestedRole }, getJwtSecret(), { expiresIn: "10m" });
  res.cookie(STATE_COOKIE, nonce, cookieOptions(10 * 60 * 1e3));
  passport2.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    state
  })(req, res, next);
};
var googleAuthCallback = (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return failRedirect(res, "not_configured");
  }
  const stateToken = typeof req.query.state === "string" ? req.query.state : "";
  const cookieNonce = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: "/" });
  let stateRole = "CANDIDATE";
  try {
    const decoded = jwt2.verify(stateToken, getJwtSecret());
    if (!cookieNonce || decoded.nonce !== cookieNonce) {
      console.warn("Google OAuth: state nonce mismatch \u2014 possible CSRF, rejecting");
      return failRedirect(res, "invalid_state");
    }
    stateRole = decoded.role === "RECRUITER" ? "RECRUITER" : "CANDIDATE";
  } catch {
    console.warn("Google OAuth: state token invalid or expired, rejecting");
    return failRedirect(res, "invalid_state");
  }
  passport2.authenticate(
    "google",
    { session: false },
    async (err, identity, info) => {
      try {
        if (err) {
          console.error("Google OAuth: provider error \u2014", err.message);
          return failRedirect(res, "provider_error");
        }
        if (!identity) {
          console.warn("Google OAuth: no identity returned \u2014", info?.message ?? "cancelled by user");
          return failRedirect(res, info?.message ? "no_email" : "cancelled");
        }
        const { user, outcome } = await findOrCreateUserFromGoogle(identity, stateRole);
        console.info(
          `Google OAuth: ${outcome} \u2014 user ${user.id} (${user.role})`
        );
        const token = jwt2.sign({ id: user.id, role: user.role }, getJwtSecret(), {
          expiresIn: "30d"
        });
        res.cookie(HANDOFF_COOKIE, token, cookieOptions(60 * 1e3));
        return res.redirect(`${getFrontendUrl()}/auth/callback`);
      } catch (error) {
        const isLinkingRefusal = error?.message?.includes("already exists with this email");
        console.error("Google OAuth: callback failed \u2014", error?.message);
        return failRedirect(res, isLinkingRefusal ? "email_in_use" : "server_error");
      }
    }
  )(req, res, next);
};
var googleAuthSession = async (req, res, next) => {
  try {
    const token = req.cookies?.[HANDOFF_COOKIE];
    res.clearCookie(HANDOFF_COOKIE, { path: "/" });
    if (!token) {
      return next(new AppError("No pending Google sign-in. Please try again.", 401));
    }
    let decoded;
    try {
      decoded = jwt2.verify(token, getJwtSecret());
    } catch {
      return next(new AppError("Your sign-in expired. Please try again.", 401));
    }
    const prisma2 = (await Promise.resolve().then(() => (init_prisma(), prisma_exports))).default;
    const user = await prisma2.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return next(new AppError("Account no longer exists.", 401));
    }
    const recruiterTier = user.role === "RECRUITER" ? await getRecruiterPlan(user.id) : void 0;
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
          recruiterTier: recruiterTier === "PREMIUM" ? "paid" : recruiterTier === "CORPORATE" ? "corporate" : recruiterTier ? "free" : void 0
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var googleAuthStatus = (_req, res) => {
  const reason = getGoogleConfigError();
  res.status(200).json({
    status: "success",
    data: { googleSignInReady: reason === null, reason }
  });
};

// server/middleware/auth.middleware.ts
import jwt3 from "jsonwebtoken";
var protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }
  try {
    const decoded = jwt3.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError("Not authorized to access this route", 401));
  }
};

// server/utils/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
var storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "job-portal-cvs",
    allowed_formats: ["pdf", "doc", "docx"],
    resource_type: "auto"
  }
});
var upload = multer({ storage });
var videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "job-portal-presentations",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi", "webm", "mkv"]
  }
});
var presentationUpload = multer({
  storage: videoStorage
});
var avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "job-portal-avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    resource_type: "image",
    transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }]
  }
});
var avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
  // 5MB — plenty for a profile photo
});

// server/routes/auth.routes.ts
var router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/google", googleAuthStart);
router.get("/google/callback", googleAuthCallback);
router.post("/google/session", googleAuthSession);
router.get("/google/status", googleAuthStatus);
router.get("/me", protect, getMe);
router.patch("/me/avatar", protect, avatarUpload.single("avatar"), updateMyAvatar);
var auth_routes_default = router;

// server/routes/job.routes.ts
import { Router as Router2 } from "express";

// server/controllers/job.controller.ts
init_prisma();
import crypto5 from "crypto";
var slugify3 = (title) => {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const suffix = crypto5.randomBytes(3).toString("hex");
  return `${base || "job"}-${suffix}`;
};
var getAllJobs = async (req, res, next) => {
  try {
    const { title, location, type, categoryId, categorySlug, wilaya, featured, limit } = req.query;
    const featuredOnly = featured === "true" ? true : void 0;
    const parsedLimit = Number(limit);
    const take = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 60) : void 0;
    const jobs = await prisma_default.job.findMany({
      where: {
        title: title ? { contains: title, mode: "insensitive" } : void 0,
        location: location ? { contains: location, mode: "insensitive" } : void 0,
        type,
        categoryId: categoryId ? categoryId : void 0,
        // Lets the frontend filter by the stable slug it already knows ("it",
        // "health", …) without first resolving it to a uuid.
        category: categorySlug ? { slug: categorySlug } : void 0,
        wilaya: wilaya ? { equals: wilaya, mode: "insensitive" } : void 0,
        featured: featuredOnly,
        status: "PUBLISHED"
      },
      include: {
        recruiter: true,
        company: true,
        category: true
      },
      // Featured first so promoted postings lead any list they appear in.
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take
    });
    res.status(200).json({
      status: "success",
      results: jobs.length,
      data: { jobs }
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterJobs = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (!user?.recruiterProfile) {
      return next(new AppError("Recruiter profile not found", 404));
    }
    const jobs = await prisma_default.job.findMany({
      where: { recruiterId: user.recruiterProfile.id },
      include: {
        applications: {
          select: {
            status: true,
            aiScore: true,
            appliedAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const jobCards = jobs.map((job) => {
      const applications = job.applications;
      const applicationsCount = applications.length;
      const newCandidatesCount = applications.filter(
        (a) => a.appliedAt >= oneWeekAgo
      ).length;
      const scored = applications.filter((a) => a.aiScore != null);
      const averageMatch = scored.length > 0 ? Math.round(
        scored.reduce((sum, a) => sum + (a.aiScore ?? 0), 0) / scored.length
      ) : null;
      return {
        id: job.id,
        title: job.title,
        location: job.location,
        publishedAt: job.publishedAt,
        status: job.status,
        applicationsCount,
        newCandidatesCount,
        averageMatch
      };
    });
    res.status(200).json({
      status: "success",
      results: jobCards.length,
      data: { jobs: jobCards }
    });
  } catch (err) {
    next(err);
  }
};
var getJob = async (req, res, next) => {
  try {
    const job = await prisma_default.job.findUnique({
      where: { id: req.params.id },
      include: { recruiter: true, company: true, category: true }
    });
    if (!job) {
      return next(new AppError("Job not found", 404));
    }
    res.status(200).json({
      status: "success",
      data: { job }
    });
  } catch (err) {
    next(err);
  }
};
var createJob = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("User not authenticated", 401));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (!user?.recruiterProfile) {
      return next(new AppError("Only recruiters can post jobs", 403));
    }
    const membership = await prisma_default.companyMember.findFirst({
      where: { recruiterId: user.recruiterProfile.id },
      include: { company: true }
    });
    if (!membership) {
      return next(new AppError("No company associated with this recruiter account", 400));
    }
    const plan = await getRecruiterPlan(req.user.id);
    const existingJobsCount = await prisma_default.job.count({
      where: { recruiterId: user.recruiterProfile.id }
    });
    if (plan === "FREE" && existingJobsCount >= 5) {
      return next(new AppError("Free plan limit reached (5 jobs). Please upgrade.", 403));
    }
    if (plan === "PREMIUM" && existingJobsCount >= 20) {
      return next(new AppError("Premium plan limit reached (20 jobs). Please upgrade to Corporate.", 403));
    }
    const {
      title,
      description,
      location,
      wilaya,
      country,
      remote,
      type,
      experienceLevel,
      vacancies,
      salaryMin,
      salaryMax,
      currency,
      categoryId,
      featured
    } = req.body;
    if (!title || !description || !location || !type || !experienceLevel) {
      return next(new AppError("title, description, location, type and experienceLevel are required", 400));
    }
    let isFeatured = featured || false;
    if (isFeatured && plan === "FREE") {
      isFeatured = false;
    }
    if (isFeatured && plan === "PREMIUM") {
      const featuredCount = await prisma_default.job.count({
        where: { recruiterId: user.recruiterProfile.id, featured: true }
      });
      if (featuredCount >= 5) {
        isFeatured = false;
      }
    }
    const job = await prisma_default.job.create({
      data: {
        title,
        slug: slugify3(title),
        description,
        location,
        wilaya,
        country,
        remote: remote ?? false,
        type,
        experienceLevel,
        vacancies: vacancies ?? 1,
        salaryMin,
        salaryMax,
        currency: currency ?? "DZD",
        categoryId: categoryId || void 0,
        featured: isFeatured,
        recruiterId: user.recruiterProfile.id,
        companyId: membership.companyId,
        status: "PUBLISHED",
        publishedAt: /* @__PURE__ */ new Date()
      }
    });
    (async () => {
      try {
        const matchingCandidates = await prisma_default.candidateProfile.findMany({
          where: {
            skills: {
              hasSome: title.split(" ")
            }
          },
          include: { user: true }
        });
        for (const candidate of matchingCandidates) {
          await sendJobMatchEmail(
            candidate.user.email,
            job.title,
            membership.company.name,
            job.id
          );
          await prisma_default.notification.create({
            data: {
              userId: candidate.userId,
              title: "New Job Match!",
              message: `A new job matches your profile: ${job.title} at ${membership.company.name}`,
              type: "INFO"
            }
          });
        }
      } catch (err) {
        console.error("Error in job match background task:", err);
      }
    })();
    res.status(201).json({
      status: "success",
      data: { job }
    });
  } catch (err) {
    next(err);
  }
};
var updateJob = async (req, res, next) => {
  try {
    const job = await prisma_default.job.findUnique({ where: { id: req.params.id } });
    if (!job) return next(new AppError("Job not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
      return next(new AppError("You stay in your lane! (Unauthorized)", 403));
    }
    const {
      title,
      description,
      location,
      wilaya,
      country,
      remote,
      type,
      experienceLevel,
      vacancies,
      salaryMin,
      salaryMax,
      currency,
      status,
      expiresAt,
      categoryId,
      featured
    } = req.body;
    let nextFeatured = void 0;
    if (featured !== void 0) {
      const plan = await getRecruiterPlan(req.user.id);
      nextFeatured = Boolean(featured);
      if (nextFeatured && plan === "FREE") {
        return next(
          new AppError("Featured jobs require a Premium or Corporate plan.", 403)
        );
      }
      if (nextFeatured && plan === "PREMIUM" && !job.featured) {
        const featuredCount = await prisma_default.job.count({
          where: { recruiterId: job.recruiterId, featured: true }
        });
        if (featuredCount >= 5) {
          return next(
            new AppError(
              "Premium plan allows 5 featured jobs. Upgrade to Corporate for more.",
              403
            )
          );
        }
      }
    }
    const updatedJob = await prisma_default.job.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        location,
        wilaya,
        country,
        remote,
        type,
        experienceLevel,
        vacancies,
        salaryMin,
        salaryMax,
        currency,
        status,
        expiresAt,
        categoryId,
        featured: nextFeatured
      }
    });
    res.status(200).json({
      status: "success",
      data: { job: updatedJob }
    });
  } catch (err) {
    next(err);
  }
};
var deleteJob = async (req, res, next) => {
  try {
    const job = await prisma_default.job.findUnique({ where: { id: req.params.id } });
    if (!job) return next(new AppError("Job not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
      return next(new AppError("Unauthorized", 403));
    }
    await prisma_default.job.delete({ where: { id: req.params.id } });
    res.status(204).json({
      status: "success",
      data: null
    });
  } catch (err) {
    next(err);
  }
};

// server/middleware/role.middleware.ts
var restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
};

// server/routes/job.routes.ts
var router2 = Router2();
router2.get("/", getAllJobs);
router2.get("/recruiter/mine", protect, restrictTo("RECRUITER", "ADMIN"), getRecruiterJobs);
router2.get("/:id", getJob);
router2.use(protect);
router2.post("/", restrictTo("RECRUITER", "ADMIN"), createJob);
router2.patch("/:id", restrictTo("RECRUITER", "ADMIN"), updateJob);
router2.delete("/:id", restrictTo("RECRUITER", "ADMIN"), deleteJob);
var job_routes_default = router2;

// server/routes/category.routes.ts
import { Router as Router3 } from "express";

// server/controllers/category.controller.ts
init_prisma();
var getAllCategories = async (_req, res, next) => {
  try {
    const categories = await prisma_default.jobCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        _count: {
          select: { jobs: { where: { status: "PUBLISHED" } } }
        }
      }
    });
    res.status(200).json({
      status: "success",
      results: categories.length,
      data: {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          jobCount: c._count.jobs
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const limitParam = Number(req.query.limit);
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 20) : 6;
    const category = await prisma_default.jobCategory.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, description: true, icon: true }
    });
    if (!category) {
      return next(new AppError("Category not found", 404));
    }
    const [jobs, jobCount] = await Promise.all([
      prisma_default.job.findMany({
        where: { categoryId: category.id, status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        take,
        select: {
          id: true,
          title: true,
          location: true,
          wilaya: true,
          type: true,
          remote: true,
          featured: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          createdAt: true,
          publishedAt: true,
          company: { select: { name: true, logo: { select: { url: true } } } }
        }
      }),
      prisma_default.job.count({ where: { categoryId: category.id, status: "PUBLISHED" } })
    ]);
    res.status(200).json({
      status: "success",
      data: { category: { ...category, jobCount }, jobs }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/category.routes.ts
var router3 = Router3();
router3.get("/", getAllCategories);
router3.get("/:slug", getCategoryBySlug);
var category_routes_default = router3;

// server/routes/application.routes.ts
import { Router as Router4 } from "express";

// server/controllers/application.controller.ts
init_prisma();

// server/services/aiAnalysis.service.ts
init_prisma();

// server/services/candidateScore.service.ts
init_prisma();
var CandidateScoreService = class {
  constructor() {
    // ============================================================
    // Score Weights
    // ============================================================
    this.WEIGHTS = {
      ai: 0.2,
      quiz: 0.2,
      oral: 0.2,
      interview: 0.2,
      recruiter: 0.2
    };
  }
  // ============================================================
  // Calculate Final Score
  // ============================================================
  calculateFinalScore(data) {
    const ai2 = data.aiScore ?? 0;
    const quiz = data.quizScore ?? 0;
    const oral = data.oralPresentationScore ?? 0;
    const interview = data.interviewScore ?? 0;
    const recruiter = data.recruiterScore ?? 0;
    return ai2 * this.WEIGHTS.ai + quiz * this.WEIGHTS.quiz + oral * this.WEIGHTS.oral + interview * this.WEIGHTS.interview + recruiter * this.WEIGHTS.recruiter;
  }
  // ============================================================
  // Create or Update Candidate Score
  // ============================================================
  async createOrUpdateScore(applicationId) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidate: true,
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    const scoreData = {
      aiScore: application.aiScore,
      quizScore: application.quizScore,
      oralPresentationScore: application.oralPresentationScore,
      recruiterScore: application.recruiterScore,
      interviewScore: application.candidateScore?.interviewScore ?? null
    };
    const finalScore = this.calculateFinalScore(scoreData);
    if (application.candidateScore) {
      return prisma_default.candidateScore.update({
        where: {
          applicationId
        },
        data: {
          aiScore: scoreData.aiScore,
          quizScore: scoreData.quizScore,
          oralPresentationScore: scoreData.oralPresentationScore,
          recruiterScore: scoreData.recruiterScore,
          interviewScore: scoreData.interviewScore,
          finalScore
        }
      });
    }
    return prisma_default.candidateScore.create({
      data: {
        applicationId,
        candidateId: application.candidateId,
        aiScore: scoreData.aiScore,
        quizScore: scoreData.quizScore,
        oralPresentationScore: scoreData.oralPresentationScore,
        recruiterScore: scoreData.recruiterScore,
        interviewScore: scoreData.interviewScore,
        finalScore
      }
    });
  }
  // ============================================================
  // Candidate
  // ============================================================
  async getMyScore(applicationId, userId) {
    const user = await prisma_default.user.findUnique({
      where: {
        id: userId
      },
      include: {
        candidateProfile: true
      }
    });
    if (!user?.candidateProfile) {
      throw new AppError(
        "Candidate profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id
      },
      include: {
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.candidateScore) {
      return this.createOrUpdateScore(
        applicationId
      );
    }
    return application.candidateScore;
  }
  // ============================================================
  // Recruiter updates interview score
  // ============================================================
  async updateInterviewScore(applicationId, recruiterUserId, interviewScore) {
    if (interviewScore < 0 || interviewScore > 100) {
      throw new AppError(
        "Interview score must be between 0 and 100.",
        400
      );
    }
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (application.recruiterId !== recruiter.recruiterProfile.id) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }
    if (!application.candidateScore) {
      await this.createOrUpdateScore(applicationId);
    }
    const current = await prisma_default.candidateScore.findUnique({
      where: {
        applicationId
      }
    });
    if (!current) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }
    const finalScore = this.calculateFinalScore({
      aiScore: current.aiScore,
      quizScore: current.quizScore,
      oralPresentationScore: current.oralPresentationScore,
      recruiterScore: current.recruiterScore,
      interviewScore
    });
    return prisma_default.candidateScore.update({
      where: {
        applicationId
      },
      data: {
        interviewScore,
        finalScore
      }
    });
  }
  // ============================================================
  // Recruiter updates recruiter evaluation
  // ============================================================
  async updateRecruiterScore(applicationId, recruiterUserId, recruiterScore) {
    if (recruiterScore < 0 || recruiterScore > 100) {
      throw new AppError(
        "Recruiter score must be between 0 and 100.",
        400
      );
    }
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (application.recruiterId !== recruiter.recruiterProfile.id) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }
    await prisma_default.application.update({
      where: {
        id: applicationId
      },
      data: {
        recruiterScore
      }
    });
    if (!application.candidateScore) {
      await this.createOrUpdateScore(applicationId);
    }
    const current = await prisma_default.candidateScore.findUnique({
      where: {
        applicationId
      }
    });
    if (!current) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }
    const finalScore = this.calculateFinalScore({
      aiScore: current.aiScore,
      quizScore: current.quizScore,
      oralPresentationScore: current.oralPresentationScore,
      interviewScore: current.interviewScore,
      recruiterScore
    });
    return prisma_default.candidateScore.update({
      where: {
        applicationId
      },
      data: {
        recruiterScore,
        finalScore
      }
    });
  }
  // ============================================================
  // Recruiter views one candidate score
  // ============================================================
  async getCandidateScore(applicationId, recruiterUserId, role) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: {
          include: {
            candidate: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (role !== "ADMIN") {
      const recruiter = await prisma_default.user.findUnique({
        where: {
          id: recruiterUserId
        },
        include: {
          recruiterProfile: true
        }
      });
      if (!recruiter?.recruiterProfile) {
        throw new AppError(
          "Recruiter profile not found.",
          404
        );
      }
      if (application.recruiterId !== recruiter.recruiterProfile.id) {
        throw new AppError(
          "Unauthorized.",
          403
        );
      }
    }
    if (!application.candidateScore) {
      return this.createOrUpdateScore(
        applicationId
      );
    }
    return application.candidateScore;
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterScores(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.candidateScore.findMany({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.candidateScore.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      })
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const [total, average, highest, lowest] = await prisma_default.$transaction([
      prisma_default.candidateScore.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      }),
      prisma_default.candidateScore.aggregate({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        _avg: {
          finalScore: true
        }
      }),
      prisma_default.candidateScore.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      }),
      prisma_default.candidateScore.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          finalScore: "asc"
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      })
    ]);
    return {
      totalCandidates: total,
      averageScore: average._avg.finalScore ?? 0,
      highestCandidate: highest,
      lowestCandidate: lowest
    };
  }
  // ============================================================
  // Admin
  // ============================================================
  async getAllScores(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.candidateScore.findMany({
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              recruiter: true,
              job: true
            }
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.candidateScore.count()
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Admin Statistics
  // ============================================================
  async getAdminStatistics() {
    const [total, average] = await prisma_default.$transaction([
      prisma_default.candidateScore.count(),
      prisma_default.candidateScore.aggregate({
        _avg: {
          finalScore: true
        }
      })
    ]);
    return {
      totalCandidates: total,
      averageScore: average._avg.finalScore ?? 0
    };
  }
  // ============================================================
  // Recalculate
  // ============================================================
  async recalculate(applicationId) {
    return this.createOrUpdateScore(
      applicationId
    );
  }
  // ============================================================
  // Delete Candidate Score
  // ============================================================
  async deleteScore(applicationId) {
    const score = await prisma_default.candidateScore.findUnique({
      where: {
        applicationId
      }
    });
    if (!score) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }
    await prisma_default.candidateScore.delete({
      where: {
        applicationId
      }
    });
    return {
      success: true,
      message: "Candidate score deleted successfully."
    };
  }
};
var candidateScore_service_default = new CandidateScoreService();

// server/services/preselection.service.ts
init_prisma();
import { PreselectionStatus } from "@prisma/client";
var PreselectionService = class {
  constructor() {
    // ============================================================
    // Minimum score required for automatic preselection
    // ============================================================
    this.MINIMUM_SCORE = 70;
  }
  // ============================================================
  // Automatic Status
  // ============================================================
  determineStatus(score) {
    if (!score) {
      return PreselectionStatus.PENDING;
    }
    if (score >= this.MINIMUM_SCORE) {
      return PreselectionStatus.SHORTLISTED;
    }
    return PreselectionStatus.REJECTED;
  }
  // ============================================================
  // Create or Update Preselection
  // ============================================================
  async createOrUpdatePreselection(applicationId) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true,
        recruiter: true,
        preselections: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.candidateScore) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }
    const finalScore = application.candidateScore.finalScore ?? 0;
    const recruiterScore = application.candidateScore.recruiterScore ?? null;
    const aiScore = application.candidateScore.aiScore ?? null;
    const status = this.determineStatus(finalScore);
    const existingPreselection = application.preselections[0];
    if (existingPreselection) {
      return prisma_default.preselection.update({
        where: {
          id: existingPreselection.id
        },
        data: {
          aiScore,
          recruiterScore,
          finalScore,
          status
        }
      });
    }
    return prisma_default.preselection.create({
      data: {
        applicationId,
        recruiterId: application.recruiterId,
        aiScore,
        recruiterScore,
        finalScore,
        status
      }
    });
  }
  // ============================================================
  // Candidate
  // ============================================================
  async getMyPreselection(applicationId, userId) {
    const user = await prisma_default.user.findUnique({
      where: {
        id: userId
      },
      include: {
        candidateProfile: true
      }
    });
    if (!user?.candidateProfile) {
      throw new AppError(
        "Candidate profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id
      },
      include: {
        preselections: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.preselections[0]) {
      return this.createOrUpdatePreselection(
        applicationId
      );
    }
    return application.preselections[0];
  }
  // ============================================================
  // Recalculate
  // ============================================================
  async recalculate(applicationId) {
    return this.createOrUpdatePreselection(
      applicationId
    );
  }
  // ============================================================
  // Recruiter reviews a candidate
  // ============================================================
  async reviewCandidate(applicationId, recruiterUserId, data) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true,
        preselections: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (application.recruiterId !== recruiter.recruiterProfile.id) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }
    if (!application.preselections[0]) {
      await this.createOrUpdatePreselection(
        applicationId
      );
    }
    const preselection = await prisma_default.preselection.findFirst({
      where: {
        applicationId
      }
    });
    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }
    const recruiterScore = data.recruiterScore ?? preselection.recruiterScore;
    return prisma_default.$transaction(async (tx) => {
      await tx.candidateScore.update({
        where: {
          applicationId
        },
        data: {
          recruiterScore
        }
      });
      return tx.preselection.update({
        where: {
          id: preselection.id
        },
        data: {
          recruiterScore,
          status: data.status,
          comment: data.comment,
          reviewedAt: /* @__PURE__ */ new Date()
        }
      });
    });
  }
  // ============================================================
  // Shortlist Candidate
  // ============================================================
  async shortlistCandidate(applicationId, recruiterUserId, comment) {
    return this.reviewCandidate(
      applicationId,
      recruiterUserId,
      {
        status: PreselectionStatus.SHORTLISTED,
        comment
      }
    );
  }
  // ============================================================
  // Reject Candidate
  // ============================================================
  async rejectCandidate(applicationId, recruiterUserId, comment) {
    return this.reviewCandidate(
      applicationId,
      recruiterUserId,
      {
        status: PreselectionStatus.REJECTED,
        comment
      }
    );
  }
  // ============================================================
  // Get One Preselection
  // ============================================================
  async getPreselection(applicationId, recruiterUserId, role) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        preselections: {
          include: {
            application: {
              include: {
                candidate: {
                  include: {
                    user: true
                  }
                },
                job: true
              }
            }
          }
        }
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.preselections[0]) {
      return this.createOrUpdatePreselection(
        applicationId
      );
    }
    if (role !== "ADMIN") {
      const recruiter = await prisma_default.user.findUnique({
        where: {
          id: recruiterUserId
        },
        include: {
          recruiterProfile: true
        }
      });
      if (!recruiter?.recruiterProfile) {
        throw new AppError(
          "Recruiter profile not found.",
          404
        );
      }
      if (application.recruiterId !== recruiter.recruiterProfile.id) {
        throw new AppError(
          "Unauthorized.",
          403
        );
      }
    }
    return application.preselections[0];
  }
  // ============================================================
  // Update Comment
  // ============================================================
  async updateComment(applicationId, recruiterUserId, comment) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const preselection = await prisma_default.preselection.findFirst({
      where: {
        applicationId,
        recruiterId: recruiter.recruiterProfile.id
      }
    });
    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }
    return prisma_default.preselection.update({
      where: {
        id: preselection.id
      },
      data: {
        comment,
        reviewedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterPreselections(recruiterUserId, page = 1, limit = 10, status) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const skip = (page - 1) * limit;
    const where = {
      recruiterId: recruiter.recruiterProfile.id
    };
    if (status) {
      where.status = status;
    }
    const [items, total] = await prisma_default.$transaction([
      prisma_default.preselection.findMany({
        where,
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.preselection.count({
        where
      })
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const [
      total,
      shortlisted,
      rejected,
      pending,
      average
    ] = await prisma_default.$transaction([
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id
        }
      }),
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id,
          status: PreselectionStatus.SHORTLISTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id,
          status: PreselectionStatus.REJECTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id,
          status: PreselectionStatus.PENDING
        }
      }),
      prisma_default.preselection.aggregate({
        where: {
          recruiterId: recruiter.recruiterProfile.id
        },
        _avg: {
          finalScore: true
        }
      })
    ]);
    return {
      total,
      shortlisted,
      rejected,
      pending,
      averageScore: average._avg.finalScore ?? 0
    };
  }
  // ============================================================
  // Recruiter Ranking
  // ============================================================
  async getRanking(recruiterUserId, limit = 20) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    return prisma_default.preselection.findMany({
      where: {
        recruiterId: recruiter.recruiterProfile.id
      },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: true
              }
            },
            job: true
          }
        }
      },
      orderBy: {
        finalScore: "desc"
      },
      take: limit
    });
  }
  // ============================================================
  // Admin
  // ============================================================
  async getAllPreselections(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.preselection.findMany({
        include: {
          recruiter: true,
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.preselection.count()
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Admin Statistics
  // ============================================================
  async getAdminStatistics() {
    const [
      total,
      shortlisted,
      rejected,
      pending,
      average
    ] = await prisma_default.$transaction([
      prisma_default.preselection.count(),
      prisma_default.preselection.count({
        where: {
          status: PreselectionStatus.SHORTLISTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          status: PreselectionStatus.REJECTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          status: PreselectionStatus.PENDING
        }
      }),
      prisma_default.preselection.aggregate({
        _avg: {
          finalScore: true
        }
      })
    ]);
    return {
      total,
      shortlisted,
      rejected,
      pending,
      averageScore: average._avg.finalScore ?? 0
    };
  }
  // ============================================================
  // Delete
  // ============================================================
  async deletePreselection(applicationId) {
    const preselection = await prisma_default.preselection.findFirst({
      where: {
        applicationId
      }
    });
    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }
    await prisma_default.preselection.delete({
      where: {
        id: preselection.id
      }
    });
    return {
      success: true,
      message: "Preselection deleted successfully."
    };
  }
};
var preselection_service_default = new PreselectionService();

// server/services/aiAnalysis.service.ts
import { AIAnalysisStatus } from "@prisma/client";

// server/services/ai/openai.provider.ts
import { GoogleGenAI } from "@google/genai";
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
async function askAI(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });
  return response.text ?? "";
}

// server/services/ai/prompt.builder.ts
function buildPrompt(data) {
  return `
You are an expert HR recruiter.

Analyze this candidate.

JOB TITLE:
${data.jobTitle}

JOB DESCRIPTION:
${data.jobDescription}

CANDIDATE CV:
${data.cvText}

Return ONLY valid JSON.

{
  "score":0,
  "summary":"",
  "strengths":[],
  "weaknesses":[],
  "matchedSkills":[],
  "missingSkills":[],
  "extractedSkills":[],
  "extractedEducation":[],
  "extractedExperience":[],
  "recommendations":[]
}
`;
}

// server/services/ai/analysis.parser.ts
function parseAnalysis(response) {
  if (!response) {
    throw new AppError(
      "Empty AI response.",
      500
    );
  }
  try {
    const cleaned = response.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      overallScore: Number(parsed.overallScore ?? 0),
      skillsScore: Number(parsed.skillsScore ?? 0),
      experienceScore: Number(parsed.experienceScore ?? 0),
      educationScore: Number(parsed.educationScore ?? 0),
      languageScore: Number(parsed.languageScore ?? 0),
      extractedSkills: Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills : [],
      extractedLanguages: Array.isArray(parsed.extractedLanguages) ? parsed.extractedLanguages : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch (error) {
    console.error(
      "AI Parser Error:",
      error
    );
    throw new AppError(
      "Invalid AI response format.",
      500
    );
  }
}

// server/services/cvExtraction.service.ts
import axios from "axios";
import pdfParse from "pdf-parse-debugging-disabled";
import mammoth from "mammoth";
var CVExtractionService = class {
  async extractTextFromCV(fileUrl) {
    if (!fileUrl) {
      throw new AppError("CV URL is missing.", 400);
    }
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer"
    });
    const buffer = Buffer.from(response.data);
    const extension = this.getExtension(fileUrl);
    switch (extension) {
      case "pdf":
        return this.extractPdf(buffer);
      case "docx":
        return this.extractDocx(buffer);
      default:
        throw new AppError(
          `Unsupported CV format: ${extension}`,
          400
        );
    }
  }
  /**
   * Extract text from PDF
   */
  async extractPdf(buffer) {
    const result = await pdfParse(buffer);
    return this.cleanText(result.text);
  }
  /**
   * Extract text from DOCX
   */
  async extractDocx(buffer) {
    const result = await mammoth.extractRawText({
      buffer
    });
    return this.cleanText(result.value);
  }
  /**
   * Get extension
   */
  getExtension(url) {
    const clean = url.split("?")[0];
    return clean.split(".").pop()?.toLowerCase() || "";
  }
  /**
   * Clean extracted text
   */
  cleanText(text) {
    return text.replace(/\r/g, "").replace(/\n{2,}/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  }
};
var cvExtraction_service_default = new CVExtractionService();

// server/services/aiAnalysis.service.ts
var AIAnalysisService = class {
  // ============================================================
  // Build Prompt
  // ============================================================
  createPrompt(jobTitle, jobDescription, cvText) {
    return buildPrompt({
      jobTitle,
      jobDescription,
      cvText
    });
  }
  // ============================================================
  // Save / Update Analysis
  // ============================================================
  async saveAnalysis(applicationId, candidateId, analysis) {
    const existing = await prisma_default.aIAnalysis.findUnique({
      where: {
        applicationId
      }
    });
    const data = {
      candidateId,
      status: AIAnalysisStatus.COMPLETED,
      overallScore: analysis.overallScore ?? 0,
      skillsScore: analysis.skillsScore ?? 0,
      experienceScore: analysis.experienceScore ?? 0,
      educationScore: analysis.educationScore ?? 0,
      languageScore: analysis.languageScore ?? 0,
      extractedSkills: analysis.extractedSkills ?? [],
      extractedLanguages: analysis.extractedLanguages ?? [],
      strengths: analysis.strengths ?? [],
      weaknesses: analysis.weaknesses ?? [],
      recommendations: analysis.recommendations ?? [],
      processedAt: /* @__PURE__ */ new Date()
    };
    if (existing) {
      return prisma_default.aIAnalysis.update({
        where: {
          applicationId
        },
        data
      });
    }
    return prisma_default.aIAnalysis.create({
      data: {
        applicationId,
        ...data
      }
    });
  }
  // ============================================================
  // Update Application AI Score
  // ============================================================
  async updateApplicationScore(applicationId, score) {
    return prisma_default.application.update({
      where: {
        id: applicationId
      },
      data: {
        aiScore: score
      }
    });
  }
  // ============================================================
  // Read Application
  // ============================================================
  async getApplication(applicationId) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidate: true,
        job: true,
        cv: true,
        aianalysis: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.cv) {
      throw new AppError(
        "Candidate CV not found.",
        404
      );
    }
    return application;
  }
  // ============================================================
  // Analyze Application
  // ============================================================
  async analyzeApplication(applicationId) {
    const application = await this.getApplication(
      applicationId
    );
    if (application.aianalysis) {
      await prisma_default.aIAnalysis.update({
        where: {
          applicationId
        },
        data: {
          status: AIAnalysisStatus.PROCESSING
        }
      });
    } else {
      await prisma_default.aIAnalysis.create({
        data: {
          applicationId,
          candidateId: application.candidateId,
          status: AIAnalysisStatus.PROCESSING
        }
      });
    }
    try {
      const cvText = await cvExtraction_service_default.extractTextFromCV(
        application.cv.url
      );
      const prompt = this.createPrompt(
        application.job.title,
        application.job.description,
        cvText
      );
      const aiResponse = await askAI(prompt);
      const analysis = parseAnalysis(aiResponse);
      const savedAnalysis = await this.saveAnalysis(
        applicationId,
        application.candidateId,
        analysis
      );
      await this.updateApplicationScore(
        applicationId,
        analysis.overallScore
      );
      await candidateScore_service_default.createOrUpdateScore(
        applicationId
      );
      await preselection_service_default.createOrUpdatePreselection(
        applicationId
      );
      return savedAnalysis;
    } catch (error) {
      await prisma_default.aIAnalysis.update({
        where: {
          applicationId
        },
        data: {
          status: AIAnalysisStatus.FAILED
        }
      });
      throw error;
    }
  }
  // ============================================================
  // Get One Analysis
  // ============================================================
  async getAnalysis(applicationId) {
    const analysis = await prisma_default.aIAnalysis.findUnique({
      where: {
        applicationId
      },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: true
              }
            },
            job: true
          }
        }
      }
    });
    if (!analysis) {
      throw new AppError(
        "AI analysis not found.",
        404
      );
    }
    return analysis;
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterAnalyses(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.aIAnalysis.findMany({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          overallScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.aIAnalysis.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      })
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const [
      total,
      average,
      highest,
      lowest
    ] = await prisma_default.$transaction([
      prisma_default.aIAnalysis.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      }),
      prisma_default.aIAnalysis.aggregate({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        _avg: {
          overallScore: true
        }
      }),
      prisma_default.aIAnalysis.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          overallScore: "desc"
        }
      }),
      prisma_default.aIAnalysis.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          overallScore: "asc"
        }
      })
    ]);
    return {
      totalAnalyses: total,
      averageScore: average._avg.overallScore ?? 0,
      highestAnalysis: highest,
      lowestAnalysis: lowest
    };
  }
  // ============================================================
  // Recalculate
  // ============================================================
  async recalculate(applicationId) {
    return this.analyzeApplication(
      applicationId
    );
  }
  // ============================================================
  // Delete Analysis
  // ============================================================
  async deleteAnalysis(applicationId) {
    const analysis = await prisma_default.aIAnalysis.findUnique({
      where: {
        applicationId
      }
    });
    if (!analysis) {
      throw new AppError(
        "AI analysis not found.",
        404
      );
    }
    await prisma_default.aIAnalysis.delete({
      where: {
        applicationId
      }
    });
    return {
      success: true,
      message: "AI analysis deleted successfully."
    };
  }
};
var aiAnalysis_service_default = new AIAnalysisService();

// server/controllers/application.controller.ts
var applyToJob = async (req, res, next) => {
  try {
    const { jobId, coverLetter } = req.body;
    const candidateId = req.user.id;
    const job = await prisma_default.job.findUnique({
      where: { id: jobId }
    });
    if (!job) {
      return next(new AppError("Job not found", 404));
    }
    const user = await prisma_default.user.findUnique({
      where: { id: candidateId },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Only candidates can apply to jobs", 403));
    }
    const existingApplication = await prisma_default.application.findFirst({
      where: { jobId, candidateId: user.candidateProfile.id }
    });
    if (existingApplication) {
      return next(new AppError("You have already applied for this job", 400));
    }
    if (!user.candidateProfile.resumeId) {
      return next(
        new AppError(
          "Please upload your CV to your profile before applying.",
          400
        )
      );
    }
    const application = await prisma_default.application.create({
      data: {
        jobId,
        candidateId: user.candidateProfile.id,
        recruiterId: job.recruiterId,
        coverLetter,
        cvId: user.candidateProfile.resumeId
      }
    });
    aiAnalysis_service_default.analyzeApplication(application.id).catch((error) => {
      console.error(
        "AI Analysis Error:",
        error
      );
    });
    res.status(201).json({
      status: "success",
      data: { application }
    });
  } catch (err) {
    next(err);
  }
};
var getMyApplications = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found", 404));
    }
    const applications = await prisma_default.application.findMany({
      where: { candidateId: user.candidateProfile.id },
      include: { job: { include: { recruiter: true } } },
      orderBy: { appliedAt: "desc" }
    });
    res.status(200).json({
      status: "success",
      results: applications.length,
      data: { applications }
    });
  } catch (err) {
    next(err);
  }
};
var getJobApplications = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await prisma_default.job.findUnique({
      where: { id: jobId },
      include: { recruiter: true }
    });
    if (!job) return next(new AppError("Job not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
      return next(new AppError("Unauthorized", 403));
    }
    const applications = await prisma_default.application.findMany({
      where: { jobId },
      include: {
        candidate: { include: { user: true } },
        cv: true,
        aianalysis: true
      },
      orderBy: { appliedAt: "desc" }
    });
    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidateUserIds = [
      ...new Set(applications.map((a) => a.candidate.userId))
    ];
    const [quizzes, presentations] = await Promise.all([
      prisma_default.quiz.findMany({
        where: { candidateId: { in: candidateUserIds } },
        include: { attempt: true }
      }),
      prisma_default.oralPresentation.findMany({
        where: { candidateId: { in: candidateIds } },
        include: { video: true }
      })
    ]);
    const quizByUserId = new Map(quizzes.map((q) => [q.candidateId, q]));
    const presentationByCandidateId = new Map(
      presentations.map((p) => [p.candidateId, p])
    );
    const enriched = applications.map((application) => ({
      ...application,
      quiz: quizByUserId.get(application.candidate.userId) ?? null,
      oralPresentation: presentationByCandidateId.get(application.candidateId) ?? null
    }));
    res.status(200).json({
      status: "success",
      results: enriched.length,
      data: { applications: enriched }
    });
  } catch (err) {
    next(err);
  }
};
var updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const application = await prisma_default.application.findUnique({
      where: { id },
      include: { job: { include: { recruiter: true } } }
    });
    if (!application) return next(new AppError("Application not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (application.job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
      return next(new AppError("Unauthorized", 403));
    }
    const updatedApplication = await prisma_default.application.update({
      where: { id },
      data: { status }
    });
    res.status(200).json({
      status: "success",
      data: { application: updatedApplication }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/application.routes.ts
var router4 = Router4();
router4.use(protect);
router4.post("/", restrictTo("CANDIDATE"), applyToJob);
router4.get("/my", restrictTo("CANDIDATE"), getMyApplications);
router4.get("/job/:jobId", restrictTo("RECRUITER", "ADMIN"), getJobApplications);
router4.patch("/:id/status", restrictTo("RECRUITER", "ADMIN"), updateApplicationStatus);
var application_routes_default = router4;

// server/routes/contact.routes.ts
import { Router as Router5 } from "express";

// server/controllers/contact.controller.ts
var sendContactMessage = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    if (!email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_USER;
    if (!contactEmail) {
      console.error("No contact email configured");
      return res.status(500).json({ message: "Server configuration error" });
    }
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>${message}</p>
        </div>
      </div>
    `;
    await sendEmail(contactEmail, `Contact Form: ${subject}`, html);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error in sendContactMessage:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// server/routes/contact.routes.ts
var router5 = Router5();
router5.post("/", sendContactMessage);
var contact_routes_default = router5;

// server/routes/admin.routes.ts
import { Router as Router6 } from "express";

// server/controllers/admin.controller.ts
init_prisma();
var getAllCompanies = async (req, res, next) => {
  try {
    const companies = await prisma_default.company.findMany({
      include: {
        members: {
          include: {
            recruiter: {
              include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } }
            }
          }
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        jobs: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json({
      status: "success",
      results: companies.length,
      data: { companies }
    });
  } catch (err) {
    next(err);
  }
};
var getCompany = async (req, res, next) => {
  try {
    const company = await prisma_default.company.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { recruiter: { include: { user: true } } } },
        subscriptions: { orderBy: { createdAt: "desc" }, include: { payments: true } },
        jobs: true
      }
    });
    if (!company) return next(new AppError("Company not found", 404));
    res.status(200).json({ status: "success", data: { company } });
  } catch (err) {
    next(err);
  }
};
var updateCompanyPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, durationDays } = req.body;
    const validPlans = ["FREE", "PREMIUM", "CORPORATE"];
    if (!plan || !validPlans.includes(plan)) {
      return next(new AppError(`plan must be one of: ${validPlans.join(", ")}`, 400));
    }
    const company = await prisma_default.company.findUnique({ where: { id } });
    if (!company) return next(new AppError("Company not found", 404));
    const startsAt = /* @__PURE__ */ new Date();
    const endsAt = new Date(startsAt.getTime() + (durationDays || 30) * 24 * 60 * 60 * 1e3);
    const [updatedCompany, subscription] = await prisma_default.$transaction([
      prisma_default.company.update({
        where: { id },
        data: { plan }
      }),
      prisma_default.subscription.create({
        data: {
          companyId: id,
          plan,
          status: "ACTIVE",
          startsAt,
          endsAt,
          autoRenew: false
        }
      })
    ]);
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "UPDATE_COMPANY_PLAN",
        entity: "Company",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.status(200).json({
      status: "success",
      data: { company: updatedCompany, subscription }
    });
  } catch (err) {
    next(err);
  }
};
var getAllUsers = async (req, res, next) => {
  try {
    const { role, status } = req.query;
    const users = await prisma_default.user.findMany({
      where: {
        role: role ? role : void 0,
        status: status ? status : void 0
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        recruiterProfile: { select: { id: true, verified: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json({ status: "success", results: users.length, data: { users } });
  } catch (err) {
    next(err);
  }
};
var updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "DELETED"];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400));
    }
    const user = await prisma_default.user.update({ where: { id }, data: { status } });
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "UPDATE_USER_STATUS",
        entity: "User",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};
var adminPreselect = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status, comment, finalScore } = req.body;
    const validStatuses = ["PENDING", "SHORTLISTED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400));
    }
    const application = await prisma_default.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { company: true } }, recruiter: true }
    });
    if (!application) return next(new AppError("Application not found", 404));
    if (application.job.company.plan !== "CORPORATE") {
      return next(new AppError("Admin preselection override is only for CORPORATE plan companies", 403));
    }
    const [preselection, updatedApplication] = await prisma_default.$transaction([
      prisma_default.preselection.create({
        data: {
          applicationId,
          recruiterId: application.recruiterId,
          status,
          finalScore: finalScore ?? void 0,
          comment: comment ? `[ADMIN OVERRIDE] ${comment}` : "[ADMIN OVERRIDE]",
          reviewedAt: /* @__PURE__ */ new Date()
        }
      }),
      prisma_default.application.update({
        where: { id: applicationId },
        data: {
          preselectionStatus: status,
          isPreselected: status === "SHORTLISTED",
          preselectionComment: comment
        }
      })
    ]);
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "ADMIN_PRESELECTION_OVERRIDE",
        entity: "Application",
        entityId: applicationId,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.status(200).json({
      status: "success",
      data: { preselection, application: updatedApplication }
    });
  } catch (err) {
    next(err);
  }
};
var getCorporatePendingPreselections = async (req, res, next) => {
  try {
    const applications = await prisma_default.application.findMany({
      where: {
        preselectionStatus: "PENDING",
        job: { company: { plan: "CORPORATE" } }
      },
      include: {
        job: { include: { company: true } },
        candidate: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }
      },
      orderBy: { appliedAt: "asc" }
    });
    res.status(200).json({ status: "success", results: applications.length, data: { applications } });
  } catch (err) {
    next(err);
  }
};
var getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalRecruiters, totalCandidates, totalCompanies, totalJobs, planCounts, pendingTickets] = await Promise.all([
      prisma_default.user.count(),
      prisma_default.user.count({ where: { role: "RECRUITER" } }),
      prisma_default.user.count({ where: { role: "CANDIDATE" } }),
      prisma_default.company.count(),
      prisma_default.job.count(),
      prisma_default.company.groupBy({ by: ["plan"], _count: true }),
      prisma_default.supportTicket.count({ where: { status: "OPEN" } })
    ]);
    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        totalRecruiters,
        totalCandidates,
        totalCompanies,
        totalJobs,
        planCounts,
        pendingTickets
      }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/admin.routes.ts
var router6 = Router6();
router6.use(protect);
router6.use(restrictTo("ADMIN"));
router6.get("/stats", getStats);
router6.get("/companies", getAllCompanies);
router6.get("/companies/:id", getCompany);
router6.patch("/companies/:id/plan", updateCompanyPlan);
router6.get("/users", getAllUsers);
router6.patch("/users/:id/status", updateUserStatus);
router6.get("/preselections/corporate-pending", getCorporatePendingPreselections);
router6.post("/preselections/:applicationId", adminPreselect);
var admin_routes_default = router6;

// server/routes/preselection.routes.ts
import { Router as Router7 } from "express";

// server/controllers/preselection.controller.ts
var getMyPreselection = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.getMyPreselection(
      req.params.applicationId,
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var getPreselection = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.getPreselection(
      req.params.applicationId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var shortlistCandidate = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.shortlistCandidate(
      req.params.applicationId,
      req.user.id,
      req.body.comment
    );
    res.status(200).json({
      status: "success",
      message: "Candidate shortlisted successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var rejectCandidate = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.rejectCandidate(
      req.params.applicationId,
      req.user.id,
      req.body.comment
    );
    res.status(200).json({
      status: "success",
      message: "Candidate rejected successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var reviewCandidate = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.reviewCandidate(
      req.params.applicationId,
      req.user.id,
      {
        status: req.body.status,
        recruiterScore: req.body.recruiterScore,
        comment: req.body.comment
      }
    );
    res.status(200).json({
      status: "success",
      message: "Candidate reviewed successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var updateComment = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.updateComment(
      req.params.applicationId,
      req.user.id,
      req.body.comment
    );
    res.status(200).json({
      status: "success",
      message: "Comment updated successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterPreselections = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status ? req.query.status : void 0;
    const result = await preselection_service_default.getRecruiterPreselections(
      req.user.id,
      page,
      limit,
      status
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics = async (req, res, next) => {
  try {
    const statistics = await preselection_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var getRanking = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const ranking = await preselection_service_default.getRanking(
      req.user.id,
      limit
    );
    res.status(200).json({
      status: "success",
      data: ranking
    });
  } catch (err) {
    next(err);
  }
};
var getAllPreselections = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await preselection_service_default.getAllPreselections(
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getAdminStatistics = async (req, res, next) => {
  try {
    const statistics = await preselection_service_default.getAdminStatistics();
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var recalculatePreselection = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.recalculate(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      message: "Preselection recalculated successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var deletePreselection = async (req, res, next) => {
  try {
    const result = await preselection_service_default.deletePreselection(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var preselection_controller_default = {
  getMyPreselection,
  getPreselection,
  shortlistCandidate,
  rejectCandidate,
  reviewCandidate,
  updateComment,
  getRecruiterPreselections,
  getRecruiterStatistics,
  getRanking,
  getAllPreselections,
  getAdminStatistics,
  recalculatePreselection,
  deletePreselection
};

// server/routes/preselection.routes.ts
var router7 = Router7();
router7.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  preselection_controller_default.getMyPreselection
);
router7.get(
  "/application/:applicationId/details",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getPreselection
);
router7.patch(
  "/application/:applicationId/review",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.reviewCandidate
);
router7.patch(
  "/application/:applicationId/shortlist",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.shortlistCandidate
);
router7.patch(
  "/application/:applicationId/reject",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.rejectCandidate
);
router7.patch(
  "/application/:applicationId/comment",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.updateComment
);
router7.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getRecruiterPreselections
);
router7.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getRecruiterStatistics
);
router7.get(
  "/recruiter/ranking",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getRanking
);
router7.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.getAllPreselections
);
router7.get(
  "/statistics",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.getAdminStatistics
);
router7.patch(
  "/application/:applicationId/recalculate",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.recalculatePreselection
);
router7.delete(
  "/application/:applicationId",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.deletePreselection
);
var preselection_routes_default = router7;

// server/routes/oralPresentation.routes.ts
import express from "express";

// server/services/oralPresentation.service.ts
init_prisma();
import { OralPresentationStatus } from "@prisma/client";
var OralPresentationService = class {
  /**
   * Candidate: Upload or replace their profile presentation video.
   * One presentation per candidate profile (not per application).
   *
   * `meta` describes a video that the browser has already uploaded
   * directly to Cloudinary (see getUploadSignature) — we only ever
   * receive the resulting metadata here, never the file itself.
   */
  async uploadPresentation(userId, meta) {
    if (!meta?.url) {
      throw new AppError("Please upload a video.", 400);
    }
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { oralPresentation: true } } }
    });
    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    const candidateId = user.candidateProfile.id;
    const fileAsset = await prisma_default.fileAsset.create({
      data: {
        url: meta.url,
        provider: "cloudinary",
        publicId: meta.publicId,
        mimeType: meta.mimeType,
        extension: meta.extension,
        size: meta.size
      }
    });
    const existing = user.candidateProfile.oralPresentation;
    if (existing) {
      const presentation2 = await prisma_default.oralPresentation.update({
        where: { candidateId },
        data: {
          videoId: fileAsset.id,
          status: OralPresentationStatus.UPLOADED
        },
        include: { video: true }
      });
      if (existing.videoId && existing.videoId !== fileAsset.id) {
        await prisma_default.fileAsset.delete({ where: { id: existing.videoId } }).catch(() => null);
      }
      return presentation2;
    }
    const presentation = await prisma_default.oralPresentation.create({
      data: {
        candidateId,
        videoId: fileAsset.id,
        status: OralPresentationStatus.UPLOADED
      },
      include: { video: true }
    });
    return presentation;
  }
  /**
   * Candidate: Get own presentation
   */
  async getMyPresentation(userId) {
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    const presentation = await prisma_default.oralPresentation.findUnique({
      where: { candidateId: user.candidateProfile.id },
      include: { video: true }
    });
    return presentation;
  }
  /**
   * Recruiter/Admin: View a candidate's presentation.
   * A recruiter may only view it if the candidate has applied to one of
   * the recruiter's jobs.
   */
  async getPresentationByCandidateId(candidateId, requesterUserId, role) {
    const presentation = await prisma_default.oralPresentation.findUnique({
      where: { candidateId },
      include: {
        video: true,
        candidate: { include: { user: true } }
      }
    });
    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }
    if (role !== "ADMIN") {
      const requester = await prisma_default.user.findUnique({
        where: { id: requesterUserId },
        include: { recruiterProfile: true }
      });
      if (!requester?.recruiterProfile) {
        throw new AppError("Recruiter profile not found.", 404);
      }
      const hasApplication = await prisma_default.application.findFirst({
        where: {
          candidateId,
          recruiterId: requester.recruiterProfile.id
        },
        select: { id: true }
      });
      if (!hasApplication) {
        throw new AppError("Unauthorized.", 403);
      }
    }
    return presentation;
  }
  /**
   * Recruiter: Score a candidate's presentation.
   * Same ownership rule as viewing: candidate must have applied to one
   * of the recruiter's jobs.
   */
  async updateRecruiterScore(candidateId, recruiterUserId, recruiterScore) {
    if (recruiterScore < 0 || recruiterScore > 100) {
      throw new AppError("Recruiter score must be between 0 and 100.", 400);
    }
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const presentation = await prisma_default.oralPresentation.findUnique({
      where: { candidateId }
    });
    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }
    const hasApplication = await prisma_default.application.findFirst({
      where: {
        candidateId,
        recruiterId: recruiter.recruiterProfile.id
      },
      select: { id: true }
    });
    if (!hasApplication) {
      throw new AppError("Unauthorized.", 403);
    }
    const updated = await prisma_default.oralPresentation.update({
      where: { candidateId },
      data: {
        recruiterScore,
        status: OralPresentationStatus.REVIEWED
      },
      include: { video: true }
    });
    const applications = await prisma_default.application.findMany({
      where: { candidateId },
      select: { id: true }
    });
    await prisma_default.application.updateMany({
      where: { candidateId },
      data: { oralPresentationScore: recruiterScore }
    });
    await Promise.all(
      applications.map(
        (app2) => candidateScore_service_default.createOrUpdateScore(app2.id).catch(() => null)
      )
    );
    return updated;
  }
  /**
   * Candidate: Delete own presentation
   */
  async deletePresentation(userId) {
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { oralPresentation: true } } }
    });
    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    const presentation = user.candidateProfile.oralPresentation;
    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }
    await prisma_default.$transaction(async (tx) => {
      await tx.oralPresentation.delete({
        where: { candidateId: user.candidateProfile.id }
      });
      if (presentation.videoId) {
        await tx.fileAsset.delete({ where: { id: presentation.videoId } });
      }
    });
    return { success: true, message: "Presentation deleted successfully." };
  }
  /**
   * Recruiter: List presentations belonging to candidates who applied
   * to this recruiter's jobs.
   */
  async getRecruiterPresentations(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const skip = (page - 1) * limit;
    const where = {
      candidate: {
        applications: {
          some: { recruiterId: recruiter.recruiterProfile.id }
        }
      }
    };
    const [items, total] = await prisma_default.$transaction([
      prisma_default.oralPresentation.findMany({
        where,
        include: { video: true, candidate: { include: { user: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.oralPresentation.count({ where })
    ]);
    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  /**
   * Admin: List all presentations
   */
  async getAllPresentations(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.oralPresentation.findMany({
        include: { video: true, candidate: { include: { user: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.oralPresentation.count()
    ]);
    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  /**
   * Recruiter dashboard statistics, scoped to candidates who applied
   * to this recruiter's jobs.
   */
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const baseWhere = {
      candidate: {
        applications: {
          some: { recruiterId: recruiter.recruiterProfile.id }
        }
      }
    };
    const [total, pending, uploaded, reviewed] = await prisma_default.$transaction([
      prisma_default.oralPresentation.count({ where: baseWhere }),
      prisma_default.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.PENDING }
      }),
      prisma_default.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.UPLOADED }
      }),
      prisma_default.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.REVIEWED }
      })
    ]);
    return { total, pending, uploaded, reviewed };
  }
};
var oralPresentation_service_default = new OralPresentationService();

// server/controllers/oralPresentation.controller.ts
var getUploadSignature = async (req, res, next) => {
  try {
    const timestamp = Math.round(Date.now() / 1e3);
    const folder = "job-portal-presentations";
    const paramsToSign = {
      timestamp,
      folder
    };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );
    res.status(200).json({
      status: "success",
      data: {
        timestamp,
        folder,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME
      }
    });
  } catch (err) {
    next(err);
  }
};
var uploadPresentation = async (req, res, next) => {
  try {
    const presentation = await oralPresentation_service_default.uploadPresentation(
      req.user.id,
      req.body
    );
    res.status(201).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var getMyPresentation = async (req, res, next) => {
  try {
    const presentation = await oralPresentation_service_default.getMyPresentation(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var getPresentationByCandidateId = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const presentation = await oralPresentation_service_default.getPresentationByCandidateId(
      candidateId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var updateRecruiterScore = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { recruiterScore } = req.body;
    const presentation = await oralPresentation_service_default.updateRecruiterScore(
      candidateId,
      req.user.id,
      Number(recruiterScore)
    );
    res.status(200).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var deletePresentation = async (req, res, next) => {
  try {
    const result = await oralPresentation_service_default.deletePresentation(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterPresentations = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const data = await oralPresentation_service_default.getRecruiterPresentations(
      req.user.id,
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...data
    });
  } catch (err) {
    next(err);
  }
};
var getAllPresentations = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await oralPresentation_service_default.getAllPresentations(
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...data
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics2 = async (req, res, next) => {
  try {
    const statistics = await oralPresentation_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: { statistics }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/oralPresentation.routes.ts
var router8 = express.Router();
router8.use(protect);
router8.get(
  "/upload-signature",
  restrictTo("CANDIDATE"),
  getUploadSignature
);
router8.post(
  "/me",
  restrictTo("CANDIDATE"),
  uploadPresentation
);
router8.get("/me", restrictTo("CANDIDATE"), getMyPresentation);
router8.delete("/me", restrictTo("CANDIDATE"), deletePresentation);
router8.get(
  "/recruiter",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterPresentations
);
router8.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterStatistics2
);
router8.get(
  "/candidate/:candidateId",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getPresentationByCandidateId
);
router8.patch(
  "/candidate/:candidateId/recruiter-score",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  updateRecruiterScore
);
router8.get("/", restrictTo("ADMIN"), getAllPresentations);
var oralPresentation_routes_default = router8;

// server/routes/quiz.routes.ts
import express2 from "express";

// server/services/quiz.service.ts
init_prisma();
import { QuizStatus } from "@prisma/client";

// server/services/ai/quiz.ai.ts
function stripFences(raw) {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}
async function generateQuizQuestions(cvText) {
  const prompt = `
You are an expert technical recruiter.

Read this candidate's CV and write EXACTLY 5 interview questions that are
directly based on what is actually written in the CV: technologies used,
real projects, education, professional experience, and responsibilities.

Do NOT write generic interview questions. Each question must reference
something specific found in the CV text below.

CANDIDATE CV:
${cvText}

Return ONLY valid JSON, an array of exactly 5 objects:
[
  {
    "question": "",
    "skill": "",
    "difficulty": "EASY" | "MEDIUM" | "HARD"
  }
]
`;
  const raw = await askAI(prompt);
  if (!raw) {
    throw new AppError("Empty AI response while generating quiz.", 500);
  }
  let parsed;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (error) {
    console.error("Quiz AI parse error:", error, raw);
    throw new AppError("Invalid AI response while generating quiz.", 500);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new AppError("AI did not return a valid question list.", 500);
  }
  const questions = parsed.slice(0, 5).map((q) => ({
    question: String(q.question ?? "").trim(),
    skill: q.skill ? String(q.skill) : void 0,
    difficulty: ["EASY", "MEDIUM", "HARD"].includes(q.difficulty) ? q.difficulty : "MEDIUM"
  }));
  if (questions.some((q) => !q.question)) {
    throw new AppError("AI returned one or more empty questions.", 500);
  }
  if (questions.length !== 5) {
    throw new AppError("AI did not return exactly 5 questions.", 500);
  }
  return questions;
}
async function evaluateAnswer(question, answer) {
  const prompt = `
You are an expert technical recruiter grading an interview answer.

QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Score the answer from 0 to 100 based on relevance, accuracy, and depth.
If the answer is empty, off-topic, or says "I don't know", score it low.

Return ONLY valid JSON:
{
  "score": 0,
  "feedback": ""
}
`;
  const raw = await askAI(prompt);
  if (!raw) {
    return { score: 0, feedback: "No AI response received." };
  }
  try {
    const parsed = JSON.parse(stripFences(raw));
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
      feedback: String(parsed.feedback ?? "")
    };
  } catch (error) {
    console.error("Quiz answer AI parse error:", error, raw);
    return { score: 0, feedback: "Unable to evaluate this answer." };
  }
}

// server/services/quiz.service.ts
var QuizService = class {
  /**
   * Candidate: Return the existing quiz for this candidate, or generate a
   * new one from their CV if none exists yet.
   */
  async getOrGenerateQuiz(userId) {
    const existingQuiz = await prisma_default.quiz.findUnique({
      where: { candidateId: userId },
      include: {
        questions: { orderBy: { order: "asc" } },
        attempt: { include: { answers: true } }
      }
    });
    if (existingQuiz) {
      return existingQuiz;
    }
    const candidate = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { resume: true } } }
    });
    if (!candidate?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    if (!candidate.candidateProfile.resume) {
      throw new AppError(
        "Please upload a CV before generating your quiz.",
        400
      );
    }
    const cvText = await cvExtraction_service_default.extractTextFromCV(
      candidate.candidateProfile.resume.url
    );
    if (!cvText || cvText.trim().length < 50) {
      throw new AppError(
        "Could not extract enough text from your CV to generate a quiz.",
        400
      );
    }
    const generated = await generateQuizQuestions(cvText);
    const quiz = await prisma_default.quiz.create({
      data: {
        candidateId: userId,
        status: QuizStatus.GENERATED,
        aiModel: "gemini-2.5-flash",
        questions: {
          create: generated.map((q, index) => ({
            order: index + 1,
            question: q.question,
            skill: q.skill,
            difficulty: q.difficulty
          }))
        }
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        attempt: { include: { answers: true } }
      }
    });
    return quiz;
  }
  /**
   * Candidate: Start (or resume) the quiz. Generates it on first call,
   * and flips status to IN_PROGRESS.
   */
  async startQuiz(userId) {
    const quiz = await this.getOrGenerateQuiz(userId);
    if (quiz.status === QuizStatus.GENERATED) {
      await prisma_default.quiz.update({
        where: { candidateId: userId },
        data: { status: QuizStatus.IN_PROGRESS }
      });
      quiz.status = QuizStatus.IN_PROGRESS;
    }
    return { quiz };
  }
  /**
   * Candidate: Get the quiz (generating it if needed).
   */
  async getQuiz(userId) {
    return this.getOrGenerateQuiz(userId);
  }
  /**
   * Candidate: Submit all answers, evaluate them, and calculate the score.
   */
  async submitQuiz(userId, answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new AppError("Answers are required.", 400);
    }
    const quiz = await prisma_default.quiz.findUnique({
      where: { candidateId: userId },
      include: { questions: true, attempt: true }
    });
    if (!quiz) {
      throw new AppError("Quiz not found. Start the quiz first.", 404);
    }
    if (quiz.status === QuizStatus.SUBMITTED || quiz.status === QuizStatus.REVIEWED) {
      throw new AppError("This quiz has already been submitted.", 400);
    }
    const questionIds = new Set(quiz.questions.map((q) => q.id));
    for (const a of answers) {
      if (!questionIds.has(a.questionId)) {
        throw new AppError("Invalid question in submission.", 400);
      }
    }
    if (answers.length !== quiz.questions.length) {
      throw new AppError(
        `All ${quiz.questions.length} questions must be answered.`,
        400
      );
    }
    const evaluated = await Promise.all(
      answers.map(async (a) => {
        const question = quiz.questions.find((q) => q.id === a.questionId);
        const result = await evaluateAnswer(question.question, a.answer);
        return { ...a, ...result };
      })
    );
    const aiScore = evaluated.reduce((sum, e) => sum + e.score, 0) / evaluated.length;
    const attempt = await prisma_default.$transaction(async (tx) => {
      if (quiz.attempt) {
        await tx.quizAnswer.deleteMany({
          where: { attemptId: quiz.attempt.id }
        });
        await tx.quizAttempt.delete({ where: { id: quiz.attempt.id } });
      }
      const created = await tx.quizAttempt.create({
        data: {
          quizId: quiz.id,
          candidateId: userId,
          aiScore,
          submittedAt: /* @__PURE__ */ new Date(),
          answers: {
            create: evaluated.map((e) => ({
              questionId: e.questionId,
              answer: e.answer,
              aiScore: e.score,
              aiFeedback: e.feedback
            }))
          }
        },
        include: { answers: true }
      });
      await tx.quiz.update({
        where: { id: quiz.id },
        data: { status: QuizStatus.SUBMITTED, submittedAt: /* @__PURE__ */ new Date() }
      });
      return created;
    });
    const candidateProfile = await prisma_default.candidateProfile.findUnique({
      where: { userId },
      include: { applications: { select: { id: true } } }
    });
    if (candidateProfile) {
      await prisma_default.application.updateMany({
        where: { candidateId: candidateProfile.id },
        data: { quizScore: aiScore }
      });
      await Promise.all(
        candidateProfile.applications.map(
          (app2) => candidateScore_service_default.createOrUpdateScore(app2.id).catch(() => null)
        )
      );
    }
    return { attempt, aiScore };
  }
  /**
   * Candidate: Get own attempt
   */
  async getMyAttempt(userId) {
    const attempt = await prisma_default.quizAttempt.findUnique({
      where: { quizId: (await this.requireQuiz(userId)).id },
      include: { answers: { include: { question: true } } }
    });
    return attempt;
  }
  /**
   * Candidate: Delete own attempt so they can be re-evaluated
   * (does not delete the quiz/questions themselves).
   */
  async deleteAttempt(userId) {
    const quiz = await prisma_default.quiz.findUnique({
      where: { candidateId: userId },
      include: { attempt: true }
    });
    if (!quiz?.attempt) {
      throw new AppError("No attempt to delete.", 404);
    }
    await prisma_default.$transaction([
      prisma_default.quizAnswer.deleteMany({ where: { attemptId: quiz.attempt.id } }),
      prisma_default.quizAttempt.delete({ where: { id: quiz.attempt.id } }),
      prisma_default.quiz.update({
        where: { id: quiz.id },
        data: { status: QuizStatus.GENERATED, submittedAt: null }
      })
    ]);
    return { success: true, message: "Attempt deleted successfully." };
  }
  /**
   * Recruiter/Admin: View a specific attempt by id.
   */
  async getAttemptById(attemptId, requesterUserId, role) {
    const attempt = await prisma_default.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: { include: { question: true } },
        candidate: { include: { candidateProfile: true } }
      }
    });
    if (!attempt) {
      throw new AppError("Attempt not found.", 404);
    }
    if (role !== "ADMIN") {
      const requester = await prisma_default.user.findUnique({
        where: { id: requesterUserId },
        include: { recruiterProfile: true }
      });
      if (!requester?.recruiterProfile) {
        throw new AppError("Recruiter profile not found.", 404);
      }
      const candidateProfileId = attempt.candidate.candidateProfile?.id;
      const hasApplication = candidateProfileId && await prisma_default.application.findFirst({
        where: {
          candidateId: candidateProfileId,
          recruiterId: requester.recruiterProfile.id
        },
        select: { id: true }
      });
      if (!hasApplication) {
        throw new AppError("Unauthorized.", 403);
      }
    }
    return attempt;
  }
  /**
   * Recruiter: List attempts belonging to candidates who applied to
   * this recruiter's jobs.
   */
  async getRecruiterAttempts(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const skip = (page - 1) * limit;
    const where = {
      candidate: {
        candidateProfile: {
          applications: {
            some: { recruiterId: recruiter.recruiterProfile.id }
          }
        }
      }
    };
    const [items, total] = await prisma_default.$transaction([
      prisma_default.quizAttempt.findMany({
        where,
        include: {
          answers: true,
          candidate: { include: { candidateProfile: true } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.quizAttempt.count({ where })
    ]);
    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  /**
   * Admin: List all attempts
   */
  async getAllAttempts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.quizAttempt.findMany({
        include: { answers: true, candidate: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.quizAttempt.count()
    ]);
    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const baseWhere = {
      candidate: {
        candidateProfile: {
          applications: {
            some: { recruiterId: recruiter.recruiterProfile.id }
          }
        }
      }
    };
    const [total, submitted] = await prisma_default.$transaction([
      prisma_default.quizAttempt.count({ where: baseWhere }),
      prisma_default.quizAttempt.count({
        where: { ...baseWhere, submittedAt: { not: null } }
      })
    ]);
    return { total, submitted };
  }
  async getAdminStatistics() {
    const [total, submitted] = await prisma_default.$transaction([
      prisma_default.quizAttempt.count(),
      prisma_default.quizAttempt.count({ where: { submittedAt: { not: null } } })
    ]);
    return { total, submitted };
  }
  async requireQuiz(userId) {
    const quiz = await prisma_default.quiz.findUnique({ where: { candidateId: userId } });
    if (!quiz) {
      throw new AppError("Quiz not found.", 404);
    }
    return quiz;
  }
};
var quiz_service_default = new QuizService();

// server/controllers/quiz.controller.ts
var startQuiz = async (req, res, next) => {
  try {
    const result = await quiz_service_default.startQuiz(req.user.id);
    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (err) {
    next(err);
  }
};
var getQuiz = async (req, res, next) => {
  try {
    const quiz = await quiz_service_default.getQuiz(req.user.id);
    res.status(200).json({
      status: "success",
      data: { quiz }
    });
  } catch (err) {
    next(err);
  }
};
var submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const result = await quiz_service_default.submitQuiz(req.user.id, answers);
    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (err) {
    next(err);
  }
};
var getMyAttempt = async (req, res, next) => {
  try {
    const attempt = await quiz_service_default.getMyAttempt(req.user.id);
    res.status(200).json({
      status: "success",
      data: { attempt }
    });
  } catch (err) {
    next(err);
  }
};
var getAttemptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attempt = await quiz_service_default.getAttemptById(
      id,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: { attempt }
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterAttempts = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await quiz_service_default.getRecruiterAttempts(
      req.user.id,
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getAllAttempts = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await quiz_service_default.getAllAttempts(page, limit);
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics3 = async (req, res, next) => {
  try {
    const statistics = await quiz_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: { statistics }
    });
  } catch (err) {
    next(err);
  }
};
var getAdminStatistics2 = async (req, res, next) => {
  try {
    const statistics = await quiz_service_default.getAdminStatistics();
    res.status(200).json({
      status: "success",
      data: { statistics }
    });
  } catch (err) {
    next(err);
  }
};
var deleteAttempt = async (req, res, next) => {
  try {
    const result = await quiz_service_default.deleteAttempt(req.user.id);
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/quiz.routes.ts
var router9 = express2.Router();
router9.use(protect);
router9.post("/start", restrictTo("CANDIDATE"), startQuiz);
router9.get("/", restrictTo("CANDIDATE"), getQuiz);
router9.post("/submit", restrictTo("CANDIDATE"), submitQuiz);
router9.get("/attempt", restrictTo("CANDIDATE"), getMyAttempt);
router9.delete("/attempt", restrictTo("CANDIDATE"), deleteAttempt);
router9.get(
  "/recruiter",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterAttempts
);
router9.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterStatistics3
);
router9.get(
  "/attempt/:id",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getAttemptById
);
router9.get("/all", restrictTo("ADMIN"), getAllAttempts);
router9.get("/admin/statistics", restrictTo("ADMIN"), getAdminStatistics2);
var quiz_routes_default = router9;

// server/routes/aiAnalysis.routes.ts
import { Router as Router8 } from "express";

// server/controllers/aiAnalysis.controller.ts
var AIAnalysisController = class {
  // ============================================================
  // Analyze Application
  // ============================================================
  async analyzeApplication(req, res, next) {
    try {
      const { applicationId } = req.params;
      const analysis = await aiAnalysis_service_default.analyzeApplication(
        applicationId
      );
      res.status(200).json({
        success: true,
        message: "AI analysis completed successfully.",
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Get One Analysis
  // ============================================================
  async getAnalysis(req, res, next) {
    try {
      const { applicationId } = req.params;
      const analysis = await aiAnalysis_service_default.getAnalysis(
        applicationId
      );
      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterAnalyses(req, res, next) {
    try {
      const recruiterUserId = req.user.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await aiAnalysis_service_default.getRecruiterAnalyses(
        recruiterUserId,
        page,
        limit
      );
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getStatistics(req, res, next) {
    try {
      const recruiterUserId = req.user.id;
      const stats = await aiAnalysis_service_default.getStatistics(
        recruiterUserId
      );
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Recalculate Analysis
  // ============================================================
  async recalculate(req, res, next) {
    try {
      const { applicationId } = req.params;
      const analysis = await aiAnalysis_service_default.recalculate(
        applicationId
      );
      res.status(200).json({
        success: true,
        message: "AI analysis recalculated successfully.",
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Delete Analysis
  // ============================================================
  async deleteAnalysis(req, res, next) {
    try {
      const { applicationId } = req.params;
      const result = await aiAnalysis_service_default.deleteAnalysis(
        applicationId
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
var aiAnalysis_controller_default = new AIAnalysisController();

// server/routes/aiAnalysis.routes.ts
var router10 = Router8();
router10.use(protect);
router10.get(
  "/:applicationId",
  restrictTo("CANDIDATE", "RECRUITER", "ADMIN"),
  aiAnalysis_controller_default.getAnalysis
);
router10.post(
  "/:applicationId/analyze",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.analyzeApplication
);
router10.post(
  "/:applicationId/recalculate",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.recalculate
);
router10.get(
  "/recruiter/all",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.getRecruiterAnalyses
);
router10.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.getStatistics
);
router10.delete(
  "/:applicationId",
  restrictTo("ADMIN"),
  aiAnalysis_controller_default.deleteAnalysis
);
var aiAnalysis_routes_default = router10;

// server/routes/candidateProfile.routes.ts
import express3 from "express";

// server/controllers/candidateProfile.controller.ts
init_prisma();
var uploadCV = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return next(new AppError("Please upload a CV file.", 400));
    }
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    const previousResumeId = user.candidateProfile.resumeId;
    const fileAsset = await prisma_default.fileAsset.create({
      data: {
        url: file.path || "",
        provider: "cloudinary",
        publicId: file.filename,
        mimeType: file.mimetype,
        extension: file.originalname?.split(".").pop(),
        size: file.size
      }
    });
    const updatedProfile = await prisma_default.candidateProfile.update({
      where: { id: user.candidateProfile.id },
      data: { resumeId: fileAsset.id },
      include: { resume: true }
    });
    if (previousResumeId && previousResumeId !== fileAsset.id) {
      await prisma_default.fileAsset.delete({ where: { id: previousResumeId } }).catch(() => null);
    }
    res.status(200).json({
      status: "success",
      data: { candidateProfile: updatedProfile }
    });
  } catch (err) {
    next(err);
  }
};
var updateMyProfile = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    const {
      firstName,
      lastName,
      phone,
      headline,
      bio,
      city,
      wilaya,
      country,
      currentJobTitle,
      yearsExperience,
      desiredSalary,
      availableImmediately,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl
    } = req.body;
    const userData = {};
    if (firstName !== void 0) userData.firstName = firstName;
    if (lastName !== void 0) userData.lastName = lastName;
    const profileFieldData = {};
    if (phone !== void 0) profileFieldData.phone = phone;
    if (headline !== void 0) profileFieldData.headline = headline;
    if (bio !== void 0) profileFieldData.bio = bio;
    if (city !== void 0) profileFieldData.city = city;
    if (wilaya !== void 0) profileFieldData.wilaya = wilaya;
    if (country !== void 0) profileFieldData.country = country;
    if (currentJobTitle !== void 0) profileFieldData.currentJobTitle = currentJobTitle;
    if (yearsExperience !== void 0) profileFieldData.yearsExperience = yearsExperience;
    if (desiredSalary !== void 0) profileFieldData.desiredSalary = desiredSalary;
    if (availableImmediately !== void 0) profileFieldData.availableImmediately = availableImmediately;
    if (skills !== void 0) profileFieldData.skills = skills;
    if (linkedinUrl !== void 0) profileFieldData.linkedinUrl = linkedinUrl;
    if (githubUrl !== void 0) profileFieldData.githubUrl = githubUrl;
    if (portfolioUrl !== void 0) profileFieldData.portfolioUrl = portfolioUrl;
    const [updatedUser, updatedProfile] = await prisma_default.$transaction([
      prisma_default.user.update({
        where: { id: user.id },
        data: userData
      }),
      prisma_default.candidateProfile.update({
        where: { id: user.candidateProfile.id },
        data: profileFieldData,
        include: { resume: true }
      })
    ]);
    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        },
        candidateProfile: updatedProfile
      }
    });
  } catch (err) {
    next(err);
  }
};
var getMyCV = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { candidateProfile: { include: { resume: true } } }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    res.status(200).json({
      status: "success",
      data: { resume: user.candidateProfile.resume }
    });
  } catch (err) {
    next(err);
  }
};
var getMyCvBuilder = async (req, res, next) => {
  try {
    const profile = await prisma_default.candidateProfile.findUnique({
      where: { userId: req.user.id },
      select: { cvBuilderData: true, updatedAt: true }
    });
    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        cvBuilderData: profile.cvBuilderData ?? null,
        updatedAt: profile.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};
var saveMyCvBuilder = async (req, res, next) => {
  try {
    const { cvBuilderData } = req.body;
    if (cvBuilderData === void 0 || cvBuilderData === null) {
      return next(new AppError("cvBuilderData is required.", 400));
    }
    if (typeof cvBuilderData !== "object" || Array.isArray(cvBuilderData)) {
      return next(new AppError("cvBuilderData must be an object.", 400));
    }
    const profile = await prisma_default.candidateProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });
    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    const updated = await prisma_default.candidateProfile.update({
      where: { id: profile.id },
      data: { cvBuilderData },
      select: { cvBuilderData: true, updatedAt: true }
    });
    res.status(200).json({
      status: "success",
      data: { cvBuilderData: updated.cvBuilderData, updatedAt: updated.updatedAt }
    });
  } catch (err) {
    next(err);
  }
};
var getCandidateCvDocument = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const profile = await prisma_default.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true } }
      }
    });
    if (!profile) {
      return next(new AppError("Candidate not found.", 404));
    }
    if (req.user.role !== "ADMIN") {
      const recruiter = await prisma_default.recruiterProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true }
      });
      if (!recruiter) {
        return next(new AppError("Recruiter profile not found.", 403));
      }
      const hasApplied = await prisma_default.application.findFirst({
        where: { candidateId: profile.id, job: { recruiterId: recruiter.id } },
        select: { id: true }
      });
      if (!hasApplied) {
        return next(
          new AppError("You can only view candidates who applied to your jobs.", 403)
        );
      }
    }
    const built = profile.cvBuilderData ?? null;
    const fullName = [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ").trim();
    const document = {
      name: built?.name || fullName || profile.user.email,
      title: built?.title || profile.currentJobTitle || profile.headline || "",
      email: built?.email || profile.user.email || "",
      phone: built?.phone || profile.phone || "",
      address: built?.address || [profile.city, profile.wilaya, profile.country].filter(Boolean).join(", "),
      summary: built?.summary || profile.bio || "",
      experiences: Array.isArray(built?.experiences) ? built.experiences : [],
      education: Array.isArray(built?.education) ? built.education : [],
      skills: Array.isArray(built?.skills) ? built.skills : profile.skills ?? [],
      languages: Array.isArray(built?.languages) ? built.languages : []
    };
    res.status(200).json({
      status: "success",
      data: {
        document,
        photoUrl: profile.user.avatar?.url ?? null,
        // Lets the UI say "this candidate has not built a CV yet" instead of
        // silently showing a sparse document.
        hasBuiltCv: Boolean(built)
      }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/candidateProfile.routes.ts
var router11 = express3.Router();
router11.use(protect);
router11.get(
  "/:candidateId/cv-document",
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateCvDocument
);
router11.use(restrictTo("CANDIDATE"));
router11.patch("/me", updateMyProfile);
router11.post("/me/cv", upload.single("cv"), uploadCV);
router11.get("/me/cv", getMyCV);
router11.get("/me/cv-builder", getMyCvBuilder);
router11.put("/me/cv-builder", saveMyCvBuilder);
var candidateProfile_routes_default = router11;

// server/routes/candidateScore.routes.ts
import { Router as Router9 } from "express";

// server/controllers/candidateScore.controller.ts
var getMyScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.getMyScore(
      req.params.applicationId,
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var updateInterviewScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.updateInterviewScore(
      req.params.applicationId,
      req.user.id,
      Number(req.body.interviewScore)
    );
    res.status(200).json({
      status: "success",
      message: "Interview score updated successfully.",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var updateRecruiterScore2 = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.updateRecruiterScore(
      req.params.applicationId,
      req.user.id,
      Number(req.body.recruiterScore)
    );
    res.status(200).json({
      status: "success",
      message: "Recruiter score updated successfully.",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var getCandidateScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.getCandidateScore(
      req.params.applicationId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterScores = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const scores = await candidateScore_service_default.getRecruiterScores(
      req.user.id,
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...scores
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics4 = async (req, res, next) => {
  try {
    const statistics = await candidateScore_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var getAllScores = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const scores = await candidateScore_service_default.getAllScores(
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...scores
    });
  } catch (err) {
    next(err);
  }
};
var getAdminStatistics3 = async (req, res, next) => {
  try {
    const statistics = await candidateScore_service_default.getAdminStatistics();
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var recalculateScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.recalculate(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      message: "Score recalculated successfully.",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var deleteScore = async (req, res, next) => {
  try {
    const result = await candidateScore_service_default.deleteScore(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/candidateScore.routes.ts
var router12 = Router9();
router12.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  getMyScore
);
router12.get(
  "/application/:applicationId/details",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateScore
);
router12.patch(
  "/application/:applicationId/interview-score",
  protect,
  restrictTo("RECRUITER"),
  updateInterviewScore
);
router12.patch(
  "/application/:applicationId/recruiter-score",
  protect,
  restrictTo("RECRUITER"),
  updateRecruiterScore2
);
router12.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER"),
  getRecruiterScores
);
router12.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER"),
  getRecruiterStatistics4
);
router12.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  getAllScores
);
router12.get(
  "/statistics",
  protect,
  restrictTo("ADMIN"),
  getAdminStatistics3
);
router12.patch(
  "/application/:applicationId/recalculate",
  protect,
  restrictTo("ADMIN"),
  recalculateScore
);
router12.delete(
  "/application/:applicationId",
  protect,
  restrictTo("ADMIN"),
  deleteScore
);
var candidateScore_routes_default = router12;

// server/routes/notification.routes.ts
import { Router as Router10 } from "express";

// server/controllers/notification.controller.ts
init_prisma();
var getMyNotifications = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));
    const notifications = await prisma_default.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.status(200).json({ status: "success", data: notifications });
  } catch (err) {
    next(err);
  }
};
var markNotificationRead = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));
    const { id } = req.params;
    const notification = await prisma_default.notification.findFirst({
      where: { id, userId: req.user.id }
    });
    if (!notification) return next(new AppError("Notification not found", 404));
    const updated = await prisma_default.notification.update({
      where: { id },
      data: { read: true }
    });
    res.status(200).json({ status: "success", data: updated });
  } catch (err) {
    next(err);
  }
};
var markAllNotificationsRead = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));
    await prisma_default.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });
    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
};

// server/routes/notification.routes.ts
var router13 = Router10();
router13.use(protect);
router13.get("/", getMyNotifications);
router13.patch("/read-all", markAllNotificationsRead);
router13.patch("/:id/read", markNotificationRead);
var notification_routes_default = router13;

// server/app.ts
dotenv3.config();
if (!process.env.JWT_SECRET) {
  console.warn(
    "\u26A0\uFE0F  JWT_SECRET is not set. Falling back to an insecure default \u2014 set JWT_SECRET in your environment before deploying to production."
  );
}
function createApp() {
  const app2 = express4();
  if (process.env.NODE_ENV === "production") {
    app2.use(helmet());
  } else {
    app2.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: [
              "'self'",
              "ws:",
              "http://localhost:*",
              "ws://localhost:*",
              "https://*.googleapis.com",
              "https://apis.google.com",
              "https://*.firebaseio.com",
              "wss://*.firebaseio.com",
              "https://*.cloudfunctions.net",
              "https://*.supabase.co",
              "https://res.cloudinary.com"
            ],
            frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"]
          }
        }
      })
    );
  }
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim());
  app2.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );
  app2.use(express4.json());
  app2.use(cookieParser());
  app2.use(passport_default.initialize());
  if (!configureGoogleStrategy()) {
    console.warn(
      "\u26A0\uFE0F  Google sign-in is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL). Email+password login is unaffected."
    );
  }
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many attempts. Please try again later."
    }
  });
  app2.use("/api/auth/login", authLimiter);
  app2.use("/api/auth/register", authLimiter);
  app2.use("/api/auth", auth_routes_default);
  app2.use("/api/jobs", job_routes_default);
  app2.use("/api/categories", category_routes_default);
  app2.use("/api/applications", application_routes_default);
  app2.use("/api/contact", contact_routes_default);
  app2.use("/api/admin", admin_routes_default);
  app2.use("/api/preselection", preselection_routes_default);
  app2.use("/api/oral-presentations", oralPresentation_routes_default);
  app2.use("/api/quiz", quiz_routes_default);
  app2.use("/api/ai-analysis", aiAnalysis_routes_default);
  app2.use("/api/candidates", candidateProfile_routes_default);
  app2.use("/api/candidate-scores", candidateScore_routes_default);
  app2.use("/api/notifications", notification_routes_default);
  app2.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.use(errorHandler);
  return app2;
}

// server/vercel-entry.ts
var app = createApp();
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
