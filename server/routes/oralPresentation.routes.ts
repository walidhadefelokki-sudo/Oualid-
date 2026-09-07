import express from "express";

import {
  createPresentationUploadUrl,
  confirmPresentationUpload,
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

// Direct-to-storage upload, in two steps. A Vercel function rejects a request
// body over ~4.5MB, so a presentation video can never reach this server as
// multipart. The browser PUTs the bytes to Supabase, then confirms — and the
// confirm step validates them, because a file that skipped our server is a
// file we have not checked.
router.post(
  "/me/upload-url",
  restrictTo("CANDIDATE"),
  createPresentationUploadUrl
);

router.post(
  "/me/confirm",
  restrictTo("CANDIDATE"),
  confirmPresentationUpload
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
