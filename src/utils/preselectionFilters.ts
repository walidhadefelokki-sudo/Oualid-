import {
  PreselectionCandidate,
  PreselectionFilters,
} from "../types/preselection";

///////////////////////////////////////////////////////////////
// SEARCH
///////////////////////////////////////////////////////////////

export function filterBySearch(
  candidates: PreselectionCandidate[],
  search: string
): PreselectionCandidate[] {

  if (!search.trim()) {

    return candidates;

  }

  const keyword = search.toLowerCase();

  return candidates.filter(candidate => {

    return (

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

      candidate.title
        ?.toLowerCase()
        .includes(keyword)

      ||

      candidate.skills.some(skill =>

        skill
          .toLowerCase()
          .includes(keyword)

      )

    );

  });

}

///////////////////////////////////////////////////////////////
// FILTERS
///////////////////////////////////////////////////////////////

export function applyFilters(
  candidates: PreselectionCandidate[],
  filters: PreselectionFilters
): PreselectionCandidate[] {

  return candidates.filter(candidate => {

    if (
      filters.status &&
      candidate.status !== filters.status
    ) {

      return false;

    }

    if (
      filters.reviewer &&
      candidate.preselectedBy !== filters.reviewer
    ) {

      return false;

    }

    if (
      filters.minimumAIScore > 0 &&
      candidate.aiScore < filters.minimumAIScore
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

    return true;

  });

}

///////////////////////////////////////////////////////////////
// SORT
///////////////////////////////////////////////////////////////

export type PreselectionSort =

  | "ai"

  | "name"

  | "experience"

  | "newest"

  | "status";

export function sortCandidates(
  candidates: PreselectionCandidate[],
  sort: PreselectionSort
): PreselectionCandidate[] {

  const list = [...candidates];

  switch (sort) {

    case "ai":

      list.sort(

        (a, b) =>

          b.aiScore -

          a.aiScore

      );

      break;

    case "name":

      list.sort(

        (a, b) =>

          a.fullName.localeCompare(
            b.fullName
          )

      );

      break;

    case "experience":

      list.sort(

        (a, b) =>

          b.experienceYears -

          a.experienceYears

      );

      break;

    case "status":

      list.sort(

        (a, b) =>

          a.status.localeCompare(
            b.status
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
// ASSIGN POSITION
///////////////////////////////////////////////////////////////

export function assignPositions(
  candidates: PreselectionCandidate[]
): PreselectionCandidate[] {

  return candidates.map(

    (candidate, index) => ({

      ...candidate,

      preselectionScore:
        candidate.preselectionScore ??
        candidate.aiScore,

      rankingPosition:

        index + 1,

    })

  );

}

///////////////////////////////////////////////////////////////
// COMPLETE PIPELINE
///////////////////////////////////////////////////////////////

export function filterCandidates(
  candidates: PreselectionCandidate[],
  filters: PreselectionFilters,
  sort: PreselectionSort = "ai"
): PreselectionCandidate[] {

  let result = filterBySearch(

    candidates,

    filters.search

  );

  result = applyFilters(

    result,

    filters

  );

  result = sortCandidates(

    result,

    sort

  );

  return assignPositions(

    result

  );

}

///////////////////////////////////////////////////////////////
// PAGINATION
///////////////////////////////////////////////////////////////

export function paginateCandidates(
  candidates: PreselectionCandidate[],
  page: number,
  pageSize: number
): PreselectionCandidate[] {

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
// ACTIVE FILTERS
///////////////////////////////////////////////////////////////

export function hasActiveFilters(
  filters: PreselectionFilters
): boolean {

  return (

    Boolean(filters.status)

    ||

    Boolean(filters.reviewer)

    ||

    Boolean(filters.location)

    ||

    Boolean(filters.search)

    ||

    filters.minimumAIScore > 0

  );

}

///////////////////////////////////////////////////////////////
// RESET CHECK
///////////////////////////////////////////////////////////////

export function isDefaultFilters(
  filters: PreselectionFilters
): boolean {

  return !hasActiveFilters(

    filters

  );

}

///////////////////////////////////////////////////////////////
// GROUP BY STATUS
///////////////////////////////////////////////////////////////

export function groupByStatus(
  candidates: PreselectionCandidate[]
) {

  return {

    pending:

      candidates.filter(

        c => c.status === "PENDING"

      ),

    underReview:

      candidates.filter(

        c => c.status === "UNDER_REVIEW"

      ),

    approved:

      candidates.filter(

        c => c.status === "APPROVED"

      ),

    rejected:

      candidates.filter(

        c => c.status === "REJECTED"

      ),

    needsReview:

      candidates.filter(

        c => c.status === "NEEDS_REVIEW"

      ),

  };

}

///////////////////////////////////////////////////////////////
// REVIEWER LIST
///////////////////////////////////////////////////////////////

export function getReviewers(
  candidates: PreselectionCandidate[]
): string[] {

  return Array.from(

    new Set(

      candidates

        .map(

          candidate =>

            candidate.preselectedBy

        )

        .filter(

          (value): value is string =>

            Boolean(value)

        )

    )

  ).sort();

}