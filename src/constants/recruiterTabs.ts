import {
  RecruiterTabRoute,
} from "../types/recruiterTabs";

/**
 * Recruiter navigation tabs.
 *
 * Visibility is determined by the allowedPlans property.
 */
export const RECRUITER_TABS: RecruiterTabRoute[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/recruiter/dashboard",
    icon: "LayoutDashboard",
    allowedPlans: ["FREE", "PAID", "CORPORATE"],
    order: 1,
    visible: true,
  },

  {
    id: "jobs",
    label: "Mes offres",
    path: "/recruiter/jobs",
    icon: "Briefcase",
    allowedPlans: ["FREE", "PAID", "CORPORATE"],
    order: 2,
    visible: true,
  },

  {
    id: "applications",
    label: "Candidatures",
    path: "/recruiter/applications",
    icon: "Users",
    allowedPlans: ["FREE", "PAID", "CORPORATE"],
    order: 3,
    visible: true,
  },

  {
    id: "ai-filter",
    label: "Filtrage IA",
    path: "/recruiter/ai-filter",
    icon: "Brain",
    allowedPlans: ["PAID", "CORPORATE"],
    order: 4,
    visible: true,
  },

  {
    id: "cv-directory",
    label: "Répertoire CV",
    path: "/recruiter/cv-directory",
    icon: "FolderOpen",
    allowedPlans: ["PAID", "CORPORATE"],
    order: 5,
    visible: true,
  },

  {
    id: "oral-presentations",
    label: "Présentation orale",
    path: "/recruiter/oral-presentations",
    icon: "Mic",
    allowedPlans: ["CORPORATE"],
    order: 6,
    visible: true,
  },

  {
    id: "quiz-results",
    label: "Résultats Quiz",
    path: "/recruiter/quiz-results",
    icon: "ClipboardCheck",
    allowedPlans: ["CORPORATE"],
    order: 7,
    visible: true,
  },

  {
    id: "preselection",
    label: "Préselection",
    path: "/recruiter/preselection",
    icon: "Star",
    allowedPlans: ["CORPORATE"],
    order: 8,
    visible: true,
  },
];

/**
 * Tabs available for each recruiter plan.
 */
export const FREE_RECRUITER_TABS = RECRUITER_TABS.filter(
  (tab) => tab.allowedPlans.includes("FREE")
);

export const PAID_RECRUITER_TABS = RECRUITER_TABS.filter(
  (tab) => tab.allowedPlans.includes("PAID")
);

export const CORPORATE_RECRUITER_TABS =
  RECRUITER_TABS.filter((tab) =>
    tab.allowedPlans.includes("CORPORATE")
  );

/**
 * Default landing page.
 */
export const DEFAULT_RECRUITER_ROUTE =
  "/recruiter/dashboard";

/**
 * Default active tab.
 */
export const DEFAULT_RECRUITER_TAB = "dashboard";

/**
 * Navigation animation.
 */
export const TAB_TRANSITION =
  "transition-all duration-200";

/**
 * Active tab styling.
 */
export const ACTIVE_TAB_CLASS =
  "bg-indigo-600 text-white shadow-md";

/**
 * Inactive tab styling.
 */
export const INACTIVE_TAB_CLASS =
  "text-slate-700 hover:bg-slate-100";

/**
 * Optional badges shown in the sidebar.
 */
export const TAB_BADGES = {
  "oral-presentations": "NEW",
  "quiz-results": "AI",
  preselection: "PRO",
} as const;