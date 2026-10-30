import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware";
import reviews, { ReviewError } from "../services/review.service";

/**
 * Reviews, from both sides, plus the public list on a profile.
 *
 * The service decides who may say what; this maps its refusals onto status
 * codes.
 */

const asHttpError = (err: unknown) =>
  err instanceof ReviewError ? new AppError(err.message, err.status) : err;

export const leaveReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, comment, qualityRating, communicationRating, deadlineRating } =
      req.body as Record<string, unknown>;

    const num = (v: unknown) =>
      v === undefined || v === null || v === "" ? null : Math.trunc(Number(v));

    const review = await reviews.leave(req.params.id, req.user!.id, {
      rating: Math.trunc(Number(rating)),
      comment: comment ? String(comment) : null,
      qualityRating: num(qualityRating),
      communicationRating: num(communicationRating),
      deadlineRating: num(deadlineRating),
    });

    res.status(201).json({ success: true, data: { review } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const replyToReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { response } = req.body as { response?: string };
    const updated = await reviews.reply(req.params.id, req.user!.id, String(response ?? ""));
    res.json({ success: true, data: { review: updated } });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** Whether this account can still review this order. */
export const getReviewState = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await reviews.pendingFor(req.params.id, req.user!.id) });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** Public: a freelancer's reviews, for their profile page. */
export const listPublicReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const data = await reviews.publicFor(req.params.username, page);

    if (!data) return next(new AppError("Freelance introuvable.", 404));
    res.json({ success: true, data });
  } catch (err) {
    next(asHttpError(err));
  }
};
