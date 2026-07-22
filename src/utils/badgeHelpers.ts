import {
  CandidateBadge,
  BadgeVisibility,
} from "../types/badge";

import {
  GOLDEN_BADGE,
  GOLDEN_BADGE_CLASSES,
  GOLDEN_BADGE_SIZES,
  BADGE_ALLOWED_ROLES,
} from "../constants/badge";

/**
 * Returns true if the recruiter has permission
 * to view Corporate-only badges.
 */
export const isCorporateRecruiter = (
  role?: string | null
): boolean => {
  if (!role) return false;

  return BADGE_ALLOWED_ROLES.includes(
    role.toUpperCase() as (typeof BADGE_ALLOWED_ROLES)[number]
  );
};

/**
 * Determines whether a badge should be displayed
 * for the current recruiter.
 */
export const canViewBadge = (
  visibility: BadgeVisibility,
  recruiterRole?: string | null
): boolean => {
  switch (visibility) {
    case "all":
      return true;

    case "corporate":
      return isCorporateRecruiter(recruiterRole);

    default:
      return false;
  }
};

/**
 * Returns the Golden Badge if the candidate
 * is preselected and the recruiter is allowed
 * to see it.
 */
export const getGoldenBadge = (
  isPreselected: boolean,
  recruiterRole?: string | null
): CandidateBadge | null => {
  if (!isPreselected) return null;

  if (
    !canViewBadge(
      GOLDEN_BADGE.visibility,
      recruiterRole
    )
  ) {
    return null;
  }

  return GOLDEN_BADGE;
};

/**
 * Returns the Tailwind classes for a badge.
 */
export const getBadgeClasses = (
  size: keyof typeof GOLDEN_BADGE_SIZES = "md",
  className = ""
): string => {
  return [
    GOLDEN_BADGE_CLASSES.trim(),
    GOLDEN_BADGE_SIZES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
};

/**
 * Returns true if the Golden Badge should
 * be rendered.
 */
export const shouldRenderGoldenBadge = (
  isPreselected: boolean,
  recruiterRole?: string | null
): boolean => {
  return (
    getGoldenBadge(
      isPreselected,
      recruiterRole
    ) !== null
  );
};

/**
 * Returns the badge label.
 */
export const getBadgeLabel = (
  badge: CandidateBadge | null
): string => {
  return badge?.label ?? "";
};

/**
 * Returns the badge icon.
 */
export const getBadgeIcon = (
  badge: CandidateBadge | null
): string => {
  return badge?.icon ?? "";
};