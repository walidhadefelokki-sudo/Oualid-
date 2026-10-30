import { CreditEntryType, ProposalStatus } from "@prisma/client";
import prisma from "../utils/prisma";
import credits from "./credits.service";
import plans from "./plans.service";

/**
 * Answering a project.
 *
 * A proposal costs the freelancer either one of their monthly quota or a few
 * credits, decided by their plan. The quota goes first — the specification
 * prices both without saying which applies to a subscriber holding credits,
 * and charging credits first would make a subscription worth nothing to
 * anyone who bought a pack.
 *
 * The charge happens only after the proposal row exists. The unique index on
 * (projectId, freelancerId) is what makes a double submit cost once: the
 * second insert fails, so there is nothing to charge for.
 */

export class ProposalError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "ProposalError";
  }
}

interface SubmitInput {
  projectId: string;
  freelancerId: string;
  userId: string;
  coverLetter: string;
  price: number;
  deliveryDays: number;
}

/**
 * Submits a proposal and charges for it.
 *
 * Order matters. The row is created first, then charged, because the row is
 * what prevents a second one; charging first would take credits for a
 * proposal the unique index is about to reject.
 *
 * If the charge fails — an empty wallet — the proposal is removed again, so
 * the freelancer is not left holding a submission nobody paid for and the
 * client is not shown an offer that was never really made.
 */
export const submit = async (input: SubmitInput) => {
  const { projectId, freelancerId, userId, coverLetter, price, deliveryDays } = input;

  if (!coverLetter?.trim()) throw new ProposalError("La lettre de motivation est obligatoire.");
  if (coverLetter.trim().length < 40) {
    throw new ProposalError("La lettre de motivation doit faire au moins 40 caractères.");
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new ProposalError("Indiquez un prix supérieur à zéro.");
  }
  if (!Number.isInteger(deliveryDays) || deliveryDays <= 0) {
    throw new ProposalError("Indiquez un délai en jours.");
  }

  const project = await prisma.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, visibility: true, clientId: true, title: true },
  });

  if (!project) throw new ProposalError("Projet introuvable.", 404);
  if (project.status !== "OPEN") {
    throw new ProposalError("Ce projet n'accepte plus de propositions.", 409);
  }

  const freelancer = await prisma.freelancerProfile.findUnique({
    where: { id: freelancerId },
    select: { userId: true },
  });
  if (!freelancer) throw new ProposalError("Profil freelance introuvable.", 404);

  // Answering your own project would let a client fill their own feed with
  // offers and inflate the counts the platform reports.
  if (project.clientId === freelancer.userId) {
    throw new ProposalError("Vous ne pouvez pas répondre à votre propre projet.", 403);
  }

  if (project.visibility === "INVITE_ONLY") {
    const invited = await prisma.projectInvite.findUnique({
      where: { projectId_freelancerId: { projectId, freelancerId } },
      select: { projectId: true },
    });
    if (!invited) throw new ProposalError("Ce projet est sur invitation uniquement.", 403);
  }

  const existing = await prisma.proposal.findUnique({
    where: { projectId_freelancerId: { projectId, freelancerId } },
    select: { id: true, status: true },
  });
  if (existing) {
    throw new ProposalError("Vous avez déjà répondu à ce projet.", 409);
  }

  const charge = await plans.resolveProposalCharge(freelancerId);
  const costs = await credits.getCreditCosts();

  // Checked before writing, so an empty wallet is refused with a message
  // rather than by creating and deleting a row.
  if (charge.method === "credits") {
    const balance = await credits.getBalance(userId);
    if (balance < costs.proposal) {
      throw new credits.InsufficientCreditsError(costs.proposal, balance);
    }
  }

  let proposal;
  try {
    proposal = await prisma.proposal.create({
      data: {
        projectId,
        freelancerId,
        coverLetter: coverLetter.trim(),
        price: String(price),
        deliveryDays,
      },
      select: { id: true, status: true, createdAt: true },
    });
  } catch (err) {
    // Two submits racing: the index decides, and the loser is told the same
    // thing it would have been told a moment earlier.
    throw new ProposalError("Vous avez déjà répondu à ce projet.", 409);
  }

  try {
    if (charge.method === "quota") {
      await plans.consumeProposalQuota(charge.subscriptionId!);
      return { proposal, charged: "quota" as const, balance: await credits.getBalance(userId) };
    }

    const spent = await credits.spend({
      userId,
      amount: costs.proposal,
      type: CreditEntryType.PROPOSAL_SUBMISSION,
      idempotencyKey: `proposal:${proposal.id}`,
      referenceType: "proposal",
      referenceId: proposal.id,
      note: `Proposition : ${project.title.slice(0, 60)}`,
    });

    return { proposal, charged: "credits" as const, balance: spent.balance };
  } catch (err) {
    // Nothing was paid, so nothing should have been said.
    await prisma.proposal.delete({ where: { id: proposal.id } }).catch(() => {});
    throw err;
  }
};

