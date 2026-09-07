import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "./error.middleware";
import { AVATAR_MAX_BYTES, VIDEO_MAX_BYTES } from "../utils/supabaseStorage";

/* -------------------------------------------------------------------------- */
/*                                   images                                   */
/* -------------------------------------------------------------------------- */

export const AVATAR_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"] as const;
export type AvatarExtension = (typeof AVATAR_EXTENSIONS)[number];

const AVATAR_MIME_TYPES: Record<AvatarExtension, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Held in memory so the real bytes can be inspected before anything is stored.
 *
 * The browser's declared MIME type is attacker-controlled — an executable
 * renamed .png arrives looking perfectly valid — so the file signature is what
 * decides. Safe at this size because `limits` rejects anything larger before
 * the whole body is read.
 */
const avatarMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
}).single("avatar");

/**
 * Runs the avatar upload and turns multer's own errors into AppErrors.
 *
 * Without this, a photo over the limit surfaced as multer's raw
 * LIMIT_FILE_SIZE, which the global handler reported as a 500 — telling the
 * candidate the server had broken when they had simply picked a big photo.
 */
export const handleAvatarUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  avatarMemoryUpload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Your photo must be smaller than 4 MB.", 400));
      }
      return next(new AppError(`Upload failed: ${err.message}`, 400));
    }
    if (err) return next(err);
    next();
  });
};

const hasImageSignature = (buffer: Buffer, extension: AvatarExtension): boolean => {
  switch (extension) {
    case "jpg":
    case "jpeg":
      return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));

    case "png":
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    case "gif": {
      const head = buffer.subarray(0, 6).toString("latin1");
      return head === "GIF87a" || head === "GIF89a";
    }

    // RIFF container with a WEBP fourcc at offset 8.
    case "webp":
      return (
        buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
        buffer.subarray(8, 12).toString("latin1") === "WEBP"
      );

    default:
      return false;
  }
};

export interface ValidatedMedia {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  fileName: string;
  size: number;
}

export const validateAvatarUpload = (
  file: Express.Multer.File | undefined
): ValidatedMedia => {
  if (!file) {
    throw new AppError("Please choose an image to upload.", 400);
  }

  if (file.buffer.length === 0) {
    throw new AppError("That file is empty. Please choose another image.", 400);
  }

  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
  if (!(AVATAR_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new AppError("Your photo must be a JPG, PNG, WEBP or GIF image.", 400);
  }

  const typed = extension as AvatarExtension;

  if (!hasImageSignature(file.buffer, typed)) {
    throw new AppError(
      "This file is not a valid image. Please choose another photo.",
      400
    );
  }

  return {
    buffer: file.buffer,
    extension: typed,
    // From our own table, not the request: the browser-supplied MIME type is
    // never stored or served back.
    mimeType: AVATAR_MIME_TYPES[typed],
    fileName: file.originalname,
    size: file.buffer.length,
  };
};

/* -------------------------------------------------------------------------- */
/*                                   video                                    */
/* -------------------------------------------------------------------------- */

export const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "avi"] as const;
export type VideoExtension = (typeof VIDEO_EXTENSIONS)[number];

const VIDEO_MIME_TYPES: Record<VideoExtension, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
};

export const resolveVideoExtension = (fileName: string): VideoExtension => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!(VIDEO_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new AppError(
      "Your presentation must be an MP4, MOV, WEBM, MKV or AVI video.",
      400
    );
  }
  return extension as VideoExtension;
};

export const videoMimeType = (extension: VideoExtension): string =>
  VIDEO_MIME_TYPES[extension];

/**
 * Confirms the first bytes of an uploaded video really are that container.
 *
 * Only the head is read — enough to identify the format without pulling a
 * large file into a serverless function to look at sixteen bytes.
 */
export const hasVideoSignature = (
  head: Buffer,
  extension: VideoExtension
): boolean => {
  switch (extension) {
    // ISO base media: a size field, then the "ftyp" box type at offset 4.
    // Covers MP4 and QuickTime alike.
    case "mp4":
    case "mov":
      return head.subarray(4, 8).toString("latin1") === "ftyp";

    // EBML header, shared by WebM and Matroska.
    case "webm":
    case "mkv":
      return head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

    // RIFF container with an AVI fourcc at offset 8.
    case "avi":
      return (
        head.subarray(0, 4).toString("latin1") === "RIFF" &&
        head.subarray(8, 11).toString("latin1") === "AVI"
      );

    default:
      return false;
  }
};

export const assertVideoSize = (size: number | null): number => {
  if (size === null) {
    throw new AppError(
      "That upload could not be found. Please try again.",
      400
    );
  }
  if (size === 0) {
    throw new AppError("That file is empty. Please choose another video.", 400);
  }
  if (size > VIDEO_MAX_BYTES) {
    throw new AppError("Your presentation must be smaller than 50 MB.", 400);
  }
  return size;
};
