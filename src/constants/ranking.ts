import {
  RankingFilters,
  RankingSort,
} from "../types/ranking";

///////////////////////////////////////////////////////////////
// PAGINATION
///////////////////////////////////////////////////////////////

export const PAGE_SIZE = 10;

export const MAX_COMPARE_CANDIDATES = 5;

///////////////////////////////////////////////////////////////
// DEFAULT SORT
///////////////////////////////////////////////////////////////

export const DEFAULT_SORT: RankingSort = "ai";

///////////////////////////////////////////////////////////////
// DEFAULT FILTERS
///////////////////////////////////////////////////////////////

export const DEFAULT_FILTERS: RankingFilters = {

  minimumAIScore: 0,

  minimumQuizScore: 0,

  minimumExperience: 0,

  status: "",

  skill: "",

  location: "",

  preselectedOnly: false,

  remoteOnly: false,

};

///////////////////////////////////////////////////////////////
// AI SCORE WEIGHTS
///////////////////////////////////////////////////////////////

export const AI_SCORE_WEIGHTS = {

  cv: 0.35,

  quiz: 0.25,

  presentation: 0.20,

  experience: 0.10,

  skills: 0.10,

};

///////////////////////////////////////////////////////////////
// SCORE THRESHOLDS
///////////////////////////////////////////////////////////////

export const SCORE_THRESHOLDS = {

  outstanding: 95,

  excellent: 90,

  veryGood: 80,

  good: 70,

  average: 60,

};

///////////////////////////////////////////////////////////////
// PRESELECTION
///////////////////////////////////////////////////////////////

export const PRESELECTION_SCORE = 85;

///////////////////////////////////////////////////////////////
// SCORE COLORS
///////////////////////////////////////////////////////////////

export const SCORE_COLORS = {

  outstanding: "text-green-600",

  excellent: "text-blue-600",

  veryGood: "text-cyan-600",

  good: "text-yellow-600",

  average: "text-orange-600",

  low: "text-red-600",

};

///////////////////////////////////////////////////////////////
// SCORE BACKGROUNDS
///////////////////////////////////////////////////////////////

export const SCORE_BACKGROUNDS = {

  outstanding: "bg-green-100",

  excellent: "bg-blue-100",

  veryGood: "bg-cyan-100",

  good: "bg-yellow-100",

  average: "bg-orange-100",

  low: "bg-red-100",

};

///////////////////////////////////////////////////////////////
// MEDAL COLORS
///////////////////////////////////////////////////////////////

export const MEDAL_COLORS = {

  gold: "#FFD700",

  silver: "#C0C0C0",

  bronze: "#CD7F32",

};

///////////////////////////////////////////////////////////////
// EXPERIENCE LEVELS
///////////////////////////////////////////////////////////////

export const EXPERIENCE_LEVELS = [

  {

    label: "Junior",

    min: 0,

    max: 1,

  },

  {

    label: "Intermediate",

    min: 2,

    max: 4,

  },

  {

    label: "Experienced",

    min: 5,

    max: 7,

  },

  {

    label: "Senior",

    min: 8,

    max: 10,

  },

  {

    label: "Expert",

    min: 11,

    max: 100,

  },

];

///////////////////////////////////////////////////////////////
// STATUS OPTIONS
///////////////////////////////////////////////////////////////

export const STATUS_OPTIONS = [

  {

    value: "",

    label: "All",

  },

  {

    value: "PENDING",

    label: "Pending",

  },

  {

    value: "REVIEWING",

    label: "Reviewing",

  },

  {

    value: "SHORTLISTED",

    label: "Shortlisted",

  },

  {

    value: "INTERVIEW",

    label: "Interview",

  },

  {

    value: "HIRED",

    label: "Hired",

  },

  {

    value: "REJECTED",

    label: "Rejected",

  },

];

///////////////////////////////////////////////////////////////
// SORT OPTIONS
///////////////////////////////////////////////////////////////

export const SORT_OPTIONS = [

  {

    value: "ai",

    label: "AI Score",

  },

  {

    value: "quiz",

    label: "Quiz Score",

  },

  {

    value: "experience",

    label: "Experience",

  },

  {

    value: "alphabetical",

    label: "Alphabetical",

  },

  {

    value: "newest",

    label: "Newest",

  },

] as const;

///////////////////////////////////////////////////////////////
// CHART COLORS
///////////////////////////////////////////////////////////////

export const CHART_COLORS = [

  "#173E7D",

  "#2154A6",

  "#3B82F6",

  "#10B981",

  "#F59E0B",

  "#EF4444",

  "#8B5CF6",

  "#06B6D4",

];

///////////////////////////////////////////////////////////////
// EXPORT FORMATS
///////////////////////////////////////////////////////////////

export const EXPORT_FORMATS = {

  PDF: "pdf",

  EXCEL: "excel",

};

///////////////////////////////////////////////////////////////
// AI LABELS
///////////////////////////////////////////////////////////////

export const AI_LABELS = {

  outstanding: "Outstanding",

  excellent: "Excellent",

  veryGood: "Very Good",

  good: "Good",

  average: "Average",

  low: "Needs Improvement",

};

///////////////////////////////////////////////////////////////
// DEFAULT ANALYTICS
///////////////////////////////////////////////////////////////

export const DEFAULT_ANALYTICS = {

  totalCandidates: 0,

  averageAI: 0,

  highestAI: 0,

  preselected: 0,

};

///////////////////////////////////////////////////////////////
// RECRUITER ACTIONS
///////////////////////////////////////////////////////////////

export const RECRUITER_ACTIONS = {

  VIEW: "view",

  COMPARE: "compare",

  PRESELECT: "preselect",

  REJECT: "reject",

  INTERVIEW: "interview",

  DOWNLOAD_CV: "download_cv",

  EXPORT_PDF: "export_pdf",

  EXPORT_EXCEL: "export_excel",

};

///////////////////////////////////////////////////////////////
// API ROUTES
///////////////////////////////////////////////////////////////

export const RANKING_ENDPOINTS = {

  LIST: "/ranking",

  JOB: "/ranking/job",

  CANDIDATE: "/ranking",

  SEARCH: "/ranking/search",

  RECALCULATE: "/ranking/recalculate",

  REFRESH: "/ranking/refresh",

  COMPARE: "/ranking/compare",

  PRESELECT: "/ranking/preselect",

  REJECT: "/ranking/reject",

  EXPORT_PDF: "/ranking/export/pdf",

  EXPORT_EXCEL: "/ranking/export/excel",

  STATISTICS: "/ranking/statistics",

  ANALYTICS: "/ranking/analytics",

};

///////////////////////////////////////////////////////////////
// EMPTY STATE
///////////////////////////////////////////////////////////////

export const EMPTY_RANKING_MESSAGE =

  "No ranked candidates available.";

///////////////////////////////////////////////////////////////
// LOADING MESSAGE
///////////////////////////////////////////////////////////////

export const LOADING_MESSAGE =

  "Calculating AI candidate ranking...";