import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import oralPresentationService from "../services/oralPresentation.service";
import {
  resolveVideoExtension,
  videoMimeType,
  hasVideoSignature,
  assertVideoSize,
} from "../middleware/mediaUpload.middleware";
import {
  PRESENTATION_BUCKET,
  OBJECT_NAME_PATTERN,
  buildObjectPath,
  createUploadTicket,
  downloadObjectHead,
  getObjectSize,
  removeObject,
} from "../utils/supabaseStorage";

/** The candidate profile of the authenticated user, or a 404. */
const requireOwnCandidateProfile = async (req: Request) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { candidateProfile: true },
  });

  if (!user?.candidateProfile) {
    throw new AppError("Candidate profile not found.", 404);
  }

  return user.candidateProfile;
};

/**
 * The path comes back from the browser at confirm time, so it is untrusted
 * input. Matching it against the exact shape this server hands out is what
 * stops a candidate confirming a path inside someone else's folder, or walking
 * out of the bucket with "..".
 */
const assertOwnObjectPath = (path: unknown, profileId: string): string => {
  if (typeof path !== "string" || !path) {
    throw new AppError("Missing upload reference.", 400);
  }

  const segments = path.split("/");
  if (segments.length !== 2) {
    throw new AppError("Invalid upload reference.", 400);
  }

  const [folder, object] = segments;
  if (folder !== profileId || !OBJECT_NAME_PATTERN.test(object)) {
    throw new AppError("Invalid upload reference.", 400);
  }

  return path;
};

/**
 * Candidate: start a direct-to-storage upload of a presentation video.
 *
 * Returns a one-time URL the browser PUTs the file to, bypassing this server
 * entirely for the video bytes — a Vercel function rejects a request body over
 * ~4.5 MB, and a presentation is allowed to be 100 MB. Nothing is recorded
 * yet: an issued ticket that is never confirmed leaves the profile untouched,
 * so an abandoned upload cannot displace an existing presentation.
 */
export const createPresentationUploadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName } = req.body as { fileName?: string };

    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Please choose a video to upload.", 400));
    }

    // Rejects a name that is not a video before a place to upload to exists.
    const extension = resolveVideoExtension(fileName);

    const profile = await requireOwnCandidateProfile(req);

    const ticket = await createUploadTicket({
      bucket: PRESENTATION_BUCKET,
      path: buildObjectPath(profile.id, extension),
    });

    res.status(200).json({
      status: "success",
      data: { path: ticket.path, signedUrl: ticket.signedUrl, token: ticket.token },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: confirm a direct upload and attach it to their presentation.
 *
 * The bytes arrived without passing through this server, so they are checked
 * here — that the object exists, sits in this candidate's own folder, is within
 * the size limit, and really is the video container it claims to be. Only the
 * head of the file is read: enough to identify the format without pulling 100 MB
 * into a serverless function. Anything that fails is deleted rather than left
 * in the bucket, and the candidate keeps the presentation they already had.
 */
export const confirmPresentationUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { path, fileName } = req.body as { path?: string; fileName?: string };

    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Missing file name.", 400));
    }

    const extension = resolveVideoExtension(fileName);
    const profile = await requireOwnCandidateProfile(req);
    const storedPath = assertOwnObjectPath(path, profile.id);

    let size: number;
    try {
      size = assertVideoSize(await getObjectSize(PRESENTATION_BUCKET, storedPath));

      const head = await downloadObjectHead(PRESENTATION_BUCKET, storedPath, 4096);
      if (!hasVideoSignature(head, extension)) {
        throw new AppError(
          `This file is not a valid ${extension.toUpperCase()} video. Please try again.`,
          400
        );
      }
    } catch (validationErr) {
      // Whatever was uploaded is not a usable presentation. Do not keep it.
      await removeObject(PRESENTATION_BUCKET, storedPath);
      throw validationErr;
    }

    const presentation = await oralPresentationService.savePresentation(
      req.user!.id,
      {
        path: storedPath,
        fileName,
        extension,
        mimeType: videoMimeType(extension),
        size,
      }
    );

    // Metadata only — never the file.
    console.log(
      `Presentation stored candidate=${profile.id} format=${extension} bytes=${size}`
    );

    res.status(201).json({
      status: "success",
      data: { presentation },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyPresentation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const presentation = await oralPresentationService.getMyPresentation(
      req.user!.id
    );

    res.status(200).json({
      status: "success",
      data: { presentation },
    });
  } catch (err) {
    next(err);
  }
};

export const getPresentationByCandidateId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { candidateId } = req.params;

    const presentation =
      await oralPresentationService.getPresentationByCandidateId(
        candidateId,
        req.user!.id,
        req.user!.role
      );

    res.status(200).json({
      status: "success",
      data: { presentation },
    });
  } catch (err) {
    next(err);
  }
};

export const updateRecruiterScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { candidateId } = req.params;
    const { recruiterScore } = req.body;

    const presentation = await oralPresentationService.updateRecruiterScore(
      candidateId,
      req.user!.id,
      Number(recruiterScore)
    );

    res.status(200).json({
      status: "success",
      data: { presentation },
    });
  } catch (err) {
    next(err);
  }
};

export const deletePresentation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await oralPresentationService.deletePresentation(
      req.user!.id
    );

    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const getRecruiterPresentations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const data = await oralPresentationService.getRecruiterPresentations(
      req.user!.id,
      page,
      limit
    );

    res.status(200).json({
      status: "success",
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

export const getAllPresentations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const data = await oralPresentationService.getAllPresentations(
      page,
      limit
    );

    res.status(200).json({
      status: "success",
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

export const getRecruiterStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statistics = await oralPresentationService.getRecruiterStatistics(
      req.user!.id
    );

    res.status(200).json({
      status: "success",
      data: { statistics },
    });
  } catch (err) {
    next(err);
  }
};
