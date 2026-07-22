import {
  CorporateCandidate,
  CorporateCandidateFilters,
  CorporateCandidateSort,
} from "../types/corporateCandidate";

/**
 * Priority sorting:
 * 1. ⭐ Preselected candidates first
 * 2. Higher AI score
 * 3. Alphabetical name
 */
export const sortByPriority = (
  candidates: CorporateCandidate[]
): CorporateCandidate[] => {
  return [...candidates].sort((a, b) => {
    if (a.isPreselected && !b.isPreselected) return -1;

    if (!a.isPreselected && b.isPreselected) return 1;

    if (b.aiScore !== a.aiScore) {
      return b.aiScore - a.aiScore;
    }

    return a.fullName.localeCompare(b.fullName);
  });
};

/**
 * Sort by AI Score.
 */
export const sortByAIScore = (
  candidates: CorporateCandidate[]
): CorporateCandidate[] => {
  return [...candidates].sort(
    (a, b) => b.aiScore - a.aiScore
  );
};

/**
 * Sort alphabetically.
 */
export const sortByName = (
  candidates: CorporateCandidate[]
): CorporateCandidate[] => {
  return [...candidates].sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );
};

/**
 * Sort by years of experience.
 */
export const sortByExperience = (
  candidates: CorporateCandidate[]
): CorporateCandidate[] => {
  return [...candidates].sort(
    (a, b) =>
      (b.experience ?? 0) -
      (a.experience ?? 0)
  );
};

/**
 * Sort by newest application.
 */
export const sortByNewest = (
  candidates: CorporateCandidate[]
): CorporateCandidate[] => {
  return [...candidates].sort(
    (a, b) =>
      new Date(b.appliedAt).getTime() -
      new Date(a.appliedAt).getTime()
  );
};

/**
 * Apply filters.
 */
export const filterCorporateCandidates = (
  candidates: CorporateCandidate[],
  filters: CorporateCandidateFilters
): CorporateCandidate[] => {
  return candidates.filter((candidate) => {
    const search = filters.search.trim().toLowerCase();

    const matchesSearch =
      search.length === 0 ||
      candidate.fullName
        .toLowerCase()
        .includes(search) ||
      candidate.email
        .toLowerCase()
        .includes(search);

    const matchesStatus =
      !filters.status ||
      candidate.status === filters.status;

    const matchesAI =
      candidate.aiScore >=
      filters.minimumAIScore;

    const matchesPreselected =
      !filters.preselectedOnly ||
      candidate.isPreselected;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesAI &&
      matchesPreselected
    );
  });
};

/**
 * Apply selected sorting mode.
 */
export const sortCorporateCandidates = (
  candidates: CorporateCandidate[],
  sort: CorporateCandidateSort
): CorporateCandidate[] => {
  switch (sort) {
    case "priority":
      return sortByPriority(candidates);

    case "aiScore":
      return sortByAIScore(candidates);

    case "name":
      return sortByName(candidates);

    case "experience":
      return sortByExperience(candidates);

    case "newest":
      return sortByNewest(candidates);

    default:
      return sortByPriority(candidates);
  }
};

/**
 * Filter then sort.
 */
export const prepareCorporateCandidateList = (
  candidates: CorporateCandidate[],
  filters: CorporateCandidateFilters,
  sort: CorporateCandidateSort
): CorporateCandidate[] => {
  const filtered = filterCorporateCandidates(
    candidates,
    filters
  );

  return sortCorporateCandidates(filtered, sort);
};

/**
 * Compute dashboard statistics.
 */
export const calculateCorporateStatistics = (
  candidates: CorporateCandidate[]
) => {
  const total = candidates.length;

  const preselected = candidates.filter(
    (candidate) => candidate.isPreselected
  ).length;

  const pending = candidates.filter(
    (candidate) => candidate.status === "pending"
  ).length;

  const approved = candidates.filter(
    (candidate) => candidate.status === "approved"
  ).length;

  const rejected = candidates.filter(
    (candidate) => candidate.status === "rejected"
  ).length;

  const averageAIScore =
    total === 0
      ? 0
      : Number(
          (
            candidates.reduce(
              (sum, candidate) =>
                sum + candidate.aiScore,
              0
            ) / total
          ).toFixed(1)
        );

  return {
    total,
    preselected,
    pending,
    approved,
    rejected,
    averageAIScore,
  };
};