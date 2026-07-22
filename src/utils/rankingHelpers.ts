import { CandidateRanking } from "../types/ranking";

///////////////////////////////////////////////////////////////
// FORMAT SCORE
///////////////////////////////////////////////////////////////

export function formatScore(
  score?: number | null
): string {

  if (score === null || score === undefined) {

    return "--";

  }

  return score.toFixed(1);

}

///////////////////////////////////////////////////////////////
// INITIALS
///////////////////////////////////////////////////////////////

export function getCandidateInitials(
  fullName: string
): string {

  return fullName
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(name => name[0].toUpperCase())
    .join("");

}

///////////////////////////////////////////////////////////////
// MEDAL
///////////////////////////////////////////////////////////////

export function getRankingMedal(
  position: number
): "gold" | "silver" | "bronze" | "none" {

  switch (position) {

    case 1:
      return "gold";

    case 2:
      return "silver";

    case 3:
      return "bronze";

    default:
      return "none";

  }

}

///////////////////////////////////////////////////////////////
// MEDAL COLOR
///////////////////////////////////////////////////////////////

export function getRankingColor(
  position: number
): string {

  switch (position) {

    case 1:
      return "text-yellow-500";

    case 2:
      return "text-gray-400";

    case 3:
      return "text-amber-700";

    default:
      return "text-gray-500";

  }

}

///////////////////////////////////////////////////////////////
// AI SCORE COLOR
///////////////////////////////////////////////////////////////

export function getAIScoreColor(
  score: number
): string {

  if (score >= 90)
    return "text-green-600";

  if (score >= 80)
    return "text-blue-600";

  if (score >= 70)
    return "text-yellow-600";

  if (score >= 60)
    return "text-orange-600";

  return "text-red-600";

}

///////////////////////////////////////////////////////////////
// AI SCORE BACKGROUND
///////////////////////////////////////////////////////////////

export function getAIScoreBackground(
  score: number
): string {

  if (score >= 90)
    return "bg-green-100";

  if (score >= 80)
    return "bg-blue-100";

  if (score >= 70)
    return "bg-yellow-100";

  if (score >= 60)
    return "bg-orange-100";

  return "bg-red-100";

}

///////////////////////////////////////////////////////////////
// STATUS LABEL
///////////////////////////////////////////////////////////////

export function getCandidateStatus(
  candidate: CandidateRanking
): string {

  if (candidate.isPreselected)
    return "Preselected";

  return candidate.status ?? "Pending";

}

///////////////////////////////////////////////////////////////
// STATUS COLOR
///////////////////////////////////////////////////////////////

export function getStatusColor(
  status: string
): string {

  switch (status.toUpperCase()) {

    case "PRESELECTED":
      return "bg-green-100 text-green-700";

    case "INTERVIEW":
      return "bg-blue-100 text-blue-700";

    case "HIRED":
      return "bg-emerald-100 text-emerald-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    case "REVIEWING":
      return "bg-yellow-100 text-yellow-700";

    default:
      return "bg-gray-100 text-gray-700";

  }

}

///////////////////////////////////////////////////////////////
// EXPERIENCE LABEL
///////////////////////////////////////////////////////////////

export function getExperienceLabel(
  years: number
): string {

  if (years <= 1)
    return "Junior";

  if (years <= 3)
    return "Intermediate";

  if (years <= 6)
    return "Experienced";

  if (years <= 10)
    return "Senior";

  return "Expert";

}

///////////////////////////////////////////////////////////////
// SORT BY AI
///////////////////////////////////////////////////////////////

export function sortByAIScore(
  candidates: CandidateRanking[]
): CandidateRanking[] {

  return [...candidates].sort(

    (a, b) =>

      b.aiScore - a.aiScore

  );

}

///////////////////////////////////////////////////////////////
// FIND CANDIDATE
///////////////////////////////////////////////////////////////

export function findCandidate(
  candidates: CandidateRanking[],
  id: string
): CandidateRanking | undefined {

  return candidates.find(

    candidate =>

      candidate.id === id

  );

}

///////////////////////////////////////////////////////////////
// TOP CANDIDATES
///////////////////////////////////////////////////////////////

export function getTopCandidates(
  candidates: CandidateRanking[],
  count = 5
): CandidateRanking[] {

  return sortByAIScore(candidates)

    .slice(0, count);

}

///////////////////////////////////////////////////////////////
// AVERAGE AI
///////////////////////////////////////////////////////////////

export function calculateAverageAIScore(
  candidates: CandidateRanking[]
): number {

  if (candidates.length === 0)
    return 0;

  const total = candidates.reduce(

    (sum, candidate) =>

      sum + candidate.aiScore,

    0

  );

  return Number(

    (total / candidates.length).toFixed(2)

  );

}

///////////////////////////////////////////////////////////////
// PRESELECTED COUNT
///////////////////////////////////////////////////////////////

export function countPreselected(
  candidates: CandidateRanking[]
): number {

  return candidates.filter(

    candidate =>

      candidate.isPreselected

  ).length;

}

///////////////////////////////////////////////////////////////
// FORMAT DATE
///////////////////////////////////////////////////////////////

export function formatApplicationDate(
  value: string | Date
): string {

  const date = new Date(value);

  return new Intl.DateTimeFormat(

    "en-US",

    {

      day: "2-digit",

      month: "short",

      year: "numeric",

    }

  ).format(date);

}

///////////////////////////////////////////////////////////////
// SAFE PERCENTAGE
///////////////////////////////////////////////////////////////

export function percentage(
  value: number,
  total: number
): number {

  if (total <= 0)
    return 0;

  return Number(

    ((value / total) * 100).toFixed(1)

  );

}

///////////////////////////////////////////////////////////////
// SEARCH
///////////////////////////////////////////////////////////////

export function candidateMatchesSearch(
  candidate: CandidateRanking,
  search: string
): boolean {

  const keyword = search.toLowerCase();

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

    candidate.skills?.some(skill =>

      skill
        .toLowerCase()
        .includes(keyword)

    ) ?? false

  );

}