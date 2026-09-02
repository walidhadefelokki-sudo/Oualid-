import express from "express";
import {
  uploadCV,
  getMyCV,
  updateMyProfile,
  getMyCvBuilder,
  saveMyCvBuilder,
  getCandidateCvDocument,
} from "../controllers/candidateProfile.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { upload } from "../utils/cloudinary";

const router = express.Router();

router.use(protect);

// Recruiter-facing, so it must be declared before the CANDIDATE-only guard
// below. Ownership (the candidate applied to this recruiter's job) is checked
// inside the controller, not here, because it needs a database lookup.
router.get(
  "/:candidateId/cv-document",
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateCvDocument
);

router.use(restrictTo("CANDIDATE"));

router.patch("/me", updateMyProfile);
router.post("/me/cv", upload.single("cv"), uploadCV);
router.get("/me/cv", getMyCV);

// The in-app CV Maker document (distinct from /me/cv, which is the uploaded
// resume file). PUT because each save replaces the whole document.
router.get("/me/cv-builder", getMyCvBuilder);
router.put("/me/cv-builder", saveMyCvBuilder);

export default router;
