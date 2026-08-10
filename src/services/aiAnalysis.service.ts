import api from "./api";

export interface AIAnalysis {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

  overallScore?: number | null;
  skillsScore?: number | null;
  experienceScore?: number | null;
  educationScore?: number | null;
  languageScore?: number | null;

  extractedSkills: string[];
  extractedLanguages: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];

  processedAt?: string | null;

  application: {
    id: string;
    job: { id: string; title: string };
    candidate: {
      id: string;
      city?: string | null;
      wilaya?: string | null;
      currentJobTitle?: string | null;
      yearsExperience?: number | null;
      user: {
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        email: string;
        phone?: string | null;
      };
    };
  };
}

class AIAnalysisService {
  /**
   * Recruiter: List AI analyses for candidates who applied to this
   * recruiter's jobs, best match first.
   */
  async getRecruiterAnalyses(page = 1, limit = 100) {
    const response = await api.get("/ai-analysis/recruiter/all", {
      params: { page, limit },
    });

    return response.data as {
      items: AIAnalysis[];
      pagination: { total: number; page: number; limit: number; pages: number };
    };
  }

  /**
   * Recruiter: Aggregate statistics.
   */
  async getStatistics() {
    const response = await api.get("/ai-analysis/recruiter/statistics");
    return response.data.data;
  }

  /**
   * Candidate/Recruiter/Admin: Get one analysis by application id.
   */
  async getAnalysis(applicationId: string): Promise<AIAnalysis> {
    const response = await api.get(`/ai-analysis/${applicationId}`);
    return response.data.data;
  }

  /**
   * Recruiter: Trigger analysis for an application.
   */
  async analyzeApplication(applicationId: string): Promise<AIAnalysis> {
    const response = await api.post(`/ai-analysis/${applicationId}/analyze`);
    return response.data.data;
  }

  /**
   * Recruiter: Recalculate an existing analysis.
   */
  async recalculate(applicationId: string): Promise<AIAnalysis> {
    const response = await api.post(
      `/ai-analysis/${applicationId}/recalculate`
    );
    return response.data.data;
  }
}

export default new AIAnalysisService();
