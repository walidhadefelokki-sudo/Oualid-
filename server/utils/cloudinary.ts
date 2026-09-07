import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Legacy media store.
 *
 * Nothing new is written here. CVs, profile photos and oral presentations all
 * live in Supabase Storage now — see server/utils/supabaseStorage.ts — where
 * the personal ones sit in private buckets read through short-lived signed
 * URLs rather than permanent public links.
 *
 * This file remains because files uploaded before the move are still hosted on
 * Cloudinary and must keep working: candidates are not going to re-upload, and
 * recruiters still open applications from before the change. FileAsset.provider
 * records which store a given row belongs to, and readers branch on it.
 */

/**
 * Deletes a Cloudinary object left over from before the migration.
 *
 * Never throws: cleanup runs after the replacement is already live, so a failed
 * tidy-up must not turn a successful upload into an error.
 */
export const destroyCloudinaryAsset = async (
  publicId: string | null | undefined,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<void> => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, err);
  }
};

export { cloudinary };
