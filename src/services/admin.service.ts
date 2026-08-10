import api from "./api.ts";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "FREE" | "PREMIUM" | "CORPORATE";
  verified: boolean;
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

  getUsers: async (params?: { role?: string; status?: string }) => {
    const { data } = await api.get("/admin/users", { params });
    return data.data.users;
  },

  updateUserStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/admin/users/${id}/status`, { status });
    return data.data.user;
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
