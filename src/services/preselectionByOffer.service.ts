import api from "./api";

/**
 * Preselection, grouped by offer.
 *
 * Uses the shared `api` client, which carries the bearer token. The older
 * `preselection.service.ts` builds its own axios instance with
 * `withCredentials` and no Authorization header, against endpoint paths that
 * do not exist on the server — which is one reason that screen never showed
 * anything.
 */

export interface PreselectionCandidateRow {
  applicationId: string;
  candidateId: string;

  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;

  position: string;
  headline: string | null;
  summary: string | null;
  location: string;
  wilaya: string | null;
  experience: number;
  skills: string[];
  /** How many they listed in all, when the list above was capped. */
  skillsTotal: number;
  availableNow: boolean;
  desiredSalary: number | null;

  /** Pulled out of the CV document: the last thing they did, the highest
   *  thing they studied. */
  lastRole: string | null;
  education: string | null;
  languages: string[];

  links: {
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
  };

  cvUrl: string | null;
  hasCv: boolean;
  hasPresentation: boolean;
  coverLetter: string | null;

  aiScore: number;
  quizScore: number | null;
  oralPresentationScore: number | null;
  finalScore: number | null;
  preselectionScore: number | null;

  /** Why the score is what it is. */
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];

  status: string;
  preselectionStatus: string;
  isPreselected: boolean;
  preselectionComment: string | null;

  appliedAt: string;
  updatedAt: string;
}

export interface PreselectionOfferCounts {
  total: number;
  preselected: number;
  pending: number;
  shortlisted: number;
  interview: number;
  hired: number;
  rejected: number;
  withCv: number;
  /** Null when nothing in this offer has been scored yet, never 0. */
  averageScore: number | null;
}

export interface PreselectionOffer {
  id: string;
  title: string;
  location: string;
  wilaya: string | null;
  type: string;
  status: string;
  sector: string | null;
  publishedAt: string | null;
  expired: boolean;
  counts: PreselectionOfferCounts;
  candidates: PreselectionCandidateRow[];
}

export interface PreselectionByOfferResult {
  offers: PreselectionOffer[];
  totals: {
    offers: number;
    offersWithCandidates: number;
    candidates: number;
    preselected: number;
    pending: number;
    shortlisted: number;
    interview: number;
    hired: number;
    rejected: number;
    averageScore: number | null;
  };
}

export interface PreselectionByOfferFilters {
  jobId?: string;
  /** Narrows the candidates; the offers stay listed either way. */
  status?: string;
  preselectedOnly?: boolean;
  q?: string;
}

const preselectionByOfferService = {
  list: async (
    filters: PreselectionByOfferFilters = {}
  ): Promise<PreselectionByOfferResult> => {
    const params: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") params[k] = v as never;
    }

    const { data } = await api.get("/preselection/recruiter/by-offer", { params });
    return data.data;
  },

  /** Marks a candidate for this offer. */
  shortlist: (applicationId: string) =>
    api.patch(`/preselection/application/${applicationId}/shortlist`),

  reject: (applicationId: string) =>
    api.patch(`/preselection/application/${applicationId}/reject`),

  comment: (applicationId: string, comment: string) =>
    api.patch(`/preselection/application/${applicationId}/comment`, { comment }),
};

export default preselectionByOfferService;
