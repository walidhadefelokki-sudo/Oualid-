import { FreelancePlanTier } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * What a freelancer's plan lets them do.
 *
 * Every limit is read here and nowhere else. The brief is explicit that
 * entitlement checks must not live only in React: a disabled button is a
 * hint, and the request it would have sent still has to be refused.
 *
 * Two ways to pay for a proposal, and the order matters:
 *
 *   A subscriber spends their monthly quota first, and only falls back to
 *   credits once it is used up. A free account has no quota and spends
 *   credits. The specification prices both — "40 propositions/mois" for Pro,
 *   "1 proposition = 2 crédits" for packs — without saying which applies to
 *   a subscriber who has both. Charging the quota first is the reading that
 *   does not make a subscription worthless to someone holding credits.
 */

export type StatsLevel = "none" | "basic" | "full";

export interface Entitlements {
  tier: FreelancePlanTier;
  planName: string;
  /** Null when the account is on the free tier. */
  subscriptionId: string | null;
  renewsAt: Date | null;

  /** Null means unlimited. */
  maxActiveServices: number | null;
  activeServices: number;
  canPublishService: boolean;

  monthlyProposals: number | null;
  proposalsUsedThisPeriod: number;
  /** Quota left this period. Null when the plan has no quota at all. */
  proposalsRemaining: number | null;

  maxPortfolioProjects: number | null;
  portfolioProjects: number;

  prioritySearch: boolean;
  removableBranding: boolean;
  customSubdomain: boolean;

  weeklyBoosts: number;
  boostsUsedThisWeek: number;

  stats: StatsLevel;
}

/** The free plan, when the table has not been seeded. */
const FREE_FALLBACK = {
  tier: FreelancePlanTier.FREE,
  name: "Gratuit",
  maxActiveServices: 1,
  monthlyProposals: null as number | null,
  maxPortfolioProjects: 6,
  prioritySearch: false,
  removableBranding: false,
  customSubdomain: false,
  weeklyBoosts: 0,
};

/** Statistics depth follows the tier, as the plan table does not store it. */
const statsFor = (tier: FreelancePlanTier): StatsLevel =>
  tier === "PREMIUM" || tier === "AGENCY" ? "full" : tier === "PRO" ? "basic" : "none";

/**
 * A subscription's quota period, rolled forward lazily.
 *
 * Nothing runs on a schedule to reset counters, so a subscription untouched
 * for three months would otherwise still report February's usage. The roll
 * happens the next time anyone asks, which is the moment it matters.
 */
const monthAfter = (d: Date) => {
  const end = new Date(d);
  end.setMonth(end.getMonth() + 1);
  return end;
};

const currentPeriod = (startedAt: Date) => {
  const now = new Date();

  /* Measured from the period's own start, not from the subscription's end
   * date. Those are different questions: a subscription renewed for another
   * year has an end date far in the future while its monthly period rolls
   * twelve times, and keying off the end date meant a subscriber in month
   * three was still counted against month one — locked out of proposals they
   * had paid for. */
  if (now < monthAfter(startedAt)) return { periodStartedAt: startedAt, rolled: false };

  // Advanced a month at a time rather than jumped to now, so a period always
  // begins on the subscription's own day of the month.
  const next = new Date(startedAt);
  while (now >= monthAfter(next)) next.setMonth(next.getMonth() + 1);

  return { periodStartedAt: next, rolled: true };
};

