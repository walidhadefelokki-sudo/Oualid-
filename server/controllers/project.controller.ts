import { Request, Response, NextFunction } from "express";
import { BudgetType, FreelanceProjectStatus, ProjectVisibility } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { slugify } from "../services/servicePublication.service";

/**
 * A client's projects.
 *
 * Free, by design. The platform earns from freelancers; charging clients to
 * post work would thin out the demand that makes a freelance subscription
 * worth paying for. So there is no credit check anywhere in this file.
 *
 * The client is a plain User. No profile to activate, no role to change —
 * any account can post work, including a recruiter who already hires
 * employees through the same company.
 */

const MIN_TITLE = 10;
const MIN_DESCRIPTION = 60;

/** Everything a project needs before anyone may see it. */
const assertReadyForReview = (p: {
  title: string;
  description: string;
  budgetMin: unknown;
  budgetMax: unknown;
}) => {
  if (p.title.trim().length < MIN_TITLE) {
    throw new AppError(`Le titre doit faire au moins ${MIN_TITLE} caractères.`, 400);
  }
  if (p.description.trim().length < MIN_DESCRIPTION) {
    throw new AppError(`La description doit faire au moins ${MIN_DESCRIPTION} caractères.`, 400);
  }

  const min = p.budgetMin == null ? null : Number(p.budgetMin);
  const max = p.budgetMax == null ? null : Number(p.budgetMax);

  if (min == null && max == null) {
    throw new AppError("Indiquez un budget, même approximatif.", 400);
  }
  if (min != null && max != null && min > max) {
    throw new AppError("Le budget minimum dépasse le maximum.", 400);
  }
};

/** The caller's own project, or nothing. Ownership is the query, not a check. */
const findOwn = (userId: string, id: string) =>
  prisma.freelanceProject.findFirst({
    where: { id, clientId: userId },
    select: { id: true, status: true, title: true },
  });

export const createDraft = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const title = String((req.body as { title?: string }).title ?? "").trim();

    const project = await prisma.freelanceProject.create({
      data: {
        clientId: req.user!.id,
        title: title || "Nouveau projet",
        slug: slugify(title || "projet"),
        description: "",
        status: "DRAFT",
      },
      select: { id: true },
    });

    res.status(201).json({ success: true, data: { id: project.id } });
  } catch (err) {
    next(err);
  }
};

