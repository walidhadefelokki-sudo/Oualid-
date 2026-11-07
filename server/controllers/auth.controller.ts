import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { companyNameFrom } from "../utils/companyName";
import { AppError } from "../middleware/error.middleware";
import { sendWelcomeEmail, sendVerifyEmail, deliverEmail } from "../utils/email";
import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
  verificationUrl,
} from "../services/emailVerification.service";
import { readAdminAccess } from "../utils/adminAccess";
import { checkPassword } from "../utils/passwordPolicy";
import { getRecruiterPlan } from "../middleware/tier.middleware";
import { RecruiterPlan } from "@prisma/client";
import crypto from "crypto";
import { getJwtSecret } from "../utils/jwt";
import { destroyCloudinaryAsset } from "../utils/cloudinary";
import { validateAvatarUpload } from "../middleware/mediaUpload.middleware";
import {
  AVATAR_BUCKET,
  buildObjectPath,
  getPublicUrl,
  removeObject,
  uploadObject,
} from "../utils/supabaseStorage";

const signToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, getJwtSecret(), {
    expiresIn: "30d",
  });
};

// Maps the backend's RecruiterPlan enum to the lowercase strings the
// frontend's TIER_ACCESS / recruiterTier already expect.
const mapPlanToTier = (plan: RecruiterPlan): "free" | "paid" | "corporate" => {
  switch (plan) {
    case "PREMIUM":
      return "paid";
    case "CORPORATE":
      return "corporate";
    default:
      return "free";
  }
};