export const getEntitlements = async (freelancerId: string): Promise<Entitlements> => {
  const now = new Date();

  const subscription = await prisma.freelanceSubscription.findFirst({
    where: { freelancerId, status: "ACTIVE", endsAt: { gt: now } },
    orderBy: { endsAt: "desc" },
    include: { plan: true },
  });

  // Rolling the period here rather than on a cron: the counter is only ever
  // read through this function, so it cannot be observed stale.
  let proposalsUsed = subscription?.proposalsUsedThisPeriod ?? 0;
  if (subscription) {
    const { periodStartedAt, rolled } = currentPeriod(subscription.periodStartedAt);
    if (rolled) {
      await prisma.freelanceSubscription.update({
        where: { id: subscription.id },
        data: { periodStartedAt, proposalsUsedThisPeriod: 0 },
      });
      proposalsUsed = 0;
    }
  }

  const plan = subscription?.plan ?? (await prisma.freelancePlan.findUnique({
    where: { tier: FreelancePlanTier.FREE },
  }));

  const p = plan ?? FREE_FALLBACK;
  const tier = p.tier as FreelancePlanTier;

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [activeServices, portfolioProjects, boostsUsedThisWeek] = await Promise.all([
    prisma.serviceListing.count({
      where: {
        freelancerId,
        // A paused or expired listing is not occupying a slot.
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    prisma.portfolioProject.count({ where: { portfolio: { freelancerId } } }),
    prisma.boost.count({ where: { freelancerId, createdAt: { gte: weekAgo } } }),
  ]);

  const monthlyProposals = p.monthlyProposals ?? null;

  return {
    tier,
    planName: p.name,
    subscriptionId: subscription?.id ?? null,
    renewsAt: subscription?.endsAt ?? null,

    maxActiveServices: p.maxActiveServices ?? null,
    activeServices,
    canPublishService: p.maxActiveServices == null || activeServices < p.maxActiveServices,

    monthlyProposals,
    proposalsUsedThisPeriod: proposalsUsed,
    proposalsRemaining:
      monthlyProposals == null ? null : Math.max(0, monthlyProposals - proposalsUsed),

    maxPortfolioProjects: p.maxPortfolioProjects ?? null,
    portfolioProjects,

    prioritySearch: p.prioritySearch,
    removableBranding: p.removableBranding,
    customSubdomain: p.customSubdomain,

    weeklyBoosts: p.weeklyBoosts,
    boostsUsedThisWeek,

    stats: statsFor(tier),
  };
};

export class PlanLimitError extends Error {
  constructor(
    message: string,
    readonly limit: number | null,
    readonly used: number
  ) {
    super(message);
    this.name = "PlanLimitError";
  }
}

/**
 * Refuses a publication the plan has no room for.
 *
 * Called by the publish handler, not by the page: the page hides the button,
 * which is a courtesy, and this refuses the request, which is the rule.
 */
export const assertCanPublishService = async (freelancerId: string) => {
  const e = await getEntitlements(freelancerId);
  if (!e.canPublishService) {
    throw new PlanLimitError(
      `La formule ${e.planName} permet ${e.maxActiveServices} service(s) en ligne. ` +
        `Mettez un service en pause ou changez de formule.`,
      e.maxActiveServices,
      e.activeServices
    );
  }
  return e;
};

/**
 * Decides how a proposal is paid for.
 *
 * Returns the quota when there is one left, so the caller charges nothing,
 * and otherwise tells it to spend credits. The caller does the spending —
 * this only decides, so that the decision and the debit stay in one
 * transaction over there rather than two round trips from here.
 */
export const resolveProposalCharge = async (
  freelancerId: string
): Promise<{ method: "quota" | "credits"; subscriptionId: string | null }> => {
  const e = await getEntitlements(freelancerId);

  if (e.subscriptionId && e.proposalsRemaining !== null && e.proposalsRemaining > 0) {
    return { method: "quota", subscriptionId: e.subscriptionId };
  }

  return { method: "credits", subscriptionId: null };
};

/** Records one proposal against the monthly quota. */
export const consumeProposalQuota = async (subscriptionId: string) => {
  await prisma.freelanceSubscription.update({
    where: { id: subscriptionId },
    data: { proposalsUsedThisPeriod: { increment: 1 } },
  });
};

export default {
  getEntitlements,
  assertCanPublishService,
  resolveProposalCharge,
  consumeProposalQuota,
  PlanLimitError,
};
