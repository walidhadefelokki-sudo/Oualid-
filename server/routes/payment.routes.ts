import { Router } from "express";
import {
  listPacks,
  startPackCheckout,
  chargilyWebhook,
  listInvoices,
  downloadInvoice,
  getOrderStatus,
} from "../controllers/payment.controller";
import { protect } from "../middleware/auth.middleware";
import { restrictTo } from "../middleware/role.middleware";

const router = Router();

/**
 * Chargily's webhook. Deliberately before `protect`: Chargily is not a signed-in
 * user, it authenticates by signing the payload, which the controller verifies
 * before it believes a word of it.
 */
router.post("/webhook/chargily", chargilyWebhook);

// The catalogue is public — the home page prices come from it too.
router.get("/packs", listPacks);

router.use(protect);
router.use(restrictTo("RECRUITER", "ADMIN"));

router.post("/checkout", startPackCheckout);
router.get("/orders/:id", getOrderStatus);
router.get("/invoices", listInvoices);
router.get("/invoices/:id/pdf", downloadInvoice);

export default router;
