import axios from "axios";
import { FileAsset } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { createSignedCvUrl, downloadCvObject } from "../utils/supabaseStorage";

/**
 * Reading a stored CV, whichever provider holds it.
 *
 * CVs uploaded before the move to private storage live in Cloudinary behind a
 * permanent public URL; new ones live in a private Supabase bucket and have no
 * durable URL at all. Both must keep working — candidates are not going to
 * re-upload, and recruiters still open applications from before the change —
 * so every reader goes through here rather than reaching for `asset.url`.
 */

/** Marker stored in `FileAsset.url` for privately-held objects. */
export const SUPABASE_URL_SCHEME = "supabase://cvs/";

export const isPrivatelyStored = (asset: Pick<FileAsset, "provider">): boolean =>
  asset.provider === "supabase";

/**
 * A URL the browser can open, valid for a few minutes.
 *
 * Only ever call this after establishing that the caller is allowed to read
 * this particular CV — minting the link is the last step of authorisation,
 * not a substitute for it.
 */
export const getCvAccessUrl = async (
  asset: Pick<FileAsset, "provider" | "publicId" | "url">
): Promise<string> => {
  if (!isPrivatelyStored(asset)) {
    // Legacy Cloudinary asset: the stored URL is the delivery URL.
    return asset.url;
  }

  if (!asset.publicId) {
    throw new AppError("This CV is missing its storage reference.", 500);
  }

  return createSignedCvUrl(asset.publicId);
};

/** The file's bytes, for server-side text extraction. */
export const getCvBuffer = async (
  asset: Pick<FileAsset, "provider" | "publicId" | "url">
): Promise<Buffer> => {
  if (isPrivatelyStored(asset)) {
    if (!asset.publicId) {
      throw new AppError("This CV is missing its storage reference.", 500);
    }
    return downloadCvObject(asset.publicId);
  }

  const response = await axios.get<ArrayBuffer>(asset.url, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data);
};

/**
 * The file extension, taken from the stored column and falling back to the
 * URL. Legacy Cloudinary rows always populated `extension`; the fallback
 * covers any that did not.
 */
export const getCvExtension = (
  asset: Pick<FileAsset, "extension" | "url" | "publicId">
): string => {
  if (asset.extension) return asset.extension.toLowerCase();
  const source = asset.publicId || asset.url;
  return source.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
};
