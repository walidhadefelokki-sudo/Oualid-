import express from "express";
import { uploadCV, getMyCV, updateMyProfile } from "../controllers/candidateProfile.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { upload } from "../utils/cloudinary";

const router = express.Router();

router.use(protect, restrictTo("CANDIDATE"));

router.patch("/me", updateMyProfile);
router.post("/me/cv", upload.single("cv"), uploadCV);
router.get("/me/cv", getMyCV);

export default router;
