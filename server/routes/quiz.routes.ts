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

import { protect, restrictTo } from "../middleware/auth.middleware";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                              Candidate Routes                              */
/* -------------------------------------------------------------------------- */

// Start / Resume quiz
router.post(
  "/application/:applicationId/start",
  protect,
  restrictTo("CANDIDATE"),
  startQuiz
);

// Get quiz questions
router.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  getQuiz
);

// Submit quiz
router.post(
  "/application/:applicationId/submit",
  protect,
  restrictTo("CANDIDATE"),
  submitQuiz
);

// Get own attempt
router.get(
  "/application/:applicationId/attempt",
  protect,
  restrictTo("CANDIDATE"),
  getMyAttempt
);

// Delete own attempt
router.delete(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  deleteAttempt
);

/* -------------------------------------------------------------------------- */
/*                              Recruiter Routes                              */
/* -------------------------------------------------------------------------- */

// Get recruiter attempts
router.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getRecruiterAttempts
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getRecruiterStatistics
);

// View candidate attempt
router.get(
  "/attempt/:id",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getAttemptById
);

/* -------------------------------------------------------------------------- */
/*                                 Admin Routes                               */
/* -------------------------------------------------------------------------- */

// Get all quiz attempts
router.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  getAllAttempts
);

// Admin statistics
router.get(
  "/statistics",
  protect,
  restrictTo("ADMIN"),
  getAdminStatistics
);

export default router;