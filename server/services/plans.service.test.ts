import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Plan entitlements, against a real database.
 *
 * What matters here is what a given account is allowed to do, so the tests
 * set up real plans and subscriptions rather than asserting that a function
 * returns the object it was handed.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error("Refusing to run against a non-local database.");
}
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const plans = await import("./plans.service");

const EMAIL = "plans-test@example.invalid";
let freelancerId: string;
let userId: string;

beforeAll(async () => {
  // The three plans the specification prices.
  for (const p of [
    { tier: "FREE" as const, name: "Gratuit", price: "0", maxActiveServices: 1, monthlyProposals: null, maxPortfolioProjects: 6, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
    { tier: "PRO" as const, name: "Pro", price: "2500", maxActiveServices: 5, monthlyProposals: 40, maxPortfolioProjects: 20, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
    { tier: "PREMIUM" as const, name: "Premium", price: "6000", maxActiveServices: null, monthlyProposals: 100, maxPortfolioProjects: null, prioritySearch: true, removableBranding: true, customSubdomain: true, weeklyBoosts: 1 },
  ]) {
    await prisma.freelancePlan.upsert({ where: { tier: p.tier }, update: p, create: p });
  }
});

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password: "x",
      role: "CANDIDATE",
      freelancerProfile: {
        create: { username: `plans-${Date.now()}`, displayName: "Plans Test" },
      },
    },
    select: { id: true, freelancerProfile: { select: { id: true } } },
  });
  userId = user.id;
  freelancerId = user.freelancerProfile!.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

/** Gives the test freelancer a live subscription to a tier. */
const subscribe = async (tier: "PRO" | "PREMIUM", opts: { periodStartedAt?: Date; endsAt?: Date; used?: number } = {}) => {
  const plan = await prisma.freelancePlan.findUnique({ where: { tier } });
  const now = new Date();
  const endsAt = opts.endsAt ?? new Date(now.getTime() + 30 * 86400_000);
  return prisma.freelanceSubscription.create({
    data: {
      freelancerId,
      userId,
      planId: plan!.id,
      status: "ACTIVE",
      startsAt: now,
      endsAt,
      periodStartedAt: opts.periodStartedAt ?? now,
      proposalsUsedThisPeriod: opts.used ?? 0,
    },
    select: { id: true },
  });
};

/** Publishes n live services for the test freelancer. */
const publishServices = async (n: number) => {
  for (let i = 0; i < n; i++) {
    await prisma.serviceListing.create({
      data: {
        freelancerId,
        title: `Service ${i}`,
        slug: `svc-${freelancerId}-${i}`,
        description: "x",
        status: "PUBLISHED",
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400_000),
      },
    });
  }
};

describe("free tier", () => {
  it("defaults to the free plan with no subscription", async () => {
    const e = await plans.getEntitlements(freelancerId);
    expect(e.tier).toBe("FREE");
    expect(e.subscriptionId).toBeNull();
    expect(e.stats).toBe("none");
    expect(e.prioritySearch).toBe(false);
  });

  it("allows one live service and refuses the second", async () => {
    expect((await plans.getEntitlements(freelancerId)).canPublishService).toBe(true);

    await publishServices(1);

    const e = await plans.getEntitlements(freelancerId);
    expect(e.activeServices).toBe(1);
    expect(e.canPublishService).toBe(false);

    await expect(plans.assertCanPublishService(freelancerId)).rejects.toThrow(
      plans.PlanLimitError
    );
  });

  it("has no monthly quota, so proposals are paid in credits", async () => {
    const e = await plans.getEntitlements(freelancerId);
    expect(e.monthlyProposals).toBeNull();
    expect(e.proposalsRemaining).toBeNull();

    const charge = await plans.resolveProposalCharge(freelancerId);
    expect(charge.method).toBe("credits");
  });

  it("does not count an expired service against the limit", async () => {
    await prisma.serviceListing.create({
      data: {
        freelancerId,
        title: "Expiré",
        slug: `expired-${freelancerId}`,
        description: "x",
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - 60 * 86400_000),
        expiresAt: new Date(Date.now() - 86400_000),
      },
    });

    const e = await plans.getEntitlements(freelancerId);
    expect(e.activeServices).toBe(0);
    expect(e.canPublishService).toBe(true);
  });
});

