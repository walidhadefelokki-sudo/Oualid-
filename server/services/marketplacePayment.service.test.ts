import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Buying credits.
 *
 * This is the file where a bug takes someone's money or gives away credits,
 * so the cases that matter are the repeated ones: a webhook delivered twice,
 * an approval clicked twice, a webhook racing an admin.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error("Refusing to run against a non-local database.");
}
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const payments = await import("./marketplacePayment.service");
const credits = await import("./credits.service");

const BUYER = "payment-buyer@example.invalid";
const ADMIN_EMAIL = "payment-admin@example.invalid";

let buyerId: string;
let adminId: string;
let packId: string;
let fileId: string;

beforeAll(async () => {
  const pack = await prisma.creditPack.findFirst({ where: { credits: 150 } });
  if (pack) {
    packId = pack.id;
  } else {
    const created = await prisma.creditPack.create({
      data: { name: "150 crédits", credits: 150, price: "2500", position: 9 },
      select: { id: true },
    });
    packId = created.id;
  }

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, password: "x", role: "ADMIN" },
    select: { id: true },
  });
  adminId = admin.id;

  const file = await prisma.fileAsset.create({
    data: { url: "https://example.invalid/recu.jpg", provider: "test" },
    select: { id: true },
  });
  fileId = file.id;
});

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: BUYER } });
  const u = await prisma.user.create({
    data: { email: BUYER, password: "x", role: "CANDIDATE" },
    select: { id: true },
  });
  buyerId = u.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [BUYER, ADMIN_EMAIL] } } });
  await prisma.fileAsset.deleteMany({ where: { id: fileId } });
  await prisma.$disconnect();
});

describe("startPurchase", () => {
  it("prices from the pack, not from the request", async () => {
    const { payment } = await payments.startPurchase(buyerId, packId, "CHARGILY_CIB");
    expect(Number(payment.amount)).toBe(2500);
    expect(payment.status).toBe("PENDING");
  });

  it("puts a transfer straight into the review queue", async () => {
    const { payment, isManual } = await payments.startPurchase(buyerId, packId, "CCP_TRANSFER");
    expect(isManual).toBe(true);
    expect(payment.status).toBe("AWAITING_REVIEW");
  });

  it("grants nothing until it settles", async () => {
    await payments.startPurchase(buyerId, packId, "CHARGILY_CIB");
    expect(await credits.getBalance(buyerId)).toBe(0);
  });

  it("refuses an unknown method", async () => {
    await expect(payments.startPurchase(buyerId, packId, "BITCOIN")).rejects.toThrow(
      /Moyen de paiement/
    );
  });
});

describe("the card webhook", () => {
  const start = async () => {
    const { payment } = await payments.startPurchase(buyerId, packId, "CHARGILY_CIB");
    const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await payments.attachCheckout(payment.id, checkoutId);
    return { paymentId: payment.id, checkoutId };
  };

  it("grants the credits once paid", async () => {
    const { checkoutId } = await start();
    await payments.handleWebhook(checkoutId, true, { event: "checkout.paid" });

    expect(await credits.getBalance(buyerId)).toBe(150);
  });

  it("grants once when the webhook is delivered twice", async () => {
    const { checkoutId } = await start();
    await payments.handleWebhook(checkoutId, true, {});
    const second = await payments.handleWebhook(checkoutId, true, {});

    expect(second.granted).toBe(false);
    expect(await credits.getBalance(buyerId)).toBe(150);
  });

  it("grants once when two webhooks arrive together", async () => {
    const { checkoutId } = await start();
    await Promise.allSettled([
      payments.handleWebhook(checkoutId, true, {}),
      payments.handleWebhook(checkoutId, true, {}),
    ]);

    expect(await credits.getBalance(buyerId)).toBe(150);
    const entries = await prisma.creditLedgerEntry.count({
      where: { referenceType: "payment", wallet: { userId: buyerId } },
    });
    expect(entries).toBe(1);
  });

  it("grants nothing on a failed payment", async () => {
    const { checkoutId, paymentId } = await start();
    await payments.handleWebhook(checkoutId, false, {});

    expect(await credits.getBalance(buyerId)).toBe(0);
    const after = await prisma.marketplacePayment.findUnique({ where: { id: paymentId } });
    expect(after!.status).toBe("FAILED");
  });

  it("ignores a checkout it does not know", async () => {
    const result = await payments.handleWebhook("chk_not_ours", true, {});
    expect(result.matched).toBe(false);
  });

  it("writes an invoice number on payment", async () => {
    const { checkoutId, paymentId } = await start();
    await payments.handleWebhook(checkoutId, true, {});

    const invoice = await prisma.marketplaceInvoice.findUnique({ where: { paymentId } });
    expect(invoice?.number).toMatch(/^\d{4}-\d{5}$/);
  });
});

