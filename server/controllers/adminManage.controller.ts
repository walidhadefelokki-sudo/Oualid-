import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  CvDerived,
  fromCvBuilder,
  fromUploadedCv,
} from "../services/profileFromCv.service";
import {
  issueEmailVerificationToken,
  verificationUrl,
} from "../services/emailVerification.service";
import { sendVerifyEmail } from "../utils/email";
import { listPayments } from "../services/adminPayments.service";
import {
  ADMIN_SCOPES,
  SCOPE_LABELS,
  normaliseScopes,
} from "../utils/adminScopes";
import { checkPassword } from "../utils/passwordPolicy";
import bcrypt from "bcryptjs";

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

/**
 * Sends one account a confirmation link.
 *
 * The reason this exists: every account that registered before confirmation
 * was built sits at PENDING with an address nobody has ever proved. They
 * cannot all be assumed good, and they cannot all be emailed at once without
 * thinking about deliverability — so this does one at a time, on purpose, and
 * the list filters to the accounts worth the click.
 */
export const sendVerificationLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        status: true,
        emailVerified: true,
        deletedAt: true,
      },
    });
    if (!target) return next(new AppError("Compte introuvable.", 404));

    if (target.emailVerified) {
      return next(new AppError("Cette adresse est déjà confirmée.", 400));
    }
    if (target.status === "DELETED" || target.deletedAt) {
      return next(new AppError("Ce compte est supprimé.", 400));
    }

    const verifyUrl = verificationUrl(await issueEmailVerificationToken(target.id));
    const sent = await sendVerifyEmail(target.email, target.firstName, verifyUrl);

    await audit(req, "SEND_VERIFICATION_LINK", "User", id);

    // Reported rather than swallowed: an administrator clicking this wants to
    // know whether to try again or chase the mail configuration.
    res.status(200).json({ status: "success", data: { sent: Boolean(sent) } });
  } catch (err) {
    next(err);
  }
};

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

    /* Only an unrestricted administrator may make or unmake an administrator.
     *
     * Without this, the "users" scope is the whole platform: a limited
     * administrator could promote a second account to ADMIN, sign into it, and
     * from there grant themselves everything. Nor may they suspend or edit an
     * existing administrator, which would be a way to remove the people who
     * can revoke their own access. */
    const touchingAdmin = role === "ADMIN" || target.role === "ADMIN";

    if (touchingAdmin && !req.adminAccess?.isSuperAdmin) {
      return next(
        new AppError(
          "Seul un administrateur sans restriction peut gérer un compte administrateur.",
          403
        )
      );
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
      /* Only an unrestricted administrator may remove another one. Otherwise
       * the "users" scope is a way to delete the people who can revoke it. */
      if (!req.adminAccess?.isSuperAdmin) {
        return next(
          new AppError(
            "Seul un administrateur sans restriction peut supprimer un compte administrateur.",
            403
          )
        );
      }

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

/**
 * Everything the admin holds on one account.
 *
 * Assembled rather than returned raw: a User row carries the bcrypt hash, and
 * the profiles carry a whole CV document. Neither belongs in an admin panel,
 * so this selects what is useful — who they are, what they have done, and what
 * is attached to them — and summarises the rest.
 */
export const getUserDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        avatar: { select: { url: true } },
        candidateProfile: {
          select: {
            id: true,
            headline: true,
            bio: true,
            city: true,
            wilaya: true,
            skills: true,
            yearsExperience: true,
            currentJobTitle: true,
            desiredSalary: true,
            availableImmediately: true,
            linkedinUrl: true,
            githubUrl: true,
            portfolioUrl: true,
            // provider/publicId/extension are here for the extractor, which
            // reads a privately stored CV through the service-role client
            // rather than an HTTP GET that would 401.
            resume: {
              select: {
                id: true,
                url: true,
                fileName: true,
                createdAt: true,
                provider: true,
                publicId: true,
                extension: true,
              },
            },
            cvBuilderData: true,
            _count: { select: { applications: true } },
          },
        },
        recruiterProfile: {
          select: {
            id: true,
            verified: true,
            companies: {
              select: {
                role: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                    plan: true,
                    postingCredits: true,
                    verified: true,
                    _count: { select: { jobs: true } },
                  },
                },
              },
            },
          },
        },
        _count: { select: { notifications: true } },
      },
    });

    if (!user) return next(new AppError("Compte introuvable.", 404));

    const { candidateProfile, ...rest } = user;

    // The CV document is reduced to a flag, as in the list: it is large, and
    // whether one exists is the only part an administrator acts on.
    const data = candidateProfile?.cvBuilderData as Record<string, unknown> | null | undefined;
    const hasBuiltCv =
      !!data &&
      typeof data === "object" &&
      Object.values(data).some((v) =>
        Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ""
      );

    /* What the CV knows that the profile does not.
     *
     * Almost nobody fills the profile in — every candidate here with a CV
     * Maker document has User.phone null, while the CV carries a real number,
     * so the panel showed "—" for all of them.
     *
     * The CV Maker document is preferred: those are fields the candidate
     * typed, not text guessed at. An uploaded file is parsed only when there
     * is no document to read, because it means fetching and parsing a PDF on
     * a page load.
     *
     * Nothing is written back. It is returned separately, labelled with where
     * it came from, and the panel shows it beside the empty field — a number
     * on a CV is evidence, not a verified contact detail. */
    let cvDerived: CvDerived | null = null;
    if (candidateProfile) {
      cvDerived = fromCvBuilder(candidateProfile.cvBuilderData);

      if (!cvDerived?.phone && candidateProfile.resume) {
        const fromFile = await fromUploadedCv(candidateProfile.resume);
        // Keep whichever fields the builder already supplied; the file only
        // fills the gaps it left.
        if (fromFile) {
          cvDerived = cvDerived
            ? {
                ...cvDerived,
                phone: cvDerived.phone ?? fromFile.phone,
                email: cvDerived.email ?? fromFile.email,
                fullName: cvDerived.fullName ?? fromFile.fullName,
              }
            : fromFile;
        }
      }
    }

    // A recruiter's own purchases, which explain the company's balance.
    const orders = await prisma.packOrder.findMany({
      where: { buyerId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        packId: true,
        jobs: true,
        amount: true,
        currency: true,
        status: true,
        invoiceNumber: true,
        paidAt: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: {
        user: {
          ...rest,
          candidateProfile: candidateProfile
            ? {
                ...candidateProfile,
                cvBuilderData: undefined,
                hasUploadedCv: Boolean(candidateProfile.resume),
                hasBuiltCv,
              }
            : null,
          /** Read from the CV, never written to the profile. */
          cvDerived,
          orders,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ============================================================== payments === */

/**
 * Every payment on the platform, in one list.
 *
 * Money arrives through three unrelated tables — subscription instalments,
 * annonce packs and marketplace credits — and none of it was visible together
 * anywhere in the admin. The merging and the totals live in
 * adminPayments.service; this reads the query string.
 */
export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : undefined;
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const SOURCES = ["subscription", "pack", "marketplace"];
    const source = str(req.query.source);

    if (source && !SOURCES.includes(source)) {
      return next(new AppError(`source must be one of: ${SOURCES.join(", ")}`, 400));
    }

    const data = await listPayments({
      source: source as never,
      status: str(req.query.status),
      method: str(req.query.method),
      q: str(req.query.q),
      from: str(req.query.from),
      to: str(req.query.to),
      page: num(req.query.page),
      perPage: num(req.query.perPage),
    });

    res.status(200).json({ status: "success", results: data.payments.length, data });
  } catch (err) {
    next(err);
  }
};

/* ========================================================== admin access === */

/** The areas that can be granted, with what each one actually permits. */
export const listAdminScopes = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      status: "success",
      data: {
        scopes: ADMIN_SCOPES.map((key) => ({ key, ...SCOPE_LABELS[key] })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Every administrator and what they may reach. */
export const listAdminAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", deletedAt: null },
      orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isSuperAdmin: true,
        adminScopes: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: "success",
      results: admins.length,
      data: {
        admins: admins.map((a) => ({
          ...a,
          // Said plainly, because an administrator with neither is an account
          // that can sign in and reach nothing — easy to create by accident.
          hasNoAccess: !a.isSuperAdmin && a.adminScopes.length === 0,
          isMe: a.id === req.user!.id,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Sets what one administrator may reach.
 *
 * Three refusals, each for the same reason — nobody should be able to widen
 * their own access or quietly remove the last person who could fix things:
 *
 *   you cannot edit your own access;
 *   the last unrestricted administrator cannot be demoted;
 *   promoting an account to administrator is not done here, and granting
 *   scopes to a non-administrator would be an administrator in all but name.
 */
export const updateAdminAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isSuperAdmin, scopes } = req.body as {
      isSuperAdmin?: boolean;
      scopes?: unknown;
    };

    if (req.user!.id === id) {
      return next(
        new AppError("Vous ne pouvez pas modifier vos propres autorisations.", 400)
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isSuperAdmin: true, deletedAt: true },
    });

    if (!target || target.deletedAt) {
      return next(new AppError("Compte introuvable.", 404));
    }

    if (target.role !== "ADMIN") {
      // Granting scopes to a candidate would be an administrator in all but
      // name, and the role change belongs on the account screen where it is
      // visible as what it is.
      return next(
        new AppError(
          "Ce compte n'est pas administrateur. Changez son rôle depuis Comptes d'abord.",
          400
        )
      );
    }

    const makeSuper = typeof isSuperAdmin === "boolean" ? isSuperAdmin : target.isSuperAdmin;

    /* Nobody may demote the last unrestricted administrator: there would be
     * no one left who could grant access back, including to themselves, and
     * the only way out would be the database.
     *
     * A backstop rather than the thing holding that invariant. The two rules
     * above already guarantee it — only an unrestricted administrator reaches
     * this handler, and nobody may edit their own access, so the caller is
     * always a second unrestricted administrator and this count is never
     * zero. Kept because it is one query and it is the rule that would break
     * first if either of those is ever relaxed. */
    if (target.isSuperAdmin && !makeSuper) {
      const others = await prisma.user.count({
        where: {
          role: "ADMIN",
          isSuperAdmin: true,
          deletedAt: null,
          status: { notIn: ["SUSPENDED", "DELETED"] },
          id: { not: target.id },
        },
      });

      if (others === 0) {
        return next(
          new AppError(
            "C'est le dernier administrateur sans restriction. Nommez-en un autre avant de limiter celui-ci.",
            400
          )
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        isSuperAdmin: makeSuper,
        /* Kept even for an unrestricted administrator rather than cleared: if
         * their unrestricted status is removed later, the areas they were
         * trusted with are still on the record instead of silently becoming
         * none. */
        ...(scopes !== undefined ? { adminScopes: normaliseScopes(scopes) } : {}),
      },
      select: {
        id: true,
        email: true,
        isSuperAdmin: true,
        adminScopes: true,
      },
    });

    await audit(req, "UPDATE_ADMIN_ACCESS", "User", target.id);

    res.status(200).json({ status: "success", data: { admin: updated } });
  } catch (err) {
    next(err);
  }
};

/**
 * Resets another administrator's password.
 *
 * For the case the self-service change cannot cover: somebody locked out, or
 * an account being handed to a new person. No current password is asked for,
 * which is exactly why it is restricted to an unrestricted administrator and
 * written to the audit log.
 *
 * Your own password is not resettable here — that is what /auth/me/password
 * is for, and it asks for the current one. A reset path that worked on
 * yourself would be a way to change your password without proving you know
 * it, which is the whole protection.
 */
export const resetAdminPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body as { newPassword?: string };

    if (req.user!.id === id) {
      return next(
        new AppError(
          "Changez votre propre mot de passe depuis votre compte : l'actuel y est demandé.",
          400
        )
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, deletedAt: true },
    });

    if (!target || target.deletedAt) {
      return next(new AppError("Compte introuvable.", 404));
    }

    /* Administrators only. Resetting an ordinary user's password from here
     * would be a way into their account with no trace they could see; a
     * candidate who forgets theirs goes through the normal reset. */
    if (target.role !== "ADMIN") {
      return next(
        new AppError("Réservé aux comptes administrateurs.", 400)
      );
    }

    const verdict = checkPassword(newPassword);
    if (!verdict.ok) return next(new AppError(verdict.message!, 400));

    await prisma.user.update({
      where: { id: target.id },
      data: { password: await bcrypt.hash(newPassword!, 12) },
      select: { id: true },
    });

    await audit(req, "RESET_ADMIN_PASSWORD", "User", target.id);

    res.status(200).json({
      status: "success",
      message: `Mot de passe de ${target.email} réinitialisé.`,
    });
  } catch (err) {
    next(err);
  }
};
