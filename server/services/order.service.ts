import { FreelanceOrderStatus } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * The life of an order.
 *
 * Created → delivered → accepted, with revisions looping back. Every move is
 * checked against the status the order is actually in, and recorded on an
 * append-only trail, because an order is the only account of what two people
 * agreed and a dispute is read from it.
 *
 * The platform does not hold the money under the MVP model: client and
 * freelancer settle between themselves. What is tracked here is the work —
 * what was promised, what was delivered, and who said it was finished.
 */

export class OrderError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "OrderError";
  }
}

/** Which side of an order this account is on, or neither. */
export const sideOf = async (orderId: string, userId: string) => {
  const order = await prisma.freelanceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      clientId: true,
      freelancerId: true,
      freelancer: { select: { userId: true } },
    },
  });

  if (!order) throw new OrderError("Commande introuvable.", 404);

  const side =
    order.clientId === userId
      ? ("client" as const)
      : order.freelancer.userId === userId
        ? ("freelancer" as const)
        : null;

  // Not "forbidden": an order nobody told you about should not be
  // distinguishable from one that does not exist.
  if (!side) throw new OrderError("Commande introuvable.", 404);

  return { order, side };
};

/** Records a status change. Written in the same transaction as the change. */
const eventFor = (
  orderId: string,
  actorId: string,
  from: FreelanceOrderStatus,
  to: FreelanceOrderStatus,
  note?: string
) =>
  prisma.orderEvent.create({
    data: { orderId, actorId, fromStatus: from, toStatus: to, note: note ?? null },
  });

/** The freelancer marks the work started. */
export const start = async (orderId: string, userId: string) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "freelancer") throw new OrderError("Seul le freelance peut démarrer.", 403);
  if (order.status !== "CREATED") throw new OrderError("Cette commande a déjà démarré.", 409);

  const [updated] = await prisma.$transaction([
    prisma.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.IN_PROGRESS },
      select: { id: true, status: true },
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.IN_PROGRESS),
  ]);

  return updated;
};

/**
 * The freelancer delivers.
 *
 * Each delivery is its own row rather than an overwrite: a client comparing
 * what arrived with what they asked for should be able to see the previous
 * attempt, and a dispute turns on exactly that.
 */
export const deliver = async (
  orderId: string,
  userId: string,
  message: string,
  fileIds: string[] = []
) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "freelancer") throw new OrderError("Seul le freelance peut livrer.", 403);

  if (!["CREATED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(order.status)) {
    throw new OrderError("Cette commande n'attend pas de livraison.", 409);
  }

  const attempt = await prisma.orderDelivery.count({ where: { orderId: order.id } });

  const [, delivery] = await prisma.$transaction([
    prisma.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.DELIVERED },
    }),
    prisma.orderDelivery.create({
      data: {
        orderId: order.id,
        message: message?.trim() || null,
        attempt: attempt + 1,
        files: fileIds.length
          ? { create: fileIds.map((fileId) => ({ fileId })) }
          : undefined,
      },
      select: { id: true, attempt: true, createdAt: true },
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.DELIVERED),
  ]);

  return delivery;
};

/**
 * The client asks for changes.
 *
 * A reason is required. "Non" with nothing attached gives the freelancer
 * nothing to act on, and the next delivery is a guess.
 */
export const requestRevision = async (orderId: string, userId: string, reason: string) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "client") throw new OrderError("Seul le client peut demander une révision.", 403);
  if (order.status !== "DELIVERED") {
    throw new OrderError("Aucune livraison à réviser.", 409);
  }
  if (!reason?.trim()) {
    throw new OrderError("Indiquez ce qui doit être revu.");
  }

  const latest = await prisma.orderDelivery.findFirst({
    where: { orderId: order.id },
    orderBy: { attempt: "desc" },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.REVISION_REQUESTED },
    }),
    ...(latest
      ? [
          prisma.orderDelivery.update({
            where: { id: latest.id },
            data: { revisionRequested: true, revisionNote: reason.trim() },
          }),
        ]
      : []),
    eventFor(
      order.id,
      userId,
      order.status,
      FreelanceOrderStatus.REVISION_REQUESTED,
      reason.trim()
    ),
  ]);

  return { status: FreelanceOrderStatus.REVISION_REQUESTED };
};

/**
 * The client accepts, and the order closes.
 *
 * `completedOrders` on the freelancer is incremented here rather than
 * counted on demand: it is read on every public card and every search
 * result, and counting completed orders per freelancer on each of those is
 * the kind of query that is fine until the day it is not.
 */
export const accept = async (orderId: string, userId: string) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "client") throw new OrderError("Seul le client peut clôturer.", 403);
  if (order.status !== "DELIVERED") {
    throw new OrderError("Cette commande n'a pas été livrée.", 409);
  }

  const now = new Date();

  const latest = await prisma.orderDelivery.findFirst({
    where: { orderId: order.id },
    orderBy: { attempt: "desc" },
    select: { id: true },
  });

  const [updated] = await prisma.$transaction([
    prisma.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.COMPLETED, completedAt: now },
      select: { id: true, status: true, completedAt: true, projectId: true },
    }),
    ...(latest
      ? [prisma.orderDelivery.update({ where: { id: latest.id }, data: { acceptedAt: now } })]
      : []),
    prisma.freelancerProfile.update({
      where: { id: order.freelancerId },
      data: { completedOrders: { increment: 1 } },
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.COMPLETED),
  ]);

  // A project is finished when the work for it is.
  if (updated.projectId) {
    await prisma.freelanceProject.updateMany({
      where: { id: updated.projectId, status: "IN_PROGRESS" },
      data: { status: "COMPLETED" },
    });
  }

  return updated;
};

