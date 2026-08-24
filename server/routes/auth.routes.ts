import { Router } from "express";
import { register, login, getMe, googleAuth, updateMyAvatar } from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";
import { avatarUpload } from "../utils/cloudinary";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.get("/me", protect, getMe);
router.patch("/me/avatar", protect, avatarUpload.single("avatar"), updateMyAvatar);

export default router;