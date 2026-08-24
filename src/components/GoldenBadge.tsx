import React from "react";
import { Award } from "lucide-react";

import { GoldenBadgeProps } from "../types/badge";

import {
  GOLDEN_BADGE_LABEL,
  GOLDEN_BADGE_TOOLTIP,
} from "../constants/badge";

import {
  getBadgeClasses,
} from "../utils/badgeHelpers";

interface Props extends GoldenBadgeProps {
  size?: "sm" | "md" | "lg";
  tooltip?: boolean;
}

const GoldenBadge: React.FC<Props> = ({
  visible,
  label = GOLDEN_BADGE_LABEL,
  className = "",
  size = "md",
  tooltip = true,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <span
      title={tooltip ? GOLDEN_BADGE_TOOLTIP : undefined}
      className={getBadgeClasses(size as "sm" | "md" | "lg", className)}
    >
      <Award
        className={
          size === "sm"
            ? "h-3.5 w-3.5"
            : size === "lg"
            ? "h-5 w-5"
            : "h-4 w-4"
        }
      />

      <span>{label}</span>
    </span>
  );
};

export default GoldenBadge;