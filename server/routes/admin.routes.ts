import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import * as adminManage from "../controllers/adminManage.controller";
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
router.patch("/users/:id", adminManage.updateUser);
// Marks the account DELETED rather than removing the row — see the controller.
router.delete("/users/:id", adminManage.deleteUser);

// Job offers
router.get("/jobs", adminManage.getAllJobsAdmin);
router.patch("/jobs/:id", adminManage.updateJobAdmin);
router.delete("/jobs/:id", adminManage.deleteJobAdmin);

// Corporate preselection override
router.get("/preselections/corporate-pending", adminController.getCorporatePendingPreselections);
router.post("/preselections/:applicationId", adminController.adminPreselect);

export default router;
