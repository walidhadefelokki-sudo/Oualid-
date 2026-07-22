import { Router } from "express";

import {
  getMyScore,
  updateInterviewScore,
  updateRecruiterScore,
  getCandidateScore,
  getRecruiterScores,
  getRecruiterStatistics,
  getAllScores,
  getAdminStatistics,
  recalculateScore,
  deleteScore,
} from "../controllers/candidateScore.controller";

import {
  protect,
  restrictTo,
} from "../middleware/auth.middleware";

const router = Router();

// ============================================================
// Candidate
// ============================================================

// View own score
router.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  getMyScore
);

// ============================================================
// Recruiter
// ============================================================

// View one candidate score
router.get(
  "/application/:applicationId/details",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateScore
);

// Update interview score
router.patch(
  "/application/:applicationId/interview-score",
  protect,
  restrictTo("RECRUITER"),
  updateInterviewScore
);

// Update recruiter evaluation
router.patch(
  "/application/:applicationId/recruiter-score",
  protect,
  restrictTo("RECRUITER"),
  updateRecruiterScore
);

// Recruiter ranking dashboard
router.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER"),
  getRecruiterScores
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER"),
  getRecruiterStatistics
);

// ============================================================
// Admin
// ============================================================

// All candidate scores
router.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  getAllScores
);

// Admin statistics
router.get(
  "/statistics",
  protect,
  restrictTo("ADMIN"),
  getAdminStatistics
);

// Force recalculation
router.patch(
  "/application/:applicationId/recalculate",
  protect,
  restrictTo("ADMIN"),
  recalculateScore
);

// Delete candidate score
router.delete(
  "/application/:applicationId",
  protect,
  restrictTo("ADMIN"),
  deleteScore
);

export default router;