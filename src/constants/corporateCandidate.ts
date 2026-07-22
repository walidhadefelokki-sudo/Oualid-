import {
  CorporateCandidateFilters,
  CorporateCandidateSort,
} from "../types/corporateCandidate";

/**
 * Default sorting used by Corporate recruiters.
 */
export const DEFAULT_CORPORATE_SORT: CorporateCandidateSort =
  "priority";

/**
 * Default filters.
 */
export const DEFAULT_CORPORATE_FILTERS: CorporateCandidateFilters =
  {
    search: "",
    preselectedOnly: false,
    minimumAIScore: 0,
    status: "",
  };

/**
 * Candidate statuses.
 */
export const CORPORATE_CANDIDATE_STATUSES = [
  {
    value: "",
    label: "All",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "reviewing",
    label: "Reviewing",
  },
  {
    value: "preselected",
    label: "Preselected",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
] as const;

/**
 * Available sorting options.
 */
export const CORPORATE_SORT_OPTIONS = [
  {
    value: "priority",
    label: "⭐ Preselected First",
  },
  {
    value: "aiScore",
    label: "Highest AI Score",
  },
  {
    value: "name",
    label: "Candidate Name",
  },
  {
    value: "experience",
    label: "Experience",
  },
  {
    value: "newest",
    label: "Newest Applications",
  },
] as const;

/**
 * Colors used for application statuses.
 */
export const CORPORATE_STATUS_COLORS: Record<
  string,
  string
> = {
  pending:
    "bg-yellow-100 text-yellow-800 border-yellow-200",

  reviewing:
    "bg-blue-100 text-blue-800 border-blue-200",

  preselected:
    "bg-amber-100 text-amber-800 border-amber-300",

  approved:
    "bg-green-100 text-green-800 border-green-200",

  rejected:
    "bg-red-100 text-red-800 border-red-200",
};

/**
 * Default page size.
 */
export const CORPORATE_PAGE_SIZE = 20;

/**
 * Maximum page size.
 */
export const CORPORATE_MAX_PAGE_SIZE = 100;

/**
 * Default AI score threshold.
 */
export const DEFAULT_AI_SCORE = 70;

/**
 * Dashboard labels.
 */
export const CORPORATE_STAT_LABELS = {
  total: "Total Candidates",

  preselected: "Preselected",

  pending: "Pending",

  approved: "Approved",

  rejected: "Rejected",

  averageAIScore: "Average AI Score",
} as const;

/**
 * Empty state.
 */
export const CORPORATE_EMPTY_STATE = {
  title: "No Candidates Found",

  description:
    "There are currently no candidates matching the selected filters.",
};

/**
 * Loading message.
 */
export const CORPORATE_LOADING_MESSAGE =
  "Loading candidates...";

/**
 * Success messages.
 */
export const CORPORATE_SUCCESS_MESSAGES = {
  refreshed:
    "Candidate list refreshed successfully.",

  sorted:
    "Candidates sorted successfully.",
};

/**
 * Error messages.
 */
export const CORPORATE_ERROR_MESSAGES = {
  load:
    "Unable to load candidates.",

  refresh:
    "Unable to refresh candidate list.",

  sort:
    "Unable to sort candidates.",
};