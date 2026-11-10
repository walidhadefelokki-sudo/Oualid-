import { FreelanceOrderStatus, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * A price quoted inside a conversation.
 *
 * The marketplace sells two ways that were already built: a client buys a
 * package off a service page, or a freelancer answers a published project.
 * Neither covers the most ordinary case — the two are talking, the job is not
 * quite any package, and somebody has to name a figure. Until now that
 * happened in the thread as a sentence, with nothing to accept and no order at
 * the end of it.
 *
 * An offer is a proposal with a shape: a title, a price, a delivery time and a
 * number of revisions. The client accepts it and an order exists, on the same
 * terms the order screens already know how to show.
 *
 * Deliberately free to send. A freelancer cannot open a conversation out of
 * nothing — either they paid a credit to answer a project, or the client
 * approached them — so an offer inside an existing thread is not a way round
 * the proposal charge. Pricing it twice would only tax the conversation the
 * platform wants people to have here rather than on WhatsApp.
 */

export class CustomOfferError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "CustomOfferError";
  }
}

/** Beyond this an "offer" is a negotiation nobody is holding to. */
const MAX_DELIVERY_DAYS = 365;
const MAX_REVISIONS = 20;
const MIN_PRICE = 500;
const MAX_PRICE = 10_000_000;

/** How long an unanswered offer stands, when none is given. */
const DEFAULT_VALID_DAYS = 7;

export interface SendOfferInput {
  conversationId: string;
  /** The freelancer sending it. */
  userId: string;
  title: string;
  description?: string | null;
  price: number;
  deliveryDays: number;
  revisions?: number;
  /** Days this offer stands. Null leaves the default. */
  validDays?: number | null;
}

const OFFER_SELECT = {
  id: true,
  conversationId: true,
  title: true,
  description: true,
  price: true,
  deliveryDays: true,
  revisions: true,
  status: true,
  expiresAt: true,
  respondedAt: true,
  orderId: true,
  createdAt: true,
  freelancer: { select: { id: true, username: true, displayName: true } },
  client: { select: { id: true, firstName: true, lastName: true, email: true } },
  order: { select: { id: true, reference: true, status: true } },
} as const;

/**
 * An offer that has run out of time is EXPIRED, whatever the column says.
 *
 * Computed on read rather than swept by a job: nothing here runs on a
 * schedule, and an offer that is accepted three weeks after it lapsed because
 * no cron fired is worse than one line of arithmetic at every read. The
 * column is corrected when somebody acts on it.
 */
const effectiveStatus = (offer: { status: string; expiresAt: Date | null }) =>
  offer.status === "SENT" && offer.expiresAt && offer.expiresAt.getTime() < Date.now()
    ? "EXPIRED"
    : offer.status;

const shape = <T extends { status: string; expiresAt: Date | null; price: Prisma.Decimal }>(
  offer: T
) => ({
  ...offer,
  price: Number(offer.price),
  status: effectiveStatus(offer),
});

/** The thread, the two sides of it, and which one is asking. */
const sidesOf = async (conversationId: string, userId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participants: {
        select: {
          userId: true,
          user: {
            select: { id: true, freelancerProfile: { select: { id: true } } },
          },
        },
      },
    },
  });

  // 404 rather than 403: a thread nobody told you about should not be
  // distinguishable from one that does not exist.
  if (!conversation || !conversation.participants.some((p) => p.userId === userId)) {
    throw new CustomOfferError("Conversation introuvable.", 404);
  }

  const me = conversation.participants.find((p) => p.userId === userId)!;
  const other = conversation.participants.find((p) => p.userId !== userId);

  if (!other) {
    throw new CustomOfferError("Cette conversation n'a plus qu'un participant.", 409);
  }

  return { conversation, me, other };
};

/**
 * Sends an offer.
 *
 * Only from a freelancer, and only to the other person in the thread. The
 * client is read from the conversation rather than taken from the request:
 * accepting a client id would let a freelancer address an offer to somebody
 * who never spoke to them.
 */
