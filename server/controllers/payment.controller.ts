import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { requirePack, ANNONCE_PACKS } from "../constants/annoncePacks";
import {
  createCheckout,
  verifyWebhookSignature,
  isChargilyConfigured,
} from "../services/chargily.service";
import { grantPostings } from "../services/postingQuota.service";
import { renderInvoicePdf } from "../services/invoicePdf.service";

/**
 * Annonce pack purchases.
 *
 * The rule the whole file is built around: the browser names a pack, never a
 * price. requirePack resolves the amount from the server's catalogue, that
 * amount is what goes to Chargily and what is written on the order, and the
 * webhook grants annonces from the stored row rather than from anything the
 * request carries.
 */

const appUrl = () =>
  (process.env.APP_URL?.trim() || process.env.CORS_ORIGIN?.split(",")[0]?.trim() || "http://localhost:5173").replace(/\/$/, "");

/** The caller's company, and their role in it. */
const resolveMembership = async (userId: string) => {
  const membership = await prisma.companyMember.findFirst({
    where: { recruiter: { userId } },
    orderBy: { createdAt: "asc" },
    include: { company: { select: { id: true, name: true, plan: true } } },
  });

  if (!membership) {
    throw new AppError("No company is attached to this account.", 404);
  }

  return membership;
};

/** The catalogue, so the UI and the charge cannot drift apart. */
export const listPacks = async (_req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    data: { packs: ANNONCE_PACKS, online: isChargilyConfigured() },
  });
};

/**
 * Starts a purchase: records the order, then opens a Chargily checkout for it.
 *
 * The order row is written first and deliberately — it holds the server's
 * price, and the webhook later matches against it by checkout id.
 */
export const startPackCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isChargilyConfigured()) {
      return next(
        new AppError("Le paiement en ligne n'est pas encore activé. Contactez le support.", 503)
      );
    }

    const membership = await resolveMembership(req.user!.id);

    // The only thing taken from the request. Everything else is ours.
    const pack = requirePack((req.body as { packId?: unknown })?.packId);

    const order = await prisma.packOrder.create({
      data: {
        companyId: membership.companyId,
        buyerId: req.user!.id,
        packId: pack.id,
        jobs: pack.jobs,
        amount: pack.price,
        currency: "dzd",
        status: "PENDING",
      },
    });

    let checkout;
    try {
      checkout = await createCheckout({
        amount: pack.price,
        successUrl: `${appUrl()}/?payment=success&order=${order.id}`,
        failureUrl: `${appUrl()}/?payment=failed&order=${order.id}`,
        description: `${pack.jobs} annonce(s) — Dar L'emploi`,
        // Matched back on the webhook. The amount is not read from here.
        metadata: { orderId: order.id, companyId: membership.companyId, packId: pack.id },
      });
    } catch (err) {
      // No checkout means no purchase; do not leave a PENDING row behind that
      // will never resolve.
      await prisma.packOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
      throw err;
    }

    const updated = await prisma.packOrder.update({
      where: { id: order.id },
      data: { checkoutId: checkout.id, checkoutUrl: checkout.url },
    });

    res.status(201).json({
      status: "success",
      data: { orderId: updated.id, checkoutUrl: checkout.url },
    });
  } catch (err) {
    next(err);
  }
};

