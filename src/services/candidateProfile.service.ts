import api from "./api";

export interface CVFileAsset {
  id: string;
  url: string;
  mimeType?: string;
  extension?: string;
  size?: number;
}

class CandidateProfileService {
  /**
   * Candidate: Upload or replace the CV on their profile.
   */
  async uploadCV(file: File): Promise<CVFileAsset | null> {
    const formData = new FormData();
    formData.append("cv", file);

    const response = await api.post("/candidates/me/cv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data.data.candidateProfile.resume;
  }

  /**
   * Candidate: Get own CV.
   */
  async getMyCV(): Promise<CVFileAsset | null> {
    const response = await api.get("/candidates/me/cv");
    return response.data.data.resume;
  }
}

export default new CandidateProfileService();
