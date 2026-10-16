import { Request, Response, NextFunction } from "express";
import { CreditEntryType } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import credits from "../services/credits.service";

/**
 * Becoming a freelancer, and the workspace that follows.
 *
 * Activation reuses the Dar L'Emploi account: the specification's "le CV d'un
 * candidat se transforme en profil freelance en un clic". Nothing is copied
 * silently — the endpoint returns what it *would* prefill, the user reviews
 * it, and the values they confirm are what gets written. A CV is private
 * until its owner decides otherwise.
 */

/** URL-safe handle for /@username, derived from what we already know. */
const slugifyUsername = (raw: string) =>
  raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);

/** Appends a counter until the handle is free. */
const uniqueUsername = async (base: string): Promise<string> => {
  const root = base || "freelance";
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? root : `${root}-${n}`;
    const taken = await prisma.freelancerProfile.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
};

/**
 * What activation would prefill, for the user to review before anything is
 * written. Read-only.
 */
export const getActivationDraft = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        candidateProfile: {
          select: {
            headline: true,
            bio: true,
            city: true,
            wilaya: true,
            skills: true,
            currentJobTitle: true,
            yearsExperience: true,
            linkedinUrl: true,
            portfolioUrl: true,
          },
        },
        freelancerProfile: { select: { username: true } },
      },
    });

    if (!user) return next(new AppError("User not found", 404));

    if (user.freelancerProfile) {
      return res.json({
        success: true,
        data: { alreadyActive: true, username: user.freelancerProfile.username },
      });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const c = user.candidateProfile;

    res.json({
      success: true,
      data: {
        alreadyActive: false,
        suggested: {
          username: await uniqueUsername(slugifyUsername(fullName || user.email.split("@")[0])),
          displayName: fullName || user.email.split("@")[0],
          title: c?.currentJobTitle ?? c?.headline ?? null,
          bio: c?.bio ?? null,
          wilaya: c?.wilaya ?? c?.city ?? null,
          skills: c?.skills ?? [],
          linkedin: c?.linkedinUrl ?? null,
          portfolio: c?.portfolioUrl ?? null,
        },
        /** Shown so the user knows where the suggestions came from. */
        source: c ? "cv" : "account",
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Creates the freelance profile.
 *
 * Writes only what the request carries. The draft above is a suggestion, not
 * a commitment, so a user who cleared a field gets an empty field.
 */
export const activate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const existing = await prisma.freelancerProfile.findUnique({
      where: { userId },
      select: { username: true },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Un profil freelance existe déjà pour ce compte.",
        data: { username: existing.username },
      });
    }

    const { username, displayName, title, bio, wilaya, categoryId, languages, hourlyRate, skills } =
      req.body as Record<string, unknown>;

    const handle = slugifyUsername(String(username ?? ""));
    if (!handle || handle.length < 3) {
      return next(new AppError("Nom d'utilisateur invalide (3 caractères minimum).", 400));
    }
    if (!String(displayName ?? "").trim()) {
      return next(new AppError("Le nom affiché est obligatoire.", 400));
    }

    const taken = await prisma.freelancerProfile.findUnique({
      where: { username: handle },
      select: { id: true },
    });
    if (taken) return next(new AppError("Ce nom d'utilisateur est déjà pris.", 409));

    const costs = await credits.getCreditCosts();

    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.freelancerProfile.create({
        data: {
          userId,
          username: handle,
          displayName: String(displayName).trim(),
          title: title ? String(title).trim() : null,
          bio: bio ? String(bio).trim() : null,
          wilaya: wilaya ? String(wilaya).trim() : null,
          categoryId: categoryId ? String(categoryId) : null,
          hourlyRate: hourlyRate != null ? String(hourlyRate) : null,
          languages: Array.isArray(languages) ? (languages as never[]) : [],
          trialClaimedAt: new Date(),
        },
        select: { id: true, username: true },
      });

      // Skills are shared with recruitment, so an existing one is reused
      // rather than duplicated under a second name.
      if (Array.isArray(skills)) {
        for (const raw of skills.slice(0, 20)) {
          const name = String(raw).trim();
          if (!name) continue;
          const skill = await tx.skill.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { id: true },
          });
          await tx.freelancerSkill.create({
            data: { freelancerId: created.id, skillId: skill.id },
          });
        }
      }

      // Every freelancer gets a portfolio record, unpublished. The editor
      // then has something to edit rather than having to create it first.
      await tx.portfolio.create({ data: { freelancerId: created.id } });

      return created;
    });

    /* The one-time trial, as proposal credits.
     *
     * trialClaimedAt is set above inside the same transaction, and the
     * idempotency key is the profile id, so a replayed request cannot grant a
     * second allowance even if it somehow reached this line twice. */
    const trialCredits = costs.trialProposals * costs.proposal;
    if (trialCredits > 0) {
      await credits.grant({
        userId,
        amount: trialCredits,
        type: CreditEntryType.TRIAL_GRANT,
        idempotencyKey: `trial:${profile.id}`,
        note: `Essai gratuit : ${costs.trialProposals} propositions`,
      });
    }

    res.status(201).json({
      success: true,
      data: { username: profile.username, credits: await credits.getBalance(userId) },
    });
  } catch (err) {
    next(err);
  }
};