describe("pro tier", () => {
  beforeEach(async () => {
    await subscribe("PRO");
  });

  it("reports the plan and its quota", async () => {
    const e = await plans.getEntitlements(freelancerId);
    expect(e.tier).toBe("PRO");
    expect(e.maxActiveServices).toBe(5);
    expect(e.monthlyProposals).toBe(40);
    expect(e.proposalsRemaining).toBe(40);
    expect(e.stats).toBe("basic");
  });

  it("allows five live services and refuses the sixth", async () => {
    await publishServices(5);
    const e = await plans.getEntitlements(freelancerId);
    expect(e.canPublishService).toBe(false);
  });

  it("spends the quota before credits", async () => {
    const charge = await plans.resolveProposalCharge(freelancerId);
    expect(charge.method).toBe("quota");
  });

  it("falls back to credits once the quota is spent", async () => {
    const sub = await prisma.freelanceSubscription.findFirst({ where: { freelancerId } });
    await prisma.freelanceSubscription.update({
      where: { id: sub!.id },
      data: { proposalsUsedThisPeriod: 40 },
    });

    const e = await plans.getEntitlements(freelancerId);
    expect(e.proposalsRemaining).toBe(0);
    expect((await plans.resolveProposalCharge(freelancerId)).method).toBe("credits");
  });

  it("counts a consumed proposal against the period", async () => {
    const charge = await plans.resolveProposalCharge(freelancerId);
    await plans.consumeProposalQuota(charge.subscriptionId!);

    const e = await plans.getEntitlements(freelancerId);
    expect(e.proposalsUsedThisPeriod).toBe(1);
    expect(e.proposalsRemaining).toBe(39);
  });
});

describe("premium tier", () => {
  beforeEach(async () => {
    await subscribe("PREMIUM");
  });

  it("has no service limit", async () => {
    await publishServices(12);
    const e = await plans.getEntitlements(freelancerId);
    expect(e.maxActiveServices).toBeNull();
    expect(e.canPublishService).toBe(true);
  });

  it("carries the paid-only entitlements", async () => {
    const e = await plans.getEntitlements(freelancerId);
    expect(e.prioritySearch).toBe(true);
    expect(e.removableBranding).toBe(true);
    expect(e.customSubdomain).toBe(true);
    expect(e.weeklyBoosts).toBe(1);
    expect(e.stats).toBe("full");
  });
});

describe("period rollover", () => {
  it("resets the monthly count when the period has passed", async () => {
    // A subscription whose period began two months ago and has since renewed.
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    await subscribe("PRO", {
      periodStartedAt: twoMonthsAgo,
      endsAt: new Date(Date.now() - 86400_000),
      used: 40,
    });

    // Expired subscriptions are not active, so this one drops to free.
    const expired = await plans.getEntitlements(freelancerId);
    expect(expired.tier).toBe("FREE");

    // Renewed: the counter rolls rather than carrying February's total.
    await prisma.freelanceSubscription.updateMany({
      where: { freelancerId },
      data: { endsAt: new Date(Date.now() + 30 * 86400_000) },
    });

    const renewed = await plans.getEntitlements(freelancerId);
    expect(renewed.tier).toBe("PRO");
    expect(renewed.proposalsUsedThisPeriod).toBe(0);
    expect(renewed.proposalsRemaining).toBe(40);
  });

  it("leaves the count alone inside the current period", async () => {
    await subscribe("PRO", { used: 7 });
    const e = await plans.getEntitlements(freelancerId);
    expect(e.proposalsUsedThisPeriod).toBe(7);
  });
});

describe("expired subscription", () => {
  it("falls back to free rather than keeping paid entitlements", async () => {
    await subscribe("PREMIUM", { endsAt: new Date(Date.now() - 1000) });

    const e = await plans.getEntitlements(freelancerId);
    expect(e.tier).toBe("FREE");
    expect(e.prioritySearch).toBe(false);
    expect(e.maxActiveServices).toBe(1);
  });
});