/**
 * Either side cancels.
 *
 * Allowed before a delivery exists. After one, the work has been done and
 * walking away is a dispute rather than a cancellation — that is what the
 * dispute queue is for.
 */
export const cancel = async (orderId: string, userId: string, reason: string) => {
  const { order } = await sideOf(orderId, userId);

  if (!["CREATED", "IN_PROGRESS"].includes(order.status)) {
    throw new OrderError(
      "Cette commande a déjà une livraison. Ouvrez un litige plutôt que de l'annuler.",
      409
    );
  }
  if (!reason?.trim()) throw new OrderError("Indiquez le motif de l'annulation.");

  await prisma.$transaction([
    prisma.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.CANCELLED },
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.CANCELLED, reason.trim()),
  ]);

  return { status: FreelanceOrderStatus.CANCELLED };
};

/** One order in full, for whichever side is reading it. */
export const detail = async (orderId: string, userId: string) => {
  const { side } = await sideOf(orderId, userId);

  const order = await prisma.freelanceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      reference: true,
      status: true,
      agreedPrice: true,
      currency: true,
      deliveryDueAt: true,
      createdAt: true,
      completedAt: true,
      service: { select: { title: true, slug: true } },
      package: { select: { tier: true, name: true, revisions: true } },
      project: { select: { title: true, slug: true } },
      client: { select: { firstName: true, lastName: true } },
      freelancer: { select: { username: true, displayName: true } },
      addons: { select: { name: true, price: true } },
      deliveries: {
        orderBy: { attempt: "desc" },
        select: {
          id: true,
          message: true,
          attempt: true,
          revisionRequested: true,
          revisionNote: true,
          acceptedAt: true,
          createdAt: true,
          files: { select: { file: { select: { url: true, fileName: true } } } },
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actor: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return {
    side,
    order: {
      ...order!,
      clientName:
        [order!.client.firstName, order!.client.lastName].filter(Boolean).join(" ") || null,
      deliveries: order!.deliveries.map((d) => ({
        ...d,
        files: d.files.map((f) => f.file),
      })),
    },
  };
};



/**
 * Buys a service package.
 *
 * The total is computed here from the package and the chosen add-ons. A
 * price sent by the browser is a number the buyer picked, and an order is
 * what both sides are held to.
 *
 * Add-on names and prices are copied onto the order rather than referenced,
 * so repricing an add-on later cannot restate what an earlier buyer agreed.
 */
export const orderService = async (
  clientId: string,
  packageId: string,
  addonIds: string[] = []
) => {
  const pkg = await prisma.servicePackage.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      price: true,
      deliveryDays: true,
      service: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          freelancerId: true,
          freelancer: { select: { userId: true } },
        },
      },
    },
  });

  if (!pkg) throw new OrderError("Formule introuvable.", 404);

  const live =
    pkg.service.status === "PUBLISHED" &&
    (!pkg.service.expiresAt || pkg.service.expiresAt > new Date());
  if (!live) throw new OrderError("Ce service n'est plus disponible.", 409);

  if (pkg.service.freelancer.userId === clientId) {
    throw new OrderError("Vous ne pouvez pas commander votre propre service.", 403);
  }

  // Only add-ons belonging to this service, so an id from elsewhere cannot
  // be attached to change the total.
  const addons = addonIds.length
    ? await prisma.serviceAddon.findMany({
        where: { id: { in: addonIds }, serviceId: pkg.service.id },
        select: { id: true, name: true, price: true, extraDays: true },
      })
    : [];

  const total = addons.reduce((sum, a) => sum + Number(a.price), Number(pkg.price));
  const days = addons.reduce((sum, a) => sum + a.extraDays, pkg.deliveryDays);

  const order = await prisma.freelanceOrder.create({
    data: {
      reference: `SRV-${Date.now().toString(36).toUpperCase()}`,
      clientId,
      freelancerId: pkg.service.freelancerId,
      serviceId: pkg.service.id,
      packageId: pkg.id,
      agreedPrice: String(total),
      deliveryDueAt: new Date(Date.now() + days * 86_400_000),
      status: FreelanceOrderStatus.CREATED,
      addons: addons.length
        ? { create: addons.map((a) => ({ addonId: a.id, name: a.name, price: a.price })) }
        : undefined,
    },
    select: { id: true, reference: true, status: true, agreedPrice: true },
  });

  await eventFor(order.id, clientId, FreelanceOrderStatus.CREATED, FreelanceOrderStatus.CREATED, "Commande passée");

  return order;
};

export default {
  start,
  deliver,
  requestRevision,
  accept,
  cancel,
  detail,
  sideOf,
  orderService,
  OrderError,
};
