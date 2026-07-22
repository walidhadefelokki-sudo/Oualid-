import { Request, Response, NextFunction } from "express";
import oralPresentationService from "../services/oralPresentation.service";
import { AppError } from "../middleware/error.middleware";

export const uploadPresentation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;

    const presentation =
      await oralPresentationService.uploadPresentation(
        applicationId,
        req.user!.id,
        req.file as any
      );

    res.status(201).json({
      status: "success",
      data: {
        presentation,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getPresentationByApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;

    const presentation =
      await oralPresentationService.getPresentationByApplication(
        applicationId,
        req.user!.id
      );

    res.status(200).json({
      status: "success",
      data: {
        presentation,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getPresentationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const presentation =
      await oralPresentationService.getPresentationById(
        id,
        req.user!.id,
        req.user!.role
      );

    res.status(200).json({
      status: "success",
      data: {
        presentation,
      },
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
    const { id } = req.params;
    const { recruiterScore } = req.body;

    const presentation =
      await oralPresentationService.updateRecruiterScore(
        id,
        req.user!.id,
        Number(recruiterScore)
      );

    res.status(200).json({
      status: "success",
      data: {
        presentation,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { transcript } = req.body;

    const presentation =
      await oralPresentationService.updateTranscript(
        id,
        transcript
      );

    res.status(200).json({
      status: "success",
      data: {
        presentation,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAIScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { aiScore } = req.body;

    const presentation =
      await oralPresentationService.updateAIScore(
        id,
        Number(aiScore)
      );

    res.status(200).json({
      status: "success",
      data: {
        presentation,
      },
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
    const { applicationId } = req.params;

    const result =
      await oralPresentationService.deletePresentation(
        applicationId,
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

    const data =
      await oralPresentationService.getRecruiterPresentations(
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

    const data =
      await oralPresentationService.getAllPresentations(
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
    const statistics =
      await oralPresentationService.getRecruiterStatistics(
        req.user!.id
      );

    res.status(200).json({
      status: "success",
      data: {
        statistics,
      },
    });
  } catch (err) {
    next(err);
  }
};