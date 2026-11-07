import prisma from "../utils/prisma";

/**
 * Every payment on the platform, in one list.
 *
 * Money arrives through three unrelated tables and the super admin could see
 * none of them together:
 *
 *   `Payment`            — a recruiter's subscription instalment
 *   `PackOrder`          — annonce packs bought through Chargily
 *   `MarketplacePayment` — freelance credits and marketplace subscriptions
 *
 * The only money visible anywhere in the admin was the CCP/BaridiMob review
 * queue buried inside freelance moderation, which is one method of one of the
 * three. So "what has the platform earned" had no answer short of opening the
 * database.
 *
 * They are read separately and merged here rather than joined in SQL: they
 * share no foreign key, their amounts are a Float, an Int of whole dinars and
 * a Decimal, and their statuses are three different enums. A UNION would need
 * every one of those differences reconciled in SQL and would still not be
 * indexable. Merging in memory is honest about the fact that these are three
 * separate things being presented as one.
 *
 * That merge is why this pages over the merged set rather than in the
 * database: a page of twenty cannot be taken from three tables without
 * reading enough of each to know which twenty. Bounded by MAX_SCAN, and the
 * response says when it has been reached.
 */

/** How many rows per source are read before merging. */
const MAX_SCAN = 2000;
const MAX_PER_PAGE = 100;

export type PaymentSource = "subscription" | "pack" | "marketplace";

/** The one status vocabulary the screen reads, mapped from three enums. */
export type UnifiedStatus =
  | "PAID"
  | "PENDING"
  | "AWAITING_REVIEW"
  | "FAILED"
  | "REFUNDED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED";

export interface AdminPaymentsParams {
  source?: PaymentSource | null;
  status?: string | null;
  method?: string | null;
  /** Reference, invoice number, payer name, e-mail or company. */
  q?: string | null;
  /** ISO dates. Filtered on when the money moved, falling back to creation. */
  from?: string | null;
  to?: string | null;
  page?: number;
  perPage?: number;
}

export interface AdminPaymentRow {
  id: string;
  source: PaymentSource;
  /** What the admin would quote to the payer. */
  reference: string;
  description: string;
  payer: {
    name: string;
    email: string | null;
    company: string | null;
  };
  amount: number;
  currency: string;
  method: string;
  status: UnifiedStatus;
  invoiceNumber: string | null;
  /** A manual transfer's proof, when one was uploaded. */
  receiptUrl: string | null;
  /** Set once the money actually moved. */
  paidAt: Date | null;
  createdAt: Date;
}

const name = (user: { firstName: string | null; lastName: string | null; email: string } | null) =>
  user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : "—";

/* -------------------------------------------------------------------------- */
/*                         Three tables, one vocabulary                       */
/* -------------------------------------------------------------------------- */

/** PackOrder's CANCELED has no equivalent elsewhere; the rest line up. */
const PACK_STATUS: Record<string, UnifiedStatus> = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELED: "CANCELED",
};

