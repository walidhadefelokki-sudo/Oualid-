import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateMyAvatar,
  changeMyPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/auth.controller";
import {
  googleAuthStart,
  googleAuthCallback,
  googleAuthSession,
  googleAuthStatus,
} from "../controllers/googleAuth.controller";
import { protect } from "../middleware/auth.middleware";
import { handleAvatarUpload } from "../middleware/mediaUpload.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// --- Email confirmation --------------------------------------------------
// The token in the link is the credential, so confirming needs no session.
// Asking for a new link does: otherwise the endpoint would send mail to any
// address handed to it.
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", protect, resendVerification);

// --- Google OAuth 2.0 / OpenID Connect -----------------------------------
// Standard redirect flow. `/google` sends the browser to Google, Google
// returns to `/google/callback`, and the callback hands the browser a
// short-lived cookie that `/google/session` trades for the application's own
// JWT — the same token a password login issues.
router.get("/google", googleAuthStart);
router.get("/google/callback", googleAuthCallback);
router.post("/google/session", googleAuthSession);
router.get("/google/status", googleAuthStatus);

router.get("/me", protect, getMe);
router.patch("/me/avatar", protect, handleAvatarUpload, updateMyAvatar);
// Anyone signed in may change their own password; the current one is required.
router.patch("/me/password", protect, changeMyPassword);

export default router;
