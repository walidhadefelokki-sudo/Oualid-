import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CreditEntryType, PrismaClient } from "@prisma/client";

/**
 * Proposals: who may answer, what it costs, and what hiring does.
 *
 * The cases worth the database are the ones where two things interact — a
 * double submit against the unique index, a charge that fails after the row
 * exists, a hire that has to reject everyone else and open an order in the
 * same breath.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error("Refusing to run against a non-local database.");
}
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const proposals = await import("./proposal.service");
const credits = await import("./credits.service");

const CLIENT = "proposal-client@example.invalid";
const FREELANCER = "proposal-freelancer@example.invalid";
const OTHER = "proposal-other@example.invalid";

let clientId: string;
let freelancerUserId: string;
let freelancerId: string;
let otherUserId: string;
let otherFreelancerId: string;
let projectId: string;

beforeAll(async () => {
  for (const p of [
    { tier: "FREE" as const, name: "Gratuit", price: "0", maxActiveServices: 1, monthlyProposals: null, maxPortfolioProjects: 6, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
    { tier: "PRO" as const, name: "Pro", price: "2500", maxActiveServices: 5, monthlyProposals: 40, maxPortfolioProjects: 20, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
  ]) {
    await prisma.freelancePlan.upsert({ where: { tier: p.tier }, update: p, create: p });
  }
  await prisma.platformSetting.upsert({
    where: { key: "freelance.credits.proposal" },
    update: { value: 2 },
    create: { key: "freelance.credits.proposal", value: 2 },
  });
});

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [CLIENT, FREELANCER, OTHER] } } });

  const client = await prisma.user.create({
    data: { email: CLIENT, password: "x", role: "CANDIDATE", firstName: "Client" },
    select: { id: true },
  });
  clientId = client.id;

  const mk = async (email: string, username: string) => {
    const u = await prisma.user.create({
      data: {
        email,
        password: "x",
        role: "CANDIDATE",
        freelancerProfile: { create: { username, displayName: username } },
      },
      select: { id: true, freelancerProfile: { select: { id: true } } },
    });
    return { userId: u.id, freelancerId: u.freelancerProfile!.id };
  };

  const f = await mk(FREELANCER, `prop-${Date.now()}`);
  freelancerUserId = f.userId;
  freelancerId = f.freelancerId;

  const o = await mk(OTHER, `prop-o-${Date.now()}`);
  otherUserId = o.userId;
  otherFreelancerId = o.freelancerId;

  const project = await prisma.freelanceProject.create({
    data: {
      clientId,
      title: "Refonte du site vitrine",
      slug: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: "Une description assez longue pour être réaliste dans un test.",
      status: "OPEN",
      visibility: "PUBLIC",
      budgetMin: "40000",
      budgetMax: "80000",
      publishedAt: new Date(),
    },
    select: { id: true },
  });
  projectId = project.id;

  await credits.grant({ userId: freelancerUserId, amount: 20, type: CreditEntryType.PURCHASE });
  await credits.grant({ userId: otherUserId, amount: 20, type: CreditEntryType.PURCHASE });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [CLIENT, FREELANCER, OTHER] } } });
  await prisma.$disconnect();
});

const LETTER =
  "Bonjour, j'ai déjà mené plusieurs refontes de sites vitrines et je peux livrer dans les délais.";

const send = (over: Partial<Parameters<typeof proposals.submit>[0]> = {}) =>
  proposals.submit({
    projectId,
    freelancerId,
    userId: freelancerUserId,
    coverLetter: LETTER,
    price: 60000,
    deliveryDays: 14,
    ...over,
  });

describe("submit", () => {
  it("creates the proposal and spends credits on the free plan", async () => {
    const result = await send();
    expect(result.charged).toBe("credits");
    expect(result.balance).toBe(18);
    expect(result.proposal.status).toBe("SENT");
  });

  it("refuses a second proposal to the same project", async () => {
    await send();
    await expect(send()).rejects.toThrow(/déjà répondu/);
    expect(await credits.getBalance(freelancerUserId)).toBe(18);
  });

  it("charges once when two submits race", async () => {
    // Both pass the "already answered" read before either writes. The unique
    // index is what has to stop the second charge.
    await Promise.allSettled([send(), send()]);

    expect(await credits.getBalance(freelancerUserId)).toBe(18);
    const count = await prisma.proposal.count({ where: { projectId, freelancerId } });
    expect(count).toBe(1);
  });

  it("refuses when the wallet cannot cover it, without creating a row", async () => {
    await prisma.creditWallet.update({
      where: { userId: freelancerUserId },
      data: { balance: 1 },
    });

    await expect(send()).rejects.toThrow(credits.InsufficientCreditsError);
    expect(await prisma.proposal.count({ where: { projectId } })).toBe(0);
  });

  it("refuses a project that is not open", async () => {
    await prisma.freelanceProject.update({
      where: { id: projectId },
      data: { status: "CLOSED" },
    });
    await expect(send()).rejects.toThrow(/n'accepte plus/);
  });

  it("refuses an invitation-only project without an invitation", async () => {
    await prisma.freelanceProject.update({
      where: { id: projectId },
      data: { visibility: "INVITE_ONLY" },
    });

    await expect(send()).rejects.toThrow(/sur invitation/);

    await prisma.projectInvite.create({ data: { projectId, freelancerId } });
    await expect(send()).resolves.toMatchObject({ charged: "credits" });
  });

  it("refuses a client answering their own project", async () => {
    const own = await prisma.freelancerProfile.create({
      data: { userId: clientId, username: `self-${Date.now()}`, displayName: "Client" },
      select: { id: true },
    });

    await expect(
      send({ freelancerId: own.id, userId: clientId })
    ).rejects.toThrow(/votre propre projet/);
  });

  it("refuses a cover letter that says nothing", async () => {
    await expect(send({ coverLetter: "ok" })).rejects.toThrow(/40 caractères/);
    expect(await credits.getBalance(freelancerUserId)).toBe(20);
  });

  it("spends the monthly quota instead of credits on a paid plan", async () => {
    const plan = await prisma.freelancePlan.findUnique({ where: { tier: "PRO" } });
    await prisma.freelanceSubscription.create({
      data: {
        freelancerId,
        userId: freelancerUserId,
        planId: plan!.id,
        status: "ACTIVE",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 86400_000),
        periodStartedAt: new Date(),
      },
    });

    const result = await send();
    expect(result.charged).toBe("quota");
    // Untouched: the subscription paid for it.
    expect(await credits.getBalance(freelancerUserId)).toBe(20);

    const sub = await prisma.freelanceSubscription.findFirst({ where: { freelancerId } });
    expect(sub!.proposalsUsedThisPeriod).toBe(1);
  });
});

describe("withdraw", () => {
  it("withdraws and does not refund", async () => {
    const { proposal } = await send();
    await proposals.withdraw(proposal.id, freelancerId);

    const after = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(after!.status).toBe("WITHDRAWN");
    // The credits bought putting the offer in front of the client, which
    // happened.
    expect(await credits.getBalance(freelancerUserId)).toBe(18);
  });

  it("refuses to withdraw someone else's proposal", async () => {
    const { proposal } = await send();
    await expect(proposals.withdraw(proposal.id, otherFreelancerId)).rejects.toThrow();
  });
});

describe("decide", () => {
  const sendOther = () =>
    proposals.submit({
      projectId,
      freelancerId: otherFreelancerId,
      userId: otherUserId,
      coverLetter: LETTER,
      price: 55000,
      deliveryDays: 10,
    });

  it("shortlists without touching the others", async () => {
    const a = await send();
    await sendOther();

    await proposals.decide(a.proposal.id, clientId, "SHORTLISTED");

    const all = await prisma.proposal.findMany({ where: { projectId } });
    expect(all.find((p) => p.id === a.proposal.id)!.status).toBe("SHORTLISTED");
    expect(all.filter((p) => p.status === "SENT")).toHaveLength(1);
  });

  it("hiring rejects the rest, opens an order and moves the project", async () => {
    const winner = await send();
    const loser = await sendOther();

    const result = await proposals.decide(winner.proposal.id, clientId, "SELECTED");

    expect(result.order).toBeTruthy();
    expect(result.order!.status).toBe("CREATED");

    const after = await prisma.proposal.findMany({ where: { projectId } });
    expect(after.find((p) => p.id === winner.proposal.id)!.status).toBe("SELECTED");
    expect(after.find((p) => p.id === loser.proposal.id)!.status).toBe("REJECTED");

    const project = await prisma.freelanceProject.findUnique({ where: { id: projectId } });
    expect(project!.status).toBe("IN_PROGRESS");

    const order = await prisma.freelanceOrder.findFirst({ where: { projectId } });
    expect(order!.agreedPrice.toString()).toBe("60000");
    expect(order!.freelancerId).toBe(freelancerId);
  });

  it("refuses a decision on someone else's project", async () => {
    const { proposal } = await send();
    await expect(proposals.decide(proposal.id, otherUserId, "REJECTED")).rejects.toThrow(
      /introuvable/
    );
  });

  it("refuses to decide on a withdrawn proposal", async () => {
    const { proposal } = await send();
    await proposals.withdraw(proposal.id, freelancerId);

    await expect(proposals.decide(proposal.id, clientId, "SELECTED")).rejects.toThrow(/retirée/);
  });
});

describe("markViewed", () => {
  it("moves SENT to VIEWED, once", async () => {
    const { proposal } = await send();

    await proposals.markViewed(proposal.id, clientId);
    const first = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(first!.status).toBe("VIEWED");
    const firstSeen = first!.viewedAt;

    await proposals.markViewed(proposal.id, clientId);
    const second = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(second!.viewedAt).toEqual(firstSeen);
  });

  it("does not let another client mark it viewed", async () => {
    const { proposal } = await send();
    await proposals.markViewed(proposal.id, otherUserId);

    const after = await prisma.proposal.findUnique({ where: { id: proposal.id } });
    expect(after!.status).toBe("SENT");
  });
});
