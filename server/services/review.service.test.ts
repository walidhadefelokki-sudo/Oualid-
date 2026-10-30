import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Reviews.
 *
 * What matters is who is allowed to say something, when, and what it does to
 * the number printed on every card.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error("Refusing to run against a non-local database.");
}
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const reviews = await import("./review.service");

const CLIENT = "review-client@example.invalid";
const FREELANCER = "review-freelancer@example.invalid";
const STRANGER = "review-stranger@example.invalid";

let clientId: string;
let freelancerUserId: string;
let freelancerId: string;
let strangerId: string;
let orderId: string;
let username: string;

/** A completed order between the two parties. */
const makeOrder = async (status: "COMPLETED" | "IN_PROGRESS" = "COMPLETED") => {
  const o = await prisma.freelanceOrder.create({
    data: {
      reference: `REV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId,
      freelancerId,
      agreedPrice: "10000",
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
    select: { id: true },
  });
  return o.id;
};

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [CLIENT, FREELANCER, STRANGER] } },
  });

  const c = await prisma.user.create({
    data: { email: CLIENT, password: "x", role: "CANDIDATE", firstName: "Amel" },
    select: { id: true },
  });
  clientId = c.id;

  username = `rev-${Date.now()}`;
  const f = await prisma.user.create({
    data: {
      email: FREELANCER,
      password: "x",
      role: "CANDIDATE",
      freelancerProfile: { create: { username, displayName: "Yacine" } },
    },
    select: { id: true, freelancerProfile: { select: { id: true } } },
  });
  freelancerUserId = f.id;
  freelancerId = f.freelancerProfile!.id;

  const s = await prisma.user.create({
    data: { email: STRANGER, password: "x", role: "CANDIDATE" },
    select: { id: true },
  });
  strangerId = s.id;

  orderId = await makeOrder();
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [CLIENT, FREELANCER, STRANGER] } },
  });
  await prisma.$disconnect();
});

describe("leave", () => {
  it("records a client's review and moves the public average", async () => {
    await reviews.leave(orderId, clientId, {
      rating: 5,
      comment: "Travail impeccable, livré en avance.",
      qualityRating: 5,
      communicationRating: 4,
      deadlineRating: 5,
    });

    const profile = await prisma.freelancerProfile.findUnique({ where: { id: freelancerId } });
    expect(profile!.ratingCount).toBe(1);
    expect(Number(profile!.ratingAverage)).toBe(5);
  });

  it("averages across several orders", async () => {
    await reviews.leave(orderId, clientId, { rating: 5 });
    await reviews.leave(await makeOrder(), clientId, { rating: 2 });

    const profile = await prisma.freelancerProfile.findUnique({ where: { id: freelancerId } });
    expect(profile!.ratingCount).toBe(2);
    expect(Number(profile!.ratingAverage)).toBe(3.5);
  });

  it("refuses before the order is completed", async () => {
    const open = await makeOrder("IN_PROGRESS");
    await expect(reviews.leave(open, clientId, { rating: 5 })).rejects.toThrow(/terminée/);
  });

  it("refuses a second review of the same order by the same person", async () => {
    await reviews.leave(orderId, clientId, { rating: 5 });
    await expect(reviews.leave(orderId, clientId, { rating: 1 })).rejects.toThrow(/déjà/);

    const profile = await prisma.freelancerProfile.findUnique({ where: { id: freelancerId } });
    expect(profile!.ratingCount).toBe(1);
  });

  it("lets both sides review the same order", async () => {
    await reviews.leave(orderId, clientId, { rating: 5 });
    await reviews.leave(orderId, freelancerUserId, { rating: 4, comment: "Client clair." });

    const all = await prisma.freelanceReview.findMany({ where: { orderId } });
    expect(all).toHaveLength(2);
  });

  it("does not let a freelancer's review of a client inflate their own rating", async () => {
    await reviews.leave(orderId, freelancerUserId, { rating: 5 });

    const profile = await prisma.freelancerProfile.findUnique({ where: { id: freelancerId } });
    expect(profile!.ratingCount).toBe(0);
    expect(profile!.ratingAverage).toBeNull();
  });

  it("refuses someone who was not part of the order", async () => {
    await expect(reviews.leave(orderId, strangerId, { rating: 1 })).rejects.toThrow(
      /introuvable/
    );
  });

  it("refuses a rating outside 1–5", async () => {
    await expect(reviews.leave(orderId, clientId, { rating: 0 })).rejects.toThrow(/entre 1 et 5/);
    await expect(reviews.leave(orderId, clientId, { rating: 6 })).rejects.toThrow(/entre 1 et 5/);
    await expect(
      reviews.leave(orderId, clientId, { rating: 4, qualityRating: 9 })
    ).rejects.toThrow(/qualité/);
  });
});

describe("reply", () => {
  it("lets the reviewed party answer, once", async () => {
    const review = await reviews.leave(orderId, clientId, { rating: 2, comment: "Trop lent." });

    await reviews.reply(review.id, freelancerUserId, "Désolé pour le retard, cause expliquée.");
    await expect(
      reviews.reply(review.id, freelancerUserId, "Encore un mot")
    ).rejects.toThrow(/déjà répondu/);
  });

  it("refuses a reply from anyone else", async () => {
    const review = await reviews.leave(orderId, clientId, { rating: 2 });
    await expect(reviews.reply(review.id, strangerId, "n'importe quoi")).rejects.toThrow(
      /concernée/
    );
  });

  it("refuses an empty reply", async () => {
    const review = await reviews.leave(orderId, clientId, { rating: 3 });
    await expect(reviews.reply(review.id, freelancerUserId, "   ")).rejects.toThrow(/vide/);
  });
});

describe("pendingFor", () => {
  it("says a completed order is reviewable", async () => {
    const r = await reviews.pendingFor(orderId, clientId);
    expect(r.canReview).toBe(true);
  });

  it("says why not, once reviewed", async () => {
    await reviews.leave(orderId, clientId, { rating: 5 });
    const r = await reviews.pendingFor(orderId, clientId);
    expect(r.canReview).toBe(false);
    expect(r.reason).toBe("already");
    expect(r.existing).toBeTruthy();
  });

  it("hides the order from a stranger", async () => {
    const r = await reviews.pendingFor(orderId, strangerId);
    expect(r.reason).toBe("not-found");
  });
});

describe("publicFor", () => {
  it("returns the freelancer's reviews with the criteria averaged", async () => {
    await reviews.leave(orderId, clientId, {
      rating: 5,
      qualityRating: 5,
      communicationRating: 3,
      deadlineRating: 4,
      comment: "Très bien.",
    });

    const page = await reviews.publicFor(username);
    expect(page!.count).toBe(1);
    expect(page!.reviews).toHaveLength(1);
    expect(Number(page!.breakdown.communication)).toBe(3);
    // The author's family name and address are not part of a public review.
    expect(JSON.stringify(page)).not.toContain(CLIENT);
  });

  it("leaves out what the freelancer wrote about clients", async () => {
    await reviews.leave(orderId, freelancerUserId, { rating: 5, comment: "Bon client." });

    const page = await reviews.publicFor(username);
    expect(page!.reviews).toHaveLength(0);
  });

  it("returns null for an unknown handle", async () => {
    expect(await reviews.publicFor("personne-du-tout")).toBeNull();
  });
});
