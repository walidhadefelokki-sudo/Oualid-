import { CreditEntryType, ServiceStatus } from "@prisma/client";
import prisma from "../utils/prisma";
import credits from "./credits.service";
import plans, { PlanLimitError } from "./plans.service";

/**
 * Publishing a service — the platform's main paid action.
 *
 * Two gates, and they answer different questions:
 *
 *   the plan   — how many services may be live at once
 *   the credits — what each publication costs
 *
 * Both are checked. A Pro account with no credits cannot publish, and an
 * account with a thousand credits still cannot exceed its plan's slots.
 *
 * Credits are taken when the service is submitted, not when a moderator
 * approves it. Taking them later would mean a queue of submissions whose
 * cost is unknown until someone acts on them, and a freelancer unable to
 * tell what they have left. A refusal gives them back, which is the policy
 * the specification proposes.
 */

export class ServiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceValidationError";
  }
}

/** A handle for the public URL, kept unique by a short random suffix. */
const slugify = (title: string) => {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "service"}-${suffix}`;
};

/**
 * What a service needs before anyone may see it.
 *
 * Checked at submission rather than while editing: a draft is allowed to be
 * half-finished, which is what makes it a draft.
 */
const assertReadyForReview = (service: {
  title: string;
  description: string;
  packages: Array<{ price: unknown; deliveryDays: number }>;
}) => {
  if (service.title.trim().length < 10) {
    throw new ServiceValidationError("Le titre doit faire au moins 10 caractères.");
  }
  if (service.description.trim().length < 60) {
    throw new ServiceValidationError("La description doit faire au moins 60 caractères.");
  }
  if (service.packages.length === 0) {
    throw new ServiceValidationError("Ajoutez au moins une formule avec un prix.");
  }
  for (const p of service.packages) {
    if (Number(p.price) <= 0) {
      throw new ServiceValidationError("Chaque formule doit avoir un prix supérieur à zéro.");
    }
    if (p.deliveryDays <= 0) {
      throw new ServiceValidationError("Chaque formule doit avoir un délai de livraison.");
    }
  }
};

/**
 * Submits a draft for moderation and charges for it.
 *
 * The charge carries the service id as its idempotency key, so a double
 * submit — two clicks, a retried request — collides on the ledger's unique
 * index and takes the cost once.
 */
export const submitForReview = async (freelancerId: string, serviceId: string, userId: string) => {
  const service = await prisma.serviceListing.findFirst({
    where: { id: serviceId, freelancerId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      packages: { select: { price: true, deliveryDays: true } },
    },
  });

  if (!service) throw new ServiceValidationError("Service introuvable.");

  if (service.status === "PENDING") {
    throw new ServiceValidationError("Ce service est déjà en attente de validation.");
  }
  if (service.status === "PUBLISHED") {
    throw new ServiceValidationError("Ce service est déjà en ligne.");
  }

  assertReadyForReview(service);

  // Refused before the charge: taking credits for a publication the plan has
  // no room for would mean refunding it a moment later.
  await plans.assertCanPublishService(freelancerId);

  const costs = await credits.getCreditCosts();
  const previousStatus = service.status;

  /* Claim the submission before charging for it.
   *
   * The status guard is what makes two simultaneous submits resolve to one:
   * only the request that finds the service still DRAFT or REJECTED moves
   * it, and the other sees count 0 and stops without spending anything.
   * A plain read-then-write would let both through. */
  const claimed = await prisma.serviceListing.updateMany({
    where: { id: service.id, freelancerId, status: { in: ["DRAFT", "REJECTED"] } },
    data: {
      status: ServiceStatus.PENDING,
      rejectionReason: null,
      publicationAttempts: { increment: 1 },
    },
  });

  if (claimed.count === 0) {
    throw new ServiceValidationError("Ce service est déjà en attente de validation.");
  }

  const { publicationAttempts } = await prisma.serviceListing.findUniqueOrThrow({
    where: { id: service.id },
    select: { publicationAttempts: true },
  });

  try {
    /* The attempt number belongs in the key.
     *
     * Keyed on the service alone, a resubmission after a refusal matched the
     * first charge, came back as a replay and republished for free — and a
     * refused service can be resubmitted any number of times. */
    const charge = await credits.spend({
      userId,
      amount: costs.servicePublication,
      type: CreditEntryType.SERVICE_PUBLICATION,
      idempotencyKey: `service-publication:${service.id}:${publicationAttempts}`,
      referenceType: "service",
      referenceId: service.id,
      note: `Publication : ${service.title.slice(0, 60)}`,
    });

    return { status: ServiceStatus.PENDING, balance: charge.balance, charged: !charge.replayed };
  } catch (err) {
    // The claim is undone when the charge fails, so an empty wallet leaves a
    // draft the freelancer can submit again rather than a service stuck in a
    // queue nobody paid for.
    await prisma.serviceListing.updateMany({
      where: { id: service.id, status: ServiceStatus.PENDING },
      data: { status: previousStatus, publicationAttempts: { decrement: 1 } },
    });
    throw err;
  }
};

/**
 * A moderator approves: the service goes live for the configured window.
 *
 * The plan is re-checked here. Submissions queue, and a freelancer who
 * submitted three while holding one slot must not have all three approved
 * past the limit.
 */
export const approve = async (serviceId: string, moderatorId: string) => {
  const service = await prisma.serviceListing.findUnique({
    where: { id: serviceId },
    select: { id: true, freelancerId: true, status: true },
  });

  if (!service) throw new ServiceValidationError("Service introuvable.");
  if (service.status !== "PENDING") {
    throw new ServiceValidationError("Ce service n'est pas en attente de validation.");
  }

  await plans.assertCanPublishService(service.freelancerId);

  const costs = await credits.getCreditCosts();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + costs.serviceDurationDays * 86_400_000);

  const [updated] = await prisma.$transaction([
    prisma.serviceListing.update({
      where: { id: service.id },
      data: { status: ServiceStatus.PUBLISHED, publishedAt: now, expiresAt },
    }),
    prisma.moderationRecord.create({
      data: {
        entityType: "service",
        entityId: service.id,
        state: "APPROVED",
        moderatorId,
      },
    }),
  ]);

  return updated;
};

/**
 * A moderator refuses: the service returns to its author with a reason, and
 * the publication credits are given back.
 *
 * The refund is keyed off the entry it reverses, so refusing the same
 * service twice pays out once.
 */
export const reject = async (serviceId: string, moderatorId: string, reason: string) => {
  if (!reason?.trim()) {
    throw new ServiceValidationError("Un motif est obligatoire pour refuser un service.");
  }

  const service = await prisma.serviceListing.findUnique({
    where: { id: serviceId },
    select: { id: true, status: true },
  });

  if (!service) throw new ServiceValidationError("Service introuvable.");
  if (service.status !== "PENDING") {
    throw new ServiceValidationError("Ce service n'est pas en attente de validation.");
  }

  await prisma.$transaction([
    prisma.serviceListing.update({
      where: { id: service.id },
      data: { status: ServiceStatus.REJECTED, rejectionReason: reason.trim() },
    }),
    prisma.moderationRecord.create({
      data: {
        entityType: "service",
        entityId: service.id,
        state: "REJECTED",
        reason: reason.trim(),
        moderatorId,
      },
    }),
  ]);

  const refund = await credits.refundFor(
    "service",
    service.id,
    "Remboursement : service refusé par la modération"
  );

  return { refunded: refund?.replayed === false, balance: refund?.balance ?? null };
};

export { slugify, assertReadyForReview, PlanLimitError };

export default { submitForReview, approve, reject, slugify, ServiceValidationError };
