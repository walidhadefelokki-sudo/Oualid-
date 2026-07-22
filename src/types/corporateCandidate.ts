/**
 * Represents a candidate application displayed in the
 * Corporate Candidate List.
 */
export interface CorporateCandidate {
  /**
   * Application identifier.
   */
  id: string;

  /**
   * Candidate identifier.
   */
  candidateId: string;

  /**
   * Candidate full name.
   */
  fullName: string;

  /**
   * Candidate email.
   */
  email: string;

  /**
   * Optional avatar.
   */
  avatarUrl?: string | null;

  /**
   * Position applied for.
   */
  jobTitle?: string;

  /**
   * AI evaluation score (0–100).
   */
  aiScore: number;

  /**
   * Years of experience.
   */
  experience?: number;

  /**
   * Indicates whether the candidate has been
   * preselected by the recruitment team.
   */
  isPreselected: boolean;

  /**
   * Candidate application status.
   */
  status:
    | "pending"
    | "reviewing"
    | "preselected"
    | "approved"
    | "rejected";

  /**
   * Date the application was submitted.
   */
  appliedAt: string | Date;

  /**
   * Recruiter who reviewed the candidate.
   */
  reviewer?: string;

  /**
   * Optional recruiter comment.
   */
  comment?: string;
}

/**
 * Sorting modes available for the Corporate
 * Candidate List.
 */
export type CorporateCandidateSort =
  | "priority"
  | "aiScore"
  | "name"
  | "experience"
  | "newest";

/**
 * Filters used by the Corporate Candidate List.
 */
export interface CorporateCandidateFilters {
  /**
   * Search by name or email.
   */
  search: string;

  /**
   * Filter only preselected candidates.
   */
  preselectedOnly: boolean;

  /**
   * Minimum AI score.
   */
  minimumAIScore: number;

  /**
   * Application status.
   */
  status: string;
}

/**
 * Statistics displayed above the Corporate Candidate List.
 */
export interface CorporateCandidateStatistics {
  total: number;
  preselected: number;
  pending: number;
  approved: number;
  rejected: number;
  averageAIScore: number;
}

/**
 * Props for the CorporateCandidateList component.
 */
export interface CorporateCandidateListProps {
  candidates: CorporateCandidate[];
  loading?: boolean;
  recruiterRole?: string;
  onCandidateClick?: (
    candidate: CorporateCandidate
  ) => void;
}