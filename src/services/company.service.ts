import api from "./api";

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  /** The company's sector, from COMPANY_SECTORS. */
  industry?: string | null;
  size?: string | null;
  foundedYear?: number | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  plan: "FREE" | "PREMIUM" | "CORPORATE";
  verified: boolean;
  /** Paid postings still in hand. Only meaningful on PREMIUM. */
  postingCredits: number;
  logo?: { id: string; url: string } | null;
}

/**
 * What this company may still publish.
 *
 * Computed server-side from the same code that enforces it, so the button and
 * the API cannot disagree about whether a posting is allowed.
 */
export interface PostingQuota {
  plan: "FREE" | "PREMIUM" | "CORPORATE";
  used: number;
  /** null means unlimited. */
  remaining: number | null;
  credits: number;
  canPublish: boolean;
  reason: string | null;
}

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";

export interface SubscriptionPayment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

/** One recorded term. A company on the default FREE plan has none. */
export interface SubscriptionRecord {
  id: string;
  plan: "FREE" | "PREMIUM" | "CORPORATE";
  /** Recomputed server-side from endsAt, not read off the stored flag. */
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  createdAt: string;
  payments: SubscriptionPayment[];
}

/**
 * How a plan is limited, which is not the same for all three.
 *   free    a single offer, no expiry
 *   offers  a balance of annonces, spent rather than timed — no expiry
 *   annual  a yearly term that runs out
 * Only "annual" has a term to show or count down.
 */
export type PlanLimitModel = "free" | "offers" | "annual";

export interface SubscriptionOverview {
  plan: "FREE" | "PREMIUM" | "CORPORATE";
  limitModel: PlanLimitModel;
  verified: boolean;
  /** When the company was created — the honest "member since". */
  memberSince: string;
  quota: PostingQuota;
  /** null on FREE, which has no term. */
  current: SubscriptionRecord | null;
  daysRemaining: number | null;
  history: SubscriptionRecord[];
  usage: {
    jobs: { total: number; byStatus: Record<string, number> };
    applications: number;
  };
}

export type CompanyUpdate = Partial<
  Pick<
    Company,
    "name" | "description" | "website" | "industry" | "size" | "foundedYear" | "country" | "city" | "address"
  >
>;

export const companyService = {
  /** The caller's own company, plus their role in it. */
  async getMyCompany(): Promise<{ company: Company; memberRole: string; quota: PostingQuota }> {
    const { data } = await api.get("/companies/me");
    return data.data;
  },

  /** Plan, term, quota and usage for the subscription panel. */
  async getMySubscription(): Promise<SubscriptionOverview> {
    const { data } = await api.get("/companies/me/subscription");
    return data.data;
  },

  async updateMyCompany(updates: CompanyUpdate): Promise<Company> {
    const { data } = await api.patch("/companies/me", updates);
    return data.data.company;
  },

  /** Uploads or replaces the logo. Returns the company with its new logo. */
  async updateLogo(file: File): Promise<Company> {
    const form = new FormData();
    // The field name matches the shared avatar middleware.
    form.append("avatar", file);

    const { data } = await api.patch("/companies/me/logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data.company;
  },
};

export default companyService;

export interface CorporateEnquiryInput {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  teamSize?: string;
  message?: string;
}

/**
 * Asks to be contacted about the Corporate plan.
 *
 * Public: a prospective client is not signed in yet, so this deliberately
 * does not go through the authenticated company service above.
 */
export async function sendCorporateEnquiry(input: CorporateEnquiryInput): Promise<void> {
  await api.post("/contact/corporate", input);
}
