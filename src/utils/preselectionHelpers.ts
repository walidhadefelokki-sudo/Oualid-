import {
  PreselectionCandidate,
  PreselectionStatus,
} from "../types/preselection";

import {
  AI_THRESHOLDS,
  STATUS_COLORS,
  DEFAULT_PRESELECTION_COMMENT,
  DATE_OPTIONS,
} from "../constants/preselection";

///////////////////////////////////////////////////////////////
// AI SCORE LABEL
///////////////////////////////////////////////////////////////

export function getAIScoreLabel(score: number): string {

  if (score >= AI_THRESHOLDS.excellent) {

    return "Excellent";

  }

  if (score >= AI_THRESHOLDS.good) {

    return "Good";

  }

  if (score >= AI_THRESHOLDS.average) {

    return "Average";

  }

  return "Needs Improvement";

}

///////////////////////////////////////////////////////////////
// AI SCORE COLOR
///////////////////////////////////////////////////////////////

export function getAIScoreColor(score: number): string {

  if (score >= AI_THRESHOLDS.excellent) {

    return "text-green-600";

  }

  if (score >= AI_THRESHOLDS.good) {

    return "text-blue-600";

  }

  if (score >= AI_THRESHOLDS.average) {

    return "text-yellow-600";

  }

  return "text-red-600";

}

///////////////////////////////////////////////////////////////
// STATUS LABEL
///////////////////////////////////////////////////////////////

export function getStatusLabel(
  status: PreselectionStatus
): string {

  switch (status) {

    case "PENDING":
      return "Pending";

    case "UNDER_REVIEW":
      return "Under Review";

    case "APPROVED":
      return "Approved";

    case "REJECTED":
      return "Rejected";

    case "NEEDS_REVIEW":
      return "Needs Review";

    default:
      return status;

  }

}

///////////////////////////////////////////////////////////////
// STATUS COLOR
///////////////////////////////////////////////////////////////

export function getStatusColor(
  status: PreselectionStatus
): string {

  return STATUS_COLORS[status];

}

///////////////////////////////////////////////////////////////
// EXPERIENCE LABEL
///////////////////////////////////////////////////////////////

export function getExperienceLabel(
  years: number
): string {

  if (years <= 1) {

    return "Junior";

  }

  if (years <= 4) {

    return "Intermediate";

  }

  if (years <= 7) {

    return "Experienced";

  }

  if (years <= 10) {

    return "Senior";

  }

  return "Expert";

}

///////////////////////////////////////////////////////////////
// FORMAT DATE
///////////////////////////////////////////////////////////////

export function formatDate(
  date?: string
): string {

  if (!date) {

    return "-";

  }

  return new Date(date).toLocaleDateString(
    undefined,
    DATE_OPTIONS
  );

}

///////////////////////////////////////////////////////////////
// REVIEWED?
///////////////////////////////////////////////////////////////

export function hasBeenReviewed(
  candidate: PreselectionCandidate
): boolean {

  return (
    candidate.status === "APPROVED" ||
    candidate.status === "REJECTED"
  );

}

///////////////////////////////////////////////////////////////
// PENDING?
///////////////////////////////////////////////////////////////

export function isPending(
  candidate: PreselectionCandidate
): boolean {

  return candidate.status === "PENDING";

}

///////////////////////////////////////////////////////////////
// APPROVED?
///////////////////////////////////////////////////////////////

export function isApproved(
  candidate: PreselectionCandidate
): boolean {

  return candidate.status === "APPROVED";

}

///////////////////////////////////////////////////////////////
// REJECTED?
///////////////////////////////////////////////////////////////

export function isRejected(
  candidate: PreselectionCandidate
): boolean {

  return candidate.status === "REJECTED";

}

///////////////////////////////////////////////////////////////
// REVIEWER
///////////////////////////////////////////////////////////////

export function getReviewer(
  candidate: PreselectionCandidate
): string {

  return candidate.preselectedBy || "-";

}

///////////////////////////////////////////////////////////////
// COMMENT
///////////////////////////////////////////////////////////////

export function getComment(
  candidate: PreselectionCandidate
): string {

  return (
    candidate.preselectionComment ||
    DEFAULT_PRESELECTION_COMMENT
  );

}

///////////////////////////////////////////////////////////////
// INITIALS
///////////////////////////////////////////////////////////////

export function getInitials(
  name: string
): string {

  return name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

}

///////////////////////////////////////////////////////////////
// FULL SCORE
///////////////////////////////////////////////////////////////

export function getAverageScore(
  candidate: PreselectionCandidate
): number {

  const scores = [

    candidate.cvScore,

    candidate.quizScore,

    candidate.presentationScore,

    candidate.aiScore,

  ].filter(
    (score): score is number =>
      typeof score === "number"
  );

  if (!scores.length) {

    return 0;

  }

  const total = scores.reduce(
    (sum, value) => sum + value,
    0
  );

  return Math.round(total / scores.length);

}

///////////////////////////////////////////////////////////////
// SEARCHABLE STRING
///////////////////////////////////////////////////////////////

export function buildSearchText(
  candidate: PreselectionCandidate
): string {

  return [

    candidate.fullName,

    candidate.email,

    candidate.location,

    candidate.title,

    ...(candidate.skills ?? []),

  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

}

///////////////////////////////////////////////////////////////
// SORT BY AI
///////////////////////////////////////////////////////////////

export function sortByAIScore(
  candidates: PreselectionCandidate[]
): PreselectionCandidate[] {

  return [...candidates].sort(

    (a, b) =>

      b.aiScore -

      a.aiScore

  );

}

///////////////////////////////////////////////////////////////
// ASSIGN RANK
///////////////////////////////////////////////////////////////

export function assignRanking(
  candidates: PreselectionCandidate[]
): PreselectionCandidate[] {

  return candidates.map(

    (candidate, index) => ({

      ...candidate,

      preselectionScore:

        candidate.aiScore,

      rankingPosition:

        index + 1,

    })

  );

}