/**
 * Defines the available badge types that can be displayed
 * on candidate profiles or cards.
 */
export type BadgeType =
  | "golden"
  | "verified"
  | "featured";

/**
 * Controls badge visibility based on recruiter permissions.
 */
export type BadgeVisibility =
  | "all"
  | "corporate";

/**
 * Represents a badge displayed on a candidate.
 */
export interface CandidateBadge {
  /**
   * Badge identifier.
   */
  id: string;

  /**
   * Badge category.
   */
  type: BadgeType;

  /**
   * Display text.
   */
  label: string;

  /**
   * Optional icon or emoji.
   */
  icon?: string;

  /**
   * Tailwind background color.
   */
  backgroundColor: string;

  /**
   * Tailwind text color.
   */
  textColor: string;

  /**
   * Determines who can see the badge.
   */
  visibility: BadgeVisibility;
}

/**
 * Props for the reusable GoldenBadge component.
 */
export interface GoldenBadgeProps {
  /**
   * Whether the badge should be rendered.
   */
  visible: boolean;

  /**
   * Optional custom label.
   */
  label?: string;

  /**
   * Optional additional Tailwind classes.
   */
  className?: string;
}