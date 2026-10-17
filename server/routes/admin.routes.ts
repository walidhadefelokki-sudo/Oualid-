import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import * as adminManage from "../controllers/adminManage.controller";
import * as schedule from "../controllers/schedule.controller";
import * as adminEmail from "../controllers/adminEmail.controller";
import * as freelanceModeration from "../controllers/freelanceModeration.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";

const router = Router();

// Everything here is admin-only
router.use(protect);
router.use(restrictTo("ADMIN"));

router.get("/stats", adminController.getStats);

// Companies / recruiter plans
router.get("/companies", adminController.getAllCompanies);
router.get("/companies/:id", adminController.getCompany);
router.patch("/companies/:id/plan", adminController.updateCompanyPlan);
// Credits an annonce pack onto a company. Manual until a payment processor
// can call grantPostings from its webhook.
router.patch("/companies/:id/postings", adminController.grantCompanyPostings);

// Users
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.get("/users/:id", adminManage.getUserDetail);
router.patch("/users/:id", adminManage.updateUser);
// Marks the account DELETED rather than removing the row — see the controller.
router.delete("/users/:id", adminManage.deleteUser);

// Job offers
router.get("/jobs", adminManage.getAllJobsAdmin);
router.patch("/jobs/:id", adminManage.updateJobAdmin);
router.delete("/jobs/:id", adminManage.deleteJobAdmin);

// Schedules — the platform team's own diary.
router.get("/schedules", schedule.listSchedules);
router.post("/schedules", schedule.createSchedule);
router.patch("/schedules/:id", schedule.updateSchedule);
router.delete("/schedules/:id", schedule.deleteSchedule);

// Mail to selected accounts, composed in the dashboard. One batch per
// request: the function is killed at 60s and the send is the slow part.
router.post("/emails/send", adminEmail.sendBroadcast);
router.post("/emails/preview", adminEmail.sendBroadcastPreview);

// Freelance moderation. Nothing a freelancer submits reaches the public
// until one of these decisions is taken.
router.get("/freelance/moderation", freelanceModeration.listQueue);
router.get("/freelance/moderation/stats", freelanceModeration.getQueueStats);
router.get("/freelance/moderation/history", freelanceModeration.listHistory);
router.post("/freelance/moderation/services/:id/approve", freelanceModeration.approveService);
router.post("/freelance/moderation/services/:id/reject", freelanceModeration.rejectService);
router.get("/freelance/moderation/projects", freelanceModeration.listProjectQueue);
router.post("/freelance/moderation/projects/:id/approve", freelanceModeration.approveProject);
router.post("/freelance/moderation/projects/:id/reject", freelanceModeration.rejectProject);

// Corporate preselection override
router.get("/preselections/corporate-pending", adminController.getCorporatePendingPreselections);
router.post("/preselections/:applicationId", adminController.adminPreselect);

export default router;
