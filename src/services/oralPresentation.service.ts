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
   * Three steps, because the video never passes through our own API: a Vercel
   * function's request body is capped at ~4.5MB, far under the 50MB a
   * presentation is allowed to be, so anything real would fail there no matter
   * how the endpoint were written.
   *
   *   1. ask the server for a one-time upload URL
   *   2. send the bytes straight to storage, reporting progress
   *   3. tell the server to check them and attach the result
   *
   * Step 3 is where format and size are verified, against the file's own bytes
   * rather than anything the browser claims. Nothing is recorded until it
   * passes, so a failed or abandoned upload leaves the existing presentation
   * exactly as it was.
   */
  async uploadPresentation(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<OralPresentation> {
    // 1. A place to upload to.
    let path: string;
    let signedUrl: string;
    try {
      const ticket = await api.post("/oral-presentations/me/upload-url", {
        fileName: file.name,
      });
      ({ path, signedUrl } = ticket.data.data);
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || String(err);
      throw new Error(detail);
    }

    // 2. The bytes. XHR rather than fetch, because it is the only way to
    //    report upload progress on a file this size.
    //
    //    The shape Supabase Storage expects on a signed upload URL: a PUT whose
    //    body is form data carrying the file under an empty field name.
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl);
      xhr.setRequestHeader("x-upsert", "false");

      xhr.upload.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new Error(
              `Le téléversement a échoué (${xhr.status}). Vérifiez votre connexion et réessayez.`
            )
          );
        }
      };

      xhr.onerror = () =>
        reject(
          new Error(
            "Erreur réseau pendant le téléversement. Vérifiez votre connexion et réessayez."
          )
        );

      xhr.send(form);
    });

    // 3. Server-side validation, then the record.
    try {
      const response = await api.post("/oral-presentations/me/confirm", {
        path,
        fileName: file.name,
      });

      return response.data.data.presentation;
    } catch (err: any) {
      const detail = err?.response?.data?.message || err?.message || String(err);
      throw new Error(detail);
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