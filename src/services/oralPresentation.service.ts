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
   * Upload or replace my presentation.
   *
   * The video is uploaded directly from the browser to Cloudinary
   * (using a short-lived signature from our backend), never through
   * our own API server. Our API runs as a Vercel serverless function,
   * which enforces a hard ~4.5MB request body limit — routing a real
   * presentation video through it would fail almost every time. Once
   * Cloudinary has the file, we send it only the small resulting
   * metadata (url, publicId, etc.) to save.
   */
  async uploadPresentation(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<OralPresentation> {
    // 1. Get a signed upload signature from our backend
    let timestamp, folder, signature, apiKey, cloudName;
    try {
      const sigResponse = await api.get("/oral-presentations/upload-signature");
      ({ timestamp, folder, signature, apiKey, cloudName } = sigResponse.data.data);
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || String(err);
      throw new Error(`[signature] ${detail}`);
    }

    if (!cloudName || !apiKey) {
      throw new Error(
        "[signature] Le serveur n'a pas renvoyé de configuration Cloudinary valide (cloudName/apiKey manquant)."
      );
    }

    // 2. Upload the file directly to Cloudinary
    const cloudinaryForm = new FormData();
    cloudinaryForm.append("file", file);
    cloudinaryForm.append("api_key", apiKey);
    cloudinaryForm.append("timestamp", timestamp);
    cloudinaryForm.append("signature", signature);
    cloudinaryForm.append("folder", folder);

    const cloudinaryResponse = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`
      );

      xhr.upload.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        let data: any = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          // response wasn't JSON — fall through, data stays null
        }
        if (xhr.status >= 200 && xhr.status < 300 && data) {
          resolve(data);
        } else {
          reject(
            new Error(
              `[cloudinary ${xhr.status}] ${data?.error?.message || xhr.responseText || "Échec du téléversement vers Cloudinary."}`
            )
          );
        }
      };

      xhr.onerror = () =>
        reject(
          new Error(
            "[cloudinary] Erreur réseau pendant le téléversement (CORS, connexion, ou domaine bloqué)."
          )
        );

      xhr.send(cloudinaryForm);
    });

    // 3. Save the resulting metadata (not the file) on our backend
    try {
      const response = await api.post("/oral-presentations/me", {
        url: cloudinaryResponse.secure_url,
        publicId: cloudinaryResponse.public_id,
        mimeType: cloudinaryResponse.resource_type
          ? `${cloudinaryResponse.resource_type}/${cloudinaryResponse.format}`
          : undefined,
        extension: cloudinaryResponse.format,
        size: cloudinaryResponse.bytes,
      });

      return response.data.data.presentation;
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || String(err);
      throw new Error(`[save] ${detail}`);
    }
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