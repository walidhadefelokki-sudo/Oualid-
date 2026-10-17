import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import publication, { ServiceValidationError } from "../services/servicePublication.service";
import { PlanLimitError } from "../services/plans.service";

/**
 * The moderation queue.
 *
 * Nothing a freelancer submits reaches the public until someone here acts on
 * it. The specification sets a target of under 24 hours, so the queue is
 * ordered oldest first and carries how long each item has waited — a target
 * nobody can see the state of is not a target.
 *
 * The decisions themselves live in servicePublication.service: approving
 * re-checks the plan, refusing returns the credits. This file is the way in,
 * not the rules.
 */

const asHttpError = (err: unknown) => {
  if (err instanceof ServiceValidationError) return new AppError(err.message, 400);
  if (err instanceof PlanLimitError) return new AppError(err.message, 409);
  return err;
};

/** Everything waiting on a decision, oldest first. */
export const listQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await prisma.serviceListing.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
        publicationAttempts: true,
        category: { select: { name: true } },
        packages: {
          orderBy: { price: "asc" },
          select: { tier: true, name: true, price: true, deliveryDays: true, revisions: true, features: true },
        },
        faqs: { orderBy: { position: "asc" }, select: { question: true, answer: true } },
        skills: { select: { skill: { select: { name: true } } } },
        media: { orderBy: { position: "asc" }, select: { file: { select: { url: true } } } },
        freelancer: {
          select: {
            username: true,
            displayName: true,
            level: true,
            identityVerified: true,
            ratingAverage: true,
            ratingCount: true,
            wilaya: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        services: services.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          submittedAt: s.updatedAt,
          // Second and later attempts deserve a closer look: this one has
          // been refused before.
          attempt: s.publicationAttempts,
          category: s.category?.name ?? null,
          packages: s.packages,
          faqs: s.faqs,
          skills: s.skills.map((x) => x.skill.name),
          images: s.media.map((m) => m.file.url),
          freelancer: {
            username: s.freelancer.username,
            displayName: s.freelancer.displayName,
            email: s.freelancer.user.email,
            level: s.freelancer.level,
            verified: s.freelancer.identityVerified,
            rating: s.freelancer.ratingAverage,
            ratingCount: s.freelancer.ratingCount,
            wilaya: s.freelancer.wilaya,
          },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/** How the queue is doing against the 24-hour target. */
export const getQueueStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [pending, overdue, approvedToday, rejectedToday] = await Promise.all([
      prisma.serviceListing.count({ where: { status: "PENDING" } }),
      // Waiting longer than the target. Measured, not assumed: the
      // specification's "moins de 24 heures" is a claim that has to be
      // checkable before anyone repeats it.
      prisma.serviceListing.count({ where: { status: "PENDING", updatedAt: { lt: dayAgo } } }),
      prisma.moderationRecord.count({
        where: { entityType: "service", state: "APPROVED", createdAt: { gte: dayAgo } },
      }),
      prisma.moderationRecord.count({
        where: { entityType: "service", state: "REJECTED", createdAt: { gte: dayAgo } },
      }),
    ]);

    res.json({ success: true, data: { pending, overdue, approvedToday, rejectedToday } });
  } catch (err) {
    next(err);
  }
};

export const approveService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await publication.approve(req.params.id, req.user!.id);
    res.json({ success: true, data: { id: service.id, status: service.status } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const rejectService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body as { reason?: string };
    const result = await publication.reject(req.params.id, req.user!.id, String(reason ?? ""));
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** The decisions already taken, for an audit of who allowed what. */
export const listHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 30;

    const [total, records] = await Promise.all([
      prisma.moderationRecord.count({ where: { entityType: "service" } }),
      prisma.moderationRecord.findMany({
        where: { entityType: "service" },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          entityId: true,
          state: true,
          reason: true,
          createdAt: true,
          moderator: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    // The title is looked up separately: a moderation record outlives the
    // thing it judged, and a deleted service should not break the history.
    const titles = await prisma.serviceListing.findMany({
      where: { id: { in: records.map((r) => r.entityId) } },
      select: { id: true, title: true },
    });
    const titleById = new Map(titles.map((t) => [t.id, t.title]));

    res.json({
      success: true,
      data: {
        records: records.map((r) => ({
          ...r,
          title: titleById.get(r.entityId) ?? "(service supprimé)",
        })),
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------
 * Projects
 *
 * Same queue, different rules. A project costs its client nothing, so there
 * is no charge to reverse on a refusal — the author fixes it and sends it
 * back. That is the whole difference, and it is why these are separate
 * handlers rather than a `type` parameter on the ones above.
 * --------------------------------------------------------------------- */

export const listProjectQueue = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.freelanceProject.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
        budgetType: true,
        budgetMin: true,
        budgetMax: true,
        deadline: true,
        remote: true,
        wilaya: true,
        visibility: true,
        category: { select: { name: true } },
        skills: { select: { skill: { select: { name: true } } } },
        client: { select: { email: true, firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      data: {
        projects: projects.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          submittedAt: p.updatedAt,
          budgetType: p.budgetType,
          budgetMin: p.budgetMin,
          budgetMax: p.budgetMax,
          deadline: p.deadline,
          remote: p.remote,
          wilaya: p.wilaya,
          visibility: p.visibility,
          category: p.category?.name ?? null,
          skills: p.skills.map((s) => s.skill.name),
          client: {
            email: p.client.email,
            name:
              p.company?.name ??
              [p.client.firstName, p.client.lastName].filter(Boolean).join(" ") ??
              null,
          },
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const approveProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const done = await prisma.freelanceProject.updateMany({
      where: { id: req.params.id, status: "PENDING" },
      data: { status: "OPEN", publishedAt: new Date() },
    });

    if (done.count === 0) {
      return next(new AppError("Ce projet n'est pas en attente de validation.", 409));
    }

    await prisma.moderationRecord.create({
      data: {
        entityType: "project",
        entityId: req.params.id,
        state: "APPROVED",
        moderatorId: req.user!.id,
      },
    });

    res.json({ success: true, data: { id: req.params.id, status: "OPEN" } });
  } catch (err) {
    next(err);
  }
};

export const rejectProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = String((req.body as { reason?: string }).reason ?? "").trim();
    if (!reason) {
      return next(new AppError("Un motif est obligatoire pour refuser un projet.", 400));
    }

    const done = await prisma.freelanceProject.updateMany({
      where: { id: req.params.id, status: "PENDING" },
      data: { status: "REJECTED", rejectionReason: reason },
    });

    if (done.count === 0) {
      return next(new AppError("Ce projet n'est pas en attente de validation.", 409));
    }

    await prisma.moderationRecord.create({
      data: {
        entityType: "project",
        entityId: req.params.id,
        state: "REJECTED",
        reason,
        moderatorId: req.user!.id,
      },
    });

    res.json({ success: true, data: { id: req.params.id, status: "REJECTED" } });
  } catch (err) {
    next(err);
  }
};
