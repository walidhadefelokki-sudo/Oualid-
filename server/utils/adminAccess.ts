import prisma from "./prisma";
import { AdminScope } from "./adminScopes";

/**
 * Reads an administrator's access without requiring the columns to exist.
 *
 * The limited-admin columns arrive in a migration, and a deploy can reach
 * production before that migration runs. When it does, every query that reads
 * a User without an explicit column list asks for `isSuperAdmin` and
 * `adminScopes`, Postgres refuses the whole statement, and sign-in stops
 * working for everybody — which is exactly what happened.
 *
 * The auth handlers are fixed by naming the columns they actually need. This
 * covers the remaining case: the admin screens, which do want the new columns
 * and must not take the site down while waiting for them.
 *
 * Absent columns mean the database predates limited administrators, and in
 * that database every administrator was unrestricted — so that is what is
 * reported. It is the behaviour the schema describes rather than a guess, and
 * it is not a widening: nobody has been limited yet.
 */

/** Checked once per process, not per request. */
let columnsPresent: boolean | null = null;

export const adminColumnsReady = async (): Promise<boolean> => {
  if (columnsPresent !== null) return columnsPresent;

  try {
    const rows = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n
        FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'User'
         AND column_name IN ('isSuperAdmin', 'adminScopes')`;

    columnsPresent = Number(rows[0]?.n ?? 0) === 2;
  } catch {
    // Cannot tell, so assume the worst for availability and the legacy
    // behaviour for access: the site keeps working.
    columnsPresent = false;
  }

  if (!columnsPresent) {
    console.warn(
      "[admin] isSuperAdmin / adminScopes are missing from the database. " +
        "Every administrator is treated as unrestricted until " +
        "`prisma migrate deploy` has run. Admin limits are NOT in force."
    );
  }

  return columnsPresent;
};

export interface AdminAccess {
  isSuperAdmin: boolean;
  adminScopes: AdminScope[];
  /** False while the migration is pending; limits are not being enforced. */
  enforced: boolean;
}

/** One account's admin access, or null if there is no such account. */
export const readAdminAccess = async (
  userId: string
): Promise<(AdminAccess & { role: string; status: string; deletedAt: Date | null }) | null> => {
  const base = await prisma.user.findUnique({
    where: { id: userId },
    // Named explicitly, so this query works on either schema.
    select: { role: true, status: true, deletedAt: true },
  });

  if (!base) return null;

  if (!(await adminColumnsReady())) {
    return {
      ...base,
      // The pre-migration state: an administrator was an administrator.
      isSuperAdmin: base.role === "ADMIN",
      adminScopes: [],
      enforced: false,
    };
  }

  const withAccess = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, adminScopes: true },
  });

  return {
    ...base,
    isSuperAdmin: Boolean(withAccess?.isSuperAdmin),
    adminScopes: (withAccess?.adminScopes ?? []) as AdminScope[],
    enforced: true,
  };
};

/** Resets the cache. Only for tests, which switch databases in one process. */
export const _resetAdminColumnCache = () => {
  columnsPresent = null;
};
