import { useMemo } from "react";

import {
  canViewBadge,
  isCorporateRecruiter,
} from "../utils/badgeHelpers";

interface UseCorporateAccessOptions {
  recruiterRole?: string | null;
}

const useCorporateAccess = ({
  recruiterRole,
}: UseCorporateAccessOptions) => {
  /**
   * True if the current recruiter belongs
   * to the Corporate plan.
   */
  const isCorporate = useMemo(
    () => isCorporateRecruiter(recruiterRole),
    [recruiterRole]
  );

  /**
   * Convenience helper for checking
   * visibility of Corporate-only features.
   */
  const hasCorporateAccess = useMemo(
    () => canViewBadge("corporate", recruiterRole),
    [recruiterRole]
  );

  /**
   * Badge visibility helper.
   */
  const canSeeGoldenBadge = useMemo(
    () => canViewBadge("corporate", recruiterRole),
    [recruiterRole]
  );

  /**
   * Generic permission checker for future
   * badge or feature visibility.
   */
  const canView = (
    visibility: "all" | "corporate"
  ): boolean => {
    return canViewBadge(visibility, recruiterRole);
  };

  return {
    recruiterRole,

    isCorporate,

    hasCorporateAccess,

    canSeeGoldenBadge,

    canView,
  };
};

export default useCorporateAccess;