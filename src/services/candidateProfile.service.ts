import api from "./api";

export interface CVFileAsset {
  id: string;
  /**
   * A signed download link that expires a few minutes after the server issued
   * it. CVs are held in a private bucket, so there is no permanent URL — fetch
   * the CV again to get a fresh link rather than storing this one.
   */
  url: string;
  /** The name of the file the candidate uploaded, for display. */
  fileName?: string | null;
  mimeType?: string | null;
  extension?: string | null;
  size?: number | null;
  uploadedAt?: string;
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
   *
   * Three steps, because the file never passes through our own API: a Vercel
   * function's request body is capped at 4.5 MB, well under the 10 MB a CV is
   * allowed to be, so anything larger would fail in production no matter how
   * the endpoint were written.
   *
   *   1. ask the server for a one-time upload URL
   *   2. send the bytes straight to storage
   *   3. tell the server to check them and attach the result
   *
   * Step 3 is where format, size and file signature are verified. Nothing is
   * recorded until it passes, so a failed or abandoned upload leaves the
   * candidate's existing CV exactly as it was.
   */
  async uploadCV(file: File): Promise<CVFileAsset | null> {
    const ticket = await api.post("/candidates/me/cv/upload-url", {
      fileName: file.name,
    });
    const { path, signedUrl } = ticket.data.data as {
      path: string;
      signedUrl: string;
    };

    // The shape Supabase Storage expects on a signed upload URL: a PUT whose
    // body is form data carrying the file under an empty field name. Sent with
    // fetch rather than the Supabase client because the client configured for
    // this app points at a different project.
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);

    const stored = await fetch(signedUrl, {
      method: "PUT",
      headers: { "x-upsert": "false" },
      body,
    });

    if (!stored.ok) {
      throw new Error(
        `Upload failed (${stored.status}). Please check your connection and try again.`
      );
    }

    const response = await api.post("/candidates/me/cv/confirm", {
      path,
      fileName: file.name,
    });

    return response.data.data.resume;
  }

  /**
   * Candidate: Get own CV, including a freshly signed download link.
   *
   * Call this again at the moment the candidate opens their CV: the link in a
   * response fetched on page load will usually have expired by then.
   */
  async getMyCV(): Promise<CVFileAsset | null> {
    const response = await api.get("/candidates/me/cv");
    return response.data.data.resume;
  }

  /**
   * Recruiter/Admin: the CV file one candidate uploaded, as a signed link.
   *
   * The backend rejects candidates who have not applied to this recruiter's
   * jobs — the UI never decides who may be read.
   */
  async getCandidateCvFile(candidateId: string): Promise<CVFileAsset> {
    const response = await api.get(`/candidates/${candidateId}/cv-file`);
    return response.data.data.resume;
  }

  /**
   * Candidate: Load the saved CV Maker document, so the builder reopens with
   * everything they previously entered. Resolves to null when they have never
   * saved one.
   */
  async getCvBuilder(): Promise<Record<string, any> | null> {
    const response = await api.get("/candidates/me/cv-builder");
    return response.data.data.cvBuilderData ?? null;
  }

  /**
   * Candidate: Save the CV Maker document. Replaces any previous save.
   */
  async saveCvBuilder(cvBuilderData: Record<string, any>): Promise<string> {
    const response = await api.put("/candidates/me/cv-builder", { cvBuilderData });
    return response.data.data.updatedAt;
  }

  /**
   * Recruiter/Admin: one candidate's CV in the same normalised shape the
   * candidate's own builder produces, so both render through CVDocument.
   *
   * The backend rejects candidates who have not applied to this recruiter's
   * jobs — the UI never decides who may be read.
   */
  async getCandidateCvDocument(candidateId: string): Promise<{
    document: Record<string, any>;
    photoUrl: string | null;
    hasBuiltCv: boolean;
  }> {
    const response = await api.get(`/candidates/${candidateId}/cv-document`);
    return response.data.data;
  }
}

export default new CandidateProfileService();
