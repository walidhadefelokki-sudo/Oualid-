///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface JobApplication {

  id: string;

  candidateId: string;

  jobId: string;

  recruiterId: string;

  status:
    | "PENDING"
    | "REVIEWING"
    | "SHORTLISTED"
    | "INTERVIEW"
    | "HIRED"
    | "REJECTED";

  cvUrl?: string;

  oralPresentationUrl?: string;

  quizScore?: number;

  aiScore?: number;

  isPreselected?: boolean;

  preselectionScore?: number;

  createdAt: string;

  updatedAt: string;

}

export interface CreateApplicationRequest {

  jobId: string;

  candidateId: string;

  cvUrl: string;

}

export interface UpdateApplicationRequest {

  cvUrl?: string;

  oralPresentationUrl?: string;

  quizScore?: number;

  aiScore?: number;

  isPreselected?: boolean;

  preselectionScore?: number;

}

///////////////////////////////////////////////////////////////
// CONFIG
///////////////////////////////////////////////////////////////

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

///////////////////////////////////////////////////////////////
// SERVICE
///////////////////////////////////////////////////////////////

class ApplicationService {

  /////////////////////////////////////////////////////////////
  // CREATE APPLICATION
  /////////////////////////////////////////////////////////////

  async createApplication(
    data: CreateApplicationRequest
  ): Promise<JobApplication> {

    const response = await fetch(

      `${API_URL}/applications`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify(data),

      }

    );

    if (!response.ok) {

      throw new Error("Unable to create application.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // GET APPLICATION
  /////////////////////////////////////////////////////////////

  async getApplication(
    applicationId: string
  ): Promise<JobApplication> {

    const response = await fetch(

      `${API_URL}/applications/${applicationId}`

    );

    if (!response.ok) {

      throw new Error("Unable to load application.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // GET MY APPLICATIONS
  /////////////////////////////////////////////////////////////

  async getCandidateApplications(
    candidateId: string
  ): Promise<JobApplication[]> {

    const response = await fetch(

      `${API_URL}/applications/candidate/${candidateId}`

    );

    if (!response.ok) {

      throw new Error("Unable to load applications.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // GET JOB APPLICATIONS
  /////////////////////////////////////////////////////////////

  async getJobApplications(
    jobId: string
  ): Promise<JobApplication[]> {

    const response = await fetch(

      `${API_URL}/applications/job/${jobId}`

    );

    if (!response.ok) {

      throw new Error("Unable to load job applications.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // UPDATE APPLICATION
  /////////////////////////////////////////////////////////////

  async updateApplication(
    applicationId: string,
    data: UpdateApplicationRequest
  ): Promise<JobApplication> {

    const response = await fetch(

      `${API_URL}/applications/${applicationId}`,

      {

        method: "PUT",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify(data),

      }

    );

    if (!response.ok) {

      throw new Error("Unable to update application.");

    }

    return response.json();

  }

  /////////////////////////////////////////////////////////////
  // UPLOAD ORAL PRESENTATION
  /////////////////////////////////////////////////////////////

  async saveOralPresentation(
    applicationId: string,
    oralPresentationUrl: string
  ): Promise<JobApplication> {

    return this.updateApplication(

      applicationId,

      {

        oralPresentationUrl,

      }

    );

  }

  /////////////////////////////////////////////////////////////
  // SAVE QUIZ SCORE
  /////////////////////////////////////////////////////////////

  async saveQuizScore(
    applicationId: string,
    quizScore: number
  ): Promise<JobApplication> {

    return this.updateApplication(

      applicationId,

      {

        quizScore,

      }

    );

  }

  /////////////////////////////////////////////////////////////
  // SAVE AI SCORE
  /////////////////////////////////////////////////////////////

  async saveAIScore(
    applicationId: string,
    aiScore: number
  ): Promise<JobApplication> {

    return this.updateApplication(

      applicationId,

      {

        aiScore,

      }

    );

  }

  /////////////////////////////////////////////////////////////
  // PRESELECT CANDIDATE
  /////////////////////////////////////////////////////////////

  async preselectCandidate(

    applicationId: string,

    score: number

  ): Promise<JobApplication> {

    return this.updateApplication(

      applicationId,

      {

        isPreselected: true,

        preselectionScore: score,

      }

    );

  }

  /////////////////////////////////////////////////////////////
  // DELETE APPLICATION
  /////////////////////////////////////////////////////////////

  async deleteApplication(
    applicationId: string
  ): Promise<void> {

    const response = await fetch(

      `${API_URL}/applications/${applicationId}`,

      {

        method: "DELETE",

      }

    );

    if (!response.ok) {

      throw new Error("Unable to delete application.");

    }

  }

}

///////////////////////////////////////////////////////////////
// EXPORT
///////////////////////////////////////////////////////////////

const applicationService = new ApplicationService();

export default applicationService;