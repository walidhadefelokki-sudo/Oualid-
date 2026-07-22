import express from "express";

import {
  uploadPresentation,
  getPresentationByApplication,
  getPresentationById,
  updateRecruiterScore,
  updateTranscript,
  updateAIScore,
  deletePresentation,
  getRecruiterPresentations,
  getAllPresentations,
  getRecruiterStatistics,
} from "../controllers/oralPresentation.controller";

import { protect, restrictTo } from "../middleware/auth.middleware";
import { presentationUpload } from "../utils/cloudinary";
// If you haven't created presentationUpload yet,
// temporarily use:
// import { upload as presentationUpload } from "../utils/cloudinary";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                               Candidate Routes                             */
/* -------------------------------------------------------------------------- */

// Upload or replace presentation
router.post(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  presentationUpload.single("video"),
  uploadPresentation
);

// Get own presentation
router.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  getPresentationByApplication
);

// Delete own presentation
router.delete(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  deletePresentation
);

/* -------------------------------------------------------------------------- */
/*                               Recruiter Routes                             */
/* -------------------------------------------------------------------------- */

// Recruiter's presentations
router.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getRecruiterPresentations
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getRecruiterStatistics
);

// View presentation
router.get(
  "/:id",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getPresentationById
);

// Recruiter score
router.patch(
  "/:id/recruiter-score",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  updateRecruiterScore
);

/* -------------------------------------------------------------------------- */
/*                                  AI Routes                                 */
/* -------------------------------------------------------------------------- */

// Save transcript
router.patch(
  "/:id/transcript",
  protect,
  restrictTo("ADMIN"),
  updateTranscript
);

// Save AI score
router.patch(
  "/:id/ai-score",
  protect,
  restrictTo("ADMIN"),
  updateAIScore
);

/* -------------------------------------------------------------------------- */
/*                                 Admin Routes                               */
/* -------------------------------------------------------------------------- */

// Get all presentations
router.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  getAllPresentations
);

export default router;