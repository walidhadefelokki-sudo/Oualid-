import crypto from "crypto";
import prisma from "../utils/prisma";
import { companyNameFrom } from "../utils/companyName";
import { AccountStatus, Role } from "@prisma/client";

/** Identity extracted from a verified Google profile. Never from the client. */
export interface GoogleIdentity {
  /** Google's immutable subject id. The account's real key. */
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

export type OAuthOutcome = "linked_existing" | "created" | "returning";

/**
 * What the Google flow hands back.
 *
 * Named fields rather than Prisma's `User`.
 *
 * Returning the whole row means every query here asks for every column in the
 * schema, so a column added by a migration that has not run yet refuses the
 * statement — which is how Google sign-in went down along with the rest of
 * authentication. It also kept the bcrypt hash in an object that is spread
 * into the session response.
 */
export interface OAuthUser {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  status: AccountStatus;
  deletedAt: Date | null;
  emailVerified: boolean;
  recruiterProfile: { id: string } | null;
}

/** Shared so the three paths below cannot drift apart. */
const OAUTH_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  status: true,
  deletedAt: true,
  emailVerified: true,
  recruiterProfile: { select: { id: true } },
} as const;

export interface OAuthResult {
  user: OAuthUser;
  outcome: OAuthOutcome;
}

const PROVIDER = "google";

/**
 * Turns "Makers Label" into "makers-label-a1b2c3". Mirrors the slug helper in
 * auth.controller so a recruiter created through Google gets a company slug
 * built the same way as one created through the registration form.
 */
const slugify = (name: string): string => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "company"}-${crypto.randomBytes(3).toString("hex")}`;
};

/**
 * Resolves a verified Google identity to an application User.
 *
 * The three cases, in the order they are checked:
 *
 *   1. This Google account is already linked  -> sign that User in.
 *   2. A User exists with the same email      -> link Google to it.
 *   3. Nothing matches                        -> create User + Account.
 *
 * Checking the linked Account first, and only then the email, is what keeps
 * one person from becoming two Users. The email path is gated on Google
 * having verified the address: linking on an unverified email would let
 * someone claim an existing account by registering that address with Google.
 *
 * User and Account are created in a single transaction so a failure cannot
 * leave a User with no way to sign in.
 */
export async function findOrCreateUserFromGoogle(
  identity: GoogleIdentity,
  requestedRole: Role
): Promise<OAuthResult> {
  // 1. Already linked.
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId,
      },
    },
    select: { user: { select: OAUTH_USER_SELECT } },
  });

  if (existingAccount) {
    return { user: existingAccount.user, outcome: "returning" };
  }

  // 2. Same email as an existing account -> link rather than duplicate.
  const existingUser = await prisma.user.findUnique({
    where: { email: identity.email },
    select: OAUTH_USER_SELECT,
  });

  if (existingUser) {
    if (!identity.emailVerified) {
      throw new Error(
        "An account already exists with this email. Sign in with your password, " +
          "or verify this address with Google before linking."
      );
    }

    await prisma.account.create({
      data: {
        userId: existingUser.id,
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId,
        providerEmail: identity.email,
      },
    });

    /* Linking proves the address: the guard above refused unless Google itself
     * says it is verified, which is the same proof the confirmation link
     * collects. Only PENDING is promoted — a suspended account that links
     * Google stays suspended. */
    const promoted =
      !existingUser.emailVerified || existingUser.status === "PENDING"
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              emailVerified: true,
              ...(existingUser.status === "PENDING" ? { status: "ACTIVE" as const } : {}),
            },
            select: OAUTH_USER_SELECT,
          })
        : existingUser;

    return { user: promoted, outcome: "linked_existing" };
  }

  // 3. Brand new person. Role comes from what they chose before leaving the
  //    app, carried through the signed OAuth state — never from Google.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: identity.email,
        // No local password: the column is nullable precisely so this stays
        // honest rather than storing an unusable placeholder hash.
        password: null,
        role: requestedRole,
        // Mirrors the password path: ACTIVE means the address is confirmed,
        // and here Google has confirmed it. In the rare case Google reports an
        // unverified address the account starts PENDING like any other, and
        // the dashboard banner offers the confirmation link.
        status: identity.emailVerified ? "ACTIVE" : "PENDING",
        emailVerified: identity.emailVerified,
        firstName: identity.firstName || undefined,
        lastName: identity.lastName || undefined,
        candidateProfile: requestedRole === "CANDIDATE" ? { create: {} } : undefined,
        recruiterProfile: requestedRole === "RECRUITER" ? { create: {} } : undefined,
      },
      // select, not include: include returns every scalar column, and one
      // added by a pending migration refuses the insert.
      select: OAUTH_USER_SELECT,
    });

    await tx.account.create({
      data: {
        userId: created.id,
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId,
        providerEmail: identity.email,
      },
    });

    // A Job requires a Company, and the registration form creates one for
    // every recruiter. Mirroring that here keeps a Google recruiter in the
    // same state as a form-registered one.
    if (requestedRole === "RECRUITER" && created.recruiterProfile) {
      // Google gives us no company name, so the email's local part stands in,
      // exactly as it does for a form signup that left the field empty.
      const fallbackName = companyNameFrom(undefined, identity.email);

      await tx.company.create({
        data: {
          name: fallbackName,
          slug: slugify(fallbackName),
          plan: "FREE",
          members: {
            create: { role: "OWNER", recruiter: { connect: { id: created.recruiterProfile.id } } },
          },
        },
      });
    }

    return created;
  });

  return { user, outcome: "created" };
}
