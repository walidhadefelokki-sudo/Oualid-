import { Router } from "express";
import * as applicationController from "../controllers/application.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { upload } from "../utils/cloudinary";

const router = Router();

router.use(protect);

router.post("/", restrictTo("CANDIDATE"), upload.single("resume"), applicationController.applyToJob);
router.get("/my", restrictTo("CANDIDATE"), applicationController.getMyApplications);
router.get("/job/:jobId", restrictTo("RECRUITER", "ADMIN"), applicationController.getJobApplications);
router.patch("/:id/status", restrictTo("RECRUITER", "ADMIN"), applicationController.updateApplicationStatus);

export default router;
