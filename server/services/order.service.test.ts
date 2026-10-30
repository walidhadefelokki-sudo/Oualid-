import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * The order state machine.
 *
 * Two people with opposing interests act on the same row, so the cases that
 * matter are the ones where the wrong side acts, or the right side acts at
 * the wrong moment.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error("Refusing to run against a non-local database.");
}
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const orders = await import("./order.service");

const CLIENT = "order-client@example.invalid";
const FREELANCER = "order-freelancer@example.invalid";
const STRANGER = "order-stranger@example.invalid";

let clientId: string;
let freelancerUserId: string;
let freelancerId: string;
let strangerId: string;
let orderId: string;
let projectId: string;

beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [CLIENT, FREELANCER, STRANGER] } },
  });

  const client = await prisma.user.create({
    data: { email: CLIENT, password: "x", role: "CANDIDATE", firstName: "Client" },
    select: { id: true },
  });
  clientId = client.id;

  const f = await prisma.user.create({
    data: {
      email: FREELANCER,
      password: "x",
      role: "CANDIDATE",
      freelancerProfile: {
        create: { username: `ord-${Date.now()}`, displayName: "Freelance" },
      },
    },
    select: { id: true, freelancerProfile: { select: { id: true } } },
  });
  freelancerUserId = f.id;
  freelancerId = f.freelancerProfile!.id;

  const s = await prisma.user.create({
    data: { email: STRANGER, password: "x", role: "CANDIDATE" },
    select: { id: true },
  });
  strangerId = s.id;

  const project = await prisma.freelanceProject.create({
    data: {
      clientId,
      title: "Projet de test",
      slug: `ord-proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: "Une description de longueur raisonnable pour le test.",
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });
  projectId = project.id;

  const order = await prisma.freelanceOrder.create({
    data: {
      reference: `ORD-${Date.now()}`,
      clientId,
      freelancerId,
      projectId,
      agreedPrice: "60000",
      status: "CREATED",
    },
    select: { id: true },
  });
  orderId = order.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [CLIENT, FREELANCER, STRANGER] } },
  });
  await prisma.$disconnect();
});

describe("access", () => {
  it("hides an order from anyone who is not a party to it", async () => {
    await expect(orders.detail(orderId, strangerId)).rejects.toThrow(/introuvable/);
  });

  it("tells each party which side they are on", async () => {
    expect((await orders.detail(orderId, clientId)).side).toBe("client");
    expect((await orders.detail(orderId, freelancerUserId)).side).toBe("freelancer");
  });
});

describe("deliver", () => {
  it("records a delivery and moves the order", async () => {
    const d = await orders.deliver(orderId, freelancerUserId, "Voici la première version.");
    expect(d.attempt).toBe(1);

    const after = await prisma.freelanceOrder.findUnique({ where: { id: orderId } });
    expect(after!.status).toBe("DELIVERED");
  });

  it("refuses a delivery from the client", async () => {
    await expect(orders.deliver(orderId, clientId, "x")).rejects.toThrow(/freelance/);
  });

  it("keeps each attempt rather than overwriting", async () => {
    await orders.deliver(orderId, freelancerUserId, "Première version.");
    await orders.requestRevision(orderId, clientId, "Le logo est trop petit.");
    const second = await orders.deliver(orderId, freelancerUserId, "Logo agrandi.");

    expect(second.attempt).toBe(2);
    const all = await prisma.orderDelivery.findMany({ where: { orderId } });
    expect(all).toHaveLength(2);
  });

  it("refuses to deliver twice without a revision in between", async () => {
    await orders.deliver(orderId, freelancerUserId, "Première version.");
    await expect(orders.deliver(orderId, freelancerUserId, "Encore")).rejects.toThrow(
      /n'attend pas de livraison/
    );
  });
});

describe("requestRevision", () => {
  beforeEach(async () => {
    await orders.deliver(orderId, freelancerUserId, "Première version.");
  });

  it("requires a reason", async () => {
    await expect(orders.requestRevision(orderId, clientId, "   ")).rejects.toThrow(/revu/);
  });

  it("records the reason against the delivery it refers to", async () => {
    await orders.requestRevision(orderId, clientId, "Le logo est trop petit.");

    const d = await prisma.orderDelivery.findFirst({ where: { orderId } });
    expect(d!.revisionRequested).toBe(true);
    expect(d!.revisionNote).toBe("Le logo est trop petit.");
  });

  it("refuses a revision asked for by the freelancer", async () => {
    await expect(
      orders.requestRevision(orderId, freelancerUserId, "je veux revoir")
    ).rejects.toThrow(/client/);
  });
});

describe("accept", () => {
  it("refuses to close an order that was never delivered", async () => {
    await expect(orders.accept(orderId, clientId)).rejects.toThrow(/livrée/);
  });

  it("closes the order, the project, and counts the completed mission", async () => {
    await orders.deliver(orderId, freelancerUserId, "Version finale.");

    const before = await prisma.freelancerProfile.findUnique({ where: { id: freelancerId } });
    await orders.accept(orderId, clientId);
    const after = await prisma.freelancerProfile.findUnique({ where: { id: freelancerId } });

    expect(after!.completedOrders).toBe(before!.completedOrders + 1);

    const order = await prisma.freelanceOrder.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("COMPLETED");
    expect(order!.completedAt).toBeTruthy();

    const project = await prisma.freelanceProject.findUnique({ where: { id: projectId } });
    expect(project!.status).toBe("COMPLETED");
  });

  it("refuses a freelancer closing their own order", async () => {
    await orders.deliver(orderId, freelancerUserId, "Version finale.");
    await expect(orders.accept(orderId, freelancerUserId)).rejects.toThrow(/client/);
  });
});

describe("cancel", () => {
  it("allows cancelling before anything was delivered", async () => {
    const result = await orders.cancel(orderId, clientId, "Besoin reporté.");
    expect(result.status).toBe("CANCELLED");
  });

  it("refuses once work has been delivered", async () => {
    await orders.deliver(orderId, freelancerUserId, "Livraison.");
    await expect(orders.cancel(orderId, clientId, "Finalement non")).rejects.toThrow(/litige/);
  });

  it("requires a reason", async () => {
    await expect(orders.cancel(orderId, clientId, "")).rejects.toThrow(/motif/);
  });
});

describe("the trail", () => {
  it("records every move, in order, with who made it", async () => {
    await orders.start(orderId, freelancerUserId);
    await orders.deliver(orderId, freelancerUserId, "v1");
    await orders.requestRevision(orderId, clientId, "à revoir");
    await orders.deliver(orderId, freelancerUserId, "v2");
    await orders.accept(orderId, clientId);

    const { order } = await orders.detail(orderId, clientId);
    expect(order.events.map((e: { toStatus: string }) => e.toStatus)).toEqual([
      "IN_PROGRESS",
      "DELIVERED",
      "REVISION_REQUESTED",
      "DELIVERED",
      "COMPLETED",
    ]);

    // The revision reason is readable from the trail, not only from the
    // delivery, because a dispute is read here.
    const revision = order.events.find(
      (e: { toStatus: string }) => e.toStatus === "REVISION_REQUESTED"
    );
    expect(revision.note).toBe("à revoir");
  });
});
