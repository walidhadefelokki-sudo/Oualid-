import { Request, Response, NextFunction } from "express";
import quizService from "../services/quiz.service";

export const startQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;

    const result = await quizService.startQuiz(
      applicationId,
      req.user!.id
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;

    const quiz = await quizService.getQuiz(
      applicationId,
      req.user!.id
    );

    res.status(200).json({
      status: "success",
      data: {
        quiz,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const submitQuiz = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;
    const { answers } = req.body;

    const result = await quizService.submitQuiz(
      applicationId,
      req.user!.id,
      answers
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;

    const attempt = await quizService.getMyAttempt(
      applicationId,
      req.user!.id
    );

    res.status(200).json({
      status: "success",
      data: {
        attempt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAttemptById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const attempt = await quizService.getAttemptById(
      id,
      req.user!.id,
      req.user!.role
    );

    res.status(200).json({
      status: "success",
      data: {
        attempt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRecruiterAttempts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result =
      await quizService.getRecruiterAttempts(
        req.user!.id,
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

export const getAllAttempts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result =
      await quizService.getAllAttempts(
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

export const getRecruiterStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statistics =
      await quizService.getRecruiterStatistics(
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

export const getAdminStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const statistics =
      await quizService.getAdminStatistics();

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

export const deleteAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;

    const result =
      await quizService.deleteAttempt(
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