/** The signed-in freelancer's own profile, wallet and counts. */
export const getMyWorkspace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        title: true,
        bio: true,
        wilaya: true,
        hourlyRate: true,
        availability: true,
        level: true,
        identityVerified: true,
        ratingAverage: true,
        ratingCount: true,
        completedOrders: true,
        languages: true,
        category: { select: { id: true, name: true } },
        skills: { select: { skill: { select: { name: true } } } },
        portfolio: { select: { published: true } },
      },
    });

    if (!profile) {
      return res.json({ success: true, data: { active: false } });
    }

    const now = new Date();

    // Counted rather than fetched: the dashboard shows numbers, and loading
    // every row to measure its length is how a dashboard gets slow.
    const [
      published,
      pending,
      drafts,
      expired,
      proposalsSent,
      proposalsShortlisted,
      activeOrders,
      completedOrders,
      balance,
    ] = await Promise.all([
      prisma.serviceListing.count({
        where: {
          freelancerId: profile.id,
          status: "PUBLISHED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.serviceListing.count({ where: { freelancerId: profile.id, status: "PENDING" } }),
      prisma.serviceListing.count({ where: { freelancerId: profile.id, status: "DRAFT" } }),
      prisma.serviceListing.count({
        where: { freelancerId: profile.id, status: "PUBLISHED", expiresAt: { lte: now } },
      }),
      prisma.proposal.count({ where: { freelancerId: profile.id } }),
      prisma.proposal.count({ where: { freelancerId: profile.id, status: "SHORTLISTED" } }),
      prisma.freelanceOrder.count({
        where: {
          freelancerId: profile.id,
          status: { in: ["CREATED", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED"] },
        },
      }),
      prisma.freelanceOrder.count({ where: { freelancerId: profile.id, status: "COMPLETED" } }),
      credits.getBalance(userId),
    ]);

    res.json({
      success: true,
      data: {
        active: true,
        profile: {
          ...profile,
          skills: profile.skills.map((s) => s.skill.name),
          portfolioPublished: profile.portfolio?.published ?? false,
        },
        stats: {
          published,
          pending,
          drafts,
          expired,
          proposalsSent,
          proposalsShortlisted,
          activeOrders,
          completedOrders,
        },
        wallet: { balance, costs: await credits.getCreditCosts() },
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Wallet history, paged. */
export const getWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const data = await credits.history(req.user!.id, page);
    res.json({ success: true, data: { ...data, costs: await credits.getCreditCosts() } });
  } catch (err) {
    next(err);
  }
};
