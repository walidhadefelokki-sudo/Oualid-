import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware";
import offers, { CustomOfferError } from "../services/customOffer.service";

/**
 * Offers quoted inside a conversation.
 *
 * The service decides who may send, accept, refuse or withdraw; this reads
 * the request and maps its refusals onto status codes.
 */

const asHttpError = (err: unknown) =>
  err instanceof CustomOfferError ? new AppError(err.message, err.status) : err;

export const sendOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, price, deliveryDays, revisions, validDays } =
      req.body as Record<string, unknown>;

    const offer = await offers.send({
      conversationId: req.params.id,
      userId: req.user!.id,
      title: String(title ?? ""),
      description: description == null ? null : String(description),
      price: Number(price),
      deliveryDays: Number(deliveryDays),
      revisions: revisions == null ? 0 : Number(revisions),
      validDays: validDays == null ? null : Number(validDays),
    });

    res.status(201).json({ success: true, data: { offer } });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** Every offer in a thread, so the client can see what was quoted before. */
export const listOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await offers.listForConversation(req.params.id, req.user!.id),
    });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** The client accepts; an order comes back with the offer. */
export const acceptOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await offers.accept(req.params.offerId, req.user!.id) });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const declineOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offer = await offers.decline(req.params.offerId, req.user!.id);
    res.json({ success: true, data: { offer } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const withdrawOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offer = await offers.withdraw(req.params.offerId, req.user!.id);
    res.json({ success: true, data: { offer } });
  } catch (err) {
    next(asHttpError(err));
  }
};
