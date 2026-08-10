import { Request, Response, NextFunction } from "express";
import { RecruiterPlan } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "./error.middleware";

// Tier hierarchy — higher index unlocks everything lower tiers get too.
const TIER_ORDER: RecruiterPlan[] = ["FREE", "PREMIUM", "CORPORATE"];

/**
 * Resolve the real, authoritative plan for a recruiter — never trust a
 * `plan`/`recruiterTier` value sent by the frontend.
 *
 * A recruiter's plan comes from the Company they belong to (via
 * CompanyMember), not from the RecruiterProfile itself. A recruiter with
 * no company yet is treated as FREE.
 */
export async function getRecruiterPlan(
  userId: string
): Promise<RecruiterPlan> {
  const membership = await prisma.companyMember.findFirst({
    where: { recruiter: { userId } },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });

  return membership?.company.plan ?? "FREE";
}

/**
 * Require the recruiter's real (server-resolved) plan to meet or exceed
 * the given minimum tier. Must run after `protect`.
 */
export const requireRecruiterTier = (minimumPlan: RecruiterPlan) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Not authorized to access this route", 401));
      }

      // Admins bypass tier restrictions entirely.
      if (req.user.role === "ADMIN") {
        return next();
      }

      if (req.user.role !== "RECRUITER") {
        return next(new AppError("Recruiters only.", 403));
      }

      const plan = await getRecruiterPlan(req.user.id);

      if (TIER_ORDER.indexOf(plan) < TIER_ORDER.indexOf(minimumPlan)) {
        return next(
          new AppError(
            `This feature requires the ${minimumPlan} plan or higher.`,
            403
          )
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
