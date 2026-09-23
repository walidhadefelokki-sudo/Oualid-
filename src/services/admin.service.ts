import api from "./api.ts";

export type AdminRole = "CANDIDATE" | "RECRUITER" | "ADMIN";
export type AdminAccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  status: AdminAccountStatus;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
  recruiterProfile?: { id: string; verified: boolean } | null;
  /**
   * Candidates only. The server reduces the CV document to a flag rather than
   * sending it — "built one" means the CV has content, not merely that the
   * builder was opened once.
   */
  candidateProfile?: {
    id: string;
    hasUploadedCv: boolean;
    hasBuiltCv: boolean;
  } | null;
}

/** Only what an administrator may change. */
export interface AdminUserChanges {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: AdminRole;
  status?: AdminAccountStatus;
}

export type AdminJobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export interface AdminJob {
  id: string;
  title: string;
  location: string;
  wilaya?: string | null;
  status: AdminJobStatus;
  featured: boolean;
  publishedAt?: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
  /** What a deletion would take with it. */
  _count: { applications: number };
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "FREE" | "PREMIUM" | "CORPORATE";
  verified: boolean;
  /** Paid annonces still in hand. Only spent on PREMIUM. */
  postingCredits: number;
  createdAt: string;
  members: {
    id: string;
    role: string;
    recruiter: {
      id: string;
      user: { id: string; email: string; firstName?: string; lastName?: string; status: string };
    };
  }[];
  subscriptions: { id: string; plan: string; status: string; startsAt: string; endsAt: string }[];
  jobs: { id: string }[];
}

export interface AdminStats {
  totalUsers: number;
  totalRecruiters: number;
  totalCandidates: number;
  totalCompanies: number;
  totalJobs: number;
  planCounts: { plan: string; _count: number }[];
  pendingTickets: number;
}

export interface CorporatePendingApplication {
  id: string;
  appliedAt: string;
  preselectionStatus: string;
  job: { title: string; company: { name: string; plan: string } };
  candidate: { user: { firstName?: string; lastName?: string; email: string } };
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const { data } = await api.get("/admin/stats");
    return data.data;
  },

  getCompanies: async (): Promise<Company[]> => {
    const { data } = await api.get("/admin/companies");
    return data.data.companies;
  },

  getCompany: async (id: string): Promise<Company> => {
    const { data } = await api.get(`/admin/companies/${id}`);
    return data.data.company;
  },

  updateCompanyPlan: async (
    id: string,
    plan: "FREE" | "PREMIUM" | "CORPORATE",
    durationDays?: number
  ) => {
    const { data } = await api.patch(`/admin/companies/${id}/plan`, { plan, durationDays });
    return data.data;
  },

  /**
   * Sets a company's annonce balance outright.
   *
   * "credits" rather than "postings": the latter adds to the balance, which is
   * what a purchase does. An administrator fixing a number is stating what it
   * should be.
   */
  setCompanyPostings: async (id: string, credits: number) => {
    const { data } = await api.patch(`/admin/companies/${id}/postings`, { credits });
    return data.data.company as { id: string; postingCredits: number };
  },

  getUsers: async (params?: { role?: string; status?: string }) => {
    const { data } = await api.get("/admin/users", { params });
    return data.data.users;
  },

  updateUserStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/admin/users/${id}/status`, { status });
    return data.data.user;
  },

  updateUser: async (id: string, changes: AdminUserChanges): Promise<AdminUser> => {
    const { data } = await api.patch(`/admin/users/${id}`, changes);
    return data.data.user;
  },

  /** Marks the account DELETED; the row and its records stay. */
  deleteUser: async (id: string): Promise<AdminUser> => {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data.data.user;
  },

  getJobs: async (params?: { status?: string; q?: string }): Promise<AdminJob[]> => {
    const { data } = await api.get("/admin/jobs", { params });
    return data.data.jobs;
  },

  updateJob: async (
    id: string,
    changes: { status?: AdminJobStatus; featured?: boolean }
  ): Promise<AdminJob> => {
    const { data } = await api.patch(`/admin/jobs/${id}`, changes);
    return data.data.job;
  },

  /**
   * Deletes an offer.
   *
   * Applications cascade off a job, so one with candidates is refused with a
   * 409 until `force` is passed — the caller is expected to say how many will
   * go before asking again.
   */
  deleteJob: async (id: string, force = false) => {
    const { data } = await api.delete(`/admin/jobs/${id}`, { params: { force } });
    return data.data as { id: string; applications: number };
  },

  getCorporatePendingPreselections: async (): Promise<CorporatePendingApplication[]> => {
    const { data } = await api.get("/admin/preselections/corporate-pending");
    return data.data.applications;
  },

  adminPreselect: async (
    applicationId: string,
    payload: { status: "PENDING" | "SHORTLISTED" | "REJECTED"; comment?: string; finalScore?: number }
  ) => {
    const { data } = await api.post(`/admin/preselections/${applicationId}`, payload);
    return data.data;
  },
};

export default adminService;
