import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CreditEntryType, PrismaClient } from "@prisma/client";

/**
 * The credit ledger, against a real database.
 *
 * Concurrency, serializable isolation and unique constraints are database
 * behaviour. Mocking Prisma here would test that the code calls the
 * functions it calls, which was never the risk; the risk is two requests
 * arriving together and both being allowed to spend the same credits.
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

// Imported after DATABASE_URL is pinned, so the service's own client points
// at the test database.
const credits = await import("./credits.service");

const EMAIL = "ledger-test@example.invalid";
let userId: string;

const freshUser = async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: { email: EMAIL, password: "x", role: "CANDIDATE", firstName: "Ledger" },
    select: { id: true },
  });
  return user.id;
};

beforeAll(async () => {
  userId = await freshUser();
});

beforeEach(async () => {
  // A clean wallet per test, so one test's balance is never another's
  // starting point.
  await prisma.creditWallet.deleteMany({ where: { userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

describe("grant", () => {
  it("creates the wallet on first use and records the entry", async () => {
    const result = await credits.grant({
      userId,
      amount: 50,
      type: CreditEntryType.PURCHASE,
      note: "pack 50",
    });

    expect(result.balance).toBe(50);
    expect(result.replayed).toBe(false);
    expect(await credits.getBalance(userId)).toBe(50);
  });

  it("writes balanceAfter so history reads without replaying the ledger", async () => {
    await credits.grant({ userId, amount: 50, type: CreditEntryType.PURCHASE });
    await credits.spend({ userId, amount: 10, type: CreditEntryType.SERVICE_PUBLICATION });

    const { entries } = await credits.history(userId);
    expect(entries.map((e) => e.balanceAfter)).toEqual([40, 50]);
  });
});

describe("spend", () => {
  beforeEach(async () => {
    await credits.grant({ userId, amount: 100, type: CreditEntryType.PURCHASE });
  });

  it("debits the balance", async () => {
    const result = await credits.spend({
      userId,
      amount: 10,
      type: CreditEntryType.SERVICE_PUBLICATION,
    });
    expect(result.balance).toBe(90);
  });

  it("refuses to go negative and leaves the balance untouched", async () => {
    await expect(
      credits.spend({ userId, amount: 101, type: CreditEntryType.PROPOSAL_SUBMISSION })
    ).rejects.toThrow(credits.InsufficientCreditsError);

    expect(await credits.getBalance(userId)).toBe(100);
  });

  it("reports what was required and what was there", async () => {
    await credits
      .spend({ userId, amount: 150, type: CreditEntryType.PROPOSAL_SUBMISSION })
      .catch((e) => {
        expect(e).toBeInstanceOf(credits.InsufficientCreditsError);
        expect(e.required).toBe(150);
        expect(e.available).toBe(100);
      });
  });
});

describe("idempotency", () => {
  beforeEach(async () => {
    await credits.grant({ userId, amount: 100, type: CreditEntryType.PURCHASE });
  });

  it("charges once when the same request is replayed", async () => {
    const key = "proposal:abc123";

    const first = await credits.spend({
      userId,
      amount: 2,
      type: CreditEntryType.PROPOSAL_SUBMISSION,
      idempotencyKey: key,
    });
    const second = await credits.spend({
      userId,
      amount: 2,
      type: CreditEntryType.PROPOSAL_SUBMISSION,
      idempotencyKey: key,
    });

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.entryId).toBe(first.entryId);
    expect(await credits.getBalance(userId)).toBe(98);
  });

  it("charges once when two identical requests arrive together", async () => {
    const key = "proposal:race";

    // Both pass the pre-check before either writes. The unique index is what
    // has to stop the second charge, not the check.
    const results = await Promise.allSettled([
      credits.spend({
        userId,
        amount: 2,
        type: CreditEntryType.PROPOSAL_SUBMISSION,
        idempotencyKey: key,
      }),
      credits.spend({
        userId,
        amount: 2,
        type: CreditEntryType.PROPOSAL_SUBMISSION,
        idempotencyKey: key,
      }),
    ]);

    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(2);
    expect(await credits.getBalance(userId)).toBe(98);

    const entries = await prisma.creditLedgerEntry.count({ where: { idempotencyKey: key } });
    expect(entries).toBe(1);
  });
});

describe("concurrent spending", () => {
  it("does not let simultaneous spends overdraw the wallet", async () => {
    // 10 credits, five concurrent spends of 4. At most two can succeed.
    await credits.grant({ userId, amount: 10, type: CreditEntryType.PURCHASE });

    const attempts = Array.from({ length: 5 }, (_, i) =>
      credits.spend({
        userId,
        amount: 4,
        type: CreditEntryType.PROPOSAL_SUBMISSION,
        idempotencyKey: `concurrent:${i}`,
      })
    );

    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;

    expect(succeeded).toBeLessThanOrEqual(2);

    const balance = await credits.getBalance(userId);
    expect(balance).toBeGreaterThanOrEqual(0);
    expect(balance).toBe(10 - succeeded * 4);
  });

  it("keeps the cached balance equal to the sum of the ledger", async () => {
    await credits.grant({ userId, amount: 60, type: CreditEntryType.PURCHASE });

    await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        credits.spend({
          userId,
          amount: 5,
          type: CreditEntryType.PROPOSAL_SUBMISSION,
          idempotencyKey: `sum:${i}`,
        })
      )
    );

    const wallet = await prisma.creditWallet.findUnique({
      where: { userId },
      select: { id: true, balance: true },
    });
    const sum = await prisma.creditLedgerEntry.aggregate({
      where: { walletId: wallet!.id },
      _sum: { delta: true },
    });

    expect(wallet!.balance).toBe(sum._sum.delta ?? 0);
  });
});

describe("refundFor", () => {
  it("returns what was taken, not what the price is now", async () => {
    await credits.grant({ userId, amount: 100, type: CreditEntryType.PURCHASE });
    await credits.spend({
      userId,
      amount: 10,
      type: CreditEntryType.SERVICE_PUBLICATION,
      referenceType: "service",
      referenceId: "svc-1",
    });

    const refund = await credits.refundFor("service", "svc-1", "rejeté par la modération");

    expect(refund?.balance).toBe(100);
  });

  it("does not pay out twice for the same spend", async () => {
    await credits.grant({ userId, amount: 100, type: CreditEntryType.PURCHASE });
    await credits.spend({
      userId,
      amount: 10,
      type: CreditEntryType.SERVICE_PUBLICATION,
      referenceType: "service",
      referenceId: "svc-2",
    });

    await credits.refundFor("service", "svc-2", "première");
    const second = await credits.refundFor("service", "svc-2", "deuxième");

    expect(second?.replayed).toBe(true);
    expect(await credits.getBalance(userId)).toBe(100);
  });

  it("returns null when there is nothing to refund", async () => {
    expect(await credits.refundFor("service", "does-not-exist", "x")).toBeNull();
  });
});

describe("input validation", () => {
  it("rejects a fractional delta", async () => {
    await expect(
      credits.grant({ userId, amount: 1.5, type: CreditEntryType.PROMOTION })
    ).rejects.toThrow(/whole number/);
  });

  it("rejects a zero or negative grant", async () => {
    await expect(
      credits.grant({ userId, amount: 0, type: CreditEntryType.PROMOTION })
    ).rejects.toThrow(/positive/);
  });
});
