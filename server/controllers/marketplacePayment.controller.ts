import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import paymentsService, { PaymentError } from "../services/marketplacePayment.service";
import {
  createCheckout,
  isChargilyConfigured,
  verifyWebhookSignature,
} from "../services/chargily.service";

/**
 * Buying marketplace credits.
 *
 * Reuses the Chargily integration the recruitment side already runs, so
 * there is one place that knows how to talk to the gateway and one webhook
 * secret to keep.
 */

const asHttpError = (err: unknown) =>
  err instanceof PaymentError ? new AppError(err.message, err.status) : err;

const APP_URL = () => process.env.APP_URL || "https://www.darlemploi.dz";

/** The packs and the transfer instructions, for the purchase screen. */
export const getPurchaseOptions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const packs = await prisma.creditPack.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true, credits: true, price: true, currency: true },
    });

    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["freelance.payment.ccp", "freelance.payment.baridimob"] } },
    });
    const read = (key: string) => settings.find((s) => s.key === key)?.value ?? null;

    res.json({
      success: true,
      data: {
        packs,
        // Whether the card route is actually usable, rather than a button
        // that fails once pressed.
        cardAvailable: isChargilyConfigured(),
        transfer: {
          ccp: read("freelance.payment.ccp"),
          baridimob: read("freelance.payment.baridimob"),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Opens a purchase, and for a card returns where to send the buyer. */
export const startPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { creditPackId, method } = req.body as { creditPackId?: string; method?: string };
    if (!creditPackId) return next(new AppError("Choisissez un pack.", 400));

    const { payment, pack, isManual } = await paymentsService.startPurchase(
      req.user!.id,
      String(creditPackId),
      String(method ?? "CHARGILY_CIB")
    );

    if (isManual) {
      return res.status(201).json({
        success: true,
        data: { payment, checkoutUrl: null, instructions: true },
      });
    }

    if (!isChargilyConfigured()) {
      return next(
        new AppError(
          "Le paiement par carte n'est pas disponible. Choisissez le virement CCP ou BaridiMob.",
          503
        )
      );
    }

    const checkout = await createCheckout({
      // Chargily takes whole dinars.
      amount: Math.round(Number(payment.amount)),
      successUrl: `${APP_URL()}/freelance/paiement/${payment.id}`,
      failureUrl: `${APP_URL()}/freelance/paiement/${payment.id}`,
      description: `${pack.name} — Dar L'emploi Freelance`,
      locale: "fr",
      metadata: { marketplacePaymentId: payment.id },
    });

    await paymentsService.attachCheckout(payment.id, checkout.id);

    res.status(201).json({
      success: true,
      data: { payment, checkoutUrl: checkout.url, instructions: false },
    });
  } catch (err) {
    next(asHttpError(err));
  }
};

/**
 * The gateway's webhook.
 *
 * The signature covers the exact bytes sent, so it is checked against
 * `rawBody` — which the app's JSON parser keeps for this purpose — and not
 * against a re-serialised copy of the parsed object, which would differ by
 * key order and whitespace and never verify.
 */
export const webhook = async (req: Request, res: Response) => {
  const signature = req.get("signature") ?? req.get("x-signature") ?? undefined;
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!raw || !verifyWebhookSignature(raw, signature)) {
    console.warn("Marketplace webhook: bad or missing signature, ignoring.");
    return res.status(400).json({ success: false, message: "Invalid signature." });
  }

  const event = req.body as { type?: string; data?: { id?: string; status?: string } };
  const checkoutId = event?.data?.id;
  if (!checkoutId) return res.status(200).json({ success: true });

  try {
    const paid = event.type === "checkout.paid" || event.data?.status === "paid";
    await paymentsService.handleWebhook(checkoutId, paid, event);
  } catch (err) {
    // Answered 200 regardless: the gateway retries on anything else, and a
    // bug here would turn into a retry storm rather than a fixed payment.
    console.error("Marketplace webhook failed:", err);
  }

  res.status(200).json({ success: true });
};

/** One payment, for the status screen the buyer returns to. */
export const getPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await prisma.marketplacePayment.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        rejectionReason: true,
        paidAt: true,
        createdAt: true,
        receipt: { select: { url: true } },
        creditPack: { select: { name: true, credits: true } },
        invoice: { select: { number: true, issuedAt: true } },
      },
    });

    if (!payment) return next(new AppError("Paiement introuvable.", 404));
    res.json({ success: true, data: { payment } });
  } catch (err) {
    next(err);
  }
};

export const listMyPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: { payments: await paymentsService.historyFor(req.user!.id) } });
  } catch (err) {
    next(err);
  }
};

export const attachReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.body as { fileId?: string };
    if (!fileId) return next(new AppError("Aucun reçu fourni.", 400));

    const result = await paymentsService.attachReceipt(
      req.params.id,
      req.user!.id,
      String(fileId)
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};

/* ----------------------------------------------------------------- admin */

export const listPendingReceipts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: { payments: await paymentsService.pendingReceipts() } });
  } catch (err) {
    next(err);
  }
};

export const approveReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: await paymentsService.approveManual(req.params.id, req.user!.id),
    });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const rejectReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body as { reason?: string };
    res.json({
      success: true,
      data: await paymentsService.rejectManual(
        req.params.id,
        req.user!.id,
        String(reason ?? "")
      ),
    });
  } catch (err) {
    next(asHttpError(err));
  }
};
