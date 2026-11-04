import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Email confirmation, against a real database.
 *
 * The thing worth testing here is not the happy path — it is everything that
 * must *not* happen: a spent token working twice, an expired link still
 * confirming, and a confirmation quietly un-suspending an account. Those are
 * all decided by rows and a transaction, so the database is part of the test.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

const isLocal = !!url && /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!isLocal && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error(
    "Refusing to run tests against a non-local database. These tests write and " +
      "delete rows. Set TEST_DATABASE_URL to a local database, or set " +
      "ALLOW_REMOTE_TEST_DB=1 if you are certain."
  );
}

process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });

const verification = await import("./emailVerification.service");

const EMAIL = "verify-test@example.invalid";
let userId: string;

/** The account as registration leaves it: PENDING and unconfirmed. */
const reset = async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: { email: EMAIL, password: "x", role: "CANDIDATE", firstName: "Verify" },
    select: { id: true },
  });
  return user.id;
};

const read = () =>
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { status: true, emailVerified: true },
  });

beforeEach(async () => {
  userId = await reset();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

describe("issueEmailVerificationToken", () => {
  it("stores only the hash, never the value in the link", async () => {
    const raw = await verification.issueEmailVerificationToken(userId);

    const rows = await prisma.emailVerificationToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("replaces an earlier unused link rather than adding to it", async () => {
    const first = await verification.issueEmailVerificationToken(userId);
    const second = await verification.issueEmailVerificationToken(userId);

    expect(await prisma.emailVerificationToken.count({ where: { userId } })).toBe(1);

    // The newest email is the one that works, which is what someone who
    // clicked "resend" expects.
    expect((await verification.consumeEmailVerificationToken(first)).ok).toBe(false);
    expect((await verification.consumeEmailVerificationToken(second)).ok).toBe(true);
  });
});

describe("consumeEmailVerificationToken", () => {
  it("confirms the address and promotes PENDING to ACTIVE", async () => {
    const raw = await verification.issueEmailVerificationToken(userId);

    const result = await verification.consumeEmailVerificationToken(raw);

    expect(result).toMatchObject({ ok: true, email: EMAIL, alreadyVerified: false });
    expect(await read()).toEqual({ status: "ACTIVE", emailVerified: true });
  });

  it("reports success on a second click without changing anything", async () => {
    const raw = await verification.issueEmailVerificationToken(userId);
    await verification.consumeEmailVerificationToken(raw);

    // Mail clients prefetch links and people double-click. Telling a confirmed
    // user their link is invalid would send them looking for a problem that
    // does not exist.
    const again = await verification.consumeEmailVerificationToken(raw);

    expect(again).toMatchObject({ ok: true, alreadyVerified: true });
    expect(await read()).toEqual({ status: "ACTIVE", emailVerified: true });
  });

  it("refuses an expired link and leaves the account alone", async () => {
    const raw = await verification.issueEmailVerificationToken(userId);
    await prisma.emailVerificationToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await verification.consumeEmailVerificationToken(raw)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(await read()).toEqual({ status: "PENDING", emailVerified: false });
  });

  it("refuses a token that was never issued", async () => {
    expect(await verification.consumeEmailVerificationToken("not-a-token")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await read()).toEqual({ status: "PENDING", emailVerified: false });
  });

  it("refuses an empty token without touching the database", async () => {
    expect(await verification.consumeEmailVerificationToken("")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("confirms a suspended account without un-suspending it", async () => {
    await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
    const raw = await verification.issueEmailVerificationToken(userId);

    expect((await verification.consumeEmailVerificationToken(raw)).ok).toBe(true);

    // The link proves the person reads the mailbox. That is not a reason to
    // undo a moderator's decision.
    expect(await read()).toEqual({ status: "SUSPENDED", emailVerified: true });
  });

  it("leaves a DELETED account deleted", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    const raw = await verification.issueEmailVerificationToken(userId);

    await verification.consumeEmailVerificationToken(raw);

    expect(await read()).toEqual({ status: "DELETED", emailVerified: true });
  });
});

describe("verificationUrl", () => {
  it("escapes the token so a base64url value survives the query string", () => {
    const url = verification.verificationUrl("a+b/c=d");
    expect(url).toContain("verifier=a%2Bb%2Fc%3Dd");
    expect(url).not.toContain("verifier=a+b/c=d");
  });

  it("does not double the slash when APP_URL has a trailing one", () => {
    const previous = process.env.APP_URL;
    process.env.APP_URL = "https://example.test/";
    try {
      expect(verification.verificationUrl("t")).toBe("https://example.test/?verifier=t");
    } finally {
      if (previous === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previous;
    }
  });
});
