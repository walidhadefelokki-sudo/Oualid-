import express from "express";

import {
  getUploadSignature,
  uploadPresentation,
  getMyPresentation,
  getPresentationByCandidateId,
  updateRecruiterScore,
  deletePresentation,
  getRecruiterPresentations,
  getAllPresentations,
  getRecruiterStatistics,
} from "../controllers/oralPresentation.controller";

import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { requireRecruiterTier } from "../middleware/tier.middleware";

const router = express.Router();

router.use(protect);

/* -------------------------------------------------------------------------- */
/*                               Candidate Routes                             */
/* -------------------------------------------------------------------------- */

// Get a signature so the browser can upload the video file directly to
// Cloudinary (bypasses our server's request body size limit)
router.get(
  "/upload-signature",
  restrictTo("CANDIDATE"),
  getUploadSignature
);

// Save the resulting video metadata after a direct-to-Cloudinary upload
// (profile-level, not tied to an application)
router.post(
  "/me",
  restrictTo("CANDIDATE"),
  uploadPresentation
);

// Get own presentation
router.get("/me", restrictTo("CANDIDATE"), getMyPresentation);

// Delete own presentation
router.delete("/me", restrictTo("CANDIDATE"), deletePresentation);

/* -------------------------------------------------------------------------- */
/*                    Recruiter Routes (Oral Presentation — CORPORATE)        */
/* -------------------------------------------------------------------------- */

// Recruiter's own list of presentations (candidates who applied to them)
router.get(
  "/recruiter",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterPresentations
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterStatistics
);

// View a specific candidate's presentation
router.get(
  "/candidate/:candidateId",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getPresentationByCandidateId
);

// Recruiter score
router.patch(
  "/candidate/:candidateId/recruiter-score",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  updateRecruiterScore
);

/* -------------------------------------------------------------------------- */
/*                                 Admin Routes                               */
/* -------------------------------------------------------------------------- */

// Get all presentations
router.get("/", restrictTo("ADMIN"), getAllPresentations);

export default router;
