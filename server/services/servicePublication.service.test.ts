import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CreditEntryType, PrismaClient } from "@prisma/client";

/**
 * Publishing a service: the plan gate, the charge, and the refund.
 *
 * This is where a bug costs a freelancer money, so the cases that matter are
 * the ones where two things interact — a double submit, a refusal after the
 * charge, a plan with no room left.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error("Refusing to run against a non-local database.");
}
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const publication = await import("./servicePublication.service");
const credits = await import("./credits.service");
const plans = await import("./plans.service");

const EMAIL = "publication-test@example.invalid";
let userId: string;
let freelancerId: string;
let moderatorId: string;

beforeAll(async () => {
  for (const p of [
    { tier: "FREE" as const, name: "Gratuit", price: "0", maxActiveServices: 1, monthlyProposals: null, maxPortfolioProjects: 6, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
    { tier: "PRO" as const, name: "Pro", price: "2500", maxActiveServices: 5, monthlyProposals: 40, maxPortfolioProjects: 20, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
  ]) {
    await prisma.freelancePlan.upsert({ where: { tier: p.tier }, update: p, create: p });
  }

  for (const s of [
    { key: "freelance.credits.servicePublication", value: 10 },
    { key: "freelance.service.durationDays", value: 30 },
  ]) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  const mod = await prisma.user.upsert({
    where: { email: "publication-mod@example.invalid" },
    update: {},
    create: { email: "publication-mod@example.invalid", password: "x", role: "ADMIN" },
    select: { id: true },
  });
  moderatorId = mod.id;
});

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password: "x",
      role: "CANDIDATE",
      freelancerProfile: {
        create: { username: `pub-${Date.now()}`, displayName: "Publication Test" },
      },
    },
    select: { id: true, freelancerProfile: { select: { id: true } } },
  });
  userId = user.id;
  freelancerId = user.freelancerProfile!.id;

  await credits.grant({ userId, amount: 100, type: CreditEntryType.PURCHASE });
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [EMAIL, "publication-mod@example.invalid"] } },
  });
  await prisma.$disconnect();
});

/** A draft complete enough to pass review. */
const draft = async (overrides: { title?: string; description?: string; price?: string } = {}) => {
  const service = await prisma.serviceListing.create({
    data: {
      freelancerId,
      title: overrides.title ?? "Création de site vitrine responsive",
      slug: publication.slugify("svc") + Math.random().toString(36).slice(2, 6),
      description:
        overrides.description ??
        "Je conçois et développe un site vitrine complet, responsive et optimisé, livré avec une formation à la prise en main.",
      status: "DRAFT",
      packages: {
        create: {
          tier: "BASIC",
          name: "Basique",
          price: overrides.price ?? "15000",
          deliveryDays: 7,
          revisions: 1,
          features: ["3 pages"],
        },
      },
    },
    select: { id: true },
  });
  return service.id;
};

