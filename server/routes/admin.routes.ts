import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import * as adminManage from "../controllers/adminManage.controller";
import * as schedule from "../controllers/schedule.controller";
import * as adminEmail from "../controllers/adminEmail.controller";
import * as freelanceModeration from "../controllers/freelanceModeration.controller";
import * as teamTask from "../controllers/teamTask.controller";
import * as marketplacePayment from "../controllers/marketplacePayment.controller";
import * as preselection from "../controllers/preselection.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";
import {
  requireAdminScope,
  requireSuperAdmin,
} from "../middleware/adminScope.middleware";

const router = Router();

// Everything here is admin-only
router.use(protect);
router.use(restrictTo("ADMIN"));

/* Each area then names the scope it needs.
 *
 * `restrictTo("ADMIN")` alone was the whole check, so any administrator
 * could change roles, delete accounts, grant annonce credits, approve
 * transfers and mail the entire database. The scope sits on the route
 * rather than inside the handler, so a route added without one is refused
 * by default instead of open by default. */
const scope = requireAdminScope;

router.get("/stats", scope("overview"), adminController.getStats);

// Companies / recruiter plans
router.get("/companies", scope("plans"), adminController.getAllCompanies);
router.get("/companies/:id", scope("plans"), adminController.getCompany);
router.patch("/companies/:id/plan", scope("plans"), adminController.updateCompanyPlan);
// Credits an annonce pack onto a company. Manual until a payment processor
// can call grantPostings from its webhook.
router.patch("/companies/:id/postings", scope("plans"), adminController.grantCompanyPostings);

// Users
router.get("/users", scope("users"), adminController.getAllUsers);
router.patch("/users/:id/status", scope("users"), adminController.updateUserStatus);
router.get("/users/:id", scope("users"), adminManage.getUserDetail);
router.patch("/users/:id", scope("users"), adminManage.updateUser);
// Sends the account its confirmation link — the only way an account that
// registered before confirmation existed can leave PENDING by itself.
router.post("/users/:id/send-verification", scope("users"), adminManage.sendVerificationLink);
// Marks the account DELETED rather than removing the row — see the controller.
router.delete("/users/:id", scope("users"), adminManage.deleteUser);

/* Every payment on the platform, merged from the three tables money
   arrives through. Read-only: approving a transfer stays on the freelance
   moderation route that owns the credit grant, so there is one place that
   can turn a receipt into credits. */
router.get("/payments", scope("payments"), adminManage.getPayments);

/* Who may administer what.
 *
 * Unrestricted administrators only, whatever areas a limited one holds: an
 * administrator who can edit their own permissions is not limited. */
router.get("/access", requireSuperAdmin, adminManage.listAdminAccess);
router.get("/access/scopes", requireSuperAdmin, adminManage.listAdminScopes);
router.patch("/access/:id", requireSuperAdmin, adminManage.updateAdminAccess);

// Job offers
router.get("/jobs", scope("jobs"), adminManage.getAllJobsAdmin);
router.patch("/jobs/:id", scope("jobs"), adminManage.updateJobAdmin);
router.delete("/jobs/:id", scope("jobs"), adminManage.deleteJobAdmin);

// Schedules — the platform team's own diary.
router.get("/schedules", scope("schedules"), schedule.listSchedules);
router.post("/schedules", scope("schedules"), schedule.createSchedule);
router.patch("/schedules/:id", scope("schedules"), schedule.updateSchedule);
router.delete("/schedules/:id", scope("schedules"), schedule.deleteSchedule);

// Mail to selected accounts, composed in the dashboard. One batch per
// request: the function is killed at 60s and the send is the slow part.
router.post("/emails/send", scope("emails"), adminEmail.sendBroadcast);
router.post("/emails/preview", scope("emails"), adminEmail.sendBroadcastPreview);

// Freelance moderation. Nothing a freelancer submits reaches the public
// until one of these decisions is taken.
router.get("/freelance/moderation", scope("freelance_moderation"), freelanceModeration.listQueue);
router.get("/freelance/moderation/stats", scope("freelance_moderation"), freelanceModeration.getQueueStats);
router.get("/freelance/moderation/history", scope("freelance_moderation"), freelanceModeration.listHistory);
router.post("/freelance/moderation/services/:id/approve", scope("freelance_moderation"), freelanceModeration.approveService);
router.post("/freelance/moderation/services/:id/reject", scope("freelance_moderation"), freelanceModeration.rejectService);
router.get("/freelance/moderation/projects", scope("freelance_moderation"), freelanceModeration.listProjectQueue);
router.post("/freelance/moderation/projects/:id/approve", scope("freelance_moderation"), freelanceModeration.approveProject);
router.post("/freelance/moderation/projects/:id/reject", scope("freelance_moderation"), freelanceModeration.rejectProject);
// Messages the contact detector flagged. A flag nobody reads is decoration,
// and the rule it stands for is imaginary — so it gets a queue.
router.get("/freelance/moderation/messages", scope("freelance_moderation"), freelanceModeration.listFlaggedMessages);
router.post("/freelance/moderation/messages/:id/clear", scope("freelance_moderation"), freelanceModeration.clearMessageFlag);

// The team's weekly board. A week is identified by its Monday.
router.get("/team/board", scope("team_tasks"), teamTask.getBoard);
router.post("/team/carry-over", scope("team_tasks"), teamTask.carryOver);
router.get("/team/members", scope("team_tasks"), teamTask.listMembers);
router.post("/team/members", scope("team_tasks"), teamTask.createMember);
router.patch("/team/members/:id", scope("team_tasks"), teamTask.updateMember);
router.delete("/team/members/:id", scope("team_tasks"), teamTask.deleteMember);
router.post("/team/tasks", scope("team_tasks"), teamTask.createTask);
router.get("/team/tasks/:id", scope("team_tasks"), teamTask.getTask);
router.patch("/team/tasks/:id", scope("team_tasks"), teamTask.updateTask);
router.delete("/team/tasks/:id", scope("team_tasks"), teamTask.deleteTask);

// Transfers waiting on a human. A screenshot is not a payment until
// somebody has looked at it.
router.get("/freelance/payments/pending", scope("freelance_moderation"), marketplacePayment.listPendingReceipts);
router.post("/freelance/payments/:id/approve", scope("freelance_moderation"), marketplacePayment.approveReceipt);
router.post("/freelance/payments/:id/reject", scope("freelance_moderation"), marketplacePayment.rejectReceipt);

// Corporate preselection override
router.get("/preselections/corporate-pending", scope("preselection"), adminController.getCorporatePendingPreselections);
// The same queue, grouped by the offer each candidate answered.
router.get("/preselections/corporate-pending/by-offer", scope("preselection"), preselection.getCorporatePendingByOffer);
router.post("/preselections/:applicationId", scope("preselection"), adminController.adminPreselect);

export default router;
