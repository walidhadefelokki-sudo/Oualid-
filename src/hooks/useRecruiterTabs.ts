import { useMemo } from "react";

import {
  RecruiterPlan,
  RecruiterTabId,
} from "../types/recruiterTabs";

import {
  getRecruiterTabs,
  getRecruiterTab,
  getDefaultRecruiterRoute,
  getDefaultRecruiterTab,
  canAccessRecruiterTab,
  getNextRecruiterTab,
  getPreviousRecruiterTab,
  isActiveRecruiterTab,
} from "../utils/recruiterTabs";

interface UseRecruiterTabsProps {
  plan: RecruiterPlan;
  activeTab?: RecruiterTabId;
}

const useRecruiterTabs = ({
  plan,
  activeTab,
}: UseRecruiterTabsProps) => {
  /**
   * Tabs available for the current recruiter plan.
   */
  const tabs = useMemo(() => {
    return getRecruiterTabs(plan);
  }, [plan]);

  /**
   * Current active tab.
   */
  const currentTab = useMemo(() => {
    if (!activeTab) {
      return getDefaultRecruiterTab(plan);
    }

    return getRecruiterTab(activeTab);
  }, [plan, activeTab]);

  /**
   * Default route.
   */
  const defaultRoute = useMemo(() => {
    return getDefaultRecruiterRoute(plan);
  }, [plan]);

  /**
   * Check if a recruiter can access a tab.
   */
  const canAccess = (
    tabId: RecruiterTabId
  ): boolean => {
    return canAccessRecruiterTab(plan, tabId);
  };

  /**
   * Check whether a tab is active.
   */
  const isActive = (
    tabId: RecruiterTabId
  ): boolean => {
    return isActiveRecruiterTab(activeTab, tabId);
  };

  /**
   * Get next accessible tab.
   */
  const nextTab = useMemo(() => {
    if (!activeTab) return undefined;

    return getNextRecruiterTab(
      plan,
      activeTab
    );
  }, [plan, activeTab]);

  /**
   * Get previous accessible tab.
   */
  const previousTab = useMemo(() => {
    if (!activeTab) return undefined;

    return getPreviousRecruiterTab(
      plan,
      activeTab
    );
  }, [plan, activeTab]);

  return {
    /**
     * Navigation
     */
    tabs,

    currentTab,

    defaultRoute,

    /**
     * Helpers
     */
    canAccess,

    isActive,

    /**
     * Navigation helpers
     */
    nextTab,

    previousTab,
  };
};

export default useRecruiterTabs;