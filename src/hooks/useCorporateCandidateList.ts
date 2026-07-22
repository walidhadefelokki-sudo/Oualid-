import { useMemo, useState } from "react";

import {
  CorporateCandidate,
  CorporateCandidateFilters,
  CorporateCandidateSort,
} from "../types/corporateCandidate";

import {
  DEFAULT_CORPORATE_FILTERS,
  DEFAULT_CORPORATE_SORT,
} from "../constants/corporateCandidate";

import {
  prepareCorporateCandidateList,
  calculateCorporateStatistics,
} from "../utils/corporateCandidateSort";

interface UseCorporateCandidateListProps {
  candidates: CorporateCandidate[];
}

const useCorporateCandidateList = ({
  candidates,
}: UseCorporateCandidateListProps) => {
  const [filters, setFilters] =
    useState<CorporateCandidateFilters>(
      DEFAULT_CORPORATE_FILTERS
    );

  const [sort, setSort] =
    useState<CorporateCandidateSort>(
      DEFAULT_CORPORATE_SORT
    );

  /**
   * Filtered + sorted candidates
   */
  const candidateList = useMemo(() => {
    return prepareCorporateCandidateList(
      candidates,
      filters,
      sort
    );
  }, [candidates, filters, sort]);

  /**
   * Dashboard statistics
   */
  const statistics = useMemo(() => {
    return calculateCorporateStatistics(candidateList);
  }, [candidateList]);

  /**
   * Total results after filtering
   */
  const total = candidateList.length;

  /**
   * Update one or more filters
   */
  const updateFilters = (
    values: Partial<CorporateCandidateFilters>
  ) => {
    setFilters((previous) => ({
      ...previous,
      ...values,
    }));
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setFilters(DEFAULT_CORPORATE_FILTERS);
  };

  /**
   * Search helper
   */
  const setSearch = (search: string) => {
    updateFilters({ search });
  };

  /**
   * Filter by status
   */
  const setStatus = (status: string) => {
    updateFilters({ status });
  };

  /**
   * Filter by AI score
   */
  const setMinimumAIScore = (
    minimumAIScore: number
  ) => {
    updateFilters({ minimumAIScore });
  };

  /**
   * Toggle preselected-only mode
   */
  const togglePreselectedOnly = () => {
    updateFilters({
      preselectedOnly:
        !filters.preselectedOnly,
    });
  };

  /**
   * Change sorting mode
   */
  const updateSort = (
    value: CorporateCandidateSort
  ) => {
    setSort(value);
  };

  return {
    /**
     * Data
     */
    candidates: candidateList,

    statistics,

    total,

    /**
     * State
     */
    filters,

    sort,

    /**
     * Actions
     */
    updateFilters,

    resetFilters,

    updateSort,

    setSearch,

    setStatus,

    setMinimumAIScore,

    togglePreselectedOnly,
  };
};

export default useCorporateCandidateList;