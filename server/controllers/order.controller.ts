import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware";
import orders, { OrderError } from "../services/order.service";

/**
 * Orders, from whichever side is asking.
 *
 * The service decides who may do what; this maps its refusals onto status
 * codes and nothing else.
 */

const asHttpError = (err: unknown) =>
  err instanceof OrderError ? new AppError(err.message, err.status) : err;

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await orders.detail(req.params.id, req.user!.id) });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const startOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await orders.start(req.params.id, req.user!.id) });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const deliverOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, fileIds } = req.body as { message?: string; fileIds?: string[] };
    const delivery = await orders.deliver(
      req.params.id,
      req.user!.id,
      String(message ?? ""),
      Array.isArray(fileIds) ? fileIds.map(String).slice(0, 20) : []
    );
    res.status(201).json({ success: true, data: { delivery } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const requestRevision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body as { reason?: string };
    const result = await orders.requestRevision(req.params.id, req.user!.id, String(reason ?? ""));
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const acceptOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await orders.accept(req.params.id, req.user!.id) });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body as { reason?: string };
    const result = await orders.cancel(req.params.id, req.user!.id, String(reason ?? ""));
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** POST /freelance/me/orders/from-service — buy a package. */
export const createFromService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { packageId, addonIds } = req.body as { packageId?: string; addonIds?: string[] };
    if (!packageId) return next(new AppError("Choisissez une formule.", 400));

    const order = await orders.orderService(
      req.user!.id,
      String(packageId),
      Array.isArray(addonIds) ? addonIds.map(String).slice(0, 10) : []
    );

    res.status(201).json({ success: true, data: { order } });
  } catch (err) {
    next(asHttpError(err));
  }
};
