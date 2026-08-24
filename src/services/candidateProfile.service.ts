import api from "./api";

export interface CVFileAsset {
  id: string;
  url: string;
  mimeType?: string;
  extension?: string;
  size?: number;
}

export interface CandidateProfileUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string;
  headline?: string;
  bio?: string;
  city?: string;
  wilaya?: string;
  country?: string;
  currentJobTitle?: string;
  yearsExperience?: number;
  desiredSalary?: number;
  availableImmediately?: boolean;
  skills?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

class CandidateProfileService {
  /**
   * Candidate: Fetch the current user + candidate profile, so the
   * profile page can be pre-filled with real saved data instead of
   * placeholders.
   */
  async getMyProfile() {
    const response = await api.get("/auth/me");
    return response.data.data.user;
  }

  /**
   * Candidate: Save changes made on the profile page (name, phone,
   * bio, location, etc.). This persists to the real backend/database,
   * not the old Supabase project.
   */
  async updateProfile(updates: CandidateProfileUpdate) {
    const response = await api.patch("/candidates/me", updates);
    return response.data.data;
  }

  /**
   * Any authenticated user: upload or replace their profile picture.
   */
  async updateAvatar(file: File): Promise<string | undefined> {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await api.patch("/auth/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data.data.avatarUrl;
  }

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
