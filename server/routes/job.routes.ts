import { Router } from "express";
import * as jobController from "../controllers/job.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";

const router = Router();

router.get("/", jobController.getAllJobs);
router.get("/recruiter/mine", protect, restrictTo("RECRUITER", "ADMIN"), jobController.getRecruiterJobs);
// Before the /:id route: Express matches in order, so "recommended" would
// otherwise be read as a job id and 404.
router.get(
  "/me/recommended",
  protect,
  restrictTo("CANDIDATE", "ADMIN"),
  jobController.getMatchedJobs
);

router.get("/:id", jobController.getJob);

router.use(protect);

router.post("/", restrictTo("RECRUITER", "ADMIN"), jobController.createJob);
router.patch("/:id", restrictTo("RECRUITER", "ADMIN"), jobController.updateJob);
router.delete("/:id", restrictTo("RECRUITER", "ADMIN"), jobController.deleteJob);

export default router;