const readSubscriptions = async (): Promise<AdminPaymentRow[]> => {
  const rows = await prisma.payment.findMany({
    take: MAX_SCAN,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          company: {
            select: {
              name: true,
              members: {
                where: { role: "OWNER" },
                take: 1,
                select: {
                  recruiter: {
                    select: {
                      user: { select: { firstName: true, lastName: true, email: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((p) => {
    const owner = p.subscription?.company?.members[0]?.recruiter?.user ?? null;

    return {
      id: p.id,
      source: "subscription" as const,
      // Payment has no reference of its own; the gateway's id is the only
      // thing a payer could quote back.
      reference: p.transactionId ?? p.id.slice(0, 8).toUpperCase(),
      description: `Abonnement ${p.subscription?.plan ?? "—"}`,
      payer: {
        name: name(owner),
        email: owner?.email ?? null,
        company: p.subscription?.company?.name ?? null,
      },
      amount: p.amount,
      currency: p.currency.toUpperCase(),
      method: p.method,
      status: (p.status as UnifiedStatus) ?? "PENDING",
      invoiceNumber: null,
      receiptUrl: null,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    };
  });
};

const readPackOrders = async (): Promise<AdminPaymentRow[]> => {
  const rows = await prisma.packOrder.findMany({
    take: MAX_SCAN,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      packId: true,
      jobs: true,
      amount: true,
      currency: true,
      status: true,
      checkoutId: true,
      invoiceNumber: true,
      paidAt: true,
      createdAt: true,
      company: { select: { name: true } },
      buyer: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    source: "pack" as const,
    reference: o.invoiceNumber ?? o.checkoutId ?? o.id.slice(0, 8).toUpperCase(),
    description: `Pack annonces ${o.packId} · ${o.jobs} annonce(s)`,
    payer: {
      name: name(o.buyer),
      email: o.buyer?.email ?? null,
      company: o.company?.name ?? null,
    },
    // Whole dinars on this table, where the others carry decimals.
    amount: o.amount,
    currency: o.currency.toUpperCase(),
    method: "CARD",
    status: PACK_STATUS[o.status] ?? "PENDING",
    invoiceNumber: o.invoiceNumber,
    receiptUrl: null,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
  }));
};

const readMarketplace = async (): Promise<AdminPaymentRow[]> => {
  const rows = await prisma.marketplacePayment.findMany({
    take: MAX_SCAN,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      paidAt: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      creditPack: { select: { name: true, credits: true } },
      subscription: { select: { plan: { select: { name: true } } } },
      receipt: { select: { url: true } },
      invoice: { select: { number: true } },
    },
  });

  return rows.map((p) => ({
    id: p.id,
    source: "marketplace" as const,
    reference: p.reference,
    description: p.creditPack
      ? `Crédits · ${p.creditPack.name} (${p.creditPack.credits})`
      : p.subscription?.plan?.name
        ? `Abonnement freelance · ${p.subscription.plan.name}`
        : "Achat marketplace",
    payer: {
      name: name(p.user),
      email: p.user?.email ?? null,
      company: null,
    },
    amount: Number(p.amount),
    currency: p.currency.toUpperCase(),
    method: p.method,
    status: p.status as UnifiedStatus,
    invoiceNumber: p.invoice?.number ?? null,
    // The proof behind a manual transfer. Approving one without looking at it
    // is granting credits because somebody said so.
    receiptUrl: p.receipt?.url ?? null,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  }));
};

/* -------------------------------------------------------------------------- */

const matches = (row: AdminPaymentRow, p: AdminPaymentsParams) => {
  if (p.source && row.source !== p.source) return false;
  if (p.status && row.status !== p.status) return false;
  if (p.method && row.method !== p.method) return false;

  if (p.q) {
    const needle = p.q.toLowerCase();
    const haystack = [
      row.reference,
      row.invoiceNumber ?? "",
      row.description,
      row.payer.name,
      row.payer.email ?? "",
      row.payer.company ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  /* Dated on when the money moved, falling back to when the attempt was made.
   * A pending payment has no paidAt, and excluding it from every date range
   * would hide exactly the ones that need chasing. */
  const when = row.paidAt ?? row.createdAt;

  if (p.from) {
    const from = new Date(p.from);
    if (!Number.isNaN(from.getTime()) && when < from) return false;
  }
  if (p.to) {
    const to = new Date(p.to);
    if (!Number.isNaN(to.getTime())) {
      // Inclusive of the whole closing day: a range ending "today" that
      // excluded today's payments would read as money gone missing.
      to.setHours(23, 59, 59, 999);
      if (when > to) return false;
    }
  }

  return true;
};

/** Money in, and money still waiting. Only PAID counts as earned. */
const summarise = (rows: AdminPaymentRow[]) => {
  const paid = rows.filter((r) => r.status === "PAID");
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sum = (list: AdminPaymentRow[]) =>
    Math.round(list.reduce((total, r) => total + r.amount, 0));

  const perSource = (source: PaymentSource) => sum(paid.filter((r) => r.source === source));

  return {
    /* Summed without converting between currencies. Everything on the
     * platform is priced in dinars; adding two currencies into one number
     * would be a figure that is simply wrong, so the breakdown below says
     * which currencies are present instead. */
    currencies: [...new Set(rows.map((r) => r.currency))],

    revenue: sum(paid),
    revenueThisMonth: sum(
      paid.filter((r) => (r.paidAt ?? r.createdAt) >= startOfMonth)
    ),

    bySource: {
      subscription: perSource("subscription"),
      pack: perSource("pack"),
      marketplace: perSource("marketplace"),
    },

    counts: {
      all: rows.length,
      paid: paid.length,
      pending: rows.filter((r) => r.status === "PENDING").length,
      // The queue a human has to work through, and the only count here that
      // is a to-do rather than a fact.
      awaitingReview: rows.filter((r) => r.status === "AWAITING_REVIEW").length,
      failed: rows.filter((r) => r.status === "FAILED" || r.status === "EXPIRED").length,
      refunded: rows.filter((r) => r.status === "REFUNDED").length,
      rejected: rows.filter((r) => r.status === "REJECTED").length,
    },

    pendingAmount: sum(
      rows.filter((r) => r.status === "PENDING" || r.status === "AWAITING_REVIEW")
    ),
  };
};

export const listPayments = async (params: AdminPaymentsParams) => {
  const page = Math.max(1, Math.trunc(params.page ?? 1) || 1);
  const perPage = Math.min(Math.max(Math.trunc(params.perPage ?? 25) || 25, 1), MAX_PER_PAGE);

  const [subscriptions, packs, marketplace] = await Promise.all([
    readSubscriptions(),
    readPackOrders(),
    readMarketplace(),
  ]);

  const everything = [...subscriptions, ...packs, ...marketplace];

  // Said out loud rather than silently truncated: a total that is quietly
  // short is worse than one that admits where it stops.
  const truncated =
    subscriptions.length === MAX_SCAN ||
    packs.length === MAX_SCAN ||
    marketplace.length === MAX_SCAN;

  const filtered = everything
    .filter((row) => matches(row, params))
    .sort(
      (a, b) =>
        (b.paidAt ?? b.createdAt).getTime() - (a.paidAt ?? a.createdAt).getTime()
    );

  const start = (page - 1) * perPage;

  return {
    payments: filtered.slice(start, start + perPage),
    total: filtered.length,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
    /* Totals over everything that matched, not over the page: a page of
     * twenty-five tells an admin nothing about what the platform earned. */
    summary: summarise(filtered),
    truncated,
    scanLimit: MAX_SCAN,
  };
};

export default { listPayments };
