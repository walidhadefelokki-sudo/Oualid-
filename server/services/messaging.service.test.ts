import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Conversations, against a real database.
 *
 * What is worth testing here is who can read what. A thread is the only
 * record of what two people agreed, so a bug that lets a third account open
 * one is the worst thing this feature can do — worse than losing a message.
 * Find-or-create is the other risk: get it wrong and a working relationship
 * splits into two half-threads, each missing the other's replies.
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

const messaging = await import("./messaging.service");
const { MessagingError } = messaging;

const EMAILS = [
  "msg-client@example.invalid",
  "msg-freelancer@example.invalid",
  "msg-stranger@example.invalid",
];

let clientId: string;
let freelancerUserId: string;
let strangerId: string;
let freelancerProfileId: string;

const wipe = async () => {
  // Conversations cascade from their participants, and participants cascade
  // from the user, so removing the accounts is enough.
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
};

beforeEach(async () => {
  await wipe();

  const mk = (email: string, firstName?: string) =>
    prisma.user.create({
      data: { email, password: "x", role: "CANDIDATE", firstName: firstName ?? null },
      select: { id: true },
    });

  clientId = (await mk(EMAILS[0], "Karim")).id;
  freelancerUserId = (await mk(EMAILS[1], "Amina")).id;
  // Left nameless on purpose, so the e-mail fallback has something to fall
  // back from.
  strangerId = (await mk(EMAILS[2])).id;

  const profile = await prisma.freelancerProfile.create({
    data: {
      userId: freelancerUserId,
      username: `msg-test-${Date.now().toString(36)}`,
      displayName: "Amina B.",
    },
    select: { id: true },
  });
  freelancerProfileId = profile.id;
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("openWith", () => {
  it("creates one thread and finds the same one again", async () => {
    const first = await messaging.openWith(clientId, freelancerUserId);
    const second = await messaging.openWith(clientId, freelancerUserId);

    expect(second.id).toBe(first.id);
    expect(await prisma.conversation.count()).toBeGreaterThan(0);

    // Found from either side: the freelancer replying must land in the thread
    // the client started, not open a second one.
    const fromOtherSide = await messaging.openWith(freelancerUserId, clientId);
    expect(fromOtherSide.id).toBe(first.id);
  });

  it("refuses a thread with yourself", async () => {
    await expect(messaging.openWith(clientId, clientId)).rejects.toThrow(MessagingError);
  });

  it("refuses a deleted account", async () => {
    await prisma.user.update({
      where: { id: freelancerUserId },
      data: { status: "DELETED", deletedAt: new Date() },
    });

    await expect(messaging.openWith(clientId, freelancerUserId)).rejects.toThrow(
      /n'est plus disponible/
    );
  });

  it("keeps an order's thread apart from the pair's general one", async () => {
    const general = await messaging.openWith(clientId, freelancerUserId);

    const order = await prisma.freelanceOrder.create({
      data: {
        reference: `TST-${Date.now().toString(36)}`,
        clientId,
        freelancerId: freelancerProfileId,
        agreedPrice: "1000",
      },
      select: { id: true },
    });

    const attached = await messaging.openWith(clientId, freelancerUserId, order.id);

    // An order is the only account of one specific job. Folding its messages
    // into the general thread would make that history unreadable on its own.
    expect(attached.id).not.toBe(general.id);

    const again = await messaging.openWith(clientId, freelancerUserId, order.id);
    expect(again.id).toBe(attached.id);
  });
});

describe("access control", () => {
  it("hides a thread from an account that is not in it", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);

    // 404, not 403: a thread nobody told you about should not be
    // distinguishable from one that does not exist.
    await expect(messaging.threadFor(id, strangerId)).rejects.toMatchObject({ status: 404 });
    await expect(messaging.send(id, strangerId, "hello")).rejects.toMatchObject({ status: 404 });
    await expect(messaging.markRead(id, strangerId)).rejects.toMatchObject({ status: 404 });
  });

  it("opens a project's client only to a freelancer who has proposed", async () => {
    const project = await prisma.freelanceProject.create({
      data: {
        clientId,
        title: "Refonte du site",
        slug: `msg-test-project-${Date.now().toString(36)}`,
        description: "Une refonte complète.",
        budgetType: "FIXED",
        status: "OPEN",
      },
      select: { id: true },
    });

    // Answering a project costs a credit or a slot in a subscription's monthly
    // allowance. If a public project page opened a free channel to the client,
    // that charge would be a fee for something nobody needs to pay for.
    await expect(
      messaging.clientBehindProject(project.id, freelancerUserId)
    ).rejects.toMatchObject({ status: 403 });

    await prisma.proposal.create({
      data: {
        projectId: project.id,
        freelancerId: freelancerProfileId,
        coverLetter: "Je peux faire ça.",
        price: "50000",
        deliveryDays: 10,
      },
    });

    expect(await messaging.clientBehindProject(project.id, freelancerUserId)).toBe(clientId);
  });

  it("refuses to resolve the other side of someone else's order", async () => {
    const order = await prisma.freelanceOrder.create({
      data: {
        reference: `TST-${Date.now().toString(36)}-b`,
        clientId,
        freelancerId: freelancerProfileId,
        agreedPrice: "1000",
      },
      select: { id: true },
    });

    expect(await messaging.otherSideOfOrder(order.id, clientId)).toBe(freelancerUserId);
    expect(await messaging.otherSideOfOrder(order.id, freelancerUserId)).toBe(clientId);
    await expect(messaging.otherSideOfOrder(order.id, strangerId)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("send and read", () => {
  it("delivers a message and shows it as mine to the sender only", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);
    await messaging.send(id, clientId, "Bonjour, êtes-vous disponible ?");

    const mine = await messaging.threadFor(id, clientId);
    expect(mine.messages).toHaveLength(1);
    expect(mine.messages[0].mine).toBe(true);
    expect(mine.conversation.with?.name).toBe("Amina B.");

    const theirs = await messaging.threadFor(id, freelancerUserId);
    expect(theirs.messages[0].mine).toBe(false);
  });

  it("refuses an empty message", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);
    await expect(messaging.send(id, clientId, "   ")).rejects.toThrow(/vide/);
  });

  it("refuses a message over the length limit", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);
    await expect(messaging.send(id, clientId, "a".repeat(5001))).rejects.toThrow(/trop long/);
  });

  it("counts the other side's messages as unread, never your own", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);

    await messaging.send(id, clientId, "un");
    await messaging.send(id, clientId, "deux");

    // Sending marks your own side read, so a sender never sees a badge for
    // their own messages.
    expect(await messaging.unreadTotal(clientId)).toBe(0);
    expect(await messaging.unreadTotal(freelancerUserId)).toBe(2);

    await messaging.threadFor(id, freelancerUserId);
    expect(await messaging.unreadTotal(freelancerUserId)).toBe(0);
  });

  it("clears unread even when the database clock runs ahead of this process", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);
    await messaging.send(id, clientId, "un");

    /* In production the message timestamp comes from Postgres and the
     * application runs on another machine. Ten seconds of skew stands in for
     * any amount of it: marking a thread read with `new Date()` would write a
     * lastReadAt *before* the message it just showed the reader, and the
     * badge would never clear again. */
    await prisma.message.updateMany({
      where: { conversationId: id },
      data: { createdAt: new Date(Date.now() + 10_000) },
    });

    expect(await messaging.unreadTotal(freelancerUserId)).toBe(1);

    await messaging.threadFor(id, freelancerUserId);

    expect(await messaging.unreadTotal(freelancerUserId)).toBe(0);
  });

  it("orders threads by their own last message", async () => {
    const a = await messaging.openWith(clientId, freelancerUserId);
    const b = await messaging.openWith(clientId, strangerId);

    await messaging.send(a.id, clientId, "premier");
    await messaging.send(b.id, clientId, "deuxième");
    await messaging.send(a.id, clientId, "troisième");

    const { threads } = await messaging.listFor(clientId);
    expect(threads[0].id).toBe(a.id);
    expect(threads[0].lastMessage?.body).toBe("troisième");
    expect(threads[1].id).toBe(b.id);
  });

  it("returns only what a poll has not seen", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);
    const first = await messaging.send(id, clientId, "un");
    await messaging.send(id, freelancerUserId, "deux");

    const fresh = await messaging.threadFor(id, clientId, {
      after: first.createdAt.toISOString(),
    });

    expect(fresh.messages.map((m) => m.body)).toEqual(["deux"]);
  });

  it("refuses a malformed after parameter", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);
    await expect(messaging.threadFor(id, clientId, { after: "yesterday" })).rejects.toThrow(
      /after/
    );
  });

  it("falls back to the e-mail local part, never the whole address", async () => {
    const { id } = await messaging.openWith(clientId, strangerId);
    const thread = await messaging.threadFor(id, clientId);

    expect(thread.conversation.with?.name).toBe("msg-stranger");
    expect(thread.conversation.with?.name).not.toContain("@");
  });
});

