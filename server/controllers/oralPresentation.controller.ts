import { Request, Response, NextFunction } from "express";
import oralPresentationService from "../services/oralPresentation.service";
import { cloudinary } from "../utils/cloudinary";

/**
 * Candidate: Generate a short-lived signature so the browser can upload
 * the video FILE directly to Cloudinary, bypassing our own server
 * entirely for the (potentially large) video bytes. This is required
 * because our API runs as a Vercel serverless function, which enforces
 * a hard ~4.5MB request body limit — most presentation videos exceed
 * that, so routing the file through our server would fail outright.
 */
export const getUploadSignature = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "job-portal-presentations";

    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET as string
    );

    res.status(200).json({
      status: "success",
      data: {
        timestamp,
        folder,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const uploadPresentation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const presentation = await oralPresentationService.uploadPresentation(
      req.user!.id,
      req.body
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