describe("submitForReview", () => {
  it("charges the configured cost and moves the service to pending", async () => {
    const id = await draft();
    const result = await publication.submitForReview(freelancerId, id, userId);

    expect(result.status).toBe("PENDING");
    expect(result.balance).toBe(90);
    expect(result.charged).toBe(true);
  });

  it("charges once when the same submit is replayed", async () => {
    const id = await draft();
    await publication.submitForReview(freelancerId, id, userId);

    // Status now PENDING, so a second submit is refused outright.
    await expect(publication.submitForReview(freelancerId, id, userId)).rejects.toThrow(
      /déjà en attente/
    );

    expect(await credits.getBalance(userId)).toBe(90);
  });

  it("does not charge twice when two submits race", async () => {
    const id = await draft();

    // Both read DRAFT before either writes PENDING, so the status check
    // cannot stop the second charge — the ledger's idempotency key must.
    await Promise.allSettled([
      publication.submitForReview(freelancerId, id, userId),
      publication.submitForReview(freelancerId, id, userId),
    ]);

    expect(await credits.getBalance(userId)).toBe(90);

    const entries = await prisma.creditLedgerEntry.count({
      where: { referenceType: "service", referenceId: id, delta: { lt: 0 } },
    });
    expect(entries).toBe(1);
  });

  it("refuses an incomplete draft without charging", async () => {
    const id = await draft({ description: "trop court" });

    await expect(publication.submitForReview(freelancerId, id, userId)).rejects.toThrow(
      publication.ServiceValidationError
    );
    expect(await credits.getBalance(userId)).toBe(100);
  });

  it("refuses when the plan has no slot left, without charging", async () => {
    // Free plan: one live service. Publish it, then try to submit another.
    const live = await draft();
    await publication.submitForReview(freelancerId, live, userId);
    await publication.approve(live, moderatorId);

    const second = await draft();
    await expect(publication.submitForReview(freelancerId, second, userId)).rejects.toThrow(
      plans.PlanLimitError
    );

    // Charged once, for the first service only.
    expect(await credits.getBalance(userId)).toBe(90);
  });

  it("refuses when there are not enough credits", async () => {
    await prisma.creditWallet.update({ where: { userId }, data: { balance: 3 } });

    const id = await draft();
    await expect(publication.submitForReview(freelancerId, id, userId)).rejects.toThrow(
      credits.InsufficientCreditsError
    );

    const after = await prisma.serviceListing.findUnique({ where: { id } });
    expect(after!.status).toBe("DRAFT");
  });
});

describe("approve", () => {
  it("publishes for the configured window", async () => {
    const id = await draft();
    await publication.submitForReview(freelancerId, id, userId);

    const published = await publication.approve(id, moderatorId);

    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).toBeTruthy();

    const days = Math.round(
      (published.expiresAt!.getTime() - published.publishedAt!.getTime()) / 86_400_000
    );
    expect(days).toBe(30);
  });

  it("records who approved it", async () => {
    const id = await draft();
    await publication.submitForReview(freelancerId, id, userId);
    await publication.approve(id, moderatorId);

    const record = await prisma.moderationRecord.findFirst({
      where: { entityType: "service", entityId: id },
    });
    expect(record?.state).toBe("APPROVED");
    expect(record?.moderatorId).toBe(moderatorId);
  });

  it("refuses to publish past the plan limit even from the queue", async () => {
    const first = await draft();
    await publication.submitForReview(freelancerId, first, userId);

    // Submitted while a slot was free; approved after it was taken.
    const second = await draft();
    await prisma.serviceListing.update({
      where: { id: second },
      data: { status: "PENDING" },
    });

    await publication.approve(first, moderatorId);

    await expect(publication.approve(second, moderatorId)).rejects.toThrow(plans.PlanLimitError);
  });
});

describe("reject", () => {
  it("returns the credits and records the reason", async () => {
    const id = await draft();
    await publication.submitForReview(freelancerId, id, userId);
    expect(await credits.getBalance(userId)).toBe(90);

    const result = await publication.reject(id, moderatorId, "Images de mauvaise qualité");

    expect(result.refunded).toBe(true);
    expect(await credits.getBalance(userId)).toBe(100);

    const after = await prisma.serviceListing.findUnique({ where: { id } });
    expect(after!.status).toBe("REJECTED");
    expect(after!.rejectionReason).toBe("Images de mauvaise qualité");
  });

  it("requires a reason", async () => {
    const id = await draft();
    await publication.submitForReview(freelancerId, id, userId);

    await expect(publication.reject(id, moderatorId, "   ")).rejects.toThrow(/motif/);
  });

  it("lets a refused service be fixed and resubmitted, charging again", async () => {
    const id = await draft();
    await publication.submitForReview(freelancerId, id, userId);
    await publication.reject(id, moderatorId, "À revoir");

    expect(await credits.getBalance(userId)).toBe(100);

    /* A resubmission is a new publication and costs again, so its key must
     * differ from the first. Sharing one would make the second submit a
     * replay and publish it for free. */
    const resubmit = await publication.submitForReview(freelancerId, id, userId);
    expect(resubmit.status).toBe("PENDING");
    // The assertion the name promised: a second publication costs again.
    expect(resubmit.charged).toBe(true);
    expect(await credits.getBalance(userId)).toBe(90);
  });
});
