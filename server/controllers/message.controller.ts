import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware";
import messaging, { MessagingError } from "../services/messaging.service";

/**
 * Conversations and messages.
 *
 * The service decides who may read and write what; this maps its refusals
 * onto status codes and does the parameter reading.
 */

const asHttpError = (err: unknown) =>
  err instanceof MessagingError ? new AppError(err.message, err.status) : err;

/**
 * Opens a thread, or finds the one that already exists.
 *
 * Three ways in, because there are three places a conversation starts on this
 * marketplace: a freelancer's page, a published project, and an order. The
 * caller names the context it has rather than looking up a user id itself —
 * that lookup is exactly where an endpoint accepting a bare `userId` would
 * become a way to message any account on the platform.
 */
export const openConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, projectId, orderId } = req.body as {
      username?: string;
      projectId?: string;
      orderId?: string;
    };

    const me = req.user!.id;
    let otherId: string;

    if (orderId) {
      otherId = await messaging.otherSideOfOrder(orderId, me);
    } else if (username) {
      otherId = await messaging.userBehindUsername(String(username).replace(/^@/, ""));
    } else if (projectId) {
      otherId = await messaging.clientBehindProject(projectId, me);
    } else {
      return next(new AppError("Précisez un freelance, un projet ou une commande.", 400));
    }

    // The order is passed on so its thread stays separate from the general
    // one; the other two share the pair's single thread.
    const conversation = await messaging.openWith(me, otherId, orderId);

    res.json({ success: true, data: { conversation } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const listConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    res.json({ success: true, data: await messaging.listFor(req.user!.id, page) });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** The badge in the navigation; cheap enough to poll. */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: { unread: await messaging.unreadTotal(req.user!.id) } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const getConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const after = typeof req.query.after === "string" ? req.query.after : undefined;
    const data = await messaging.threadFor(req.params.id, req.user!.id, { after });
    res.json({ success: true, data });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body } = req.body as { body?: string };
    const message = await messaging.send(req.params.id, req.user!.id, String(body ?? ""));
    res.status(201).json({ success: true, data: { message } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const markConversationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await messaging.markRead(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(asHttpError(err));
  }
};