// Turns "Makers Label" into "makers-label-a1b2c3" - the trailing random
// suffix keeps the (unique) Company.slug collision-free without needing
// an extra DB round trip to check availability.
const slugify = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "company"}-${suffix}`;
};


// After creating a User with a RecruiterProfile, this creates the
// recruiter's Company and links them as its OWNER via CompanyMember.
const createCompanyForRecruiter = async (recruiterProfileId: string, companyName: string) => {
  await prisma.company.create({
    data: {
      name: companyName,
      slug: slugify(companyName),
      plan: "FREE",
      members: {
        create: {
          role: "OWNER",
          recruiter: { connect: { id: recruiterProfileId } },
        },
      },
    },
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, firstName, lastName, companyName, plan, source } = req.body;

    /* Which side of the platform this signup came from. The account is
     * shared either way — one login for jobs and freelance — but a
     * marketplace signup is not a job applicant, and the recruitment admin
     * should not count them as candidates who never applied.
     *
     * Read from a fixed set, never stored raw: this value ends up in admin
     * filters and reports. */
    const signupSource = source === "FREELANCE" ? "FREELANCE" : "JOBS";

    // Covers the "signed up with Google first, now registering" case: the
    // unique email constraint already prevents a duplicate User, but the
    // message should point at the way in rather than look like a dead end.
    /* Columns named explicitly.
     *
     * Without a `select`, Prisma asks for every column in the schema — so a
     * column added by a migration that has not run yet makes Postgres refuse
     * the whole statement. That is what took sign-in down across the site when
     * the limited-admin columns shipped ahead of their migration: this query
     * never reached the password check.
     *
     * Naming what is needed also keeps the bcrypt hash and anything else
     * irrelevant out of rows that get spread into responses. */
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });
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

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
        signupSource,
        candidateProfile: role === "CANDIDATE" ? { create: {} } : undefined,
        recruiterProfile: role === "RECRUITER" ? { create: {} } : undefined,
      },
      /* select, not include.
       *
       * `include` returns every scalar column alongside the relations, so a
       * column added by a migration that has not run yet refuses the insert —
       * which is how registration broke along with sign-in. */
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        candidateProfile: { select: { id: true } },
        recruiterProfile: { select: { id: true } },
      },
    });

    if (role === "RECRUITER" && user.recruiterProfile) {
      await createCompanyForRecruiter(user.recruiterProfile.id, companyNameFrom(companyName, email));
    }

    // Send the welcome email. `user.role` is the persisted role, not the
    // value from the request body, so the message always matches the account
    // that was actually created.
    //
    // Recruiters are greeted by company name because that is what the signup
    // form collects for them — it sends no firstName at all, so the previous
    // fallback addressed every company by its raw email address.
    const greeting =
      user.role === "RECRUITER"
        ? companyNameFrom(companyName, email)
        : `${firstName ?? ""} ${lastName ?? ""}`.trim() || email;

    /* Awaited, with a ceiling.
     *
     * This used to be fired off unawaited so a slow mail server could not hold
     * up account creation. Sound reasoning on a long-lived server, wrong on
     * Vercel: the function is frozen as soon as the response is written, and a
     * promise still in flight simply never finishes. That is why registration
     * confirmations stopped arriving while the awaited contact and support
     * mail kept working.
     *
     * deliverEmail bounds the wait and swallows failures, so a mail problem
     * still cannot fail a signup that is already committed. */
    /* The account is PENDING until this link is clicked — that is what the
     * status column means. Issued before the send so the email cannot go out
     * pointing at a token that was never written. */
    const verifyUrl = verificationUrl(await issueEmailVerificationToken(user.id));

    await deliverEmail("Welcome", () =>
      sendWelcomeEmail(email, greeting, user.role, verifyUrl)
    );

    const token = signToken(user.id, user.role);

    // Included so the session a new recruiter starts with matches what login
    // and /auth/me return. Without it the frontend saw an undefined tier until
    // the next page load, and had to guess.
    const recruiterTier =
      user.role === "RECRUITER"
        ? mapPlanToTier(await getRecruiterPlan(user.id))
        : undefined;

    res.status(201).json({
      status: "success",
      token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          // Sent so the client can show the "confirm your address" reminder
          // without a second round trip to /auth/me.
          emailVerified: user.emailVerified,
          recruiterTier,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // See the note on the registration query above: an implicit select is
    // what broke sign-in when a migration was pending.
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        status: true,
        deletedAt: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
      },
    });

    // A Google-only account has no local password. Say so plainly instead of
    // "incorrect password", which would send the user round in circles trying
    // credentials that were never set. This leaks nothing an attacker could
    // not learn by clicking "Continue with Google" themselves.
    if (user && user.password === null) {
      return next(
        new AppError(
          "This account uses Google sign-in. Please continue with Google.",
          401
        )
      );
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError("Incorrect email or password", 401));
    }

    /* Suspending or deleting an account did nothing before this: neither
     * sign-in nor `protect` looked at status, so the admin controls that set
     * it were decorative and a suspended user kept working normally.
     *
     * Checked after the password, so this cannot be used to enumerate which
     * addresses are registered. PENDING is deliberately allowed: it means the
     * address has not been confirmed yet, and the dashboard says so with a
     * banner offering a new link. Blocking sign-in on it instead would lock
     * out everyone who registered before confirmation existed, and would hide
     * the one page that can resend the email. */
    if (user.status === "SUSPENDED") {
      return next(
        new AppError("Ce compte est suspendu. Contactez le support.", 403)
      );
    }
    if (user.status === "DELETED" || user.deletedAt) {
      return next(new AppError("Ce compte n'existe plus.", 403));
    }

    const token = signToken(user.id, user.role);

    const recruiterTier =
      user.role === "RECRUITER"
        ? mapPlanToTier(await getRecruiterPlan(user.id))
        : undefined;

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
          // Sent so the client can show the "confirm your address" reminder
          // without a second round trip to /auth/me.
          emailVerified: user.emailVerified,
          recruiterTier,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirms an email address from the link in a welcome email.
 *
 * Public: the person clicking has usually not signed in yet, and the token is
 * the credential. It answers 200 for an already-confirmed address because a
 * second click — a mail client prefetching, a double tap — is not an error the
 * user can do anything about.
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) return next(new AppError("Lien de confirmation incomplet.", 400));

    const result = await consumeEmailVerificationToken(token);

    // Compared rather than negated: the project compiles without
    // strictNullChecks, where `!result.ok` does not narrow the union.
    if (result.ok === false) {
      return next(
        new AppError(
          result.reason === "expired"
            ? "Ce lien de confirmation a expiré. Connectez-vous pour en recevoir un nouveau."
            : "Ce lien de confirmation n'est pas valide.",
          400
        )
      );
    }

    res.status(200).json({
      status: "success",
      data: { email: result.email, alreadyVerified: result.alreadyVerified },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Sends the signed-in user a fresh confirmation link.
 *
 * Reports success when the address is already confirmed instead of an error:
 * the user asked to be confirmed and they are. Issuing a new token invalidates
 * the previous one, so the newest email is always the one that works.
 */
export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return next(new AppError("User not found", 404));

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, emailVerified: true },
    });
    if (!user) return next(new AppError("User not found", 404));

    if (user.emailVerified) {
      return res.status(200).json({
        status: "success",
        data: { sent: false, alreadyVerified: true },
      });
    }

    const verifyUrl = verificationUrl(await issueEmailVerificationToken(user.id));
    await deliverEmail("Verify", () =>
      sendVerifyEmail(user.email, user.firstName, verifyUrl)
    );

    res.status(200).json({ status: "success", data: { sent: true, alreadyVerified: false } });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError("User not found", 404));

    // Selected explicitly. `include` returns every User column, and this
    // response is spread straight into the JSON body — so /auth/me was handing
    // each user their own bcrypt hash on every page load. A password hash has
    // no reason to leave the server: it is exactly what an attacker needs for
    // an offline cracking attempt if a token or the page is ever compromised.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredLanguage: true,
        createdAt: true,
        candidateProfile: true,
        recruiterProfile: true,
        avatar: true,
      },
    });

    if (!user) return next(new AppError("User not found", 404));

    const recruiterTier =
      user.role === "RECRUITER"
        ? mapPlanToTier(await getRecruiterPlan(user.id))
        : undefined;

    /* The admin sidebar hides what the account cannot reach, so it has to
     * know. Read separately rather than selected above, because these two
     * columns arrive in a migration and this endpoint is on the path of every
     * signed-in user — selecting them here is what turned a pending migration
     * into nobody being able to hold a session.
     *
     * Enforcement is on the routes regardless; this only stops the UI
     * offering a screen that would answer 403. */
    const access =
      user.role === "ADMIN" ? await readAdminAccess(user.id) : null;

    res.status(200).json({
      status: "success",
      data: {
        user: {
          ...user,
          recruiterTier,
          ...(access
            ? {
                isSuperAdmin: access.isSuperAdmin,
                adminScopes: access.adminScopes,
              }
            : {}),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Any authenticated user: upload or replace their profile picture.
 */
/**
 * Any authenticated user: upload or replace their profile photo.
 *
 * Proxied through this server rather than uploaded directly, unlike CVs and
 * presentations: a photo is capped at 4 MB, comfortably under the ~4.5 MB a
 * Vercel function accepts as a request body, and handling the bytes here means
 * the file signature is checked before anything is stored rather than after.
 *
 * The avatars bucket is public. A profile photo is shown in every recruiter
 * list, so a permanent URL under an unguessable path keeps those lists one
 * query instead of a signing round trip per row — and it is what every
 * existing consumer of `avatarUrl` already expects.
 */
export const updateMyAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let storedPath: string | null = null;

  try {
    // Throws a 400 for the wrong format, an empty file, or bytes that do not
    // match the extension they claim.
    const image = validateAvatarUpload(req.file);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return next(new AppError("User not found.", 404));
    }

    const previousAvatarId = user.avatarId;

    // Storage first: the profile must never point at an object that was never
    // written.
    storedPath = await uploadObject({
      bucket: AVATAR_BUCKET,
      path: buildObjectPath(user.id, image.extension),
      buffer: image.buffer,
      mimeType: image.mimeType,
    });

    let updatedUser;
    try {
      updatedUser = await prisma.$transaction(async (tx) => {
        const asset = await tx.fileAsset.create({
          data: {
            url: getPublicUrl(AVATAR_BUCKET, storedPath!),
            provider: "supabase",
            publicId: storedPath!,
            fileName: image.fileName,
            mimeType: image.mimeType,
            extension: image.extension,
            size: image.size,
          },
        });

        return tx.user.update({
          where: { id: user.id },
          data: { avatarId: asset.id },
          include: { avatar: true },
        });
      });
    } catch (dbErr) {
      // Written but unreferenced. Remove it rather than leave a stray photo.
      await removeObject(AVATAR_BUCKET, storedPath);
      throw dbErr;
    }

    // Only now is the old photo safe to release.
    if (previousAvatarId && previousAvatarId !== updatedUser.avatarId) {
      const previous = await prisma.fileAsset.findUnique({
        where: { id: previousAvatarId },
      });

      // The stored file, not just the row — deleting only the row left the old
      // photo hosted forever, still reachable by anyone holding its URL.
      if (previous?.provider === "supabase" && previous.publicId) {
        await removeObject(AVATAR_BUCKET, previous.publicId);
      } else if (previous?.provider === "cloudinary") {
        await destroyCloudinaryAsset(previous.publicId, "image");
      }

      await prisma.fileAsset
        .delete({ where: { id: previousAvatarId } })
        .catch(() => null);
    }

    res.status(200).json({
      status: "success",
      data: {
        avatarUrl: updatedUser.avatar?.url,
      },
    });
  } catch (err) {
    next(err);
  }
};
/**
 * Changes the signed-in user's own password.
 *
 * The current password is required even though the session already proves who
 * this is: a borrowed or forgotten unlocked browser should not be enough to
 * lock the owner out of their own account.
 *
 * Open to any signed-in user, not only administrators — a candidate has the
 * same right to change their password, and putting the rule on the admin
 * routes would have meant writing it twice.
 */
export const changeMyPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      // Named explicitly; see the note on the login query.
      select: { id: true, email: true, password: true },
    });

    if (!user) return next(new AppError("Compte introuvable.", 404));

    /* A Google-only account has no local password to replace. Say so plainly
     * rather than letting them set one that the sign-in screen will never
     * ask for. */
    if (user.password === null) {
      return next(
        new AppError(
          "Ce compte se connecte avec Google et n'a pas de mot de passe.",
          400
        )
      );
    }

    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      return next(new AppError("Mot de passe actuel incorrect.", 401));
    }

    const verdict = checkPassword(newPassword);
    if (!verdict.ok) return next(new AppError(verdict.message!, 400));

    if (await bcrypt.compare(newPassword!, user.password)) {
      return next(
        new AppError("Le nouveau mot de passe est identique à l'ancien.", 400)
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword!, 12) },
      select: { id: true },
    });

    /* No new token is issued and the old one keeps working. The JWT carries
     * no password, so changing one cannot invalidate a session — saying
     * otherwise would be a promise this does not keep. Real revocation needs
     * a token version on the user, which is its own piece of work. */
    res.status(200).json({ status: "success", message: "Mot de passe modifié." });
  } catch (err) {
    next(err);
  }
};