describe("contactFlags", () => {
  const flagged = (body: string) => messaging.contactFlags(body).length > 0;

  it("catches a phone number however it is written", () => {
    expect(flagged("appelez-moi au 0555 12 34 56")).toBe(true);
    expect(flagged("+213555123456")).toBe(true);
    expect(flagged("00213-555-123456")).toBe(true);
    expect(flagged("0770.11.22.33")).toBe(true);
  });

  it("catches a number spelled out to dodge a digit filter", () => {
    expect(flagged("zero cinq cinq cinq un deux trois quatre")).toBe(true);
  });

  it("catches an e-mail, including the obfuscated form", () => {
    expect(flagged("ecrivez a amina@gmail.com")).toBe(true);
    expect(flagged("amina (arobase) gmail . com")).toBe(true);
  });

  it("catches a push to an external messenger", () => {
    expect(flagged("on continue sur WhatsApp")).toBe(true);
    expect(flagged("mon telegram est plus rapide")).toBe(true);
    expect(flagged("on traite hors plateforme, moins de frais")).toBe(true);
  });

  it("leaves an ordinary message alone", () => {
    expect(flagged("Bonjour, je peux livrer en 5 jours pour 12000 DA.")).toBe(false);
    expect(flagged("Le logo fait 1024 x 1024 pixels.")).toBe(false);
    // A portfolio link is normal and useful here, so a bare URL is not a flag.
    expect(flagged("voici mon travail : https://behance.net/amina")).toBe(false);
    // Reference numbers and prices are full of digits and must not trip it.
    expect(flagged("commande SRV-1A2B3C, total 45000 DA, acompte 15000")).toBe(false);
  });

  it("names every reason it found, for the moderator who reads it", () => {
    const reasons = messaging.contactFlags("0555123456 ou amina@gmail.com, ou WhatsApp");
    expect(reasons).toContain("numéro de téléphone");
    expect(reasons).toContain("adresse e-mail");
    expect(reasons).toContain("messagerie externe");
  });

  it("flags the message but still delivers it", async () => {
    const { id } = await messaging.openWith(clientId, freelancerUserId);
    const sent = await messaging.send(id, clientId, "mon numero: 0555 12 34 56");

    // Never a block and never a ban: only a person can tell a plumber quoting
    // their own landline from someone dodging the platform.
    expect(sent.flagged).toBe(true);
    expect(sent.flagReason).toContain("téléphone");

    const thread = await messaging.threadFor(id, freelancerUserId);
    expect(thread.messages).toHaveLength(1);
    // The recipient is not shown the flag: that would turn a guess into an
    // accusation.
    expect(thread.messages[0].flagged).toBe(false);

    const own = await messaging.threadFor(id, clientId);
    expect(own.messages[0].flagged).toBe(true);
  });
});
