import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// NOTE: CVs are no longer stored here. They contain personal data and now
// live in a private Supabase Storage bucket, read only through short-lived
// signed URLs — see server/utils/supabaseStorage.ts. Cloudinary keeps the
// public media: avatars, company logos and oral presentations.

const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "job-portal-presentations",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi", "webm", "mkv"],
  } as any,
});

export const presentationUpload = multer({
  storage: videoStorage,
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "job-portal-avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    resource_type: "image",
    transformation: [{ width: 512, height: 512, crop: "fill", gravity: "face" }],
  } as any,
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — plenty for a profile photo
});

export { cloudinary };