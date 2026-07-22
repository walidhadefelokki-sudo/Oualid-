import { useCallback, useEffect, useMemo, useState } from "react";

import preselectionService from "../services/preselection.service";

import {
  PreselectionCandidate,
  PreselectionFilters,
  PreselectionStatistics,
  ReviewRequest,
} from "../types/preselection";

import {
  DEFAULT_FILTERS,
} from "../constants/preselection";

import {
  filterCandidates,
  paginateCandidates,
  getTotalPages,
  PreselectionSort,
} from "../utils/preselectionFilters";

export function usePreselection() {

  /////////////////////////////////////////////////////////////
  // STATE
  /////////////////////////////////////////////////////////////

  const [candidates, setCandidates] =

    useState<PreselectionCandidate[]>([]);

  const [statistics, setStatistics] =

    useState<PreselectionStatistics | null>(null);

  const [filters, setFilters] =

    useState<PreselectionFilters>(DEFAULT_FILTERS);

  const [sort, setSort] =

    useState<PreselectionSort>("ai");

  const [page, setPage] =

    useState(1);

  const [pageSize, setPageSize] =

    useState(10);

  const [loading, setLoading] =

    useState(false);

  const [error, setError] =

    useState<string | null>(null);

  /////////////////////////////////////////////////////////////
  // LOAD
  /////////////////////////////////////////////////////////////

  const loadCandidates = useCallback(async () => {

    try {

      setLoading(true);

      setError(null);

      const response =

        await preselectionService.getCandidates();

      setCandidates(response.candidates);

      setStatistics(response.statistics);

    } catch (err: any) {

      setError(

        err?.response?.data?.message ||

        err?.message ||

        "Unable to load candidates."

      );

    } finally {

      setLoading(false);

    }

  }, []);

  /////////////////////////////////////////////////////////////
  // INITIAL LOAD
  /////////////////////////////////////////////////////////////

  useEffect(() => {

    loadCandidates();

  }, [loadCandidates]);

  /////////////////////////////////////////////////////////////
  // FILTERED
  /////////////////////////////////////////////////////////////

  const filteredCandidates = useMemo(() => {

    return filterCandidates(

      candidates,

      filters,

      sort

    );

  }, [

    candidates,

    filters,

    sort,

  ]);

  /////////////////////////////////////////////////////////////
  // PAGINATED
  /////////////////////////////////////////////////////////////

  const paginatedCandidates = useMemo(() => {

    return paginateCandidates(

      filteredCandidates,

      page,

      pageSize

    );

  }, [

    filteredCandidates,

    page,

    pageSize,

  ]);

  /////////////////////////////////////////////////////////////
  // TOTAL PAGES
  /////////////////////////////////////////////////////////////

  const totalPages = useMemo(() => {

    return getTotalPages(

      filteredCandidates.length,

      pageSize

    );

  }, [

    filteredCandidates,

    pageSize,

  ]);

  /////////////////////////////////////////////////////////////
  // FILTERS
  /////////////////////////////////////////////////////////////

  const updateFilters = (

    values: Partial<PreselectionFilters>

  ) => {

    setPage(1);

    setFilters(previous => ({

      ...previous,

      ...values,

    }));

  };

  /////////////////////////////////////////////////////////////
  // RESET FILTERS
  /////////////////////////////////////////////////////////////

  const resetFilters = () => {

    setPage(1);

    setFilters(DEFAULT_FILTERS);

  };

  /////////////////////////////////////////////////////////////
  // SORT
  /////////////////////////////////////////////////////////////

  const updateSort = (

    value: PreselectionSort

  ) => {

    setSort(value);

  };

  /////////////////////////////////////////////////////////////
  // APPROVE
  /////////////////////////////////////////////////////////////

  const approveCandidate = async (

    request: ReviewRequest

  ) => {

    await preselectionService.approve(

      request

    );

    await loadCandidates();

  };

  /////////////////////////////////////////////////////////////
  // REJECT
  /////////////////////////////////////////////////////////////

  const rejectCandidate = async (

    request: ReviewRequest

  ) => {

    await preselectionService.reject(

      request

    );

    await loadCandidates();

  };

  /////////////////////////////////////////////////////////////
  // COMMENT
  /////////////////////////////////////////////////////////////

  const saveComment = async (

    request: ReviewRequest

  ) => {

    await preselectionService.saveComment(

      request

    );

    await loadCandidates();

  };

  /////////////////////////////////////////////////////////////
  // REFRESH
  /////////////////////////////////////////////////////////////

  const refresh = async () => {

    await loadCandidates();

  };

  /////////////////////////////////////////////////////////////
  // RETURN
  /////////////////////////////////////////////////////////////

  return {

    ///////////////////////////////////////////////////////////
    // DATA
    ///////////////////////////////////////////////////////////

    candidates,

    filteredCandidates,

    paginatedCandidates,

    statistics,

    ///////////////////////////////////////////////////////////
    // STATE
    ///////////////////////////////////////////////////////////

    filters,

    sort,

    page,

    pageSize,

    totalPages,

    loading,

    error,

    ///////////////////////////////////////////////////////////
    // SETTERS
    ///////////////////////////////////////////////////////////

    setPage,

    setPageSize,

    updateSort,

    updateFilters,

    resetFilters,

    ///////////////////////////////////////////////////////////
    // ACTIONS
    ///////////////////////////////////////////////////////////

    approveCandidate,

    rejectCandidate,

    saveComment,

    refresh,

    reload: loadCandidates,

  };

}

export default usePreselection;