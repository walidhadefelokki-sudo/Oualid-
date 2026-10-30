import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Reviews.
 *
 * Only after a completed order, in both directions, one each. The
 * specification is explicit about that and the constraint matters: a rating
 * that anyone can leave about anyone is worth nothing, and the thing being
 * vouched for is that these two people actually worked together.
 *
 * A freelancer may reply once, publicly. Not a thread — a review is the
 * client's account, and a seller who can argue indefinitely turns every bad
 * review into a negotiation.
 */

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

const inRange = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;

export interface ReviewInput {
  rating: number;
  comment?: string | null;
  qualityRating?: number | null;
  communicationRating?: number | null;
  deadlineRating?: number | null;
}

/**
 * Recomputes a freelancer's average from their approved reviews.
 *
 * Recomputed rather than adjusted. An incremental average drifts the moment
 * one review is removed by moderation, and this number is printed on every
 * card the platform shows.
 */
export const recomputeRating = async (freelancerUserId: string) => {
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId: freelancerUserId },
    select: { id: true },
  });
  if (!profile) return;

  const agg = await prisma.freelanceReview.aggregate({
    where: { targetId: freelancerUserId, state: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.freelancerProfile.update({
    where: { id: profile.id },
    data: {
      ratingAverage:
        agg._count.rating > 0 ? new Prisma.Decimal((agg._avg.rating ?? 0).toFixed(2)) : null,
      ratingCount: agg._count.rating,
    },
  });
};

/**
 * Leaves a review on a completed order.
 *
 * The target is derived from the order, never taken from the request: a
 * caller who could name the target could review anyone.
 */
export const leave = async (orderId: string, authorId: string, input: ReviewInput) => {
  if (!inRange(input.rating)) throw new ReviewError("La note doit être comprise entre 1 et 5.");

  for (const [name, value] of [
    ["qualité", input.qualityRating],
    ["communication", input.communicationRating],
    ["respect des délais", input.deadlineRating],
  ] as const) {
    if (value !== undefined && value !== null && !inRange(value)) {
      throw new ReviewError(`La note de ${name} doit être comprise entre 1 et 5.`);
    }
  }

  const order = await prisma.freelanceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      clientId: true,
      freelancer: { select: { userId: true } },
    },
  });

  if (!order) throw new ReviewError("Commande introuvable.", 404);

  const isClient = order.clientId === authorId;
  const isFreelancer = order.freelancer.userId === authorId;
  if (!isClient && !isFreelancer) throw new ReviewError("Commande introuvable.", 404);

  if (order.status !== "COMPLETED") {
    throw new ReviewError("Vous pourrez laisser un avis une fois la commande terminée.", 409);
  }

  const targetId = isClient ? order.freelancer.userId : order.clientId;

  try {
    const review = await prisma.freelanceReview.create({
      data: {
        orderId: order.id,
        authorId,
        targetId,
        rating: input.rating,
        qualityRating: input.qualityRating ?? null,
        communicationRating: input.communicationRating ?? null,
        deadlineRating: input.deadlineRating ?? null,
        comment: input.comment?.trim() || null,
      },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });

    // Only a review of a freelancer moves a public average.
    if (isClient) await recomputeRating(targetId);

    return review;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ReviewError("Vous avez déjà laissé un avis sur cette commande.", 409);
    }
    throw err;
  }
};

/** The reviewed party answers, once. */
export const reply = async (reviewId: string, userId: string, response: string) => {
  if (!response?.trim()) throw new ReviewError("La réponse ne peut pas être vide.");

  const review = await prisma.freelanceReview.findUnique({
    where: { id: reviewId },
    select: { id: true, targetId: true, response: true },
  });

  if (!review) throw new ReviewError("Avis introuvable.", 404);
  if (review.targetId !== userId) {
    throw new ReviewError("Seule la personne concernée peut répondre.", 403);
  }
  if (review.response) {
    throw new ReviewError("Vous avez déjà répondu à cet avis.", 409);
  }

  return prisma.freelanceReview.update({
    where: { id: review.id },
    data: { response: response.trim(), respondedAt: new Date() },
    select: { id: true, response: true, respondedAt: true },
  });
};

/** What a given order still allows this account to say. */
export const pendingFor = async (orderId: string, userId: string) => {
  const order = await prisma.freelanceOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, clientId: true, freelancer: { select: { userId: true } } },
  });

  if (!order) return { canReview: false, reason: "not-found" as const, existing: null };

  const isParty = order.clientId === userId || order.freelancer.userId === userId;
  if (!isParty) return { canReview: false, reason: "not-found" as const, existing: null };

  const existing = await prisma.freelanceReview.findUnique({
    where: { orderId_authorId: { orderId, authorId: userId } },
    select: { id: true, rating: true, comment: true, response: true },
  });

  if (existing) return { canReview: false, reason: "already" as const, existing };
  if (order.status !== "COMPLETED") {
    return { canReview: false, reason: "not-completed" as const, existing: null };
  }

  return { canReview: true, reason: null, existing: null };
};

/**
 * A freelancer's public reviews.
 *
 * Only reviews written about them by their clients, and only approved ones.
 * Reviews they wrote about clients are not part of their reputation.
 */
export const publicFor = async (username: string, page = 1, pageSize = 10) => {
  const profile = await prisma.freelancerProfile.findUnique({
    where: { username },
    select: { userId: true, ratingAverage: true, ratingCount: true },
  });
  if (!profile) return null;

  const where = { targetId: profile.userId, state: "APPROVED" as const };

  const [total, reviews, breakdown] = await Promise.all([
    prisma.freelanceReview.count({ where }),
    prisma.freelanceReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        rating: true,
        qualityRating: true,
        communicationRating: true,
        deadlineRating: true,
        comment: true,
        response: true,
        respondedAt: true,
        createdAt: true,
        // The client's first name only. A review is public; the person who
        // wrote it did not sign up to be findable by it.
        author: { select: { firstName: true } },
      },
    }),
    prisma.freelanceReview.aggregate({
      where,
      _avg: {
        qualityRating: true,
        communicationRating: true,
        deadlineRating: true,
      },
    }),
  ]);

  return {
    average: profile.ratingAverage,
    count: profile.ratingCount,
    breakdown: {
      quality: breakdown._avg.qualityRating,
      communication: breakdown._avg.communicationRating,
      deadline: breakdown._avg.deadlineRating,
    },
    reviews,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

export default { leave, reply, pendingFor, publicFor, recomputeRating, ReviewError };
