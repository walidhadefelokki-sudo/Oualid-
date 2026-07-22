import { Router } from "express";

import preselectionController from "../controllers/preselection.controller";

import {
  protect,
  restrictTo,
} from "../middleware/auth.middleware";

const router = Router();

// ============================================================
// Candidate
// ============================================================

// View own preselection
router.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  preselectionController.getMyPreselection
);

// ============================================================
// Recruiter
// ============================================================

// View one preselection
router.get(
  "/application/:applicationId/details",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  preselectionController.getPreselection
);

// Review candidate
router.patch(
  "/application/:applicationId/review",
  protect,
  restrictTo("RECRUITER"),
  preselectionController.reviewCandidate
);

// Shortlist candidate
router.patch(
  "/application/:applicationId/shortlist",
  protect,
  restrictTo("RECRUITER"),
  preselectionController.shortlistCandidate
);

// Reject candidate
router.patch(
  "/application/:applicationId/reject",
  protect,
  restrictTo("RECRUITER"),
  preselectionController.rejectCandidate
);

// Update recruiter comment
router.patch(
  "/application/:applicationId/comment",
  protect,
  restrictTo("RECRUITER"),
  preselectionController.updateComment
);

// Recruiter's preselection list
router.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER"),
  preselectionController.getRecruiterPreselections
);

// Recruiter statistics
router.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER"),
  preselectionController.getRecruiterStatistics
);

// Recruiter ranking
router.get(
  "/recruiter/ranking",
  protect,
  restrictTo("RECRUITER"),
  preselectionController.getRanking
);

// ============================================================
// Admin
// ============================================================

// Get all preselection records
router.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  preselectionController.getAllPreselections
);

// Global statistics
router.get(
  "/statistics",
  protect,
  restrictTo("ADMIN"),
  preselectionController.getAdminStatistics
);

// Force recalculation
router.patch(
  "/application/:applicationId/recalculate",
  protect,
  restrictTo("ADMIN"),
  preselectionController.recalculatePreselection
);

// Delete preselection
router.delete(
  "/application/:applicationId",
  protect,
  restrictTo("ADMIN"),
  preselectionController.deletePreselection
);

export default router;