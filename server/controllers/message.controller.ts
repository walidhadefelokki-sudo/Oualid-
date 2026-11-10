import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/error.middleware";
import prisma from "../utils/prisma";
import messaging, { MessagingError } from "../services/messaging.service";
import { validateMessageAttachments } from "../middleware/mediaUpload.middleware";
import {
  MESSAGE_ATTACHMENT_BUCKET,
  buildObjectPath,
  removeObject,
  uploadObject,
} from "../utils/supabaseStorage";

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

/**
 * Sends a message, with files when there are any.
 *
 * One request rather than upload-then-send: a two-step flow leaves orphaned
 * files behind every time somebody attaches something and then changes their
 * mind, and nothing would ever collect them.
 *
 * Multer leaves a JSON request alone, so the text-only path every message
 * still uses is untouched.
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  const stored: string[] = [];

  try {
    const { body } = req.body as { body?: string };
    const files = validateMessageAttachments(req.files as Express.Multer.File[] | undefined);

    /* Checked before a single byte is stored. Without this, attaching a file
     * to a thread you are not in would upload it first and refuse afterwards,
     * leaving the object behind. */
    if (files.length) await messaging.assertParticipant(req.params.id, req.user!.id);

    const fileIds: string[] = [];

    for (const file of files) {
      const path = await uploadObject({
        bucket: MESSAGE_ATTACHMENT_BUCKET,
        path: buildObjectPath(req.user!.id, file.extension),
        buffer: file.buffer,
        mimeType: file.mimeType,
      });
      stored.push(path);

      const asset = await prisma.fileAsset.create({
        data: {
          // The path, not a URL: this bucket is private and every read is
          // signed, so a stored link would be one that stopped working.
          url: path,
          provider: "supabase",
          publicId: path,
          fileName: file.fileName,
          mimeType: file.mimeType,
          extension: file.extension,
          size: file.size,
        },
        select: { id: true },
      });

      fileIds.push(asset.id);
    }

    try {
      const message = await messaging.send(
        req.params.id,
        req.user!.id,
        String(body ?? ""),
        fileIds
      );
      res.status(201).json({ success: true, data: { message } });
    } catch (sendErr) {
      // Stored but attached to nothing. Remove them rather than leave files
      // no row points at.
      await Promise.all(stored.map((path) => removeObject(MESSAGE_ATTACHMENT_BUCKET, path)));
      throw sendErr;
    }
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
