import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "./error.middleware";
import { AdminScope, SCOPE_LABELS, canUseScope } from "../utils/adminScopes";

/**
 * Restricts an admin route to the administrators allowed that area.
 *
 * Runs after `protect` and `restrictTo("ADMIN")`: this answers "which parts",
 * not "is this an administrator".
 *
 * The account is read from the database on every request rather than taken
 * from the token. A JWT here lasts thirty days, so scopes carried in it would
 * mean a revoked permission kept working for a month — on an access-control
 * change that is not a trade worth making, and admin traffic is a handful of
 * requests, not a hot path.
 */
export const requireAdminScope = (scope: AdminScope) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new AppError("Not authorized to access this route", 401));
      }

      const account = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          role: true,
          status: true,
          deletedAt: true,
          isSuperAdmin: true,
          adminScopes: true,
        },
      });

      // Suspended or deleted between issuing the token and using it. `protect`
      // only reads the token, so without this an administrator could be
      // suspended and keep working for the rest of the month.
      if (
        !account ||
        account.role !== "ADMIN" ||
        account.status === "SUSPENDED" ||
        account.status === "DELETED" ||
        account.deletedAt
      ) {
        return next(new AppError("You do not have permission to perform this action", 403));
      }

      if (!canUseScope(account, scope)) {
        return next(
          new AppError(
            `Accès limité : « ${SCOPE_LABELS[scope].label} » ne fait pas partie de vos autorisations.`,
            403
          )
        );
      }

      // Carried forward so a handler can make the finer decisions — a limited
      // administrator with "users" may edit an account but never create an
      // administrator.
      req.adminAccess = {
        isSuperAdmin: account.isSuperAdmin,
        scopes: account.adminScopes as AdminScope[],
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Only an unrestricted administrator.
 *
 * For the things a limited one must never reach however many areas they were
 * given: granting admin access, and promoting anybody to administrator. An
 * administrator who can edit their own permissions is not limited.
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    const account = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, status: true, deletedAt: true, isSuperAdmin: true },
    });

    if (
      !account ||
      account.role !== "ADMIN" ||
      !account.isSuperAdmin ||
      account.status === "SUSPENDED" ||
      account.status === "DELETED" ||
      account.deletedAt
    ) {
      return next(
        new AppError("Réservé à un administrateur sans restriction.", 403)
      );
    }

    req.adminAccess = { isSuperAdmin: true, scopes: [] };
    next();
  } catch (err) {
    next(err);
  }
};

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAdminScope / requireSuperAdmin. */
      adminAccess?: {
        isSuperAdmin: boolean;
        scopes: AdminScope[];
      };
    }
  }
}
