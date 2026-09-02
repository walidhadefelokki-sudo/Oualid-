import api from "./api";

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  location: string;
  wilaya?: string | null;
  type: string;
  remote: boolean;
  /** Promoted as "À la une". Set by the backend per the recruiter's plan. */
  featured: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  status: string;
  // GET /jobs/:id returns the full Job record, so these are available when
  // loading an existing offer into the recruiter's edit form.
  experienceLevel?: string | null;
  createdAt: string;
  company: {
    name: string;
    logo?: { url: string } | null;
  };
  category?: { name: string } | null;
}

export interface RecruiterJobCard {
  id: string;
  title: string;
  location?: string | null;
  publishedAt?: string | null;
  status: string;
  applicationsCount: number;
  newCandidatesCount: number;
  averageMatch: number | null;
}

// Matches the backend's `type` (JobType) and `experienceLevel`
// (ExperienceLevel) enums exactly — see prisma/schema.prisma.
export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "INTERNSHIP" | "TEMPORARY";
export type ExperienceLevel = "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "MANAGER";

export interface CreateJobPayload {
  title: string;
  description: string;
  location: string;
  wilaya?: string;
  country?: string;
  remote?: boolean;
  type: JobType;
  experienceLevel: ExperienceLevel;
  vacancies?: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  categoryId?: string;
  featured?: boolean;
}

/**
 * Query filters accepted by GET /jobs. Every field is optional and only sent
 * when present, so `getAllJobs()` with no argument behaves exactly as before.
 */
export interface JobFilters {
  title?: string;
  location?: string;
  wilaya?: string;
  type?: JobType;
  categoryId?: string;
  /** Filter by the sector's stable slug ("it", "health", …). */
  categorySlug?: string;
  featured?: boolean;
  /** Server clamps this to 60. */
  limit?: number;
}

// Every field is optional: the recruiter's edit form sends the whole form
// state, but a caller may send only what changed. `status` is update-only
// (a job is always created as-is, then opened/closed later).
export interface UpdateJobPayload extends Partial<CreateJobPayload> {
  status?: string;
}

class JobService {
  /**
   * Public: Get published jobs (for candidate job browsing and the landing
   * page). All filters are optional; omitting them returns every published
   * job, which is the behaviour every existing caller relies on.
   */
  async getAllJobs(filters: JobFilters = {}): Promise<PublicJob[]> {
    const response = await api.get("/jobs", { params: filters });
    return response.data.data.jobs;
  }

  /**
   * Public: jobs promoted as "À la une". Featured placement is granted by the
   * backend according to the recruiter's plan — never by the client.
   */
  async getFeaturedJobs(limit = 6): Promise<PublicJob[]> {
    return this.getAllJobs({ featured: true, limit });
  }

  /**
   * Public: part-time openings, for the dedicated landing-page section.
   */
  async getPartTimeJobs(limit = 6): Promise<PublicJob[]> {
    return this.getAllJobs({ type: "PART_TIME", limit });
  }

  /**
   * Public: Get a single job's full detail.
   */
  async getJob(jobId: string): Promise<PublicJob> {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data.data.job;
  }

  /**
   * Recruiter: Get job cards for the recruiter's own jobs, with
   * real application/match stats.
   */
  async getRecruiterJobs(): Promise<RecruiterJobCard[]> {
    const response = await api.get("/jobs/recruiter/mine");
    return response.data.data.jobs;
  }

  /**
   * Recruiter: Publish a new job offer.
   */
  async createJob(payload: CreateJobPayload): Promise<PublicJob> {
    const response = await api.post("/jobs", payload);
    return response.data.data.job;
  }

  /**
   * Recruiter: Update one of their own job offers.
   *
   * The payload is partial — the backend spreads it into prisma.job.update,
   * and Prisma ignores keys whose value is undefined, so sending only the
   * changed fields leaves the rest of the record untouched.
   */
  async updateJob(jobId: string, payload: UpdateJobPayload): Promise<PublicJob> {
    const response = await api.patch(`/jobs/${jobId}`, payload);
    return response.data.data.job;
  }

  /**
   * Recruiter: Delete one of their own job offers.
   */
  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  }
}

export default new JobService();
