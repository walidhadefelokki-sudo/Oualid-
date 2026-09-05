import crypto from "crypto";
import prisma from "../utils/prisma";
import { Role, User } from "@prisma/client";

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

export interface OAuthResult {
  user: User;
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
    include: { user: true },
  });

  if (existingAccount) {
    return { user: existingAccount.user, outcome: "returning" };
  }

  // 2. Same email as an existing account -> link rather than duplicate.
  const existingUser = await prisma.user.findUnique({
    where: { email: identity.email },
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

    return { user: existingUser, outcome: "linked_existing" };
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
        status: "ACTIVE",
        emailVerified: identity.emailVerified,
        firstName: identity.firstName || undefined,
        lastName: identity.lastName || undefined,
        candidateProfile: requestedRole === "CANDIDATE" ? { create: {} } : undefined,
        recruiterProfile: requestedRole === "RECRUITER" ? { create: {} } : undefined,
      },
      include: { recruiterProfile: true },
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
      await tx.company.create({
        data: {
          name: "My Company",
          slug: slugify("My Company"),
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
