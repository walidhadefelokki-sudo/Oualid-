import { Router } from "express";
import { register, login, getMe, updateMyAvatar } from "../controllers/auth.controller";
import {
  googleAuthStart,
  googleAuthCallback,
  googleAuthSession,
  googleAuthStatus,
} from "../controllers/googleAuth.controller";
import { protect } from "../middleware/auth.middleware";
import { avatarUpload } from "../utils/cloudinary";

const router = Router();

router.post("/register", register);
router.post("/login", login);

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
router.patch("/me/avatar", protect, avatarUpload.single("avatar"), updateMyAvatar);

export default router;
