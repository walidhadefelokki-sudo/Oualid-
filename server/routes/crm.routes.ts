import { Router } from "express";
import * as crm from "../controllers/crm.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";

const router = Router();

// The whole CRM is admin-only. Applied here rather than per-route so a new
// endpoint cannot be added without the guard by forgetting a line.
router.use(protect);
router.use(restrictTo("ADMIN"));

// Leads
router.get("/leads", crm.listLeads);
router.post("/leads", crm.createLead);
router.patch("/leads/:id", crm.updateLead);
router.delete("/leads/:id", crm.deleteLead);
router.post("/leads/:id/convert", crm.convertLead);

// Relationship history, on a lead or on a person
router.post("/notes", crm.addNote);
router.delete("/notes/:id", crm.deleteNote);

// Recruiters and candidates
router.get("/contacts", crm.listContacts);

export default router;
