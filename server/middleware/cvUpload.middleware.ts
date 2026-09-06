import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "./error.middleware";

/** Formats a CV may be uploaded in. Mirrored by the frontend's own check. */
export const CV_EXTENSIONS = ["pdf", "doc", "docx"] as const;
export type CvExtension = (typeof CV_EXTENSIONS)[number];

export const CV_MAX_BYTES = 10 * 1024 * 1024;

const CV_MIME_TYPES: Record<CvExtension, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Holds the upload in memory rather than streaming it straight to storage.
 *
 * The file has to be inspected before it is stored — the browser's declared
 * MIME type is attacker-controlled, so an `.exe` renamed to `.pdf` arrives
 * looking perfectly valid. Buffering lets the real bytes be checked first.
 * Safe at this size because `limits` rejects anything over 10 MB before the
 * whole body is read.
 */
export const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CV_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
    if (!(CV_EXTENSIONS as readonly string[]).includes(extension)) {
      cb(new AppError("Your CV must be a PDF, DOC or DOCX file.", 400));
      return;
    }
    cb(null, true);
  },
}).single("cv");

/**
 * Confirms the bytes really are the format the filename claims.
 *
 * Extension and MIME type both travel with the request and can say anything;
 * the file signature cannot be set without producing a file that genuinely
 * starts that way.
 */
const hasSignature = (buffer: Buffer, extension: CvExtension): boolean => {
  switch (extension) {
    // "%PDF"
    case "pdf":
      return buffer.subarray(0, 4).toString("latin1") === "%PDF";

    // OLE2 compound document — the legacy Word container.
    case "doc":
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));

    // DOCX is a ZIP. "PK\x03\x04" alone would accept any archive, so also
    // require a Word part: ZIP stores entry names uncompressed in the local
    // file headers, so they are readable straight out of the raw bytes.
    case "docx":
      return (
        buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) &&
        buffer.subarray(0, 4096).includes("word/")
      );

    default:
      return false;
  }
};

export interface ValidatedCv {
  buffer: Buffer;
  extension: CvExtension;
  mimeType: string;
  fileName: string;
  size: number;
}

/**
 * The extension a filename claims, if we accept it.
 *
 * Used before any bytes exist, when issuing a direct-upload ticket — a name
 * that is not a CV never gets a place to upload to.
 */
export const resolveCvExtension = (fileName: string): CvExtension => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!(CV_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new AppError("Your CV must be a PDF, DOC or DOCX file.", 400);
  }
  return extension as CvExtension;
};

/**
 * Turns raw bytes into a CV known to be well-formed, or throws an AppError the
 * global handler renders as a clean 400.
 *
 * Both upload paths end here — the multipart one and the direct-to-storage one
 * — so a file that reached the bucket without passing through Express is held
 * to exactly the same checks.
 */
export const validateCvBuffer = (buffer: Buffer, fileName: string): ValidatedCv => {
  if (buffer.length === 0) {
    throw new AppError("That file is empty. Please choose another CV.", 400);
  }

  if (buffer.length > CV_MAX_BYTES) {
    throw new AppError("Your CV must be smaller than 10 MB.", 400);
  }

  const extension = resolveCvExtension(fileName);

  if (!hasSignature(buffer, extension)) {
    throw new AppError(
      `This file is not a valid ${extension.toUpperCase()} document. Please upload your CV again.`,
      400
    );
  }

  return {
    buffer,
    extension,
    // Taken from our own table, not from the request: the browser-supplied
    // MIME type is never stored or served back.
    mimeType: CV_MIME_TYPES[extension],
    fileName,
    size: buffer.length,
  };
};

/** Turns a multer upload into a validated CV. */
export const validateCvUpload = (file: Express.Multer.File | undefined): ValidatedCv => {
  if (!file) {
    throw new AppError("Please choose a CV file to upload.", 400);
  }
  return validateCvBuffer(file.buffer, file.originalname);
};

/**
 * Runs the multer middleware and converts its own errors into AppErrors.
 *
 * Without this, an oversized upload surfaces as multer's raw `LIMIT_FILE_SIZE`,
 * which the error handler would report as a 500.
 */
export const handleCvUpload = (req: Request, res: Response, next: NextFunction) => {
  cvUpload(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Your CV must be smaller than 10 MB.", 400));
      }
      return next(new AppError(`Upload failed: ${err.message}`, 400));
    }
    if (err) return next(err);
    next();
  });
};
