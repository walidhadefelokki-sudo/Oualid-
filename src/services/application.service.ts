import api from "./api";

export type ApplicationStatus =
  | "PENDING"
  | "REVIEWING"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "HIRED"
  | "REJECTED";

export interface ApplicationCandidate {
  id: string;
  city?: string | null;
  wilaya?: string | null;
  currentJobTitle?: string | null;
  yearsExperience?: number | null;
  skills?: string[];
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedAt: string;
  isPreselected?: boolean;

  aiScore?: number | null;
  quizScore?: number | null;
  oralPresentationScore?: number | null;

  candidate: ApplicationCandidate;
  cv?: { id: string; url: string } | null;
  aianalysis?: {
    overallScore?: number | null;
    strengths?: string[];
    weaknesses?: string[];
  } | null;
  quiz?: {
    status: string;
    attempt?: { aiScore?: number | null } | null;
  } | null;
  oralPresentation?: {
    id: string;
    status: string;
    video?: { url: string } | null;
  } | null;
}

class ApplicationService {
  /**
   * Candidate: Apply to a job (uses the CV already on the candidate's
   * profile — no per-application file upload).
   */
  async applyToJob(jobId: string, coverLetter?: string) {
    const response = await api.post("/applications", { jobId, coverLetter });
    return response.data.data.application;
  }

  /**
   * Candidate: Get own applications.
   */
  async getMyApplications(): Promise<ApplicationRecord[]> {
    const response = await api.get("/applications/my");
    return response.data.data.applications;
  }

  /**
   * Recruiter/Admin: Get applications for a specific job, enriched with
   * CV, AI analysis, quiz, and oral presentation data.
   */
  async getJobApplications(jobId: string): Promise<ApplicationRecord[]> {
    const response = await api.get(`/applications/job/${jobId}`);
    return response.data.data.applications;
  }

  /**
   * Recruiter/Admin: Update an application's status.
   */
  async updateStatus(
    applicationId: string,
    status: ApplicationStatus
  ): Promise<ApplicationRecord> {
    const response = await api.patch(`/applications/${applicationId}/status`, {
      status,
    });
    return response.data.data.application;
  }
}

export default new ApplicationService();
