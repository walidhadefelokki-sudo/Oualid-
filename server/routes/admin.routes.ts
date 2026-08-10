import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
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

// Users
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);

// Corporate preselection override
router.get("/preselections/corporate-pending", adminController.getCorporatePendingPreselections);
router.post("/preselections/:applicationId", adminController.adminPreselect);

export default router;
