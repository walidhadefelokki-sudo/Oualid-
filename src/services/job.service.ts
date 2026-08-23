import api from "./api";

export interface PublicJob {
  id: string;
  title: string;
  description: string;
  location: string;
  wilaya?: string | null;
  type: string;
  remote: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  status: string;
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

class JobService {
  /**
   * Public: Get all published jobs (for candidate job browsing).
   */
  async getAllJobs(): Promise<PublicJob[]> {
    const response = await api.get("/jobs");
    return response.data.data.jobs;
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
   * Recruiter: Delete one of their own job offers.
   */
  async deleteJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}`);
  }
}

export default new JobService();