/**
 * Withdraws a proposal.
 *
 * The credits are not returned. They bought the act of putting the offer in
 * front of the client, which happened; refunding on withdrawal would make
 * every proposal free to anyone willing to take it back.
 */
export const withdraw = async (proposalId: string, freelancerId: string) => {
  const done = await prisma.proposal.updateMany({
    where: {
      id: proposalId,
      freelancerId,
      status: { in: ["SENT", "VIEWED", "SHORTLISTED"] },
    },
    data: { status: ProposalStatus.WITHDRAWN, decidedAt: new Date() },
  });

  if (done.count === 0) {
    throw new ProposalError("Cette proposition ne peut plus être retirée.", 409);
  }

  return { status: ProposalStatus.WITHDRAWN };
};

/** Marks a proposal seen, the first time the client opens it. */
export const markViewed = async (proposalId: string, clientId: string) => {
  await prisma.proposal.updateMany({
    where: {
      id: proposalId,
      status: ProposalStatus.SENT,
      project: { clientId },
    },
    data: { status: ProposalStatus.VIEWED, viewedAt: new Date() },
  });
};

/**
 * The client's decision on one proposal.
 *
 * Scoped to proposals on the client's own projects, so ownership is the
 * query rather than a check that can be forgotten.
 */
export const decide = async (
  proposalId: string,
  clientId: string,
  decision: "SHORTLISTED" | "REJECTED" | "SELECTED"
) => {
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, project: { clientId } },
    select: {
      id: true,
      status: true,
      price: true,
      deliveryDays: true,
      freelancerId: true,
      project: { select: { id: true, status: true, title: true } },
    },
  });

  if (!proposal) throw new ProposalError("Proposition introuvable.", 404);
  if (proposal.status === "WITHDRAWN") {
    throw new ProposalError("Cette proposition a été retirée.", 409);
  }

  if (decision !== "SELECTED") {
    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: decision as ProposalStatus,
        ...(decision === "SHORTLISTED" ? { shortlistedAt: new Date() } : {}),
        ...(decision === "REJECTED" ? { decidedAt: new Date() } : {}),
      },
      select: { id: true, status: true },
    });
    return { proposal: updated, order: null };
  }

  /* Hiring. One winner per project: the chosen proposal becomes SELECTED,
   * the rest are rejected, the project moves to IN_PROGRESS and an order is
   * created — all together, because a hire that half happened leaves a
   * client who thinks they hired someone and a freelancer who was never
   * told. */
  const reference = `PRJ-${Date.now().toString(36).toUpperCase()}`;

  const [, , , order] = await prisma.$transaction([
    prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: ProposalStatus.SELECTED, decidedAt: new Date() },
    }),
    prisma.proposal.updateMany({
      where: {
        projectId: proposal.project.id,
        id: { not: proposal.id },
        status: { in: ["SENT", "VIEWED", "SHORTLISTED"] },
      },
      data: { status: ProposalStatus.REJECTED, decidedAt: new Date() },
    }),
    prisma.freelanceProject.update({
      where: { id: proposal.project.id },
      data: { status: "IN_PROGRESS" },
    }),
    prisma.freelanceOrder.create({
      data: {
        reference,
        clientId,
        freelancerId: proposal.freelancerId,
        projectId: proposal.project.id,
        agreedPrice: proposal.price,
        deliveryDueAt: new Date(Date.now() + proposal.deliveryDays * 86_400_000),
        status: "CREATED",
      },
      select: { id: true, reference: true, status: true },
    }),
  ]);

  return { proposal: { id: proposal.id, status: ProposalStatus.SELECTED }, order };
};

export default { submit, withdraw, markViewed, decide, ProposalError };
