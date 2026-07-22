import {
  RecruiterPlan,
  RecruiterTabId,
  RecruiterTabRoute,
} from "../types/recruiterTabs";

import {
  RECRUITER_TABS,
  DEFAULT_RECRUITER_ROUTE,
} from "../constants/recruiterTabs";

/**
 * Returns all tabs available for a recruiter plan.
 */
export const getRecruiterTabs = (
  plan: RecruiterPlan
): RecruiterTabRoute[] => {
  return RECRUITER_TABS
    .filter(
      (tab) =>
        tab.visible !== false &&
        tab.allowedPlans.includes(plan)
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};

/**
 * Returns a tab by its identifier.
 */
export const getRecruiterTab = (
  id: RecruiterTabId
): RecruiterTabRoute | undefined => {
  return RECRUITER_TABS.find(
    (tab) => tab.id === id
  );
};

/**
 * Returns a tab by its route.
 */
export const getRecruiterTabByPath = (
  path: string
): RecruiterTabRoute | undefined => {
  return RECRUITER_TABS.find(
    (tab) => tab.path === path
  );
};

/**
 * Checks whether a recruiter can access a tab.
 */
export const canAccessRecruiterTab = (
  plan: RecruiterPlan,
  tabId: RecruiterTabId
): boolean => {
  const tab = getRecruiterTab(tabId);

  if (!tab) {
    return false;
  }

  return tab.allowedPlans.includes(plan);
};

/**
 * Returns the first accessible route
 * for a recruiter plan.
 */
export const getDefaultRecruiterRoute = (
  plan: RecruiterPlan
): string => {
  const tabs = getRecruiterTabs(plan);

  if (tabs.length === 0) {
    return DEFAULT_RECRUITER_ROUTE;
  }

  return tabs[0].path;
};

/**
 * Returns the first accessible tab.
 */
export const getDefaultRecruiterTab = (
  plan: RecruiterPlan
): RecruiterTabRoute | undefined => {
  return getRecruiterTabs(plan)[0];
};

/**
 * Checks if a route belongs to
 * the current recruiter plan.
 */
export const isRecruiterRouteAccessible = (
  plan: RecruiterPlan,
  path: string
): boolean => {
  const tab = getRecruiterTabByPath(path);

  if (!tab) {
    return false;
  }

  return tab.allowedPlans.includes(plan);
};

/**
 * Returns the next accessible tab.
 */
export const getNextRecruiterTab = (
  plan: RecruiterPlan,
  currentTab: RecruiterTabId
): RecruiterTabRoute | undefined => {
  const tabs = getRecruiterTabs(plan);

  const currentIndex = tabs.findIndex(
    (tab) => tab.id === currentTab
  );

  if (
    currentIndex === -1 ||
    currentIndex === tabs.length - 1
  ) {
    return undefined;
  }

  return tabs[currentIndex + 1];
};

/**
 * Returns the previous accessible tab.
 */
export const getPreviousRecruiterTab = (
  plan: RecruiterPlan,
  currentTab: RecruiterTabId
): RecruiterTabRoute | undefined => {
  const tabs = getRecruiterTabs(plan);

  const currentIndex = tabs.findIndex(
    (tab) => tab.id === currentTab
  );

  if (currentIndex <= 0) {
    return undefined;
  }

  return tabs[currentIndex - 1];
};

/**
 * Returns true if the supplied tab
 * is active.
 */
export const isActiveRecruiterTab = (
  activeTab: RecruiterTabId | undefined,
  tabId: RecruiterTabId
): boolean => {
  return activeTab === tabId;
};

/**
 * Returns all recruiter routes.
 */
export const getRecruiterRoutes = (): string[] => {
  return RECRUITER_TABS.map(
    (tab) => tab.path
  );
};

/**
 * Groups tabs by recruiter plan.
 */
export const getRecruiterTabsByPlan = () => ({
  FREE: getRecruiterTabs("FREE"),
  PAID: getRecruiterTabs("PAID"),
  CORPORATE: getRecruiterTabs("CORPORATE"),
});