import { Request, Response, NextFunction } from "express";
import oralPresentationService from "../services/oralPresentation.service";

export const uploadPresentation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const presentation = await oralPresentationService.uploadPresentation(
      req.user!.id,
      req.file as any
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
