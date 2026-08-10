import { Router } from "express";

import aiAnalysisController from "../controllers/aiAnalysis.controller";

import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { requireRecruiterTier } from "../middleware/tier.middleware";

const router = Router();

router.use(protect);

// ============================================================
// Candidate
// ============================================================

// View own AI analysis
router.get(
  "/:applicationId",
  restrictTo("CANDIDATE", "RECRUITER", "ADMIN"),
  aiAnalysisController.getAnalysis
);

// ============================================================
// Recruiter (AI Filter — PREMIUM plan or higher)
// ============================================================

// Analyze candidate application
router.post(
  "/:applicationId/analyze",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysisController.analyzeApplication
);

// Recalculate AI analysis
router.post(
  "/:applicationId/recalculate",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysisController.recalculate
);

// Recruiter dashboard
router.get(
  "/recruiter/all",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysisController.getRecruiterAnalyses
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysisController.getStatistics
);

// ============================================================
// Admin
// ============================================================

// Delete AI Analysis
router.delete(
  "/:applicationId",
  restrictTo("ADMIN"),
  aiAnalysisController.deleteAnalysis
);

export default router;