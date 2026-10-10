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

  /** Everything held on one account, assembled server-side. */
  getUserDetail: async (id: string): Promise<AdminUserDetail> => {
    const { data } = await api.get(`/admin/users/${id}`);
    return data.data.user;
  },

  /**
   * Mails one batch of selected accounts.
   *
   * The caller splits the selection and calls this repeatedly: the serverless
   * function is killed at 60 seconds, and sending is about two seconds a
   * message, so one request cannot carry a whole campaign.
   */
  sendBroadcast: async (payload: BroadcastPayload): Promise<BroadcastResult> => {
    const { data } = await api.post("/admin/emails/send", payload);
    return data.data;
  },

  /** Sends the composed message to one address, before anyone else gets it. */
  sendBroadcastPreview: async (
    payload: Omit<BroadcastPayload, "userIds" | "mode"> & { to: string }
  ): Promise<boolean> => {
    const { data } = await api.post("/admin/emails/preview", payload);
    return Boolean(data.success);
  },

  getSchedules: async (params?: { from?: string; to?: string }): Promise<ScheduleEvent[]> => {
    const { data } = await api.get("/admin/schedules", { params });
    return data.data.events;
  },

  createSchedule: async (input: ScheduleInput): Promise<ScheduleEvent> => {
    const { data } = await api.post("/admin/schedules", input);
    return data.data.event;
  },

  updateSchedule: async (id: string, input: Partial<ScheduleInput>): Promise<ScheduleEvent> => {
    const { data } = await api.patch(`/admin/schedules/${id}`, input);
    return data.data.event;
  },

  deleteSchedule: async (id: string) => {
    await api.delete(`/admin/schedules/${id}`);
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

/* ============================================================ schedules === */

export type ScheduleType = "MEETING" | "INTERVIEW" | "CALL" | "DEMO" | "DEADLINE" | "OTHER";
export type ScheduleStatus = "PLANNED" | "CONFIRMED" | "DONE" | "CANCELLED";

export interface SchedulePerson {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
}

/** Either a platform account, or a name and address typed in. */
export interface ScheduleGuest {
  id?: string;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  user?: SchedulePerson | null;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  type: ScheduleType;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location?: string | null;
  notes?: string | null;
  status: ScheduleStatus;
  createdAt: string;
  host?: SchedulePerson | null;
  guests: ScheduleGuest[];
}

export interface ScheduleInput {
  title: string;
  type?: ScheduleType;
  status?: ScheduleStatus;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  location?: string | null;
  notes?: string | null;
  hostId?: string | null;
  guests?: Array<{ userId?: string | null; name?: string | null; email?: string | null }>;
}

/* ========================================================= user detail === */

/**
 * Contact details read out of the candidate's CV.
 *
 * Shown beside a profile field the candidate left empty — almost every account
 * with a CV has no phone number on the profile while the CV carries a real one.
 * Labelled with its source, and never written back to the profile: a number
 * typed into a CV is evidence, not a verified contact detail.
 */
export interface CvDerived {
  source: "cv-maker" | "uploaded-cv";
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  title?: string | null;
  summary?: string | null;
  skills?: string[];
  linkedin?: string | null;
  portfolio?: string | null;
}

/**
 * A message composed in the dashboard.
 *
 * `individual` sends one personalised copy per recipient — placeholders are
 * filled and each person is the only address on their copy. `grouped` sends a
 * single message with everyone blind-copied, which is faster but cannot be
 * personalised and makes every reply land in one thread.
 */
export interface BroadcastPayload {
  userIds: string[];
  mode: "individual" | "grouped";
  subject: string;
  body: string;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
}

export interface BroadcastResult {
  mode: "individual" | "grouped";
  sent: number;
  failed: number;
  results: Array<{ id: string; email: string; ok: boolean; error?: string }>;
}

/** How many recipients one request may carry, per mode. Mirrors the server. */
export const BROADCAST_BATCH = 12;
export const BROADCAST_MAX_BCC = 200;

export interface AdminUserDetail extends AdminUser {
  phone?: string | null;
  updatedAt: string;
  deletedAt?: string | null;
  avatar?: { url: string } | null;
  candidateProfile?:
    | (AdminUser["candidateProfile"] & {
        headline?: string | null;
        bio?: string | null;
        city?: string | null;
        wilaya?: string | null;
        skills: string[];
        yearsExperience?: number | null;
        currentJobTitle?: string | null;
        desiredSalary?: number | null;
        availableImmediately: boolean;
        linkedinUrl?: string | null;
        githubUrl?: string | null;
        portfolioUrl?: string | null;
        resume?: { id: string; url: string; fileName?: string | null; createdAt: string } | null;
        _count: { applications: number };
      })
    | null;
  recruiterProfile?:
    | (AdminUser["recruiterProfile"] & {
        companies: Array<{
          role: string;
          company: {
            id: string;
            name: string;
            plan: string;
            postingCredits: number;
            verified: boolean;
            _count: { jobs: number };
          };
        }>;
      })
    | null;
  cvDerived?: CvDerived | null;
  orders: Array<{
    id: string;
    packId: string;
    jobs: number;
    amount: number;
    currency: string;
    status: string;
    invoiceNumber?: string | null;
    paidAt?: string | null;
    createdAt: string;
  }>;
}
