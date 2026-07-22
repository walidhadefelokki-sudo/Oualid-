import {
  PreselectionFilters,
  PreselectionStatus,
} from "../types/preselection";

///////////////////////////////////////////////////////////////
// PAGINATION
///////////////////////////////////////////////////////////////

export const PAGE_SIZE = 10;

///////////////////////////////////////////////////////////////
// DEFAULT FILTERS
///////////////////////////////////////////////////////////////

export const DEFAULT_FILTERS: PreselectionFilters = {

  status: "",

  reviewer: "",

  minimumAIScore: 0,

  location: "",

  search: "",

};

///////////////////////////////////////////////////////////////
// STATUS
///////////////////////////////////////////////////////////////

export const PRESELECTION_STATUSES: {
  value: PreselectionStatus;
  label: string;
}[] = [

  {
    value: "PENDING",
    label: "Pending",
  },

  {
    value: "UNDER_REVIEW",
    label: "Under Review",
  },

  {
    value: "APPROVED",
    label: "Approved",
  },

  {
    value: "REJECTED",
    label: "Rejected",
  },

  {
    value: "NEEDS_REVIEW",
    label: "Needs Review",
  },

];

///////////////////////////////////////////////////////////////
// STATUS COLORS
///////////////////////////////////////////////////////////////

export const STATUS_COLORS = {

  PENDING: "bg-yellow-100 text-yellow-800",

  UNDER_REVIEW: "bg-blue-100 text-blue-800",

  APPROVED: "bg-green-100 text-green-800",

  REJECTED: "bg-red-100 text-red-800",

  NEEDS_REVIEW: "bg-orange-100 text-orange-800",

};

///////////////////////////////////////////////////////////////
// STATUS BADGE COLORS
///////////////////////////////////////////////////////////////

export const STATUS_BORDER_COLORS = {

  PENDING: "border-yellow-300",

  UNDER_REVIEW: "border-blue-300",

  APPROVED: "border-green-300",

  REJECTED: "border-red-300",

  NEEDS_REVIEW: "border-orange-300",

};

///////////////////////////////////////////////////////////////
// AI SCORE THRESHOLDS
///////////////////////////////////////////////////////////////

export const AI_THRESHOLDS = {

  excellent: 90,

  good: 80,

  average: 70,

  low: 60,

};

///////////////////////////////////////////////////////////////
// AUTO PRESELECTION
///////////////////////////////////////////////////////////////

export const AUTO_PRESELECTION_SCORE = 85;

///////////////////////////////////////////////////////////////
// COMMENT TEMPLATES
///////////////////////////////////////////////////////////////

export const COMMENT_TEMPLATES = [

  "Preselected by Dar L'emploi.",

  "Excellent technical profile.",

  "Strong communication skills.",

  "Recommended for client interview.",

  "Excellent quiz performance.",

  "Outstanding AI evaluation.",

  "Needs additional technical assessment.",

  "Insufficient experience for this position.",

  "Presentation quality needs improvement.",

];

///////////////////////////////////////////////////////////////
// DASHBOARD CARDS
///////////////////////////////////////////////////////////////

export const DASHBOARD_CARDS = [

  {

    key: "pending",

    title: "Pending Reviews",

  },

  {

    key: "approved",

    title: "Approved",

  },

  {

    key: "rejected",

    title: "Rejected",

  },

  {

    key: "needsReview",

    title: "Needs Review",

  },

];

///////////////////////////////////////////////////////////////
// TABLE COLUMNS
///////////////////////////////////////////////////////////////

export const TABLE_COLUMNS = [

  "Rank",

  "Candidate",

  "AI Score",

  "Quiz",

  "Presentation",

  "Reviewer",

  "Status",

  "Comment",

  "Actions",

];

///////////////////////////////////////////////////////////////
// REVIEW ACTIONS
///////////////////////////////////////////////////////////////

export const REVIEW_ACTIONS = {

  APPROVE: "approve",

  REJECT: "reject",

  COMMENT: "comment",

};

///////////////////////////////////////////////////////////////
// API ENDPOINTS
///////////////////////////////////////////////////////////////

export const PRESELECTION_ENDPOINTS = {

  LIST: "/preselection",

  DETAILS: "/preselection",

  APPROVE: "/preselection/approve",

  REJECT: "/preselection/reject",

  COMMENT: "/preselection/comment",

  HISTORY: "/preselection/history",

  STATISTICS: "/preselection/statistics",

};

///////////////////////////////////////////////////////////////
// EMPTY STATE
///////////////////////////////////////////////////////////////

export const EMPTY_MESSAGE =

  "No candidates waiting for preselection.";

///////////////////////////////////////////////////////////////
// LOADING
///////////////////////////////////////////////////////////////

export const LOADING_MESSAGE =

  "Loading candidates for review...";

///////////////////////////////////////////////////////////////
// SUCCESS MESSAGES
///////////////////////////////////////////////////////////////

export const SUCCESS_MESSAGES = {

  APPROVED: "Candidate approved successfully.",

  REJECTED: "Candidate rejected successfully.",

  COMMENT_SAVED: "Comment saved successfully.",

};

///////////////////////////////////////////////////////////////
// ERROR MESSAGES
///////////////////////////////////////////////////////////////

export const ERROR_MESSAGES = {

  LOAD: "Unable to load candidates.",

  APPROVE: "Unable to approve candidate.",

  REJECT: "Unable to reject candidate.",

  COMMENT: "Unable to save comment.",

};

///////////////////////////////////////////////////////////////
// DATE FORMAT
///////////////////////////////////////////////////////////////

export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {

  year: "numeric",

  month: "short",

  day: "numeric",

};

///////////////////////////////////////////////////////////////
// DEFAULT COMMENT
///////////////////////////////////////////////////////////////

export const DEFAULT_PRESELECTION_COMMENT =

  "Preselected by Dar L'emploi.";

///////////////////////////////////////////////////////////////
// MAX COMMENT LENGTH
///////////////////////////////////////////////////////////////

export const MAX_COMMENT_LENGTH = 500;