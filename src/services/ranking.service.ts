import axios, {
  AxiosInstance,
  AxiosResponse,
} from "axios";

import {
  CandidateRanking,
} from "../types/ranking";

///////////////////////////////////////////////////////////////
// API
///////////////////////////////////////////////////////////////

const api: AxiosInstance = axios.create({

  baseURL:

    import.meta.env.VITE_API_URL ??

    "http://localhost:5000/api",

  withCredentials: true,

  headers: {

    "Content-Type":

      "application/json",

  },

});

///////////////////////////////////////////////////////////////
// SERVICE
///////////////////////////////////////////////////////////////

class RankingService {

  /////////////////////////////////////////////////////////////
  // REQUEST
  /////////////////////////////////////////////////////////////

  private async request<T>(

    promise: Promise<AxiosResponse<T>>

  ): Promise<T> {

    try {

      const response =

        await promise;

      return response.data;

    }

    catch (error) {

      console.error(

        "Ranking API Error:",

        error

      );

      throw error;

    }

  }

  /////////////////////////////////////////////////////////////
  // GET ALL RANKINGS
  /////////////////////////////////////////////////////////////

  async getRanking():

    Promise<CandidateRanking[]> {

    return this.request(

      api.get<CandidateRanking[]>(

        "/ranking"

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // GET RANKING FOR A JOB
  /////////////////////////////////////////////////////////////

  async getRankingByJob(

    jobId: string

  ): Promise<CandidateRanking[]> {

    return this.request(

      api.get<CandidateRanking[]>(

        `/ranking/job/${jobId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // GET SINGLE CANDIDATE
  /////////////////////////////////////////////////////////////

  async getCandidate(

    candidateId: string

  ): Promise<CandidateRanking> {

    return this.request(

      api.get<CandidateRanking>(

        `/ranking/${candidateId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // SEARCH
  /////////////////////////////////////////////////////////////

  async searchCandidates(

    keyword: string

  ): Promise<CandidateRanking[]> {

    return this.request(

      api.get<CandidateRanking[]>(

        "/ranking/search",

        {

          params: {

            q: keyword,

          },

        }

      )

    );

  }
    /////////////////////////////////////////////////////////////
  // PRESELECT CANDIDATE
  /////////////////////////////////////////////////////////////

  async preselectCandidate(

    candidateId: string

  ): Promise<CandidateRanking> {

    return this.request(

      api.post<CandidateRanking>(

        `/ranking/preselect/${candidateId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // REJECT CANDIDATE
  /////////////////////////////////////////////////////////////

  async rejectCandidate(

    candidateId: string

  ): Promise<CandidateRanking> {

    return this.request(

      api.post<CandidateRanking>(

        `/ranking/reject/${candidateId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // UPDATE STATUS
  /////////////////////////////////////////////////////////////

  async updateCandidateStatus(

    candidateId: string,

    status: string

  ): Promise<CandidateRanking> {

    return this.request(

      api.patch<CandidateRanking>(

        `/ranking/status/${candidateId}`,

        {

          status,

        }

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // COMPARE CANDIDATES
  /////////////////////////////////////////////////////////////

  async compareCandidates(

    candidateIds: string[]

  ): Promise<CandidateRanking[]> {

    return this.request(

      api.post<CandidateRanking[]>(

        "/ranking/compare",

        {

          candidateIds,

        }

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // DELETE CANDIDATE
  /////////////////////////////////////////////////////////////

  async deleteCandidate(

    candidateId: string

  ): Promise<void> {

    await this.request(

      api.delete(

        `/ranking/${candidateId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // RESTORE CANDIDATE
  /////////////////////////////////////////////////////////////

  async restoreCandidate(

    candidateId: string

  ): Promise<CandidateRanking> {

    return this.request(

      api.post<CandidateRanking>(

        `/ranking/restore/${candidateId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // TOGGLE PRESELECT
  /////////////////////////////////////////////////////////////

  async togglePreselected(

    candidateId: string,

    value: boolean

  ): Promise<CandidateRanking> {

    return this.request(

      api.patch<CandidateRanking>(

        `/ranking/preselected/${candidateId}`,

        {

          isPreselected: value,

        }

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // BULK PRESELECT
  /////////////////////////////////////////////////////////////

  async bulkPreselect(

    candidateIds: string[]

  ): Promise<void> {

    await this.request(

      api.post(

        "/ranking/preselect",

        {

          candidateIds,

        }

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // BULK REJECT
  /////////////////////////////////////////////////////////////

  async bulkReject(

    candidateIds: string[]

  ): Promise<void> {

    await this.request(

      api.post(

        "/ranking/reject",

        {

          candidateIds,

        }

      )

    );

  }
    /////////////////////////////////////////////////////////////
  // RECALCULATE RANKING
  /////////////////////////////////////////////////////////////

  async recalculateRanking():

    Promise<CandidateRanking[]> {

    return this.request(

      api.post<CandidateRanking[]>(

        "/ranking/recalculate"

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // REFRESH RANKING
  /////////////////////////////////////////////////////////////

  async refreshRanking():

    Promise<CandidateRanking[]> {

    return this.request(

      api.get<CandidateRanking[]>(

        "/ranking/refresh"

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // UPDATE AI SCORE
  /////////////////////////////////////////////////////////////

  async updateAIScore(

    candidateId: string,

    aiScore: number

  ): Promise<CandidateRanking> {

    return this.request(

      api.patch<CandidateRanking>(

        `/ranking/ai-score/${candidateId}`,

        {

          aiScore,

        }

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // GENERATE AI SCORE
  /////////////////////////////////////////////////////////////

  async generateAIScore(

    candidateId: string

  ): Promise<CandidateRanking> {

    return this.request(

      api.post<CandidateRanking>(

        `/ranking/generate-score/${candidateId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // EXPORT PDF
  /////////////////////////////////////////////////////////////

  async exportPDF(

    candidates?: CandidateRanking[]

  ): Promise<Blob> {

    const response =

      await api.post(

        "/ranking/export/pdf",

        {

          candidates,

        },

        {

          responseType: "blob",

        }

      );

    return response.data;

  }

  /////////////////////////////////////////////////////////////
  // EXPORT EXCEL
  /////////////////////////////////////////////////////////////

  async exportExcel(

    candidates?: CandidateRanking[]

  ): Promise<Blob> {

    const response =

      await api.post(

        "/ranking/export/excel",

        {

          candidates,

        },

        {

          responseType: "blob",

        }

      );

    return response.data;

  }

  /////////////////////////////////////////////////////////////
  // DOWNLOAD REPORT
  /////////////////////////////////////////////////////////////

  async downloadReport(

    type: "pdf" | "excel",

    candidates?: CandidateRanking[]

  ): Promise<void> {

    const blob =

      type === "pdf"

        ? await this.exportPDF(

            candidates

          )

        : await this.exportExcel(

            candidates

          );

    const url =

      window.URL.createObjectURL(

        blob

      );

    const link =

      document.createElement("a");

    link.href = url;

    link.download =

      `candidate-ranking.${

        type === "pdf"

          ? "pdf"

          : "xlsx"

      }`;

    document.body.appendChild(

      link

    );

    link.click();

    link.remove();

    window.URL.revokeObjectURL(

      url

    );

  }

  /////////////////////////////////////////////////////////////
  // GET DASHBOARD STATISTICS
  /////////////////////////////////////////////////////////////

  async getStatistics() {

    return this.request(

      api.get(

        "/ranking/statistics"

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // GET ANALYTICS
  /////////////////////////////////////////////////////////////

  async getAnalytics() {

    return this.request(

      api.get(

        "/ranking/analytics"

      )

    );

  }
    /////////////////////////////////////////////////////////////
  // CALCULATE RANKING
  /////////////////////////////////////////////////////////////

  async calculateRanking(

    jobId: string

  ): Promise<CandidateRanking[]> {

    return this.request(

      api.post<CandidateRanking[]>(

        `/ranking/calculate/${jobId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // CALCULATE SINGLE CANDIDATE SCORE
  /////////////////////////////////////////////////////////////

  async calculateCandidateScore(

    candidateId: string

  ): Promise<number> {

    return this.request(

      api.post<number>(

        `/ranking/calculate-score/${candidateId}`

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // HEALTH CHECK
  /////////////////////////////////////////////////////////////

  async healthCheck(): Promise<boolean> {

    try {

      await api.get(

        "/health"

      );

      return true;

    }

    catch {

      return false;

    }

  }

}

///////////////////////////////////////////////////////////////
// EXPORT
///////////////////////////////////////////////////////////////

const rankingService =

  new RankingService();

export default rankingService;