/** INV-2026-000001, allocated only on payment so there are no gaps. */
const nextInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const last = await prisma.packOrder.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  const seq = last?.invoiceNumber ? Number(last.invoiceNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, "0")}`;
};

/**
 * Chargily's webhook.
 *
 * Public, because Chargily calls it — which is exactly why the signature is
 * checked first. Without that, a POST of {"type":"checkout.paid"} from anyone
 * who found the URL would credit annonces for free.
 *
 * Idempotent: the grant is applied inside a transaction that only fires when
 * the order is still PENDING, so a webhook Chargily retries (or replays)
 * cannot hand out the same pack twice.
 */
export const chargilyWebhook = async (req: Request, res: Response) => {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!raw) {
    console.error("Chargily webhook: raw body missing — cannot verify signature.");
    return res.status(400).json({ message: "Cannot verify payload" });
  }

  const signature = req.header("signature") || req.header("x-signature") || undefined;

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("Chargily webhook: bad signature, rejected.");
    return res.status(403).json({ message: "Invalid signature" });
  }

  const event = req.body as {
    type?: string;
    data?: { id?: string; status?: string; amount?: number; metadata?: Record<string, string> | null };
  };

  // Acknowledge anything else so Chargily stops retrying it.
  if (event?.type !== "checkout.paid") {
    return res.status(200).json({ received: true, ignored: event?.type ?? "unknown" });
  }

  const checkoutId = event.data?.id;
  if (!checkoutId) {
    return res.status(400).json({ message: "Missing checkout id" });
  }

  try {
    const order = await prisma.packOrder.findUnique({ where: { checkoutId } });

    if (!order) {
      // Signed, so it is genuinely Chargily — but it belongs to nothing here.
      console.error(`Chargily webhook: no order for checkout ${checkoutId}`);
      return res.status(200).json({ received: true, matched: false });
    }

    if (order.status === "PAID") {
      return res.status(200).json({ received: true, alreadyApplied: true });
    }

    const invoiceNumber = await nextInvoiceNumber();

    // updateMany with a status guard, so two concurrent deliveries cannot both
    // pass the check above and both grant the pack.
    const claimed = await prisma.packOrder.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(), invoiceNumber },
    });

    if (claimed.count === 0) {
      return res.status(200).json({ received: true, alreadyApplied: true });
    }

    // Paying for annonces puts the company on the Annonces plan and credits
    // what it bought. Corporate is not downgraded by a pack purchase.
    await prisma.company.updateMany({
      where: { id: order.companyId, plan: "FREE" },
      data: { plan: "PREMIUM" },
    });

    await grantPostings(order.companyId, order.jobs);

    console.log(
      `Chargily: order ${order.id} paid — ${order.jobs} annonce(s), ${order.amount} DZD, invoice ${invoiceNumber}`
    );

    res.status(200).json({ received: true, applied: true });
  } catch (err) {
    console.error("Chargily webhook processing failed:", err);
    // A 500 makes Chargily retry, which is what we want for a transient fault.
    res.status(500).json({ message: "Processing failed" });
  }
};

/** The company's paid purchases, newest first. */
export const listInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const membership = await resolveMembership(req.user!.id);

    const invoices = await prisma.packOrder.findMany({
      where: { companyId: membership.companyId, status: "PAID" },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        packId: true,
        jobs: true,
        amount: true,
        currency: true,
        paidAt: true,
        checkoutId: true,
      },
    });

    res.status(200).json({ status: "success", data: { invoices } });
  } catch (err) {
    next(err);
  }
};

/**
 * One invoice as a PDF.
 *
 * Scoped to the caller's own company: the id is a uuid, but an invoice is a
 * financial document and guessing should not be the only thing standing
 * between someone and another company's purchase history.
 */
export const downloadInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const membership = await resolveMembership(req.user!.id);

    const order = await prisma.packOrder.findFirst({
      where: { id: req.params.id, companyId: membership.companyId, status: "PAID" },
      include: {
        company: { select: { name: true } },
        buyer: { select: { email: true } },
      },
    });

    if (!order || !order.paidAt || !order.invoiceNumber) {
      return next(new AppError("Facture introuvable.", 404));
    }

    const pdf = renderInvoicePdf({
      invoiceNumber: order.invoiceNumber,
      paidAt: order.paidAt,
      companyName: order.company.name,
      buyerEmail: order.buyer?.email ?? null,
      packId: order.packId,
      jobs: order.jobs,
      amount: order.amount,
      currency: order.currency,
      checkoutId: order.checkoutId,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${order.invoiceNumber}.pdf"`
    );
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
};

/**
 * What happened to one order, for the page the customer lands on after paying.
 *
 * Chargily redirects the browser back before the webhook has necessarily
 * arrived, so this reports the order's real state and the UI waits rather than
 * announcing a success that has not been confirmed.
 */
export const getOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const membership = await resolveMembership(req.user!.id);

    const order = await prisma.packOrder.findFirst({
      where: { id: req.params.id, companyId: membership.companyId },
      select: {
        id: true,
        status: true,
        jobs: true,
        amount: true,
        currency: true,
        invoiceNumber: true,
        paidAt: true,
      },
    });

    if (!order) return next(new AppError("Commande introuvable.", 404));

    res.status(200).json({ status: "success", data: { order } });
  } catch (err) {
    next(err);
  }
};
