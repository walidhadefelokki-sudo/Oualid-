import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "job-portal-cvs",
    allowed_formats: ["pdf", "doc", "docx"],
    resource_type: "auto",
  } as any,
});

export const upload = multer({ storage: storage });


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