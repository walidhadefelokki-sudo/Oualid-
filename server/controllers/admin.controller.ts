import { Request, Response, NextFunction } from "express";
import { grantPostings, setPostings } from "../services/postingQuota.service";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

// ============================================================
// COMPANIES / PLAN MANAGEMENT
// ============================================================

export const getAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        members: {
          include: {
            recruiter: {
              include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } },
            },
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        jobs: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      results: companies.length,
      data: { companies },
    });
  } catch (err) {
    next(err);
  }
};

export const getCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { recruiter: { include: { user: true } } } },
        subscriptions: { orderBy: { createdAt: "desc" }, include: { payments: true } },
        jobs: true,
      },
    });

    if (!company) return next(new AppError("Company not found", 404));

    res.status(200).json({ status: "success", data: { company } });
  } catch (err) {
    next(err);
  }
};

// Change a recruiter's (company's) plan. Optionally creates a new Subscription record
// so the change is tracked, instead of silently overwriting Company.plan.
export const updateCompanyPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { plan, durationDays } = req.body;

    const validPlans = ["FREE", "PREMIUM", "CORPORATE"];
    if (!plan || !validPlans.includes(plan)) {
      return next(new AppError(`plan must be one of: ${validPlans.join(", ")}`, 400));
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return next(new AppError("Company not found", 404));

    /* Only CORPORATE is a subscription in the sense of a term that runs and
     * then lapses, and it is sold by the year. FREE is a single offer with no
     * expiry, and PREMIUM is a balance of annonces that is spent rather than
     * timed — writing a 30-day Subscription row for either invented an expiry
     * that nothing enforces and that the recruiter's own panel then counted
     * down. Those two change the plan and nothing else; the audit log below
     * still records that it happened. */
    const isTermed = plan === "CORPORATE";
    const startsAt = new Date();
    const endsAt = new Date(
      startsAt.getTime() + (durationDays || 365) * 24 * 60 * 60 * 1000
    );

    const [updatedCompany, subscription] = await prisma.$transaction([
      prisma.company.update({
        where: { id },
        data: { plan },
      }),
      ...(isTermed
        ? [
            prisma.subscription.create({
              data: {
                companyId: id,
                plan,
                status: "ACTIVE",
                startsAt,
                endsAt,
                autoRenew: false,
              },
            }),
          ]
        : []),
    ]);

    // audit trail
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "UPDATE_COMPANY_PLAN",
        entity: "Company",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    res.status(200).json({
      status: "success",
      data: { company: updatedCompany, subscription },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// USERS
// ============================================================

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, status } = req.query;

    const users = await prisma.user.findMany({
      where: {
        role: role ? (role as any) : undefined,
        status: status ? (status as any) : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        recruiterProfile: { select: { id: true, verified: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ status: "success", results: users.length, data: { users } });
  } catch (err) {
    next(err);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "DELETED"];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400));
    }

    const user = await prisma.user.update({ where: { id }, data: { status } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "UPDATE_USER_STATUS",
        entity: "User",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ADMIN PRESELECTION OVERRIDE (Corporate recruiters)
// Separate from the recruiter's own Preselection flow: admin can
// directly set a decision on an application for a CORPORATE company.
// ============================================================

export const adminPreselect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { applicationId } = req.params;
    const { status, comment, finalScore } = req.body;

    const validStatuses = ["PENDING", "SHORTLISTED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400));
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { company: true } }, recruiter: true },
    });

    if (!application) return next(new AppError("Application not found", 404));

    if (application.job.company.plan !== "CORPORATE") {
      return next(new AppError("Admin preselection override is only for CORPORATE plan companies", 403));
    }

    const [preselection, updatedApplication] = await prisma.$transaction([
      prisma.preselection.create({
        data: {
          applicationId,
          recruiterId: application.recruiterId,
          status,
          finalScore: finalScore ?? undefined,
          comment: comment ? `[ADMIN OVERRIDE] ${comment}` : "[ADMIN OVERRIDE]",
          reviewedAt: new Date(),
        },
      }),
      prisma.application.update({
        where: { id: applicationId },
        data: {
          preselectionStatus: status,
          isPreselected: status === "SHORTLISTED",
          preselectionComment: comment,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "ADMIN_PRESELECTION_OVERRIDE",
        entity: "Application",
        entityId: applicationId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    res.status(200).json({
      status: "success",
      data: { preselection, application: updatedApplication },
    });
  } catch (err) {
    next(err);
  }
};

// List applications for CORPORATE companies awaiting admin preselection
export const getCorporatePendingPreselections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applications = await prisma.application.findMany({
      where: {
        preselectionStatus: "PENDING",
        job: { company: { plan: "CORPORATE" } },
      },
      include: {
        job: { include: { company: true } },
        candidate: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { appliedAt: "asc" },
    });

    res.status(200).json({ status: "success", results: applications.length, data: { applications } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// DASHBOARD STATS
// ============================================================

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalRecruiters, totalCandidates, totalCompanies, totalJobs, planCounts, pendingTickets] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "RECRUITER" } }),
        prisma.user.count({ where: { role: "CANDIDATE" } }),
        prisma.company.count(),
        prisma.job.count(),
        prisma.company.groupBy({ by: ["plan"], _count: true }),
        prisma.supportTicket.count({ where: { status: "OPEN" } }),
      ]);

    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        totalRecruiters,
        totalCandidates,
        totalCompanies,
        totalJobs,
        planCounts,
        pendingTickets,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Credits a company with paid job postings, after a pack purchase.
 *
 * Manual for now: the payment form has no processor behind it, so a purchase
 * is confirmed here rather than by a webhook. When Chargily is wired in, its
 * callback should call grantPostings directly and this becomes the manual
 * fallback for support.
 */
export const grantCompanyPostings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // "postings" adds to the balance (a purchase); "credits" sets it outright
    // (an administrator correcting it). Exactly one of the two.
    const { postings, credits } = req.body as { postings?: number; credits?: number };

    if (postings == null && credits == null) {
      return next(new AppError("Provide either postings (to add) or credits (to set).", 400));
    }
    if (postings != null && credits != null) {
      return next(new AppError("Provide postings or credits, not both.", 400));
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return next(new AppError("Company not found", 404));

    const updated =
      credits != null ? await setPostings(id, Number(credits)) : await grantPostings(id, Number(postings));

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: credits != null ? "SET_COMPANY_POSTINGS" : "GRANT_COMPANY_POSTINGS",
        entity: "Company",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    res.status(200).json({ status: "success", data: { company: updated } });
  } catch (err) {
    next(err);
  }
};
