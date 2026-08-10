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
}

export default new JobService();
