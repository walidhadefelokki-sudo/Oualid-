import api from "./api";
import type { CandidateCV } from "../components/recruiter/CVDirectory";

/**
 * The recruiter's CV directory.
 *
 * One request. This screen used to be assembled in the browser: fetch the
 * recruiter's offers, then one request per offer for its applicants, merge
 * them, and search the result with `String.includes` — which meant the search
 * could not see accents, never looked at skills, and the page got slower with
 * every offer posted.
 */

export interface CvDirectoryFilters {
  /**
   * What the recruiter typed. Matched against the candidate's name, headline,
   * current job title, city, wilaya, skills and the offers they answered —
   * accent-insensitively, with every word required.
   */
  q?: string;
  /** Only candidates who answered this offer. */
  jobId?: string;
  wilaya?: string;
  minExperience?: number;
  /** Their best application must score at least this. */
  minScore?: number;
  hasCv?: boolean;
  availableNow?: boolean;
  preselectedOnly?: boolean;
  page?: number;
  /** Clamped to 200 by the server. */
  perPage?: number;
}

export interface CvDirectoryPage {
  candidates: CandidateCV[];
  /** Matching the current search. */
  total: number;
  /** Every applicant the recruiter has, whatever the search says. */
  totalAll: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const cvDirectoryService = {
  search: async (filters: CvDirectoryFilters = {}): Promise<CvDirectoryPage> => {
    // Only what is set: an undefined turns into the string "undefined" in a
    // query string and would be read as a real filter.
    const params: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") params[k] = v as never;
    }

    const { data } = await api.get("/applications/cv-directory", { params });
    const d = data.data;

    return {
      candidates: d.candidates ?? [],
      total: d.total ?? 0,
      totalAll: d.totalAll ?? d.total ?? 0,
      page: d.page ?? 1,
      perPage: d.perPage ?? 0,
      totalPages: d.totalPages ?? 1,
    };
  },
};

export default cvDirectoryService;
