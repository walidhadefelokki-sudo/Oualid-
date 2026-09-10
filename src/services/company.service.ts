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
