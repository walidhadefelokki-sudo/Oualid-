import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import proposals, { ProposalError } from "../services/proposal.service";
import { InsufficientCreditsError } from "../services/credits.service";

/**
 * Proposals, from both sides.
 *
 * The freelancer sends and withdraws; the client reads, shortlists, rejects
 * and hires. Every handler resolves the caller's own profile or scopes the
 * query to their own project, so ownership is the query rather than a check
 * that can be skipped.
 */

const asHttpError = (err: unknown) => {
  if (err instanceof ProposalError) return new AppError(err.message, err.status);
  if (err instanceof InsufficientCreditsError) {
    return new AppError(
      `Crédits insuffisants : ${err.required} requis, ${err.available} disponibles.`,
      402
    );
  }
  return err;
};

const requireFreelancer = async (userId: string) => {
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw new AppError("Aucun profil freelance pour ce compte.", 404);
  return profile.id;
};

/** POST /freelance/me/proposals — answer a project. */
export const submitProposal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireFreelancer(req.user!.id);
    const { projectId, coverLetter, price, deliveryDays } = req.body as Record<string, unknown>;

    const result = await proposals.submit({
      projectId: String(projectId ?? ""),
      freelancerId,
      userId: req.user!.id,
      coverLetter: String(coverLetter ?? ""),
      price: Number(price),
      deliveryDays: Math.trunc(Number(deliveryDays)),
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const withdrawProposal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireFreelancer(req.user!.id);
    const result = await proposals.withdraw(req.params.id, freelancerId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};

/**
 * Whether this freelancer may answer a project, and what it would cost.
 *
 * Read by the project page so the form can say "2 crédits" or "1 de vos 40
 * propositions" before anything is written. The server decides again on
 * submission; this only spares the reader a refusal they could have been
 * told about earlier.
 */
export const getProposalEligibility = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });

    if (!profile) {
      return res.json({
        success: true,
        data: { canPropose: false, reason: "no-profile" },
      });
    }

    const project = await prisma.freelanceProject.findUnique({
      where: { id: req.params.projectId },
      select: { id: true, status: true, visibility: true, clientId: true },
    });
    if (!project) return next(new AppError("Projet introuvable.", 404));

    const existing = await prisma.proposal.findUnique({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: profile.id } },
      select: { id: true, status: true },
    });

    const plans = await import("../services/plans.service");
    const creditsService = await import("../services/credits.service");

    const [charge, costs, balance, entitlements] = await Promise.all([
      plans.resolveProposalCharge(profile.id),
      creditsService.getCreditCosts(),
      creditsService.getBalance(req.user!.id),
      plans.getEntitlements(profile.id),
    ]);

    const invited =
      project.visibility === "PUBLIC"
        ? true
        : Boolean(
            await prisma.projectInvite.findUnique({
              where: { projectId_freelancerId: { projectId: project.id, freelancerId: profile.id } },
              select: { projectId: true },
            })
          );

    const reason = existing
      ? "already-proposed"
      : project.clientId === req.user!.id
        ? "own-project"
        : project.status !== "OPEN"
          ? "closed"
          : !invited
            ? "not-invited"
            : charge.method === "credits" && balance < costs.proposal
              ? "insufficient-credits"
              : null;

    res.json({
      success: true,
      data: {
        canPropose: reason === null,
        reason,
        existing,
        method: charge.method,
        creditCost: costs.proposal,
        balance,
        proposalsRemaining: entitlements.proposalsRemaining,
        planName: entitlements.planName,
      },
    });
  } catch (err) {
    next(asHttpError(err));
  }
};

/* ------------------------------------------------------------ client side */

/**
 * One proposal in full, for the client deciding on it.
 *
 * Opening it marks it seen, which is what the freelancer's "vue" status
 * reports. Scoped to the client's own projects.
 */
export const getProposalForClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await proposals.markViewed(req.params.id, req.user!.id);

    const proposal = await prisma.proposal.findFirst({
      where: { id: req.params.id, project: { clientId: req.user!.id } },
      select: {
        id: true,
        coverLetter: true,
        price: true,
        deliveryDays: true,
        status: true,
        createdAt: true,
        viewedAt: true,
        shortlistedAt: true,
        project: { select: { id: true, title: true, status: true } },
        freelancer: {
          select: {
            username: true,
            displayName: true,
            title: true,
            bio: true,
            level: true,
            identityVerified: true,
            ratingAverage: true,
            ratingCount: true,
            completedOrders: true,
            wilaya: true,
            hourlyRate: true,
            languages: true,
            skills: { select: { skill: { select: { name: true } } } },
            // The address is deliberately absent: the client talks to the
            // freelancer through the platform, and a proposal is not a
            // reason to hand over a contact detail.
          },
        },
      },
    });

    if (!proposal) return next(new AppError("Proposition introuvable.", 404));

    res.json({
      success: true,
      data: {
        proposal: {
          ...proposal,
          freelancer: {
            ...proposal.freelancer,
            skills: proposal.freelancer.skills.map((s) => s.skill.name),
          },
        },
      },
    });
  } catch (err) {
    next(asHttpError(err));
  }
};

const DECISIONS = ["SHORTLISTED", "REJECTED", "SELECTED"] as const;

export const decideProposal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decision } = req.body as { decision?: string };
    if (!DECISIONS.includes(decision as never)) {
      return next(new AppError("Décision inconnue.", 400));
    }

    const result = await proposals.decide(req.params.id, req.user!.id, decision as never);
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};
