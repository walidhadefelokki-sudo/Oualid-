import { CreditEntryType, MarketplacePaymentStatus, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import credits from "./credits.service";

/**
 * Buying credits.
 *
 * Two ways to pay, and they differ in who decides the money arrived. A card
 * payment is confirmed by the gateway's signed webhook; a CCP or BaridiMob
 * transfer is confirmed by a person looking at a receipt. Neither is
 * confirmed by the browser saying so.
 *
 * Credits are granted in exactly one place — `settle` — so there is one
 * answer to "how did this balance get here", and it is keyed on the payment
 * so a replayed webhook or a double-clicked approval pays out once.
 */

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

/** Short, readable, and unique enough to quote in an e-mail. */
const reference = () => `DL-${Date.now().toString(36).toUpperCase()}`;

const MANUAL_METHODS = ["CCP_TRANSFER", "BARIDIMOB", "BANK_TRANSFER"] as const;
type ManualMethod = (typeof MANUAL_METHODS)[number];

/**
 * Grants the credits a paid payment bought, once.
 *
 * The status guard is what makes it once: only the update that finds the
 * payment still unpaid proceeds, so two webhooks, or a webhook racing an
 * admin approval, cannot both grant. The ledger's idempotency key is the
 * second line of defence rather than the first.
 */
export const settle = async (paymentId: string) => {
  const payment = await prisma.marketplacePayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      status: true,
      amount: true,
      creditPack: { select: { id: true, name: true, credits: true } },
    },
  });

  if (!payment) throw new PaymentError("Paiement introuvable.", 404);
  if (!payment.creditPack) {
    throw new PaymentError("Ce paiement ne correspond à aucun pack de crédits.", 409);
  }

  const claimed = await prisma.marketplacePayment.updateMany({
    where: { id: payment.id, status: { not: MarketplacePaymentStatus.PAID } },
    data: { status: MarketplacePaymentStatus.PAID, paidAt: new Date() },
  });

  if (claimed.count === 0) {
    // Already settled. Returning the balance rather than throwing, because
    // a replayed webhook is a normal event and not an error to report.
    return { granted: false, balance: await credits.getBalance(payment.userId) };
  }

  const granted = await credits.grant({
    userId: payment.userId,
    amount: payment.creditPack.credits,
    type: CreditEntryType.PURCHASE,
    idempotencyKey: `payment:${payment.id}`,
    referenceType: "payment",
    referenceId: payment.id,
    note: `Achat : ${payment.creditPack.name}`,
  });

  await issueInvoice(payment.id);

  return { granted: !granted.replayed, balance: granted.balance };
};

/** An invoice number per calendar year, allocated on payment. */
const issueInvoice = async (paymentId: string) => {
  const existing = await prisma.marketplaceInvoice.findUnique({
    where: { paymentId },
    select: { id: true },
  });
  if (existing) return;

  const year = new Date().getFullYear();
  const countThisYear = await prisma.marketplaceInvoice.count({
    where: { number: { startsWith: `${year}-` } },
  });

  try {
    await prisma.marketplaceInvoice.create({
      data: {
        paymentId,
        number: `${year}-${String(countThisYear + 1).padStart(5, "0")}`,
      },
    });
  } catch (err) {
    // Two settlements racing for the same number. The unique index decides;
    // the loser retries once with the next one.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await prisma.marketplaceInvoice
        .create({
          data: {
            paymentId,
            number: `${year}-${String(countThisYear + 2).padStart(5, "0")}`,
          },
        })
        .catch(() => {});
      return;
    }
    throw err;
  }
};

/** Opens a payment for a pack. Nothing is granted until it settles. */
export const startPurchase = async (
  userId: string,
  creditPackId: string,
  method: string
) => {
  const pack = await prisma.creditPack.findFirst({
    where: { id: creditPackId, active: true },
    select: { id: true, name: true, credits: true, price: true, currency: true },
  });

  if (!pack) throw new PaymentError("Pack introuvable ou indisponible.", 404);

  const isManual = MANUAL_METHODS.includes(method as ManualMethod);
  const isCard = method === "CHARGILY_CIB" || method === "CHARGILY_EDAHABIA";
  if (!isManual && !isCard) throw new PaymentError("Moyen de paiement inconnu.");

  const payment = await prisma.marketplacePayment.create({
    data: {
      reference: reference(),
      userId,
      creditPackId: pack.id,
      // Read from the pack, never from the request: a client-supplied
      // amount is the price the buyer would like to pay.
      amount: pack.price,
      currency: pack.currency,
      method: method as never,
      status: isManual
        ? MarketplacePaymentStatus.AWAITING_REVIEW
        : MarketplacePaymentStatus.PENDING,
    },
    select: { id: true, reference: true, amount: true, currency: true, status: true },
  });

  return { payment, pack, isManual };
};

