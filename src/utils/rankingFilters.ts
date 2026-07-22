import {
  CandidateRanking,
  RankingFilters,
  RankingSort,
} from "../types/ranking";

///////////////////////////////////////////////////////////////
// SEARCH
///////////////////////////////////////////////////////////////

export function filterBySearch(
  candidates: CandidateRanking[],
  search: string
): CandidateRanking[] {

  if (!search.trim()) {

    return candidates;

  }

  const keyword = search.toLowerCase();

  return candidates.filter(candidate =>

    candidate.fullName
      .toLowerCase()
      .includes(keyword)

    ||

    candidate.email
      .toLowerCase()
      .includes(keyword)

    ||

    candidate.location
      ?.toLowerCase()
      .includes(keyword)

    ||

    candidate.skills?.some(skill =>

      skill
        .toLowerCase()
        .includes(keyword)

    )

  );

}

///////////////////////////////////////////////////////////////
// FILTERS
///////////////////////////////////////////////////////////////

export function applyRankingFilters(
  candidates: CandidateRanking[],
  filters: RankingFilters
): CandidateRanking[] {

  return candidates.filter(candidate => {

    if (
      filters.minimumAIScore > 0 &&
      candidate.aiScore < filters.minimumAIScore
    ) {

      return false;

    }

    if (
      filters.minimumQuizScore > 0 &&
      (candidate.quizScore ?? 0) <
      filters.minimumQuizScore
    ) {

      return false;

    }

    if (
      filters.minimumExperience > 0 &&
      candidate.experienceYears <
      filters.minimumExperience
    ) {

      return false;

    }

    if (
      filters.preselectedOnly &&
      !candidate.isPreselected
    ) {

      return false;

    }

    if (
      filters.remoteOnly &&
      !candidate.remote
    ) {

      return false;

    }

    if (
      filters.status &&
      candidate.status !== filters.status
    ) {

      return false;

    }

    if (
      filters.location &&
      !candidate.location
        ?.toLowerCase()
        .includes(
          filters.location.toLowerCase()
        )
    ) {

      return false;

    }

    if (
      filters.skill &&
      !candidate.skills?.some(skill =>

        skill
          .toLowerCase()
          .includes(
            filters.skill.toLowerCase()
          )

      )
    ) {

      return false;

    }

    return true;

  });

}

///////////////////////////////////////////////////////////////
// SORT
///////////////////////////////////////////////////////////////

export function sortCandidates(
  candidates: CandidateRanking[],
  sort: RankingSort
): CandidateRanking[] {

  const list = [...candidates];

  switch (sort) {

    case "ai":

      list.sort(

        (a, b) =>

          b.aiScore - a.aiScore

      );

      break;

    case "quiz":

      list.sort(

        (a, b) =>

          (b.quizScore ?? 0)

          -

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

  return list;

}

///////////////////////////////////////////////////////////////
// ASSIGN POSITIONS
///////////////////////////////////////////////////////////////

export function assignRankingPositions(
  candidates: CandidateRanking[]
): CandidateRanking[] {

  return candidates.map(

    (candidate, index) => ({

      ...candidate,

      rankingPosition:

        index + 1,

    })

  );

}

///////////////////////////////////////////////////////////////
// COMPLETE PIPELINE
///////////////////////////////////////////////////////////////

export function filterAndSortCandidates(
  candidates: CandidateRanking[],
  search: string,
  filters: RankingFilters,
  sort: RankingSort
): CandidateRanking[] {

  let results = filterBySearch(

    candidates,

    search

  );

  results = applyRankingFilters(

    results,

    filters

  );

  results = sortCandidates(

    results,

    sort

  );

  return assignRankingPositions(

    results

  );

}

///////////////////////////////////////////////////////////////
// PAGINATION
///////////////////////////////////////////////////////////////

export function paginateCandidates(
  candidates: CandidateRanking[],
  page: number,
  pageSize: number
): CandidateRanking[] {

  const start =

    (page - 1) *

    pageSize;

  return candidates.slice(

    start,

    start + pageSize

  );

}

///////////////////////////////////////////////////////////////
// TOTAL PAGES
///////////////////////////////////////////////////////////////

export function getTotalPages(
  totalItems: number,
  pageSize: number
): number {

  return Math.max(

    1,

    Math.ceil(

      totalItems /

      pageSize

    )

  );

}

///////////////////////////////////////////////////////////////
// HAS ACTIVE FILTERS
///////////////////////////////////////////////////////////////

export function hasActiveFilters(
  filters: RankingFilters
): boolean {

  return (

    filters.minimumAIScore > 0 ||

    filters.minimumQuizScore > 0 ||

    filters.minimumExperience > 0 ||

    filters.preselectedOnly ||

    filters.remoteOnly ||

    Boolean(filters.status) ||

    Boolean(filters.location) ||

    Boolean(filters.skill)

  );

}

///////////////////////////////////////////////////////////////
// RESET CHECK
///////////////////////////////////////////////////////////////

export function isDefaultFilters(
  filters: RankingFilters
): boolean {

  return !hasActiveFilters(filters);

}