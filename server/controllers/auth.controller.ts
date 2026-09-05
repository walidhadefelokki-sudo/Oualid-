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

    // Send Welcome Email. `user.role` is the persisted role, not the value
    // from the request body, so the email always names the account that was
    // actually created.
    const name = firstName ? `${firstName} ${lastName || ''}`.trim() : email;
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
export const updateMyAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file as
      | { path?: string; filename?: string; mimetype?: string; size?: number }
      | undefined;

    if (!file?.path) {
      return next(new AppError("Please upload an image.", 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return next(new AppError("User not found.", 404));
    }

    const avatarAsset = await prisma.fileAsset.create({
      data: {
        url: file.path,
        provider: "cloudinary",
        publicId: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    const previousAvatarId = user.avatarId;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatarId: avatarAsset.id },
      include: { avatar: true },
    });

    if (previousAvatarId && previousAvatarId !== avatarAsset.id) {
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