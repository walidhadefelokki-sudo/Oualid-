import { Router } from "express";

import aiAnalysisController from "../controllers/aiAnalysis.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

// ============================================================
// Candidate
// ============================================================

// View own AI analysis
router.get(
  "/:applicationId",
  authenticate,
  authorize("CANDIDATE", "RECRUITER", "ADMIN"),
  aiAnalysisController.getAnalysis
);

// ============================================================
// Recruiter
// ============================================================

// Analyze candidate application
router.post(
  "/:applicationId/analyze",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  aiAnalysisController.analyzeApplication
);

// Recalculate AI analysis
router.post(
  "/:applicationId/recalculate",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  aiAnalysisController.recalculate
);

// Recruiter dashboard
router.get(
  "/recruiter/all",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  aiAnalysisController.getRecruiterAnalyses
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  authenticate,
  authorize("RECRUITER", "ADMIN"),
  aiAnalysisController.getStatistics
);

// ============================================================
// Admin
// ============================================================

// Delete AI Analysis
router.delete(
  "/:applicationId",
  authenticate,
  authorize("ADMIN"),
  aiAnalysisController.deleteAnalysis
);

export default router;