/** Records the gateway's checkout id so its webhook can be matched. */
export const attachCheckout = async (paymentId: string, checkoutId: string) =>
  prisma.marketplacePayment.update({
    where: { id: paymentId },
    data: { providerCheckoutId: checkoutId },
    select: { id: true },
  });

/**
 * Handles a verified webhook.
 *
 * The signature is checked by the caller, which has the raw body; this only
 * trusts a payment it can find by the gateway's own id.
 */
export interface WebhookResult {
  matched: boolean;
  settled: boolean;
  granted: boolean;
  balance: number | null;
}

export const handleWebhook = async (
  checkoutId: string,
  paid: boolean,
  payload: unknown
): Promise<WebhookResult> => {
  // One shape whatever happens, so a caller never has to narrow a union to
  // find out whether anything was granted.
  const nothing: WebhookResult = {
    matched: false,
    settled: false,
    granted: false,
    balance: null,
  };

  const payment = await prisma.marketplacePayment.findUnique({
    where: { providerCheckoutId: checkoutId },
    select: { id: true, status: true },
  });

  // An unknown checkout is not an error to retry: it may belong to the
  // recruitment side, which has its own handler.
  if (!payment) return nothing;

  await prisma.marketplacePayment.update({
    where: { id: payment.id },
    data: { providerPayload: payload as Prisma.InputJsonValue },
  });

  if (!paid) {
    await prisma.marketplacePayment.updateMany({
      where: { id: payment.id, status: { not: MarketplacePaymentStatus.PAID } },
      data: { status: MarketplacePaymentStatus.FAILED },
    });
    return { ...nothing, matched: true };
  }

  const result = await settle(payment.id);
  return { matched: true, settled: true, granted: result.granted, balance: result.balance };
};

/** The buyer attaches their transfer receipt. */
export const attachReceipt = async (paymentId: string, userId: string, fileId: string) => {
  const payment = await prisma.marketplacePayment.findFirst({
    where: { id: paymentId, userId },
    select: { id: true, status: true, method: true },
  });

  if (!payment) throw new PaymentError("Paiement introuvable.", 404);
  if (payment.status === "PAID") throw new PaymentError("Ce paiement est déjà réglé.", 409);
  if (!MANUAL_METHODS.includes(payment.method as ManualMethod)) {
    throw new PaymentError("Ce paiement ne se règle pas par virement.", 409);
  }

  return prisma.marketplacePayment.update({
    where: { id: payment.id },
    data: { receiptId: fileId, status: MarketplacePaymentStatus.AWAITING_REVIEW },
    select: { id: true, status: true },
  });
};

/**
 * An administrator approves a transfer.
 *
 * A receipt is required. Approving without one would be granting credits
 * because somebody said so, which is the thing the queue exists to prevent.
 */
export const approveManual = async (paymentId: string, adminId: string) => {
  const payment = await prisma.marketplacePayment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, receiptId: true, method: true },
  });

  if (!payment) throw new PaymentError("Paiement introuvable.", 404);
  if (payment.status === "PAID") throw new PaymentError("Ce paiement est déjà réglé.", 409);
  if (!MANUAL_METHODS.includes(payment.method as ManualMethod)) {
    throw new PaymentError("Ce paiement n'est pas un virement.", 409);
  }
  if (!payment.receiptId) {
    throw new PaymentError("Aucun reçu n'a été déposé pour ce paiement.", 409);
  }

  await prisma.marketplacePayment.update({
    where: { id: payment.id },
    data: { reviewedById: adminId, reviewedAt: new Date() },
  });

  return settle(payment.id);
};

export const rejectManual = async (paymentId: string, adminId: string, reason: string) => {
  if (!reason?.trim()) throw new PaymentError("Un motif est obligatoire.");

  const done = await prisma.marketplacePayment.updateMany({
    where: { id: paymentId, status: { not: MarketplacePaymentStatus.PAID } },
    data: {
      status: MarketplacePaymentStatus.REJECTED,
      rejectionReason: reason.trim(),
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
  });

  if (done.count === 0) {
    throw new PaymentError("Ce paiement ne peut plus être refusé.", 409);
  }

  return { status: MarketplacePaymentStatus.REJECTED };
};

/** A buyer's own purchase history. */
export const historyFor = async (userId: string) =>
  prisma.marketplacePayment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
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
      creditPack: { select: { name: true, credits: true } },
      invoice: { select: { number: true, issuedAt: true } },
    },
  });

/** The transfers waiting on a human, oldest first. */
export const pendingReceipts = async () =>
  prisma.marketplacePayment.findMany({
    where: { status: MarketplacePaymentStatus.AWAITING_REVIEW },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      reference: true,
      amount: true,
      currency: true,
      method: true,
      createdAt: true,
      receipt: { select: { url: true, fileName: true } },
      creditPack: { select: { name: true, credits: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });

export default {
  startPurchase,
  attachCheckout,
  handleWebhook,
  attachReceipt,
  approveManual,
  rejectManual,
  settle,
  historyFor,
  pendingReceipts,
  PaymentError,
};
