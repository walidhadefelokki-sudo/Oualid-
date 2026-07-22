import axios, { AxiosInstance } from "axios";

import {
  PreselectionCandidate,
  PreselectionResponse,
  PreselectionStatistics,
  ReviewRequest,
  ReviewResponse,
  PreselectionHistory,
} from "../types/preselection";

import {
  PRESELECTION_ENDPOINTS,
} from "../constants/preselection";

class PreselectionService {

  private api: AxiosInstance;

  constructor() {

    this.api = axios.create({

      baseURL:

        import.meta.env.VITE_API_URL ||

        process.env.REACT_APP_API_URL ||

        "",

      headers: {

        "Content-Type": "application/json",

      },

      withCredentials: true,

    });

  }

  /////////////////////////////////////////////////////////////
  // GET ALL
  /////////////////////////////////////////////////////////////

  async getCandidates(): Promise<PreselectionResponse> {

    const { data } = await this.api.get<PreselectionResponse>(

      PRESELECTION_ENDPOINTS.LIST

    );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // GET ONE
  /////////////////////////////////////////////////////////////

  async getCandidate(

    id: string

  ): Promise<PreselectionCandidate> {

    const { data } =

      await this.api.get<PreselectionCandidate>(

        `${PRESELECTION_ENDPOINTS.DETAILS}/${id}`

      );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // APPROVE
  /////////////////////////////////////////////////////////////

  async approve(

    request: ReviewRequest

  ): Promise<ReviewResponse> {

    const { data } =

      await this.api.post<ReviewResponse>(

        PRESELECTION_ENDPOINTS.APPROVE,

        request

      );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // REJECT
  /////////////////////////////////////////////////////////////

  async reject(

    request: ReviewRequest

  ): Promise<ReviewResponse> {

    const { data } =

      await this.api.post<ReviewResponse>(

        PRESELECTION_ENDPOINTS.REJECT,

        request

      );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // SAVE COMMENT
  /////////////////////////////////////////////////////////////

  async saveComment(

    request: ReviewRequest

  ): Promise<ReviewResponse> {

    const { data } =

      await this.api.post<ReviewResponse>(

        PRESELECTION_ENDPOINTS.COMMENT,

        request

      );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // UPDATE REVIEW
  /////////////////////////////////////////////////////////////

  async updateReview(

    request: ReviewRequest

  ): Promise<ReviewResponse> {

    const { data } =

      await this.api.put<ReviewResponse>(

        `${PRESELECTION_ENDPOINTS.DETAILS}/${request.applicationId}`,

        request

      );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // HISTORY
  /////////////////////////////////////////////////////////////

  async getHistory(

    applicationId: string

  ): Promise<PreselectionHistory[]> {

    const { data } =

      await this.api.get<PreselectionHistory[]>(

        `${PRESELECTION_ENDPOINTS.HISTORY}/${applicationId}`

      );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // STATISTICS
  /////////////////////////////////////////////////////////////

  async getStatistics()

    : Promise<PreselectionStatistics> {

    const { data } =

      await this.api.get<PreselectionStatistics>(

        PRESELECTION_ENDPOINTS.STATISTICS

      );

    return data;

  }

  /////////////////////////////////////////////////////////////
  // SEARCH
  /////////////////////////////////////////////////////////////

  async search(

    keyword: string

  ): Promise<PreselectionCandidate[]> {

    const response =

      await this.getCandidates();

    const search = keyword.toLowerCase();

    return response.candidates.filter(candidate =>

      candidate.fullName
        .toLowerCase()
        .includes(search)

      ||

      candidate.email
        .toLowerCase()
        .includes(search)

      ||

      candidate.location
        ?.toLowerCase()
        .includes(search)

      ||

      candidate.skills.some(skill =>

        skill
          .toLowerCase()
          .includes(search)

      )

    );

  }

  /////////////////////////////////////////////////////////////
  // GET PENDING
  /////////////////////////////////////////////////////////////

  async getPending()

    : Promise<PreselectionCandidate[]> {

    const response =

      await this.getCandidates();

    return response.candidates.filter(

      candidate =>

        candidate.status === "PENDING"

    );

  }

  /////////////////////////////////////////////////////////////
  // GET APPROVED
  /////////////////////////////////////////////////////////////

  async getApproved()

    : Promise<PreselectionCandidate[]> {

    const response =

      await this.getCandidates();

    return response.candidates.filter(

      candidate =>

        candidate.status === "APPROVED"

    );

  }

  /////////////////////////////////////////////////////////////
  // GET REJECTED
  /////////////////////////////////////////////////////////////

  async getRejected()

    : Promise<PreselectionCandidate[]> {

    const response =

      await this.getCandidates();

    return response.candidates.filter(

      candidate =>

        candidate.status === "REJECTED"

    );

  }

  /////////////////////////////////////////////////////////////
  // REFRESH
  /////////////////////////////////////////////////////////////

  async refresh()

    : Promise<PreselectionResponse> {

    return this.getCandidates();

  }

}

export default new PreselectionService();