import express from "express";
import {
  uploadCV,
  getMyCV,
  updateMyProfile,
  getMyCvBuilder,
  saveMyCvBuilder,
} from "../controllers/candidateProfile.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { upload } from "../utils/cloudinary";

const router = express.Router();

router.use(protect, restrictTo("CANDIDATE"));

router.patch("/me", updateMyProfile);
router.post("/me/cv", upload.single("cv"), uploadCV);
router.get("/me/cv", getMyCV);

// The in-app CV Maker document (distinct from /me/cv, which is the uploaded
// resume file). PUT because each save replaces the whole document.
router.get("/me/cv-builder", getMyCvBuilder);
router.put("/me/cv-builder", saveMyCvBuilder);

export default router;
