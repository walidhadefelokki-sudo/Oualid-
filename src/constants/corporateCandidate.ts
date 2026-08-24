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
    label: "Tous",
  },
  {
    value: "pending",
    label: "En attente",
  },
  {
    value: "reviewing",
    label: "En cours d'examen",
  },
  {
    value: "preselected",
    label: "Présélectionné",
  },
  {
    value: "approved",
    label: "Approuvé",
  },
  {
    value: "rejected",
    label: "Rejeté",
  },
] as const;

/**
 * Available sorting options.
 */
export const CORPORATE_SORT_OPTIONS = [
  {
    value: "priority",
    label: "⭐ Présélectionnés d'abord",
  },
  {
    value: "aiScore",
    label: "Meilleur score IA",
  },
  {
    value: "name",
    label: "Nom du candidat",
  },
  {
    value: "experience",
    label: "Expérience",
  },
  {
    value: "newest",
    label: "Candidatures les plus récentes",
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
  total: "Total des candidats",

  preselected: "Présélectionnés",

  pending: "En attente",

  approved: "Approuvés",

  rejected: "Rejetés",

  averageAIScore: "Score IA moyen",
} as const;

/**
 * Empty state.
 */
export const CORPORATE_EMPTY_STATE = {
  title: "Aucun candidat trouvé",

  description:
    "Aucun candidat ne correspond actuellement aux filtres sélectionnés.",
};

/**
 * Loading message.
 */
export const CORPORATE_LOADING_MESSAGE =
  "Chargement des candidats...";

/**
 * Success messages.
 */
export const CORPORATE_SUCCESS_MESSAGES = {
  refreshed:
    "Liste des candidats actualisée avec succès.",

  sorted:
    "Candidats triés avec succès.",
};

/**
 * Error messages.
 */
export const CORPORATE_ERROR_MESSAGES = {
  load:
    "Impossible de charger les candidats.",

  refresh:
    "Impossible d'actualiser la liste des candidats.",

  sort:
    "Impossible de trier les candidats.",
};