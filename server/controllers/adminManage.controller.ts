import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

/**
 * Super-admin management of accounts and offers.
 *
 * Kept apart from admin.controller, which is about plans, stats and
 * preselection. These are the destructive operations, and they are the ones
 * worth reading before changing.
 */

const audit = (
  req: Request,
  action: string,
  entity: string,
  entityId: string
) =>
  prisma.auditLog
    .create({
      data: {
        userId: req.user?.id,
        action,
        entity,
        entityId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    })
    .catch((err) => console.error(`Audit log failed for ${action}:`, err));

/* ============================================================= accounts === */

const ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"] as const;
const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "DELETED"] as const;

/**
 * Edits one account: name, email, role, status.
 *
 * An administrator cannot change their own role or status. Demoting or
 * suspending yourself locks you out of the only page that could undo it.
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, status } = req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
      status?: string;
    };

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return next(new AppError("Compte introuvable.", 404));

    if (req.user?.id === id && (role !== undefined || status !== undefined)) {
      return next(
        new AppError("Vous ne pouvez pas modifier votre propre rôle ou statut.", 400)
      );
    }

    if (role !== undefined && !ROLES.includes(role as never)) {
      return next(new AppError(`role must be one of: ${ROLES.join(", ")}`, 400));
    }
    if (status !== undefined && !STATUSES.includes(status as never)) {
      return next(new AppError(`status must be one of: ${STATUSES.join(", ")}`, 400));
    }

    // Demoting the last administrator has the same effect as deleting them.
    if (role !== undefined && target.role === "ADMIN" && role !== "ADMIN") {
      const admins = await prisma.user.count({
        where: { role: "ADMIN", status: { not: "DELETED" } },
      });
      if (admins <= 1) {
        return next(new AppError("Impossible de rétrograder le dernier administrateur.", 400));
      }
    }

    const nextEmail = email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== target.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return next(new AppError("Adresse email invalide.", 400));
      }
      const taken = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (taken) return next(new AppError("Cette adresse email est déjà utilisée.", 400));
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName: firstName?.trim() ?? undefined,
        lastName: lastName?.trim() ?? undefined,
        email: nextEmail ?? undefined,
        role: (role as never) ?? undefined,
        status: (status as never) ?? undefined,
        // Reinstating has to clear the tombstone, or sign-in keeps refusing.
        deletedAt: status && status !== "DELETED" ? null : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    await audit(req, "UPDATE_USER", "User", id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes an account — by marking it, not by removing the row.
 *
 * A User is referenced by their applications, their company membership, the
 * CRM notes written about them and the orders raised for them. Removing the
 * row takes all of that with it, so a recruiter would lose candidates from
 * offers they are still hiring for. The account is marked DELETED and stamped,
 * which is what the schema's own deletedAt column is for: sign-in refuses it,
 * and nobody else's records are disturbed.
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return next(new AppError("Vous ne pouvez pas supprimer votre propre compte.", 400));
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return next(new AppError("Compte introuvable.", 404));

    if (target.role === "ADMIN") {
      const admins = await prisma.user.count({
        where: { role: "ADMIN", status: { not: "DELETED" } },
      });
      if (admins <= 1) {
        return next(new AppError("Impossible de supprimer le dernier administrateur.", 400));
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: "DELETED", deletedAt: new Date() },
      select: { id: true, email: true, status: true, deletedAt: true },
    });

    await audit(req, "DELETE_USER", "User", id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};

/* ================================================================= jobs === */

/** Every offer, with what deleting one would take with it. */
export const getAllJobsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, q } = req.query as { status?: string; q?: string };

    const jobs = await prisma.job.findMany({
      where: {
        status: status ? (status as never) : undefined,
        title: q ? { contains: q, mode: "insensitive" } : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        title: true,
        location: true,
        wilaya: true,
        status: true,
        featured: true,
        publishedAt: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
        // Surfaced in the list so a delete is never a surprise.
        _count: { select: { applications: true } },
      },
    });

    res.status(200).json({ status: "success", results: jobs.length, data: { jobs } });
  } catch (err) {
    next(err);
  }
};

const JOB_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;

/** Changes an offer's status, or its featured placement. */
export const updateJobAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, featured } = req.body as { status?: string; featured?: boolean };

    if (status !== undefined && !JOB_STATUSES.includes(status as never)) {
      return next(new AppError(`status must be one of: ${JOB_STATUSES.join(", ")}`, 400));
    }

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return next(new AppError("Offre introuvable.", 404));

    const updated = await prisma.job.update({
      where: { id },
      data: {
        status: (status as never) ?? undefined,
        featured: typeof featured === "boolean" ? featured : undefined,
        // Publishing for the first time needs a date, or the offer shows no
        // age wherever it is listed.
        publishedAt: status === "PUBLISHED" && !job.publishedAt ? new Date() : undefined,
      },
      select: { id: true, title: true, status: true, featured: true, publishedAt: true },
    });

    await audit(req, "UPDATE_JOB", "Job", id);
    res.status(200).json({ status: "success", data: { job: updated } });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes an offer.
 *
 * Applications cascade off a Job, so this removes the people who applied to it
 * along with the listing. That is rarely what "remove this offer" is meant to
 * do, so one with applications is refused unless force=true, and the count
 * comes back in the refusal — ARCHIVED takes an offer out of circulation
 * without destroying anyone's application history.
 */
export const deleteJobAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const force = req.query.force === "true";

    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { applications: true } } },
    });
    if (!job) return next(new AppError("Offre introuvable.", 404));

    const applications = job._count.applications;
    if (applications > 0 && !force) {
      return res.status(409).json({
        status: "error",
        message: `Cette offre a ${applications} candidature(s), qui seront supprimées avec elle. Archivez-la, ou confirmez la suppression.`,
        data: { applications },
      });
    }

    await prisma.job.delete({ where: { id } });

    await audit(req, "DELETE_JOB", "Job", id);
    res.status(200).json({ status: "success", data: { id, applications } });
  } catch (err) {
    next(err);
  }
};
