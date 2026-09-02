import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

interface UploadedFile {
  path?: string;
  filename?: string;
  mimetype?: string;
  size?: number;
  originalname?: string;
}

/**
 * Candidate: Upload or replace the CV on their profile.
 * This is the single CV used across job applications, AI analysis,
 * and quiz generation.
 */
export const uploadCV = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file as UploadedFile | undefined;

    if (!file) {
      return next(new AppError("Please upload a CV file.", 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { candidateProfile: true },
    });

    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    const previousResumeId = user.candidateProfile.resumeId;

    const fileAsset = await prisma.fileAsset.create({
      data: {
        url: file.path || "",
        provider: "cloudinary",
        publicId: file.filename,
        mimeType: file.mimetype,
        extension: file.originalname?.split(".").pop(),
        size: file.size,
      },
    });

    const updatedProfile = await prisma.candidateProfile.update({
      where: { id: user.candidateProfile.id },
      data: { resumeId: fileAsset.id },
      include: { resume: true },
    });

    // Clean up the old CV file now that the new one is attached
    if (previousResumeId && previousResumeId !== fileAsset.id) {
      await prisma.fileAsset
        .delete({ where: { id: previousResumeId } })
        .catch(() => null);
    }

    res.status(200).json({
      status: "success",
      data: { candidateProfile: updatedProfile },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Update own profile (basic info on User + candidate-specific
 * fields on CandidateProfile). Called when the candidate saves changes
 * from their profile page.
 */
export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { candidateProfile: true },
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
      portfolioUrl,
    } = req.body;

    // Fields that live on the User row
    const userData: Record<string, unknown> = {};
    if (firstName !== undefined) userData.firstName = firstName;
    if (lastName !== undefined) userData.lastName = lastName;

    // Fields that live on the CandidateProfile row
    const profileFieldData: Record<string, unknown> = {};
    if (phone !== undefined) profileFieldData.phone = phone;
    if (headline !== undefined) profileFieldData.headline = headline;
    if (bio !== undefined) profileFieldData.bio = bio;
    if (city !== undefined) profileFieldData.city = city;
    if (wilaya !== undefined) profileFieldData.wilaya = wilaya;
    if (country !== undefined) profileFieldData.country = country;
    if (currentJobTitle !== undefined) profileFieldData.currentJobTitle = currentJobTitle;
    if (yearsExperience !== undefined) profileFieldData.yearsExperience = yearsExperience;
    if (desiredSalary !== undefined) profileFieldData.desiredSalary = desiredSalary;
    if (availableImmediately !== undefined) profileFieldData.availableImmediately = availableImmediately;
    if (skills !== undefined) profileFieldData.skills = skills;
    if (linkedinUrl !== undefined) profileFieldData.linkedinUrl = linkedinUrl;
    if (githubUrl !== undefined) profileFieldData.githubUrl = githubUrl;
    if (portfolioUrl !== undefined) profileFieldData.portfolioUrl = portfolioUrl;

    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: userData,
      }),
      prisma.candidateProfile.update({
        where: { id: user.candidateProfile.id },
        data: profileFieldData,
        include: { resume: true },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
        },
        candidateProfile: updatedProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Get own CV info.
 */
export const getMyCV = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { candidateProfile: { include: { resume: true } } },
    });

    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    res.status(200).json({
      status: "success",
      data: { resume: user.candidateProfile.resume },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Get their saved CV Maker document.
 *
 * Returns `null` (not 404) when nothing has been saved yet, so the frontend
 * can simply fall back to its default/empty CV without special-casing errors.
 */
export const getMyCvBuilder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user!.id },
      select: { cvBuilderData: true, updatedAt: true },
    });

    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        cvBuilderData: profile.cvBuilderData ?? null,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Save (create or replace) their CV Maker document.
 *
 * The whole document is replaced on every save — the CV Maker edits it as a
 * single unit, so there is no partial-update semantics to preserve.
 */
export const saveMyCvBuilder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cvBuilderData } = req.body;

    if (cvBuilderData === undefined || cvBuilderData === null) {
      return next(new AppError("cvBuilderData is required.", 400));
    }

    // Guard against a client sending a primitive/array: the CV Maker always
    // stores an object, and a wrong shape here would break loading later.
    if (typeof cvBuilderData !== "object" || Array.isArray(cvBuilderData)) {
      return next(new AppError("cvBuilderData must be an object.", 400));
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });

    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    const updated = await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { cvBuilderData },
      select: { cvBuilderData: true, updatedAt: true },
    });

    res.status(200).json({
      status: "success",
      data: { cvBuilderData: updated.cvBuilderData, updatedAt: updated.updatedAt },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Recruiter/Admin: the CV document for one candidate, in the same normalised
 * shape the candidate's own CV Maker uses — so both render through one
 * component and one design.
 *
 * Access is enforced here, not in the UI. A recruiter may only read a
 * candidate who has applied to one of *their* jobs; admins may read anyone.
 * Without this check any authenticated recruiter could enumerate every
 * candidate profile on the platform by id.
 */
export const getCandidateCvDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { candidateId } = req.params;

    const profile = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true } },
      },
    });

    if (!profile) {
      return next(new AppError("Candidate not found.", 404));
    }

    if (req.user!.role !== "ADMIN") {
      const recruiter = await prisma.recruiterProfile.findUnique({
        where: { userId: req.user!.id },
        select: { id: true },
      });

      if (!recruiter) {
        return next(new AppError("Recruiter profile not found.", 403));
      }

      const hasApplied = await prisma.application.findFirst({
        where: { candidateId: profile.id, job: { recruiterId: recruiter.id } },
        select: { id: true },
      });

      if (!hasApplied) {
        return next(
          new AppError("You can only view candidates who applied to your jobs.", 403)
        );
      }
    }

    // The CV Maker document is the richest source. Where the candidate has
    // not built one, fall back to the structured profile fields so the
    // recruiter still sees something real rather than an empty template.
    const built = (profile.cvBuilderData as Record<string, any> | null) ?? null;
    const fullName =
      [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ").trim();

    const document = {
      name: built?.name || fullName || profile.user.email,
      title: built?.title || profile.currentJobTitle || profile.headline || "",
      email: built?.email || profile.user.email || "",
      phone: built?.phone || profile.phone || "",
      address:
        built?.address ||
        [profile.city, profile.wilaya, profile.country].filter(Boolean).join(", "),
      summary: built?.summary || profile.bio || "",
      experiences: Array.isArray(built?.experiences) ? built.experiences : [],
      education: Array.isArray(built?.education) ? built.education : [],
      skills: Array.isArray(built?.skills) ? built.skills : profile.skills ?? [],
      languages: Array.isArray(built?.languages) ? built.languages : [],
    };

    res.status(200).json({
      status: "success",
      data: {
        document,
        photoUrl: profile.user.avatar?.url ?? null,
        // Lets the UI say "this candidate has not built a CV yet" instead of
        // silently showing a sparse document.
        hasBuiltCv: Boolean(built),
      },
    });
  } catch (err) {
    next(err);
  }
};