/** The client's own list, at every status. */
export const listMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.freelanceProject.findMany({
      where: { clientId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        rejectionReason: true,
        budgetType: true,
        budgetMin: true,
        budgetMax: true,
        deadline: true,
        remote: true,
        wilaya: true,
        visibility: true,
        publishedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        _count: { select: { proposals: true } },
      },
    });

    res.json({
      success: true,
      data: {
        projects: projects.map((p) => ({
          ...p,
          category: p.category?.name ?? null,
          proposalCount: p._count.proposals,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.freelanceProject.findFirst({
      where: { id: req.params.id, clientId: req.user!.id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        rejectionReason: true,
        categoryId: true,
        budgetType: true,
        budgetMin: true,
        budgetMax: true,
        deadline: true,
        remote: true,
        wilaya: true,
        visibility: true,
        skills: { select: { skill: { select: { name: true } } } },
        _count: { select: { proposals: true } },
      },
    });

    if (!project) return next(new AppError("Projet introuvable.", 404));

    res.json({
      success: true,
      data: {
        project: {
          ...project,
          skills: project.skills.map((s) => s.skill.name),
          proposalCount: project._count.proposals,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await findOwn(req.user!.id, req.params.id);
    if (!existing) return next(new AppError("Projet introuvable.", 404));

    if (existing.status === "PENDING") {
      return next(new AppError("Ce projet est en cours de validation.", 409));
    }

    const {
      title,
      description,
      categoryId,
      budgetType,
      budgetMin,
      budgetMax,
      deadline,
      remote,
      wilaya,
      visibility,
      skills,
    } = req.body as Record<string, any>;

    await prisma.$transaction(async (tx) => {
      await tx.freelanceProject.update({
        where: { id: existing.id },
        data: {
          ...(title !== undefined ? { title: String(title).trim() || "Nouveau projet" } : {}),
          ...(description !== undefined ? { description: String(description) } : {}),
          ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
          ...(budgetType !== undefined
            ? { budgetType: (budgetType === "HOURLY" ? "HOURLY" : "FIXED") as BudgetType }
            : {}),
          ...(budgetMin !== undefined
            ? { budgetMin: budgetMin === "" || budgetMin == null ? null : String(Number(budgetMin)) }
            : {}),
          ...(budgetMax !== undefined
            ? { budgetMax: budgetMax === "" || budgetMax == null ? null : String(Number(budgetMax)) }
            : {}),
          ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
          ...(remote !== undefined ? { remote: Boolean(remote) } : {}),
          ...(wilaya !== undefined ? { wilaya: wilaya ? String(wilaya).trim() : null } : {}),
          ...(visibility !== undefined
            ? {
                visibility: (visibility === "INVITE_ONLY"
                  ? "INVITE_ONLY"
                  : "PUBLIC") as ProjectVisibility,
              }
            : {}),
        },
      });

      if (Array.isArray(skills)) {
        await tx.projectSkill.deleteMany({ where: { projectId: existing.id } });
        for (const raw of skills.slice(0, 15)) {
          const name = String(raw).trim();
          if (!name) continue;
          const skill = await tx.skill.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { id: true },
          });
          await tx.projectSkill.create({ data: { projectId: existing.id, skillId: skill.id } });
        }
      }
    });

    res.json({ success: true, data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
};

/**
 * Sends the project to moderation.
 *
 * Nothing is charged. The status guard means two clicks resolve to one
 * submission rather than two queue entries.
 */
export const submitMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.freelanceProject.findFirst({
      where: { id: req.params.id, clientId: req.user!.id },
      select: {
        id: true,
        title: true,
        description: true,
        budgetMin: true,
        budgetMax: true,
        status: true,
      },
    });

    if (!project) return next(new AppError("Projet introuvable.", 404));
    if (project.status === "PENDING") {
      return next(new AppError("Ce projet est déjà en attente de validation.", 409));
    }
    if (project.status === "OPEN") {
      return next(new AppError("Ce projet est déjà publié.", 409));
    }

    assertReadyForReview(project);

    const claimed = await prisma.freelanceProject.updateMany({
      where: { id: project.id, clientId: req.user!.id, status: { in: ["DRAFT", "REJECTED"] } },
      data: { status: FreelanceProjectStatus.PENDING, rejectionReason: null },
    });

    if (claimed.count === 0) {
      return next(new AppError("Ce projet est déjà en attente de validation.", 409));
    }

    res.json({ success: true, data: { status: "PENDING" } });
  } catch (err) {
    next(err);
  }
};

/**
 * Closes a project.
 *
 * Kept rather than deleted: the proposals sent to it, and any order that
 * came out of it, refer to this row.
 */
export const closeMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const done = await prisma.freelanceProject.updateMany({
      where: {
        id: req.params.id,
        clientId: req.user!.id,
        status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] },
      },
      data: { status: FreelanceProjectStatus.CLOSED },
    });

    if (done.count === 0) return next(new AppError("Ce projet ne peut pas être clôturé.", 409));
    res.json({ success: true, data: { status: "CLOSED" } });
  } catch (err) {
    next(err);
  }
};

export const deleteMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.freelanceProject.findFirst({
      where: { id: req.params.id, clientId: req.user!.id },
      select: { id: true, status: true, _count: { select: { proposals: true } } },
    });

    if (!project) return next(new AppError("Projet introuvable.", 404));

    // Freelancers paid credits to answer this. Removing it would take the
    // thing they paid for out from under them.
    if (project._count.proposals > 0) {
      return next(
        new AppError(
          "Ce projet a reçu des propositions et ne peut pas être supprimé. Clôturez-le.",
          409
        )
      );
    }
    if (project.status === "PENDING") {
      return next(new AppError("Ce projet est en cours de validation.", 409));
    }

    await prisma.freelanceProject.delete({ where: { id: project.id } });
    res.json({ success: true, data: { id: project.id } });
  } catch (err) {
    next(err);
  }
};

/** The proposals a client has received, newest first. */
export const listProposalsReceived = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await findOwn(req.user!.id, req.params.id);
    if (!project) return next(new AppError("Projet introuvable.", 404));

    const proposals = await prisma.proposal.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        coverLetter: true,
        price: true,
        deliveryDays: true,
        status: true,
        createdAt: true,
        freelancer: {
          select: {
            username: true,
            displayName: true,
            title: true,
            level: true,
            identityVerified: true,
            ratingAverage: true,
            ratingCount: true,
            completedOrders: true,
            wilaya: true,
          },
        },
      },
    });

    res.json({ success: true, data: { project, proposals } });
  } catch (err) {
    next(err);
  }
};
