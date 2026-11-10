import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Offers quoted inside a conversation, against a real database.
 *
 * An offer turns into an order, which is money and an obligation, so what is
 * tested here is everything that must not happen: a second order from the
 * same offer, an accept by somebody who is not the client, an expired quote
 * honoured weeks later, two live offers leaving the freelancer unsure which
 * price they are held to.
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
const offers = await import("./customOffer.service");

const TAG = "offer-test";

let clientId: string;
let freelancerUserId: string;
let freelancerProfileId: string;
let strangerId: string;
let conversationId: string;

const base = {
  title: "Refonte du logo",
  description: "Trois propositions, fichiers vectoriels.",
  price: 45000,
  deliveryDays: 10,
  revisions: 2,
};

const sendOffer = (over: Partial<typeof base> & { validDays?: number } = {}) =>
  offers.send({ conversationId, userId: freelancerUserId, ...base, ...over });

const wipe = async () => {
  await prisma.user.deleteMany({ where: { email: { contains: TAG } } });
};

beforeEach(async () => {
  await wipe();

  const client = await prisma.user.create({
    data: { email: `${TAG}-client@example.invalid`, password: "x", role: "CANDIDATE", firstName: "Karim" },
    select: { id: true },
  });

  const freelancer = await prisma.user.create({
    data: {
      email: `${TAG}-free@example.invalid`,
      password: "x",
      role: "CANDIDATE",
      firstName: "Amina",
      freelancerProfile: {
        create: { username: `${TAG}-${Math.random().toString(36).slice(2, 8)}`, displayName: "Amina B." },
      },
    },
    include: { freelancerProfile: true },
  });

  const stranger = await prisma.user.create({
    data: { email: `${TAG}-stranger@example.invalid`, password: "x", role: "CANDIDATE" },
    select: { id: true },
  });

  clientId = client.id;
  freelancerUserId = freelancer.id;
  freelancerProfileId = freelancer.freelancerProfile!.id;
  strangerId = stranger.id;

  const conversation = await prisma.conversation.create({
    data: { participants: { create: [{ userId: clientId }, { userId: freelancerUserId }] } },
    select: { id: true },
  });
  conversationId = conversation.id;
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("sending", () => {
  it("quotes a price, a delay and revisions", async () => {
    const offer = await sendOffer();

    expect(offer).toMatchObject({
      title: "Refonte du logo",
      price: 45000,
      deliveryDays: 10,
      revisions: 2,
      status: "SENT",
    });
    expect(offer.orderId).toBeNull();
    expect(offer.expiresAt).toBeTruthy();
  });

  it("refuses somebody who is not a freelancer", async () => {
    // The client is in the thread but has no freelancer profile.
    await expect(
      offers.send({ conversationId, userId: clientId, ...base })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("refuses somebody outside the conversation", async () => {
    // 404, not 403: a thread nobody told you about should not be
    // distinguishable from one that does not exist.
    await expect(
      offers.send({ conversationId, userId: strangerId, ...base })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("refuses prices and delays outside what an offer can mean", async () => {
    await expect(sendOffer({ price: 10 })).rejects.toThrow(/prix/i);
    await expect(sendOffer({ price: 99_000_000 })).rejects.toThrow(/prix/i);
    await expect(sendOffer({ deliveryDays: 0 })).rejects.toThrow(/délai/i);
    await expect(sendOffer({ deliveryDays: 500 })).rejects.toThrow(/délai/i);
    await expect(sendOffer({ revisions: -1 })).rejects.toThrow(/révisions/i);
    await expect(sendOffer({ title: "x" })).rejects.toThrow(/titre/i);
  });

  it("supersedes a live offer instead of leaving two standing", async () => {
    const first = await sendOffer({ price: 45000 });
    const second = await sendOffer({ price: 38000 });

    /* Two live offers mean the client can accept either and the freelancer
     * does not know which price they are held to. Re-quoting after a
     * conversation is normal, so the old one is withdrawn rather than the new
     * one refused. */
    const all = (await offers.listForConversation(conversationId, clientId)).offers;
    expect(all.find((o) => o.id === first.id)!.status).toBe("WITHDRAWN");
    expect(all.find((o) => o.id === second.id)!.status).toBe("SENT");
    expect(all.filter((o) => o.status === "SENT")).toHaveLength(1);
  });
});

describe("accepting", () => {
  it("creates an order on the offer's own terms", async () => {
    const offer = await sendOffer();
    const { order, offer: accepted } = await offers.accept(offer.id, clientId);

    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.orderId).toBe(order.id);
    expect(order.reference).toMatch(/^OFF-/);
    // The price stored when it was sent, never anything the request carried.
    expect(Number(order.agreedPrice)).toBe(45000);
    expect(order.status).toBe("CREATED");

    const stored = await prisma.freelanceOrder.findUniqueOrThrow({
      where: { id: order.id },
      select: { clientId: true, freelancerId: true, serviceId: true, projectId: true, deliveryDueAt: true },
    });

    expect(stored.clientId).toBe(clientId);
    expect(stored.freelancerId).toBe(freelancerProfileId);
    // Neither: this order came from a conversation, and pointing at a service
    // it did not come from would be a lie the order screens would repeat.
    expect(stored.serviceId).toBeNull();
    expect(stored.projectId).toBeNull();
    expect(stored.deliveryDueAt).toBeTruthy();
  });

  it("records the acceptance on the order's trail", async () => {
    const offer = await sendOffer();
    const { order } = await offers.accept(offer.id, clientId);

    const event = await prisma.orderEvent.findFirst({
      where: { orderId: order.id },
      select: { note: true, actorId: true },
    });

    expect(event?.actorId).toBe(clientId);
    expect(event?.note).toContain("Refonte du logo");
  });

  it("refuses a second accept, so one offer is never two orders", async () => {
    const offer = await sendOffer();
    await offers.accept(offer.id, clientId);

    await expect(offers.accept(offer.id, clientId)).rejects.toMatchObject({ status: 409 });
    expect(await prisma.freelanceOrder.count({ where: { clientId } })).toBe(1);
  });

  it("lets only the client accept", async () => {
    const offer = await sendOffer();

    // The freelancer accepting their own quote would be ordering on the
    // client's behalf.
    await expect(offers.accept(offer.id, freelancerUserId)).rejects.toMatchObject({ status: 403 });
    await expect(offers.accept(offer.id, strangerId)).rejects.toMatchObject({ status: 404 });
    expect(await prisma.freelanceOrder.count()).toBe(0);
  });

  it("refuses an offer that has run out of time", async () => {
    const offer = await sendOffer();
    await prisma.customOffer.update({
      where: { id: offer.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    /* Computed on read rather than swept by a job: nothing here runs on a
     * schedule, and a quote honoured three weeks late because no cron fired
     * is worse than one line of arithmetic. */
    await expect(offers.accept(offer.id, clientId)).rejects.toThrow(/expiré/i);
    expect(await prisma.freelanceOrder.count()).toBe(0);
  });

  it("reports an expired offer as expired without being asked to act", async () => {
    const offer = await sendOffer();
    await prisma.customOffer.update({
      where: { id: offer.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const [listed] = (await offers.listForConversation(conversationId, clientId)).offers;
    expect(listed.status).toBe("EXPIRED");
  });

  it("attaches the thread to the order it produced", async () => {
    const offer = await sendOffer();
    const { order } = await offers.accept(offer.id, clientId);

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { orderId: true },
    });

    expect(conversation.orderId).toBe(order.id);
  });
});

describe("refusing and withdrawing", () => {
  it("lets the client decline", async () => {
    const offer = await sendOffer();
    expect((await offers.decline(offer.id, clientId)).status).toBe("DECLINED");
    expect(await prisma.freelanceOrder.count()).toBe(0);
  });

  it("lets the freelancer withdraw before an answer", async () => {
    const offer = await sendOffer();
    expect((await offers.withdraw(offer.id, freelancerUserId)).status).toBe("WITHDRAWN");
  });

  it("will not let each side do the other's part", async () => {
    const offer = await sendOffer();
    await expect(offers.decline(offer.id, freelancerUserId)).rejects.toMatchObject({ status: 403 });
    await expect(offers.withdraw(offer.id, clientId)).rejects.toMatchObject({ status: 403 });
  });

  it("will not withdraw an offer that is already an order", async () => {
    const offer = await sendOffer();
    await offers.accept(offer.id, clientId);

    // The order exists and the work may have started; withdrawing the quote
    // would undo neither.
    await expect(offers.withdraw(offer.id, freelancerUserId)).rejects.toThrow(/acceptée/i);
  });

  it("will not accept one that was declined", async () => {
    const offer = await sendOffer();
    await offers.decline(offer.id, clientId);

    await expect(offers.accept(offer.id, clientId)).rejects.toMatchObject({ status: 409 });
  });
});

describe("reading", () => {
  it("shows both sides the history of what was quoted", async () => {
    await sendOffer({ price: 45000 });
    await sendOffer({ price: 38000 });

    const forClient = (await offers.listForConversation(conversationId, clientId)).offers;
    const forFreelancer = (await offers.listForConversation(conversationId, freelancerUserId)).offers;

    expect(forClient).toHaveLength(2);
    expect(forClient.map((o) => o.price)).toEqual([38000, 45000]);
    expect(forFreelancer).toHaveLength(2);
  });

  it("shows nothing to somebody outside the thread", async () => {
    await sendOffer();
    await expect(
      offers.listForConversation(conversationId, strangerId)
    ).rejects.toMatchObject({ status: 404 });
  });
});
