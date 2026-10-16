import { Router } from "express";
import * as freelancePublic from "../controllers/freelancePublic.controller";

/**
 * Public marketplace reads. No `protect` here on purpose: a visitor browses
 * services, projects and freelancers before signing in, and the handlers
 * already restrict themselves to published content.
 */
const router = Router();

router.get("/categories", freelancePublic.listCategories);
router.get("/services", freelancePublic.listServices);
router.get("/projects", freelancePublic.listProjects);
router.get("/freelancers", freelancePublic.listFreelancers);
router.get("/pricing", freelancePublic.listPricing);

export default router;
