import { Router } from "express";
import * as applicationController from "../controllers/application.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import { requireRecruiterTier } from "../middleware/tier.middleware";

const router = Router();

router.use(protect);

router.post("/", restrictTo("CANDIDATE"), applicationController.applyToJob);
router.get("/my", restrictTo("CANDIDATE"), applicationController.getMyApplications);
router.get("/job/:jobId", restrictTo("RECRUITER", "ADMIN"), applicationController.getJobApplications);
/* The CV directory. Before /job/:jobId would never match it, but kept above
   anyway so the ordering does not have to be rediscovered later.

   Gated on the plan here as well as in the UI: hiding a menu entry is not
   access control. */
router.get(
  "/cv-directory",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  applicationController.getCvDirectory
);
router.patch("/:id/status", restrictTo("RECRUITER", "ADMIN"), applicationController.updateApplicationStatus);

export default router;
