import express from "express";

import {
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
import { presentationUpload } from "../utils/cloudinary";

const router = express.Router();

router.use(protect);

/* -------------------------------------------------------------------------- */
/*                               Candidate Routes                             */
/* -------------------------------------------------------------------------- */

// Upload or replace own presentation (profile-level, not tied to an application)
router.post(
  "/me",
  restrictTo("CANDIDATE"),
  presentationUpload.single("video"),
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
