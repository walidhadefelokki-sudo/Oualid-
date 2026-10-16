import { Router } from "express";
import * as freelancePublic from "../controllers/freelancePublic.controller";
import * as freelancer from "../controllers/freelancer.controller";
import { protect } from "../middleware/auth.middleware";

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

/* Signed-in freelancer. `protect` from here down.
 *
 * Any Dar L'Emploi account may activate a freelance profile — the
 * specification is explicit that one account switches between selling and
 * buying — so there is no restrictTo here. What a caller may do is decided
 * by whether they have a FreelancerProfile, not by their recruitment role. */
router.get("/me/activation", protect, freelancer.getActivationDraft);
router.post("/me/activate", protect, freelancer.activate);
router.get("/me/workspace", protect, freelancer.getMyWorkspace);
router.get("/me/wallet", protect, freelancer.getWallet);

export default router;
