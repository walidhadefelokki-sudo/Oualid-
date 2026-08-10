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
