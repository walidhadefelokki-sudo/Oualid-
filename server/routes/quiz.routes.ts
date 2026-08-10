import express from "express";

import {
  startQuiz,
  getQuiz,
  submitQuiz,
  getMyAttempt,
  getAttemptById,
  getRecruiterAttempts,
  getAllAttempts,
  getRecruiterStatistics,
  getAdminStatistics,
  deleteAttempt,
} from "../controllers/quiz.controller";

import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { requireRecruiterTier } from "../middleware/tier.middleware";

const router = express.Router();

router.use(protect);

/* -------------------------------------------------------------------------- */
/*                              Candidate Routes                              */
/* -------------------------------------------------------------------------- */

// Start / resume quiz (generates it from CV on first call)
router.post("/start", restrictTo("CANDIDATE"), startQuiz);

// Get quiz questions (generates it from CV on first call)
router.get("/", restrictTo("CANDIDATE"), getQuiz);

// Submit quiz answers
router.post("/submit", restrictTo("CANDIDATE"), submitQuiz);

// Get own attempt/result
router.get("/attempt", restrictTo("CANDIDATE"), getMyAttempt);

// Delete own attempt (to retake)
router.delete("/attempt", restrictTo("CANDIDATE"), deleteAttempt);

/* -------------------------------------------------------------------------- */
/*                    Recruiter Routes (Quiz Results — CORPORATE)             */
/* -------------------------------------------------------------------------- */

// Get recruiter's candidates' attempts
router.get(
  "/recruiter",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterAttempts
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterStatistics
);

// View a specific attempt
router.get(
  "/attempt/:id",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getAttemptById
);

/* -------------------------------------------------------------------------- */
/*                                 Admin Routes                               */
/* -------------------------------------------------------------------------- */

router.get("/all", restrictTo("ADMIN"), getAllAttempts);

router.get("/admin/statistics", restrictTo("ADMIN"), getAdminStatistics);

export default router;