describe("manual transfers", () => {
  const startManual = async () => {
    const { payment } = await payments.startPurchase(buyerId, packId, "CCP_TRANSFER");
    return payment.id;
  };

  it("refuses approval with no receipt", async () => {
    const id = await startManual();
    await expect(payments.approveManual(id, adminId)).rejects.toThrow(/reçu/);
    expect(await credits.getBalance(buyerId)).toBe(0);
  });

  it("grants once the receipt is approved", async () => {
    const id = await startManual();
    await payments.attachReceipt(id, buyerId, fileId);
    await payments.approveManual(id, adminId);

    expect(await credits.getBalance(buyerId)).toBe(150);
  });

  it("grants once when approval is clicked twice", async () => {
    const id = await startManual();
    await payments.attachReceipt(id, buyerId, fileId);
    await payments.approveManual(id, adminId);
    await expect(payments.approveManual(id, adminId)).rejects.toThrow(/déjà réglé/);

    expect(await credits.getBalance(buyerId)).toBe(150);
  });

  it("refusing requires a reason and grants nothing", async () => {
    const id = await startManual();
    await payments.attachReceipt(id, buyerId, fileId);

    await expect(payments.rejectManual(id, adminId, "  ")).rejects.toThrow(/motif/);
    await payments.rejectManual(id, adminId, "Reçu illisible.");

    expect(await credits.getBalance(buyerId)).toBe(0);
    const after = await prisma.marketplacePayment.findUnique({ where: { id } });
    expect(after!.status).toBe("REJECTED");
    expect(after!.rejectionReason).toBe("Reçu illisible.");
  });

  it("cannot refuse a payment already settled", async () => {
    const id = await startManual();
    await payments.attachReceipt(id, buyerId, fileId);
    await payments.approveManual(id, adminId);

    await expect(payments.rejectManual(id, adminId, "trop tard")).rejects.toThrow(/plus/);
    expect(await credits.getBalance(buyerId)).toBe(150);
  });

  it("does not let someone attach a receipt to another buyer's payment", async () => {
    const id = await startManual();

    const other = await prisma.user.create({
      data: { email: "payment-other@example.invalid", password: "x", role: "CANDIDATE" },
      select: { id: true },
    });

    await expect(payments.attachReceipt(id, other.id, fileId)).rejects.toThrow(/introuvable/);
    await prisma.user.deleteMany({ where: { email: "payment-other@example.invalid" } });
  });

  it("appears in the review queue only while it waits", async () => {
    const id = await startManual();
    await payments.attachReceipt(id, buyerId, fileId);

    expect((await payments.pendingReceipts()).some((p) => p.id === id)).toBe(true);

    await payments.approveManual(id, adminId);
    expect((await payments.pendingReceipts()).some((p) => p.id === id)).toBe(false);
  });
});

describe("history", () => {
  it("shows the buyer what they paid and its invoice", async () => {
    const { payment } = await payments.startPurchase(buyerId, packId, "CHARGILY_CIB");
    await payments.attachCheckout(payment.id, `chk_h_${Date.now()}`);
    await payments.settle(payment.id);

    const history = await payments.historyFor(buyerId);
    expect(history[0].status).toBe("PAID");
    expect(history[0].invoice?.number).toBeTruthy();
    expect(history[0].creditPack?.credits).toBe(150);
  });
});
