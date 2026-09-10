import { RecruiterPlan } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

/**
 * How many job offers each plan may publish.
 *
 *   FREE       one offer, ever
 *   PREMIUM    as many as the company has bought, in annonce packs
 *   CORPORATE  unlimited
 *
 * Lives in one place because the same rule has to answer two different
 * questions: "may this request publish?" on the server, and "what should the
 * button say?" in the UI. Two implementations of that would drift, and the
 * drift would show up as a button that promises something the API refuses.
 */

/** FREE is a trial, not a tier: one offer is the whole allowance. */
export const FREE_JOB_ALLOWANCE = 1;

export interface PostingQuota {
  plan: RecruiterPlan;
  /** Offers already published by this company. */
  used: number;
  /** null when unlimited. */
  remaining: number | null;
  /** Paid postings in hand. Only meaningful on PREMIUM. */
  credits: number;
  canPublish: boolean;
  /** Why not, when canPublish is false. Null otherwise. */
  reason: string | null;
}

/**
 * Reports the quota without changing it.
 *
 * Counts jobs per company rather than per recruiter: on a multi-account plan
 * the allowance belongs to the company that paid for it, not to whichever
 * member happens to be posting.
 */
export const getPostingQuota = async (companyId: string): Promise<PostingQuota> => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, postingCredits: true },
  });

  if (!company) {
    throw new AppError("No company associated with this recruiter account.", 400);
  }

  const used = await prisma.job.count({ where: { companyId } });

  if (company.plan === "CORPORATE") {
    return {
      plan: company.plan,
      used,
      remaining: null,
      credits: company.postingCredits,
      canPublish: true,
      reason: null,
    };
  }

  if (company.plan === "FREE") {
    const remaining = Math.max(FREE_JOB_ALLOWANCE - used, 0);
    return {
      plan: company.plan,
      used,
      remaining,
      credits: company.postingCredits,
      canPublish: remaining > 0,
      reason:
        remaining > 0
          ? null
          : "Votre offre gratuite est déjà publiée. Achetez un pack d'annonces ou passez au plan Corporate pour publier davantage.",
    };
  }

  // PREMIUM: the allowance is whatever was bought.
  return {
    plan: company.plan,
    used,
    remaining: company.postingCredits,
    credits: company.postingCredits,
    canPublish: company.postingCredits > 0,
    reason:
      company.postingCredits > 0
        ? null
        : "Vous n'avez plus d'annonce disponible. Achetez un pack pour publier une nouvelle offre.",
  };
};

/**
 * Claims one posting, or refuses.
 *
 * The PREMIUM branch decrements with a conditional updateMany rather than
 * reading the balance and writing it back: two requests arriving together
 * would both read the same number and both think they were entitled to it.
 * Letting the database do the comparison means exactly one of them wins.
 *
 * Returns a rollback for the caller to run if the job insert then fails, so a
 * credit is never burned on an offer that was never created.
 */
export const consumePosting = async (
  companyId: string
): Promise<{ refund: () => Promise<void> }> => {
  const quota = await getPostingQuota(companyId);

  if (!quota.canPublish) {
    throw new AppError(quota.reason ?? "Publication limit reached.", 403);
  }

  if (quota.plan !== "PREMIUM") {
    // Nothing is spent on FREE or CORPORATE, so there is nothing to give back.
    return { refund: async () => {} };
  }

  const claimed = await prisma.company.updateMany({
    where: { id: companyId, postingCredits: { gt: 0 } },
    data: { postingCredits: { decrement: 1 } },
  });

  if (claimed.count === 0) {
    // Someone else took the last one between the check and the claim.
    throw new AppError(
      "Vous n'avez plus d'annonce disponible. Achetez un pack pour publier une nouvelle offre.",
      403
    );
  }

  return {
    refund: async () => {
      await prisma.company
        .update({ where: { id: companyId }, data: { postingCredits: { increment: 1 } } })
        .catch((err) => console.error(`Could not refund a posting credit to ${companyId}:`, err));
    },
  };
};

/** Adds paid postings to a company, after a pack purchase. */
export const grantPostings = async (companyId: string, amount: number) => {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1000) {
    throw new AppError("The number of postings must be a whole number between 1 and 1000.", 400);
  }

  return prisma.company.update({
    where: { id: companyId },
    data: { postingCredits: { increment: amount } },
    select: { id: true, name: true, plan: true, postingCredits: true },
  });
};

/**
 * Sets a company's paid postings to an exact number.
 *
 * Distinct from grantPostings, which adds. An administrator correcting a
 * balance is saying what it should be, not what to add to it — and with only
 * an "add" they would have to work out the delta themselves, which is how a
 * balance ends up wrong in the opposite direction. 0 is allowed here (it is a
 * legitimate balance) where grantPostings rejects it as a no-op purchase.
 */
export const setPostings = async (companyId: string, credits: number) => {
  if (!Number.isInteger(credits) || credits < 0 || credits > 1000) {
    throw new AppError("The number of postings must be a whole number between 0 and 1000.", 400);
  }

  return prisma.company.update({
    where: { id: companyId },
    data: { postingCredits: credits },
    select: { id: true, name: true, plan: true, postingCredits: true },
  });
};
