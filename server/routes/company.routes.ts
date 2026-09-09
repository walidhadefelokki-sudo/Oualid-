import { Router } from "express";
import {
  getMyCompany,
  updateMyCompany,
  updateMyCompanyLogo,
} from "../controllers/company.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { handleAvatarUpload } from "../middleware/mediaUpload.middleware";

const router = Router();

router.use(protect);
router.use(restrictTo("RECRUITER", "ADMIN"));

router.get("/me", getMyCompany);
router.patch("/me", updateMyCompany);

// handleAvatarUpload buffers the image and rejects the wrong format or an
// oversized file before the controller runs. Reused rather than duplicated:
// a logo and an avatar have identical constraints.
router.patch("/me/logo", handleAvatarUpload, updateMyCompanyLogo);

export default router;
