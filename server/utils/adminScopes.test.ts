import { describe, expect, it } from "vitest";
import {
  ADMIN_SCOPES,
  SCOPE_LABELS,
  canUseScope,
  isAdminScope,
  normaliseScopes,
} from "./adminScopes";

/**
 * The scope rules.
 *
 * Pure functions, so no database. What is checked here is the shape of the
 * permission model itself: that it fails closed, that every area is described
 * for whoever is granting it, and that `canUseScope` cannot be talked into a
 * yes by a non-administrator.
 */

describe("the scope list", () => {
  it("describes every area it offers", () => {
    // The list is what the granting screen renders. An area with no
    // description is one an administrator is asked to grant blind.
    for (const scope of ADMIN_SCOPES) {
      expect(SCOPE_LABELS[scope]?.label, scope).toBeTruthy();
      expect(SCOPE_LABELS[scope]?.description, scope).toBeTruthy();
    }
  });

  it("describes nothing it does not offer", () => {
    expect(Object.keys(SCOPE_LABELS).sort()).toEqual([...ADMIN_SCOPES].sort());
  });

  it("warns in the description where an area touches money or mass mail", () => {
    // These three are the ones that cost money or reach thousands of people;
    // whoever grants them should be told so on the spot.
    expect(SCOPE_LABELS.emails.description).toMatch(/milliers/i);
    expect(SCOPE_LABELS.plans.description).toMatch(/pay/i);
    expect(SCOPE_LABELS.freelance_moderation.description).toMatch(/crédits/i);
  });
});

describe("isAdminScope", () => {
  it("accepts a known area and nothing else", () => {
    expect(isAdminScope("users")).toBe(true);
    expect(isAdminScope("everything")).toBe(false);
    expect(isAdminScope("")).toBe(false);
    expect(isAdminScope(null)).toBe(false);
    expect(isAdminScope(42)).toBe(false);
  });
});

describe("normaliseScopes", () => {
  it("keeps the known ones and drops the rest", () => {
    expect(normaliseScopes(["users", "nope", "jobs"])).toEqual(["users", "jobs"]);
  });

  it("removes duplicates", () => {
    expect(normaliseScopes(["users", "users"])).toEqual(["users"]);
  });

  it("treats anything that is not a list as no access", () => {
    // Fail closed: a malformed grant must not widen anything.
    expect(normaliseScopes(undefined)).toEqual([]);
    expect(normaliseScopes("users")).toEqual([]);
    expect(normaliseScopes({ users: true })).toEqual([]);
    expect(normaliseScopes(null)).toEqual([]);
  });
});

describe("canUseScope", () => {
  const limited = { role: "ADMIN", isSuperAdmin: false, adminScopes: ["users", "jobs"] };

  it("lets an unrestricted administrator through everywhere", () => {
    const sup = { role: "ADMIN", isSuperAdmin: true, adminScopes: [] };
    for (const scope of ADMIN_SCOPES) expect(canUseScope(sup, scope)).toBe(true);
  });

  it("lets a limited administrator into what they were given, and no further", () => {
    expect(canUseScope(limited, "users")).toBe(true);
    expect(canUseScope(limited, "jobs")).toBe(true);
    expect(canUseScope(limited, "payments")).toBe(false);
    expect(canUseScope(limited, "emails")).toBe(false);
  });

  it("refuses an administrator who was given nothing", () => {
    // The default for a new administrator, deliberately: an account created
    // without anyone deciding what it may touch reaches nothing.
    const fresh = { role: "ADMIN", isSuperAdmin: false, adminScopes: [] };
    for (const scope of ADMIN_SCOPES) expect(canUseScope(fresh, scope)).toBe(false);
  });

  it("refuses anyone who is not an administrator, scopes or not", () => {
    // Scopes on a candidate would be an administrator in all but name.
    const recruiter = { role: "RECRUITER", isSuperAdmin: true, adminScopes: ["users"] };
    expect(canUseScope(recruiter, "users")).toBe(false);

    const candidate = { role: "CANDIDATE", isSuperAdmin: false, adminScopes: ["users"] };
    expect(canUseScope(candidate, "users")).toBe(false);
  });

  it("refuses a missing account", () => {
    expect(canUseScope(null, "users")).toBe(false);
    expect(canUseScope(undefined, "users")).toBe(false);
  });

  it("refuses when the scope list is missing or malformed", () => {
    expect(canUseScope({ role: "ADMIN", isSuperAdmin: false }, "users")).toBe(false);
    expect(
      canUseScope(
        { role: "ADMIN", isSuperAdmin: false, adminScopes: "users" as never },
        "users"
      )
    ).toBe(false);
  });
});
