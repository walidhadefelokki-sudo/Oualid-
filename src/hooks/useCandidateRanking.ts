import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import rankingService from "../services/ranking.service";

import {
  CandidateRanking,
  RankingFilters,
  RankingSort,
} from "../types/ranking";

import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  PAGE_SIZE,
} from "../constants/ranking";

///////////////////////////////////////////////////////////////
// HOOK
///////////////////////////////////////////////////////////////

export default function useCandidateRanking() {

  /////////////////////////////////////////////////////////////
  // STATE
  /////////////////////////////////////////////////////////////

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [applications, setApplications] =
    useState<CandidateRanking[]>([]);

  const [search, setSearch] =
    useState("");

  const [filters, setFilters] =
    useState<RankingFilters>(
      DEFAULT_FILTERS
    );

  const [sort, setSort] =
    useState<RankingSort>(
      DEFAULT_SORT
    );

  const [currentPage, setCurrentPage] =
    useState(1);

  const [selectedCandidates, setSelectedCandidates] =
    useState<string[]>([]);

  /////////////////////////////////////////////////////////////
  // LOAD
  /////////////////////////////////////////////////////////////

  const loadRanking =
    useCallback(async () => {

      try {

        setLoading(true);

        setError(null);

        const data =
          await rankingService.getRanking();

        setApplications(data);

      }

      catch (err) {

        console.error(err);

        setError(
          "Unable to load candidate ranking."
        );

      }

      finally {

        setLoading(false);

      }

    }, []);

  /////////////////////////////////////////////////////////////
  // INITIAL LOAD
  /////////////////////////////////////////////////////////////

  useEffect(() => {

    loadRanking();

  }, [loadRanking]);

  /////////////////////////////////////////////////////////////
  // REFRESH
  /////////////////////////////////////////////////////////////

  const refreshRanking =
    useCallback(async () => {

      try {

        setRefreshing(true);

        const data =
          await rankingService.recalculateRanking();

        setApplications(data);

      }

      catch (err) {

        console.error(err);

        setError(
          "Unable to refresh ranking."
        );

      }

      finally {

        setRefreshing(false);

      }

    }, []);

  /////////////////////////////////////////////////////////////
  // RESET
  /////////////////////////////////////////////////////////////

  const resetFilters =
    useCallback(() => {

      setFilters(
        DEFAULT_FILTERS
      );

      setSearch("");

      setSort(
        DEFAULT_SORT
      );

      setCurrentPage(1);

    }, []);

  /////////////////////////////////////////////////////////////
  // UPDATE FILTER
  /////////////////////////////////////////////////////////////

  const updateFilters =
    useCallback(

      (
        value: RankingFilters
      ) => {

        setFilters(value);

        setCurrentPage(1);

      },

      []

    );

  /////////////////////////////////////////////////////////////
  // UPDATE SORT
  /////////////////////////////////////////////////////////////

  const updateSort =
    useCallback(

      (
        value: RankingSort
      ) => {

        setSort(value);

      },

      []

    );
      /////////////////////////////////////////////////////////////
  // FILTER + SORT
  /////////////////////////////////////////////////////////////

  const filteredCandidates =
    useMemo(() => {

      let list = [...applications];

      /////////////////////////////////////////////////////////
      // SEARCH
      /////////////////////////////////////////////////////////

      if (search.trim()) {

        const keyword =
          search.toLowerCase();

        list = list.filter(candidate =>

          candidate.fullName
            .toLowerCase()
            .includes(keyword)

          ||

          candidate.email
            .toLowerCase()
            .includes(keyword)

          ||

          candidate.skills?.some(skill =>

            skill
              .toLowerCase()
              .includes(keyword)

          )

        );

      }

      /////////////////////////////////////////////////////////
      // MIN AI SCORE
      /////////////////////////////////////////////////////////

      if (filters.minimumAIScore > 0) {

        list = list.filter(

          candidate =>

            candidate.aiScore >=
            filters.minimumAIScore

        );

      }

      /////////////////////////////////////////////////////////
      // MIN QUIZ SCORE
      /////////////////////////////////////////////////////////

      if (filters.minimumQuizScore > 0) {

        list = list.filter(

          candidate =>

            (candidate.quizScore ?? 0) >=
            filters.minimumQuizScore

        );

      }

      /////////////////////////////////////////////////////////
      // EXPERIENCE
      /////////////////////////////////////////////////////////

      if (filters.minimumExperience > 0) {

        list = list.filter(

          candidate =>

            candidate.experienceYears >=
            filters.minimumExperience

        );

      }

      /////////////////////////////////////////////////////////
      // STATUS
      /////////////////////////////////////////////////////////

      if (filters.status) {

        list = list.filter(

          candidate =>

            candidate.status ===
            filters.status

        );

      }

      /////////////////////////////////////////////////////////
      // LOCATION
      /////////////////////////////////////////////////////////

      if (filters.location) {

        const location =
          filters.location.toLowerCase();

        list = list.filter(candidate =>

          candidate.location
            ?.toLowerCase()
            .includes(location)

        );

      }

      /////////////////////////////////////////////////////////
      // SKILL
      /////////////////////////////////////////////////////////

      if (filters.skill) {

        const skill =
          filters.skill.toLowerCase();

        list = list.filter(candidate =>

          candidate.skills?.some(s =>

            s
              .toLowerCase()
              .includes(skill)

          )

        );

      }

      /////////////////////////////////////////////////////////
      // PRESELECTED
      /////////////////////////////////////////////////////////

      if (filters.preselectedOnly) {

        list = list.filter(

          candidate =>

            candidate.isPreselected

        );

      }

      /////////////////////////////////////////////////////////
      // REMOTE
      /////////////////////////////////////////////////////////

      if (filters.remoteOnly) {

        list = list.filter(

          candidate =>

            candidate.remote === true

        );

      }

      /////////////////////////////////////////////////////////
      // SORT
      /////////////////////////////////////////////////////////

      switch (sort) {

        case "ai":

          list.sort(

            (a, b) =>

              b.aiScore -
              a.aiScore

          );

          break;

        case "quiz":

          list.sort(

            (a, b) =>

              (b.quizScore ?? 0) -

              (a.quizScore ?? 0)

          );

          break;

        case "experience":

          list.sort(

            (a, b) =>

              b.experienceYears -

              a.experienceYears

          );

          break;

        case "alphabetical":

          list.sort(

            (a, b) =>

              a.fullName.localeCompare(

                b.fullName

              )

          );

          break;

        case "newest":

          list.sort(

            (a, b) =>

              new Date(
                b.appliedAt
              ).getTime()

              -

              new Date(
                a.appliedAt
              ).getTime()

          );

          break;

      }

      /////////////////////////////////////////////////////////
      // POSITION
      /////////////////////////////////////////////////////////

      return list.map(

        (

          candidate,

          index

        ) => ({

          ...candidate,

          rankingPosition:

            index + 1,

        })

      );

    },

    [

      applications,

      search,

      filters,

      sort,

    ]);

  /////////////////////////////////////////////////////////////
  // PAGINATION
  /////////////////////////////////////////////////////////////

  const totalPages =
    Math.max(

      1,

      Math.ceil(

        filteredCandidates.length /

        PAGE_SIZE

      )

    );

  const paginatedCandidates =
    useMemo(() => {

      const start =

        (currentPage - 1) *

        PAGE_SIZE;

      return filteredCandidates.slice(

        start,

        start + PAGE_SIZE

      );

    },

    [

      filteredCandidates,

      currentPage,

    ]);

  /////////////////////////////////////////////////////////////
  // STATISTICS
  /////////////////////////////////////////////////////////////

  const statistics =
    useMemo(() => {

      const total =
        filteredCandidates.length;

      const averageAI =

        total === 0

          ? 0

          : filteredCandidates.reduce(

              (sum, c) =>

                sum +

                c.aiScore,

              0

            ) / total;

      const highestAI =

        total === 0

          ? 0

          : Math.max(

              ...filteredCandidates.map(

                c => c.aiScore

              )

            );

      const preselected =

        filteredCandidates.filter(

          c =>

            c.isPreselected

        ).length;

      return {

        total,

        averageAI,

        highestAI,

        preselected,

      };

    },

    [

      filteredCandidates,

    ]);
      /////////////////////////////////////////////////////////////
  // SELECTION
  /////////////////////////////////////////////////////////////

  const toggleSelection =
    useCallback((id: string) => {

      setSelectedCandidates(previous => {

        if (previous.includes(id)) {

          return previous.filter(

            item => item !== id

          );

        }

        return [

          ...previous,

          id,

        ];

      });

    }, []);

  /////////////////////////////////////////////////////////////
  // SELECT ALL
  /////////////////////////////////////////////////////////////

  const selectAll =
    useCallback(() => {

      setSelectedCandidates(

        paginatedCandidates.map(

          candidate =>

            candidate.id

        )

      );

    },

    [

      paginatedCandidates,

    ]);

  /////////////////////////////////////////////////////////////
  // CLEAR SELECTION
  /////////////////////////////////////////////////////////////

  const clearSelection =
    useCallback(() => {

      setSelectedCandidates([]);

    }, []);

  /////////////////////////////////////////////////////////////
  // PRESELECT
  /////////////////////////////////////////////////////////////

  const preselectCandidate =
    useCallback(

      async (

        candidateId: string

      ) => {

        try {

          await rankingService.preselectCandidate(

            candidateId

          );

          await loadRanking();

        }

        catch (error) {

          console.error(error);

          setError(

            "Unable to preselect candidate."

          );

        }

      },

      [

        loadRanking,

      ]

    );

  /////////////////////////////////////////////////////////////
  // PRESELECT MULTIPLE
  /////////////////////////////////////////////////////////////

  const preselectSelected =
    useCallback(

      async () => {

        try {

          await Promise.all(

            selectedCandidates.map(

              id =>

                rankingService.preselectCandidate(

                  id

                )

            )

          );

          clearSelection();

          await loadRanking();

        }

        catch (error) {

          console.error(error);

          setError(

            "Unable to update selected candidates."

          );

        }

      },

      [

        selectedCandidates,

        clearSelection,

        loadRanking,

      ]

    );

  /////////////////////////////////////////////////////////////
  // COMPARE
  /////////////////////////////////////////////////////////////

  const compareCandidates =
    useCallback(() => {

      return applications.filter(

        candidate =>

          selectedCandidates.includes(

            candidate.id

          )

      );

    },

    [

      applications,

      selectedCandidates,

    ]);

  /////////////////////////////////////////////////////////////
  // EXPORT PDF
  /////////////////////////////////////////////////////////////

  const exportPDF =
    useCallback(async () => {

      try {

        await rankingService.exportPDF(

          filteredCandidates

        );

      }

      catch (error) {

        console.error(error);

      }

    },

    [

      filteredCandidates,

    ]);

  /////////////////////////////////////////////////////////////
  // EXPORT EXCEL
  /////////////////////////////////////////////////////////////

  const exportExcel =
    useCallback(async () => {

      try {

        await rankingService.exportExcel(

          filteredCandidates

        );

      }

      catch (error) {

        console.error(error);

      }

    },

    [

      filteredCandidates,

    ]);

  /////////////////////////////////////////////////////////////
  // PAGE
  /////////////////////////////////////////////////////////////

  const nextPage =
    useCallback(() => {

      setCurrentPage(

        previous =>

          Math.min(

            previous + 1,

            totalPages

          )

      );

    },

    [

      totalPages,

    ]);

  const previousPage =
    useCallback(() => {

      setCurrentPage(

        previous =>

          Math.max(

            previous - 1,

            1

          )

      );

    },

    []);

  const goToPage =
    useCallback(

      (

        page: number

      ) => {

        if (

          page >= 1 &&

          page <= totalPages

        ) {

          setCurrentPage(

            page

          );

        }

      },

      [

        totalPages,

      ]

    );
      /////////////////////////////////////////////////////////////
  // RETURN
  /////////////////////////////////////////////////////////////

  return {

    ///////////////////////////////////////////////////////////
    // DATA
    ///////////////////////////////////////////////////////////

    applications,

    filteredCandidates,

    paginatedCandidates,

    statistics,

    ///////////////////////////////////////////////////////////
    // LOADING
    ///////////////////////////////////////////////////////////

    loading,

    refreshing,

    error,

    ///////////////////////////////////////////////////////////
    // SEARCH
    ///////////////////////////////////////////////////////////

    search,

    setSearch,

    ///////////////////////////////////////////////////////////
    // FILTERS
    ///////////////////////////////////////////////////////////

    filters,

    updateFilters,

    resetFilters,

    ///////////////////////////////////////////////////////////
    // SORT
    ///////////////////////////////////////////////////////////

    sort,

    updateSort,

    ///////////////////////////////////////////////////////////
    // PAGINATION
    ///////////////////////////////////////////////////////////

    currentPage,

    totalPages,

    nextPage,

    previousPage,

    goToPage,

    setCurrentPage,

    ///////////////////////////////////////////////////////////
    // SELECTION
    ///////////////////////////////////////////////////////////

    selectedCandidates,

    toggleSelection,

    selectAll,

    clearSelection,

    ///////////////////////////////////////////////////////////
    // ACTIONS
    ///////////////////////////////////////////////////////////

    loadRanking,

    refreshRanking,

    preselectCandidate,

    preselectSelected,

    compareCandidates,

    exportPDF,

    exportExcel,

  };

}