export const send = async (input: SendOfferInput) => {
  const { me, other } = await sidesOf(input.conversationId, input.userId);

  if (!me.user.freelancerProfile) {
    throw new CustomOfferError(
      "Seul un freelance peut envoyer une offre. Activez votre profil freelance.",
      403
    );
  }

  const title = (input.title ?? "").trim();
  if (title.length < 3) {
    throw new CustomOfferError("Donnez un titre à cette offre.", 400);
  }
  if (title.length > 120) {
    throw new CustomOfferError("Le titre est trop long (120 caractères maximum).", 400);
  }

  const price = Math.round(Number(input.price));
  if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
    throw new CustomOfferError(
      `Le prix doit être compris entre ${MIN_PRICE} et ${MAX_PRICE} DZD.`,
      400
    );
  }

  const deliveryDays = Math.trunc(Number(input.deliveryDays));
  if (!Number.isFinite(deliveryDays) || deliveryDays < 1 || deliveryDays > MAX_DELIVERY_DAYS) {
    throw new CustomOfferError(
      `Le délai doit être compris entre 1 et ${MAX_DELIVERY_DAYS} jours.`,
      400
    );
  }

  const revisions = Math.trunc(Number(input.revisions ?? 0));
  if (!Number.isFinite(revisions) || revisions < 0 || revisions > MAX_REVISIONS) {
    throw new CustomOfferError(`Les révisions doivent aller de 0 à ${MAX_REVISIONS}.`, 400);
  }

  /* One live offer per thread.
   *
   * Two standing offers mean the client can accept either and the freelancer
   * does not know which price they are held to. Superseding the previous one
   * rather than refusing: re-quoting after a conversation is the normal thing
   * to do, and making somebody withdraw first is a step with no purpose. */
  const live = await prisma.customOffer.findFirst({
    where: { conversationId: input.conversationId, status: "SENT" },
    select: { id: true, expiresAt: true, status: true },
  });

  const validDays = input.validDays ?? DEFAULT_VALID_DAYS;
  if (!Number.isFinite(validDays) || validDays < 1 || validDays > 90) {
    throw new CustomOfferError("La validité doit aller de 1 à 90 jours.", 400);
  }

  const offer = await prisma.$transaction(async (tx) => {
    if (live) {
      await tx.customOffer.update({
        where: { id: live.id },
        data: { status: "WITHDRAWN", respondedAt: new Date() },
      });
    }

    return tx.customOffer.create({
      data: {
        conversationId: input.conversationId,
        freelancerId: me.user.freelancerProfile!.id,
        clientId: other.userId,
        title,
        description: input.description?.trim() || null,
        price: String(price),
        deliveryDays,
        revisions,
        expiresAt: new Date(Date.now() + validDays * 86_400_000),
      },
      select: OFFER_SELECT,
    });
  });

  // The thread moves to the top of both inboxes: an offer is the most
  // important thing that can happen in one.
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
    select: { id: true },
  });

  return shape(offer);
};

/**
 * Every offer in a thread, newest first, for whoever is in it.
 *
 * Says which side the reader is on as well. The thread screen has to know
 * whether to offer "envoyer une offre" or "accepter", and working it out from
 * the offers alone fails on the first one — before any exists there is
 * nothing to infer it from.
 */
export const listForConversation = async (conversationId: string, userId: string) => {
  const { me } = await sidesOf(conversationId, userId);

  const rows = await prisma.customOffer.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: OFFER_SELECT,
  });

  return {
    offers: rows.map(shape),
    canSendOffer: Boolean(me.user.freelancerProfile),
  };
};

/** The offer, if this account is on one side of it. */
const offerFor = async (offerId: string, userId: string) => {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    select: { ...OFFER_SELECT, freelancer: { select: { id: true, userId: true, username: true, displayName: true } } },
  });

  if (!offer) throw new CustomOfferError("Offre introuvable.", 404);

  const isClient = offer.client.id === userId;
  const isFreelancer = offer.freelancer.userId === userId;

  if (!isClient && !isFreelancer) throw new CustomOfferError("Offre introuvable.", 404);

  return { offer, isClient, isFreelancer };
};

