import api from "./api.ts";

export interface OralPresentation {
  id: string;

  recruiterScore?: number;

  status: "PENDING" | "UPLOADED" | "REVIEWED";

  createdAt: string;
  updatedAt: string;

  video?: {
    id: string;
    url: string;
    mimeType?: string;
    extension?: string;
    size?: number;
  };

  candidate?: any;
}

class OralPresentationService {
  /**
   * Candidate
   * Upload or replace my presentation
   */
  async uploadPresentation(file: File): Promise<OralPresentation> {
    const formData = new FormData();
    formData.append("video", file);

    const response = await api.post(
      "/oral-presentations/me",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data.data.presentation;
  }

  /**
   * Candidate
   * Get my presentation
   */
  async getMyPresentation(): Promise<OralPresentation | null> {
    const response = await api.get("/oral-presentations/me");

    return response.data.data.presentation;
  }

  /**
   * Candidate
   * Delete my presentation
   */
  async deletePresentation(): Promise<void> {
    await api.delete("/oral-presentations/me");
  }

  /**
   * Recruiter
   * Get candidate presentation
   */
  async getCandidatePresentation(
    candidateId: string
  ): Promise<OralPresentation> {
    const response = await api.get(
      `/oral-presentations/candidate/${candidateId}`
    );

    return response.data.data.presentation;
  }

  /**
   * Recruiter
   * Update recruiter score for a candidate's presentation
   */
  async updateRecruiterScore(
    candidateId: string,
    recruiterScore: number
  ): Promise<OralPresentation> {
    const response = await api.patch(
      `/oral-presentations/candidate/${candidateId}/recruiter-score`,
      {
        recruiterScore,
      }
    );

    return response.data.data.presentation;
  }

  /**
   * Recruiter
   * List presentations
   */
  async getRecruiterPresentations(
    page = 1,
    limit = 10
  ) {
    const response = await api.get(
      "/oral-presentations/recruiter",
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data;
  }

  /**
   * Recruiter statistics
   */
  async getRecruiterStatistics() {
    const response = await api.get(
      "/oral-presentations/recruiter/statistics"
    );

    return response.data.data.statistics;
  }

  /**
   * Admin
   * List all presentations
   */
  async getAllPresentations(
    page = 1,
    limit = 20
  ) {
    const response = await api.get(
      "/oral-presentations",
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data;
  }
}

export default new OralPresentationService();