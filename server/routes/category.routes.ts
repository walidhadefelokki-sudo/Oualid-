import { Router } from "express";
import { getAllCategories, getCategoryBySlug } from "../controllers/category.controller";

const router = Router();

// Both routes are deliberately public: the landing page renders the domain
// grid and its popup before anyone signs in. They expose only published job
// data and company names — no candidate or recruiter information.
router.get("/", getAllCategories);
router.get("/:slug", getCategoryBySlug);

export default router;
