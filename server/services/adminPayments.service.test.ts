import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * The admin payments list, against a real database.
 *
 * Three tables with three status enums, three amount types and no shared key
 * are being presented as one list. What is worth testing is that the merge
 * does not lose or mis-state money: the statuses map onto one vocabulary, only
 * paid money counts as revenue, and a pending transfer still appears in a date
 * range even though it has no payment date.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

const isLocal = !!url && /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!isLocal && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error(
    "Refusing to run tests against a non-local database. These tests write and " +
      "delete rows. Set TEST_DATABASE_URL to a local database, or set " +
      "ALLOW_REMOTE_TEST_DB=1 if you are certain."
  );
}

process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const payments = await import("./adminPayments.service");

const TAG = "adminpay-test";

/** Only the rows this file created; the database may hold real ones. */
const ours = (rows: any[]) => rows.filter((r) => r.reference.startsWith("ADMINPAY"));

const list = (over: Partial<Parameters<typeof payments.listPayments>[0]> = {}) =>
  payments.listPayments({ q: "ADMINPAY", ...over });

const wipe = async () => {
  await prisma.marketplacePayment.deleteMany({ where: { reference: { startsWith: "ADMINPAY" } } });
  await prisma.packOrder.deleteMany({ where: { packId: { startsWith: TAG } } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.user.deleteMany({ where: { email: { contains: TAG } } });
  await prisma.creditPack.deleteMany({ where: { name: { startsWith: TAG } } });
};

beforeAll(async () => {
  await wipe();

  const recruiterUser = await prisma.user.create({
    data: {
      email: `${TAG}-rec@example.invalid`,
      password: "x",
      role: "RECRUITER",
      firstName: "Yacine",
      lastName: "Brahimi",
      recruiterProfile: { create: {} },
    },
    include: { recruiterProfile: true },
  });

  const company = await prisma.company.create({
    data: { name: "Makers Label", slug: `${TAG}-co`, plan: "PREMIUM" },
  });

  await prisma.companyMember.create({
    data: {
      companyId: company.id,
      recruiterId: recruiterUser.recruiterProfile!.id,
      role: "OWNER",
    },
  });

  // 1. A subscription instalment, paid.
  const subscription = await prisma.subscription.create({
    data: {
      companyId: company.id,
      plan: "PREMIUM",
      startsAt: new Date("2026-01-01"),
      endsAt: new Date("2027-01-01"),
    },
  });

  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: 30000,
      currency: "DZD",
      method: "CARD",
      status: "PAID",
      transactionId: "ADMINPAY-SUB-1",
      paidAt: new Date("2026-02-10T10:00:00Z"),
    },
  });

  // 2. An annonce pack, paid — amount is a whole-dinar Int on this table.
  await prisma.packOrder.create({
    data: {
      companyId: company.id,
      buyerId: recruiterUser.id,
      packId: `${TAG}-pack-5`,
      jobs: 5,
      amount: 12000,
      currency: "dzd",
      status: "PAID",
      invoiceNumber: "ADMINPAY-INV-001",
      paidAt: new Date("2026-02-12T10:00:00Z"),
    },
  });

  // 3. A pack that failed: attempted, never earned.
  await prisma.packOrder.create({
    data: {
      companyId: company.id,
      buyerId: recruiterUser.id,
      packId: `${TAG}-pack-1`,
      jobs: 1,
      amount: 3000,
      currency: "dzd",
      status: "FAILED",
      checkoutId: "ADMINPAY-CHK-FAIL",
      // Dated explicitly. A failed attempt has no paidAt and would otherwise
      // default to now(), making it the most recent row in the list.
      createdAt: new Date("2026-02-08T10:00:00Z"),
    },
  });

  const freelancer = await prisma.user.create({
    data: {
      email: `${TAG}-free@example.invalid`,
      password: "x",
      role: "CANDIDATE",
      firstName: "Amina",
      lastName: "Belkacem",
    },
  });

  const pack = await prisma.creditPack.create({
    data: { name: `${TAG}-50`, credits: 50, price: "2500", currency: "DZD" },
  });

  // 4. Marketplace credits, paid by card — a Decimal amount.
  await prisma.marketplacePayment.create({
    data: {
      reference: "ADMINPAY-MKT-1",
      userId: freelancer.id,
      creditPackId: pack.id,
      amount: "2500",
      currency: "DZD",
      method: "CHARGILY_CIB",
      status: "PAID",
      paidAt: new Date("2026-02-14T10:00:00Z"),
    },
  });

  // 5. A CCP transfer waiting on a human. No paidAt.
  await prisma.marketplacePayment.create({
    data: {
      reference: "ADMINPAY-MKT-2",
      userId: freelancer.id,
      creditPackId: pack.id,
      amount: "5000",
      currency: "DZD",
      method: "CCP_TRANSFER",
      status: "AWAITING_REVIEW",
      createdAt: new Date("2026-02-15T10:00:00Z"),
    },
  });
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("the merge", () => {
  it("brings all three tables into one list", async () => {
    const { payments: rows } = await list();
    const sources = ours(rows).map((r) => r.source);

    expect(sources).toContain("subscription");
    expect(sources).toContain("pack");
    expect(sources).toContain("marketplace");
    expect(ours(rows)).toHaveLength(5);
  });

  it("orders by when the money moved, newest first", async () => {
    const { payments: rows } = await list();

    // The awaiting-review transfer has no paidAt and falls back to its
    // creation date, which is the most recent of the five.
    expect(ours(rows).map((r) => r.reference)).toEqual([
      "ADMINPAY-MKT-2",
      "ADMINPAY-MKT-1",
      "ADMINPAY-INV-001",
      "ADMINPAY-SUB-1",
      "ADMINPAY-CHK-FAIL",
    ]);
  });

  it("names the payer and what they bought, whichever table it came from", async () => {
    const rows = ours((await list()).payments);

    const sub = rows.find((r) => r.source === "subscription")!;
    expect(sub.payer.name).toBe("Yacine Brahimi");
    expect(sub.payer.company).toBe("Makers Label");
    expect(sub.description).toContain("PREMIUM");

    const pack = rows.find((r) => r.reference === "ADMINPAY-INV-001")!;
    expect(pack.description).toContain("5 annonce(s)");
    expect(pack.invoiceNumber).toBe("ADMINPAY-INV-001");

    const mkt = rows.find((r) => r.reference === "ADMINPAY-MKT-1")!;
    expect(mkt.payer.name).toBe("Amina Belkacem");
    expect(mkt.description).toContain("50");
  });

  it("maps three status enums onto one vocabulary", async () => {
    const rows = ours((await list()).payments);
    const status = (ref: string) => rows.find((r) => r.reference === ref)!.status;

    expect(status("ADMINPAY-SUB-1")).toBe("PAID");
    expect(status("ADMINPAY-CHK-FAIL")).toBe("FAILED");
    expect(status("ADMINPAY-MKT-2")).toBe("AWAITING_REVIEW");
  });

  it("normalises the currency, which one table stores lowercase", async () => {
    const rows = ours((await list()).payments);
    expect(rows.every((r) => r.currency === "DZD")).toBe(true);
  });
});

describe("the totals", () => {
  it("counts only paid money as revenue", async () => {
    const { summary } = await list();

    // 30000 + 12000 + 2500. The failed pack and the transfer awaiting review
    // are not money the platform has.
    expect(summary.revenue).toBe(44500);
    expect(summary.bySource.subscription).toBe(30000);
    expect(summary.bySource.pack).toBe(12000);
    expect(summary.bySource.marketplace).toBe(2500);
  });

  it("separates what is still owed from what was earned", async () => {
    const { summary } = await list();

    expect(summary.pendingAmount).toBe(5000);
    expect(summary.counts.awaitingReview).toBe(1);
    expect(summary.counts.paid).toBe(3);
    expect(summary.counts.failed).toBe(1);
  });

  it("totals the whole match, not just the page", async () => {
    const { summary, payments: rows } = await list({ perPage: 2 });

    expect(rows).toHaveLength(2);
    // A page of two tells an admin nothing about what the platform earned.
    expect(summary.revenue).toBe(44500);
    expect(summary.counts.all).toBe(5);
  });

  it("names the currencies present rather than adding them together", async () => {
    const { summary } = await list();

    // Converting between currencies to produce one number would make that
    // number simply wrong.
    expect(summary.currencies).toEqual(["DZD"]);
  });
});

describe("filters", () => {
  it("filters by source", async () => {
    expect(ours((await list({ source: "pack" })).payments)).toHaveLength(2);
    expect(ours((await list({ source: "marketplace" })).payments)).toHaveLength(2);
  });

  it("filters by status", async () => {
    const { payments: rows, summary } = await list({ status: "PAID" });
    expect(ours(rows)).toHaveLength(3);
    expect(summary.revenue).toBe(44500);
  });

  it("filters by method", async () => {
    expect(ours((await list({ method: "CCP_TRANSFER" })).payments)).toHaveLength(1);
  });

  it("searches the reference, the invoice number and the payer", async () => {
    expect(ours((await list({ q: "ADMINPAY-INV-001" })).payments)).toHaveLength(1);
    expect(ours((await list({ q: "Belkacem" })).payments)).toHaveLength(2);
    expect(ours((await list({ q: "Makers Label" })).payments)).toHaveLength(3);
  });

  it("includes a payment with no payment date in a date range", async () => {
    const { payments: rows } = await list({
      from: "2026-02-15",
      to: "2026-02-15",
    });

    // It falls back to the creation date. Excluding it would hide exactly the
    // payments that need chasing.
    expect(ours(rows).map((r) => r.reference)).toEqual(["ADMINPAY-MKT-2"]);
  });

  it("includes the closing day in full", async () => {
    const { payments: rows } = await list({ from: "2026-02-10", to: "2026-02-12" });

    // A range ending on the 12th that excluded the 12th would read as money
    // gone missing.
    expect(ours(rows).map((r) => r.reference).sort()).toEqual([
      "ADMINPAY-INV-001",
      "ADMINPAY-SUB-1",
    ]);
  });

  it("ignores a malformed date rather than returning nothing", async () => {
    const { payments: rows } = await list({ from: "not-a-date" });
    expect(ours(rows)).toHaveLength(5);
  });
});

describe("paging", () => {
  it("pages over the merged set", async () => {
    const first = await list({ perPage: 2, page: 1 });
    const second = await list({ perPage: 2, page: 2 });

    expect(first.total).toBe(5);
    expect(first.totalPages).toBe(3);
    expect(first.payments).toHaveLength(2);

    const ids = (r: typeof first) => r.payments.map((p) => p.id);
    expect(ids(first).some((id) => ids(second).includes(id))).toBe(false);
  });

  it("caps the page size", async () => {
    expect((await list({ perPage: 5000 })).perPage).toBe(100);
  });

  it("says whether it read everything", async () => {
    const result = await list();

    // A total that is quietly short is worse than one that admits where it
    // stops.
    expect(result).toHaveProperty("truncated");
    expect(result.truncated).toBe(false);
    expect(result.scanLimit).toBeGreaterThan(0);
  });
});
