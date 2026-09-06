import express from "express";
import {
  uploadCV,
  getMyCV,
  updateMyProfile,
  getMyCvBuilder,
  saveMyCvBuilder,
  getCandidateCvDocument,
  getCandidateCvFile,
  createCvUploadUrl,
  confirmCvUpload,
} from "../controllers/candidateProfile.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { handleCvUpload } from "../middleware/cvUpload.middleware";

const router = express.Router();

router.use(protect);

// Recruiter-facing, so it must be declared before the CANDIDATE-only guard
// below. Ownership (the candidate applied to this recruiter's job) is checked
// inside the controller, not here, because it needs a database lookup.
router.get(
  "/:candidateId/cv-document",
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateCvDocument
);

// The candidate's uploaded CV file, as a short-lived signed link. Same
// ownership rule as /cv-document, checked in the controller for the same
// reason: it needs a database lookup.
router.get(
  "/:candidateId/cv-file",
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateCvFile
);

router.use(restrictTo("CANDIDATE"));

router.patch("/me", updateMyProfile);
// Direct-to-storage upload, in two steps. This is the path the app uses: a
// Vercel function's request body is capped at 4.5 MB, so a 10 MB CV can never
// reach the server as multipart however the handler is written. The browser
// PUTs the bytes to Supabase, then confirms — and the confirm step validates
// them, because a file that skipped our server is a file we have not checked.
router.post("/me/cv/upload-url", createCvUploadUrl);
router.post("/me/cv/confirm", confirmCvUpload);

// Multipart upload, kept as a fallback for callers that cannot do the two-step
// flow. Subject to the same 4.5 MB platform cap, and ending in the same
// finalize step, so the two cannot record a CV differently. handleCvUpload
// buffers the file and rejects the wrong format or an oversized upload before
// the controller runs.
router.post("/me/cv", handleCvUpload, uploadCV);
router.get("/me/cv", getMyCV);

// The in-app CV Maker document (distinct from /me/cv, which is the uploaded
// resume file). PUT because each save replaces the whole document.
router.get("/me/cv-builder", getMyCvBuilder);
router.put("/me/cv-builder", saveMyCvBuilder);

export default router;
