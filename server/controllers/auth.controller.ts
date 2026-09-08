import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { sendWelcomeEmail } from "../utils/email";
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
    const { email, password, role, firstName, lastName, companyName, plan } = req.body;

    // Covers the "signed up with Google first, now registering" case: the
    // unique email constraint already prevents a duplicate User, but the
    // message should point at the way in rather than look like a dead end.
    const existingUser = await prisma.user.findUnique({ where: { email } });
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
        candidateProfile: role === "CANDIDATE" ? { create: {} } : undefined,
        recruiterProfile: role === "RECRUITER" ? { create: {} } : undefined,
      },
      include: {
        candidateProfile: true,
        recruiterProfile: true,
      }
    });

    if (role === "RECRUITER" && user.recruiterProfile) {
      await createCompanyForRecruiter(user.recruiterProfile.id, companyName || "My Company");
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
        ? companyName || "My Company"
        : `${firstName ?? ""} ${lastName ?? ""}`.trim() || email;

    // Deliberately not awaited: a slow or failing mail server must not hold up
    // or fail account creation, which has already been committed.
    sendWelcomeEmail(email, greeting, user.role).catch((err) =>
      console.error("Welcome email failed:", err)
    );

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
          lastName: user.lastName,
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

    const user = await prisma.user.findUnique({ where: { email } });

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
          recruiterTier,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError("User not found", 404));

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
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

    res.status(200).json({
      status: "success",
      data: { user: { ...user, recruiterTier } },
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