/**
 * The client accepts, and an order exists.
 *
 * The order is created from the offer's own figures, never from anything the
 * request carries: the price the client agreed to is the one stored when the
 * freelancer sent it.
 *
 * `CustomOffer.orderId` is unique, so two accepts racing cannot produce two
 * orders — the second violates the constraint rather than charging somebody
 * twice for the same job.
 */
export const accept = async (offerId: string, userId: string) => {
  const { offer, isClient } = await offerFor(offerId, userId);

  if (!isClient) {
    throw new CustomOfferError("Seul le client peut accepter cette offre.", 403);
  }

  const status = effectiveStatus(offer);

  if (status === "EXPIRED") {
    throw new CustomOfferError(
      "Cette offre a expiré. Demandez au freelance de la renvoyer.",
      409
    );
  }
  if (status !== "SENT") {
    throw new CustomOfferError("Cette offre n'est plus disponible.", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.freelanceOrder.create({
      data: {
        reference: `OFF-${Date.now().toString(36).toUpperCase()}`,
        clientId: offer.client.id,
        freelancerId: offer.freelancer.id,
        // No service and no project: this order came from a conversation, and
        // saying so by leaving both null is truer than pointing at something
        // it did not come from.
        agreedPrice: offer.price,
        deliveryDueAt: new Date(Date.now() + offer.deliveryDays * 86_400_000),
        status: FreelanceOrderStatus.CREATED,
      },
      select: { id: true, reference: true, status: true, agreedPrice: true },
    });

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        actorId: userId,
        fromStatus: FreelanceOrderStatus.CREATED,
        toStatus: FreelanceOrderStatus.CREATED,
        note: `Offre personnalisée acceptée : ${offer.title}`,
      },
    });

    const updated = await tx.customOffer.update({
      where: { id: offer.id },
      data: { status: "ACCEPTED", respondedAt: new Date(), orderId: order.id },
      select: OFFER_SELECT,
    });

    /* The thread is attached to the order, so the conversation that produced
     * it is the one the order screen links to — unless this pair already has
     * an order thread, in which case the general one stays general. */
    await tx.conversation
      .update({ where: { id: offer.conversationId }, data: { orderId: order.id } })
      .catch(() => undefined);

    return { offer: updated, order };
  });

  return { offer: shape(result.offer), order: result.order };
};

/** The client says no. */
export const decline = async (offerId: string, userId: string) => {
  const { offer, isClient } = await offerFor(offerId, userId);

  if (!isClient) {
    throw new CustomOfferError("Seul le client peut refuser cette offre.", 403);
  }
  if (effectiveStatus(offer) !== "SENT") {
    throw new CustomOfferError("Cette offre n'est plus disponible.", 409);
  }

  const updated = await prisma.customOffer.update({
    where: { id: offer.id },
    data: { status: "DECLINED", respondedAt: new Date() },
    select: OFFER_SELECT,
  });

  return shape(updated);
};

/** The freelancer takes it back, before it is answered. */
export const withdraw = async (offerId: string, userId: string) => {
  const { offer, isFreelancer } = await offerFor(offerId, userId);

  if (!isFreelancer) {
    throw new CustomOfferError("Seul le freelance peut retirer cette offre.", 403);
  }

  const status = effectiveStatus(offer);

  if (status === "ACCEPTED") {
    // The order exists and the work may have started. Withdrawing the quote
    // afterwards would not undo either; cancelling the order is the move.
    throw new CustomOfferError(
      "Cette offre a été acceptée. Annulez la commande si besoin.",
      409
    );
  }
  if (status !== "SENT") {
    throw new CustomOfferError("Cette offre n'est plus en attente.", 409);
  }

  const updated = await prisma.customOffer.update({
    where: { id: offer.id },
    data: { status: "WITHDRAWN", respondedAt: new Date() },
    select: OFFER_SELECT,
  });

  return shape(updated);
};

export default { send, listForConversation, accept, decline, withdraw, CustomOfferError };
