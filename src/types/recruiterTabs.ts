/**
 * Recruiter subscription plans.
 */
export type RecruiterPlan =
  | "FREE"
  | "PAID"
  | "CORPORATE";

/**
 * Identifiers for all recruiter navigation tabs.
 */
export type RecruiterTabId =
  | "dashboard"
  | "jobs"
  | "applications"
  | "ai-filter"
  | "cv-directory"
  | "oral-presentations"
  | "quiz-results"
  | "preselection";

/**
 * Route associated with a recruiter tab.
 */
export interface RecruiterTabRoute {
  /**
   * Internal identifier.
   */
  id: RecruiterTabId;

  /**
   * Display label.
   */
  label: string;

  /**
   * URL path.
   */
  path: string;

  /**
   * Optional Lucide icon name.
   * The actual icon is resolved by the UI component.
   */
  icon?: string;

  /**
   * Plans allowed to access this tab.
   */
  allowedPlans: RecruiterPlan[];

  /**
   * Optional badge (e.g. "New", "Beta").
   */
  badge?: string;

  /**
   * Whether the tab should be visible in navigation.
   */
  visible?: boolean;

  /**
   * Optional ordering index.
   */
  order?: number;
}

/**
 * Props for the recruiter navigation component.
 */
export interface RecruiterNavigationProps {
  /**
   * Current recruiter subscription plan.
   */
  plan: RecruiterPlan;

  /**
   * Currently active tab.
   */
  activeTab?: RecruiterTabId;

  /**
   * Callback fired when a tab is selected.
   */
  onTabChange?: (tab: RecruiterTabRoute) => void;
}

/**
 * Props for an individual recruiter tab.
 */
export interface RecruiterTabProps {
  /**
   * Tab definition.
   */
  tab: RecruiterTabRoute;

  /**
   * Whether this tab is currently active.
   */
  active?: boolean;

  /**
   * Click handler.
   */
  onClick?: (tab: RecruiterTabRoute) => void;
}