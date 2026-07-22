import { Request, Response, NextFunction } from "express";
import candidateScoreService from "../services/candidateScore.service";

// ============================================================
// Candidate
// ============================================================

export const getMyScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const score = await candidateScoreService.getMyScore(
      req.params.applicationId,
      req.user.id
    );

    res.status(200).json({
      status: "success",
      data: score,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// Recruiter
// ============================================================

export const updateInterviewScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const score =
      await candidateScoreService.updateInterviewScore(
        req.params.applicationId,
        req.user.id,
        Number(req.body.interviewScore)
      );

    res.status(200).json({
      status: "success",
      message: "Interview score updated successfully.",
      data: score,
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
    const score =
      await candidateScoreService.updateRecruiterScore(
        req.params.applicationId,
        req.user.id,
        Number(req.body.recruiterScore)
      );

    res.status(200).json({
      status: "success",
      message: "Recruiter score updated successfully.",
      data: score,
    });
  } catch (err) {
    next(err);
  }
};

export const getCandidateScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const score =
      await candidateScoreService.getCandidateScore(
        req.params.applicationId,
        req.user.id,
        req.user.role
      );

    res.status(200).json({
      status: "success",
      data: score,
    });
  } catch (err) {
    next(err);
  }
};

export const getRecruiterScores = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const scores =
      await candidateScoreService.getRecruiterScores(
        req.user.id,
        page,
        limit
      );

    res.status(200).json({
      status: "success",
      ...scores,
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
      await candidateScoreService.getRecruiterStatistics(
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

// ============================================================
// Admin
// ============================================================

export const getAllScores = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const scores =
      await candidateScoreService.getAllScores(
        page,
        limit
      );

    res.status(200).json({
      status: "success",
      ...scores,
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
      await candidateScoreService.getAdminStatistics();

    res.status(200).json({
      status: "success",
      data: statistics,
    });
  } catch (err) {
    next(err);
  }
};

export const recalculateScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const score =
      await candidateScoreService.recalculate(
        req.params.applicationId
      );

    res.status(200).json({
      status: "success",
      message: "Score recalculated successfully.",
      data: score,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result =
      await candidateScoreService.deleteScore(
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