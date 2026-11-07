import crypto from "crypto";
import prisma from "../utils/prisma";

/**
 * Confirming an email address.
 *
 * `User.status` used to be decoration: every password signup was born PENDING
 * and nothing ever moved it, so the column told an administrator only that the
 * account had not been edited by hand. This gives it one meaning — PENDING is
 * an address nobody has proved they can read — and this file is the only place
 * that moves an account out of it.
 *
 * The link carries a random 256-bit value and the database keeps only its
 * SHA-256. A token is single-use and expires, so a link forwarded or left in a
 * mailbox months later confirms nothing.
 */

const TTL_MS = 48 * 60 * 60 * 1000;

/** Not a password hash: the input is already 256 bits of entropy, so a slow
 *  KDF would buy nothing and cost a round of CPU on every click. */
const digest = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Issues a fresh link for a user and invalidates any earlier unused one.
 *
 * Replacing rather than accumulating means "resend" cannot be used to build a
 * pile of live links to the same account, and the newest email is always the
 * one that works — which is what someone who clicked resend expects.
 */
export const issueEmailVerificationToken = async (userId: string): Promise<string> => {
  const raw = crypto.randomBytes(32).toString("base64url");

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: digest(raw),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    }),
  ]);

  return raw;
};

export type VerificationResult =
  | { ok: true; email: string; alreadyVerified: boolean }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Spends a token and confirms the address.
 *
 * `status` is promoted only from PENDING. A suspended or deleted account that
 * confirms its address stays suspended or deleted: the link proves the person
 * reads the mailbox, which is not a reason to undo a moderator's decision.
 */
export const consumeEmailVerificationToken = async (
  raw: string
): Promise<VerificationResult> => {
  if (!raw || typeof raw !== "string") return { ok: false, reason: "invalid" };

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: digest(raw) },
    include: { user: { select: { id: true, email: true, status: true, emailVerified: true } } },
  });

  if (!record || !record.user) return { ok: false, reason: "invalid" };

  // A second click on the same link is the common case — mail clients prefetch,
  // and people double-click. Report success rather than "invalid link", which
  // would make a user who is verified think they are not.
  if (record.usedAt) {
    return record.user.emailVerified
      ? { ok: true, email: record.user.email, alreadyVerified: true }
      : { ok: false, reason: "invalid" };
  }

  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.user.id },
      data: {
        emailVerified: true,
        ...(record.user.status === "PENDING" ? { status: "ACTIVE" as const } : {}),
      },
    }),
  ]);

  return { ok: true, email: record.user.email, alreadyVerified: record.user.emailVerified };
};

/**
 * The address the link in an email points at.
 *
 * The recruitment app has no router — a view is a string in `App.tsx` — so the
 * token rides on the site root as a query parameter, which the app reads on
 * load and strips from the bar.
 */
export const verificationUrl = (token: string) => {
  const base = (process.env.APP_URL || "https://www.darlemploi.dz").replace(/\/$/, "");
  return `${base}/?verifier=${encodeURIComponent(token)}`;
};
