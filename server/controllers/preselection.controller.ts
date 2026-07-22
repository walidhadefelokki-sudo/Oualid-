import { Request, Response, NextFunction } from "express";
import { PreselectionStatus } from "@prisma/client";
import preselectionService from "../services/preselection.service";

// ============================================================
// Candidate
// ============================================================

export const getMyPreselection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const preselection =
      await preselectionService.getMyPreselection(
        req.params.applicationId,
        req.user.id
      );

    res.status(200).json({
      status: "success",
      data: preselection,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// Recruiter
// ============================================================

export const getPreselection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const preselection =
      await preselectionService.getPreselection(
        req.params.applicationId,
        req.user.id,
        req.user.role
      );

    res.status(200).json({
      status: "success",
      data: preselection,
    });
  } catch (err) {
    next(err);
  }
);

export const shortlistCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const preselection =
      await preselectionService.shortlistCandidate(
        req.params.applicationId,
        req.user.id,
        req.body.comment
      );

    res.status(200).json({
      status: "success",
      message: "Candidate shortlisted successfully.",
      data: preselection,
    });
  } catch (err) {
    next(err);
  }
};

export const rejectCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const preselection =
      await preselectionService.rejectCandidate(
        req.params.applicationId,
        req.user.id,
        req.body.comment
      );

    res.status(200).json({
      status: "success",
      message: "Candidate rejected successfully.",
      data: preselection,
    });
  } catch (err) {
    next(err);
  }
};

export const reviewCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const preselection =
      await preselectionService.reviewCandidate(
        req.params.applicationId,
        req.user.id,
        {
          status: req.body.status as PreselectionStatus,
          recruiterScore: req.body.recruiterScore,
          comment: req.body.comment,
        }
      );

    res.status(200).json({
      status: "success",
      message: "Candidate reviewed successfully.",
      data: preselection,
    });
  } catch (err) {
    next(err);
  }
};

export const updateComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const preselection =
      await preselectionService.updateComment(
        req.params.applicationId,
        req.user.id,
        req.body.comment
      );

    res.status(200).json({
      status: "success",
      message: "Comment updated successfully.",
      data: preselection,
    });
  } catch (err) {
    next(err);
  }
};

export const getRecruiterPreselections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const status = req.query.status
      ? (req.query.status as PreselectionStatus)
      : undefined;

    const result =
      await preselectionService.getRecruiterPreselections(
        req.user.id,
        page,
        limit,
        status
      );

    res.status(200).json({
      status: "success",
      ...result,
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
      await preselectionService.getRecruiterStatistics(
        req.user.id
      );

    res.status(200).json({
      status: "success",
      data: statistics,
    });
  } catch (err) {
    next(err);
  }
};

export const getRanking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = Number(req.query.limit) || 20;

    const ranking =
      await preselectionService.getRanking(
        req.user.id,
        limit
      );

    res.status(200).json({
      status: "success",
      data: ranking,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// Admin
// ============================================================

export const getAllPreselections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result =
      await preselectionService.getAllPreselections(
        page,
        limit
      );

    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statistics =
      await preselectionService.getAdminStatistics();

    res.status(200).json({
      status: "success",
      data: statistics,
    });
  } catch (err) {
    next(err);
  }
};

export const recalculatePreselection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const preselection =
      await preselectionService.recalculate(
        req.params.applicationId
      );

    res.status(200).json({
      status: "success",
      message: "Preselection recalculated successfully.",
      data: preselection,
    });
  } catch (err) {
    next(err);
  }
};

export const deletePreselection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result =
      await preselectionService.deletePreselection(
        req.params.applicationId
      );

    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export default {
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
  deletePreselection,
};