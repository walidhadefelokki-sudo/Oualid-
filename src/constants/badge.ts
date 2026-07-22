import { CandidateBadge } from "../types/badge";

/**
 * Default label displayed for preselected candidates.
 */
export const GOLDEN_BADGE_LABEL = "⭐ Préselectionné";

/**
 * Only Corporate recruiters can see the Golden Badge.
 */
export const GOLDEN_BADGE_VISIBILITY = "corporate" as const;

/**
 * Default Tailwind classes.
 */
export const GOLDEN_BADGE_BACKGROUND =
  "bg-yellow-400";

export const GOLDEN_BADGE_TEXT =
  "text-yellow-900";

export const GOLDEN_BADGE_CLASSES = `
inline-flex
items-center
gap-2
rounded-full
px-3
py-1
text-sm
font-bold
shadow-sm
border
border-yellow-500
bg-yellow-400
text-yellow-900
`;

/**
 * Reusable badge definition.
 */
export const GOLDEN_BADGE: CandidateBadge = {
  id: "golden-preselection",

  type: "golden",

  label: GOLDEN_BADGE_LABEL,

  icon: "⭐",

  backgroundColor: GOLDEN_BADGE_BACKGROUND,

  textColor: GOLDEN_BADGE_TEXT,

  visibility: GOLDEN_BADGE_VISIBILITY,
};

/**
 * Tooltip displayed when hovering the badge.
 */
export const GOLDEN_BADGE_TOOLTIP =
  "This candidate has been preselected by the recruitment team.";

/**
 * Animation classes.
 */
export const GOLDEN_BADGE_ANIMATION =
  "transition-all duration-200 hover:scale-105";

/**
 * Badge size presets.
 */
export const GOLDEN_BADGE_SIZES = {
  sm: "px-2 py-1 text-xs",

  md: "px-3 py-1 text-sm",

  lg: "px-4 py-2 text-base",
} as const;

/**
 * Badge visibility roles.
 */
export const BADGE_ALLOWED_ROLES = [
  "CORPORATE",
] as const;