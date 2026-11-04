import prisma from "../utils/prisma";

/**
 * Conversations between a client and a freelancer.
 *
 * Every public page on the marketplace names people without giving a way to
 * reach them — no e-mail, no phone, by design, because a deal struck over
 * WhatsApp leaves nothing to read when it goes wrong. That design only holds
 * up if there is somewhere to talk instead. This is that somewhere.
 *
 * Two deliberate limits:
 *
 *   A thread is between exactly two accounts. Group threads would need a
 *   different unread model and nothing in the specification asks for one.
 *
 *   Messages are polled, not pushed. A websocket on Vercel's serverless
 *   functions means another service to run; `after` makes polling cheap
 *   enough that it is not worth one yet.
 */

export class MessagingError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "MessagingError";
  }
}

const MAX_BODY = 5000;

/* -------------------------------------------------------------------------- */
/*                        Contact details in a message                        */
/* -------------------------------------------------------------------------- */

/**
 * Looks for an attempt to move the conversation off the platform.
 *
 * This flags; it never blocks and never bans. A plumber quoting their own
 * landline, a developer linking their GitHub, and someone saying "WhatsApp me
 * and we'll skip the fees" all produce the same match, and only a person can
 * tell them apart. So the message is delivered, the flag is raised, and a
 * moderator reads it.
 *
 * Deliberately not a general URL matcher: a link to a portfolio or a brief is
 * normal and useful here. What is checked is the shape of a direct line.
 */
const PATTERNS: Array<[RegExp, string]> = [
  // Algerian mobiles, with or without the country code and with any of the
  // usual separators: 0555 12 34 56, +213555123456, 00213-555-123456.
  [/(?:\+|00)\s*213[\s.\-]*[5-7]\d(?:[\s.\-]*\d){7}/, "numéro de téléphone"],
  [/(?:^|[^\d])0[5-7](?:[\s.\-]*\d){8}(?:[^\d]|$)/, "numéro de téléphone"],
  // Spelled out to dodge a digit filter: "zero five five five".
  [
    /\b(?:z[eé]ro|sifr)\b[\s,.\-]*(?:\b(?:un|deux|trois|quatre|cinq|six|sept|huit|neuf|z[eé]ro)\b[\s,.\-]*){5,}/i,
    "numéro de téléphone",
  ],
  [/[\w.+-]+@[\w-]+\.[\w.]{2,}/, "adresse e-mail"],
  // "arobase", "(at)", "[at]" standing in for the @.
  [
    /[\w.+-]{2,}\s*[([]?\s*(?:arobase|at|dot)\s*[)\]]?\s*[\w-]{2,}\s*\.\s*[a-z]{2,}/i,
    "adresse e-mail",
  ],
  [
    /\b(?:whats?app|watsapp|wtsp|telegram|t\.me|viber|imo|messenger|snapchat|instagram|insta|facebook)\b/i,
    "messagerie externe",
  ],
  [
    /(?:hors[\s-]?plateforme|en dehors de la plateforme|sans passer par (?:le )?site)/i,
    "contournement de la plateforme",
  ],
];

/** The reasons a message looks like an attempt to go off-platform. */
export const contactFlags = (body: string): string[] => {
  const found = new Set<string>();
  for (const [pattern, reason] of PATTERNS) {
    if (pattern.test(body)) found.add(reason);
  }
  return [...found];
};

/* -------------------------------------------------------------------------- */
/*                                  Threads                                   */
/* -------------------------------------------------------------------------- */

/** The thread, if this account is in it. */
const participantIn = async (conversationId: string, userId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      orderId: true,
      participants: { select: { userId: true, lastReadAt: true } },
    },
  });

  // Not "forbidden": a thread nobody told you about should not be
  // distinguishable from one that does not exist.
  if (!conversation || !conversation.participants.some((p) => p.userId === userId)) {
    throw new MessagingError("Conversation introuvable.", 404);
  }

  return conversation;
};

/**
 * The thread between two accounts, created if this is the first message.
 *
 * One thread per pair, on purpose. Threading per service or per project would
 * scatter a working relationship across half a dozen inboxes, and whatever a
 * message is about is already named on the order itself.
 *
 * The exception is a thread attached to an order: `Conversation.orderId` is
 * unique, so that one is found by the order and kept apart from the general
 * one, which is what makes an order's history readable on its own.
 */
export const openWith = async (userId: string, otherUserId: string, orderId?: string) => {
  if (userId === otherUserId) {
    throw new MessagingError("Vous ne pouvez pas vous écrire à vous-même.", 400);
  }

  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, status: true, deletedAt: true },
  });
  if (!other || other.status === "DELETED" || other.deletedAt) {
    throw new MessagingError("Ce compte n'est plus disponible.", 404);
  }

  if (orderId) {
    const existing = await prisma.conversation.findUnique({
      where: { orderId },
      select: { id: true },
    });
    if (existing) return existing;
  } else {
    /* The general thread between these two: the one with both of them in it
     * and no order attached. Found through the join rows rather than with a
     * unique key, because "a conversation with exactly these two
     * participants" is not something a constraint can express. */
    const mine = await prisma.conversationParticipant.findMany({
      where: { userId, conversation: { orderId: null } },
      select: { conversationId: true },
    });

    if (mine.length) {
      const shared = await prisma.conversationParticipant.findFirst({
        where: {
          userId: otherUserId,
          conversationId: { in: mine.map((m) => m.conversationId) },
        },
        select: { conversationId: true },
      });
      if (shared) return { id: shared.conversationId };
    }
  }

  return prisma.conversation.create({
    data: {
      orderId: orderId ?? null,
      participants: { create: [{ userId }, { userId: otherUserId }] },
    },
    select: { id: true },
  });
};

/** Resolves the account behind a freelancer's public username. */
export const userBehindUsername = async (username: string) => {
  const freelancer = await prisma.freelancerProfile.findUnique({
    where: { username },
    select: { userId: true },
  });
  if (!freelancer) throw new MessagingError("Freelance introuvable.", 404);
  return freelancer.userId;
};

/**
 * Resolves the client who published a project, for a freelancer writing in.
 *
 * Only a freelancer who has actually submitted a proposal. Answering a project
 * costs a credit or one of a subscription's monthly allowance, and that charge
 * is the marketplace's revenue on this side — an open channel to the client
 * from a public project page would make it a pitch nobody needs to pay for.
 * Having paid is what earns the thread.
 */
export const clientBehindProject = async (projectId: string, userId: string) => {
  const project = await prisma.freelanceProject.findFirst({
    where: { id: projectId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    select: { clientId: true },
  });
  if (!project) throw new MessagingError("Projet introuvable.", 404);

  const proposed = await prisma.proposal.findFirst({
    where: { projectId, freelancer: { userId } },
    select: { id: true },
  });

  if (!proposed) {
    throw new MessageAfterProposalError();
  }

  return project.clientId;
};

/** Named so the controller's 403 reads as the rule it is, not a generic refusal. */
class MessageAfterProposalError extends MessagingError {
  constructor() {
    super("Envoyez d'abord une proposition : la discussion s'ouvre ensuite.", 403);
  }
}

/** Resolves the other side of an order, for the thread attached to it. */
export const otherSideOfOrder = async (orderId: string, userId: string) => {
  const order = await prisma.freelanceOrder.findUnique({
    where: { id: orderId },
    select: { id: true, clientId: true, freelancer: { select: { userId: true } } },
  });
  if (!order) throw new MessagingError("Commande introuvable.", 404);

  if (order.clientId === userId) return order.freelancer.userId;
  if (order.freelancer.userId === userId) return order.clientId;
  throw new MessagingError("Commande introuvable.", 404);
};

/* -------------------------------------------------------------------------- */
/*                                  Reading                                   */
/* -------------------------------------------------------------------------- */

const OTHER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  freelancerProfile: { select: { displayName: true, username: true } },
} as const;

/** The name to show for the other person in a thread. */
const nameOf = (user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  freelancerProfile: { displayName: string; username: string } | null;
}) =>
  user.freelancerProfile?.displayName ||
  [user.firstName, user.lastName].filter(Boolean).join(" ") ||
  // The local part only. A thread list is not a place to hand out addresses.
  user.email.split("@")[0];

/** How many messages in one thread this account has not seen. */
const unreadIn = (conversationId: string, userId: string, lastReadAt: Date | null) =>
  prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });

/**
 * Marks a thread read, up to its newest message.
 *
 * Deliberately not `new Date()`. `Message.createdAt` defaults to `now()` and
 * is therefore stamped by the database, while `new Date()` is the application
 * server's clock — two different machines in production. If the database runs
 * even a little ahead, a message's `createdAt` lands after the `lastReadAt`
 * written when it was read, and it stays unread for good: a badge nobody can
 * clear.
 *
 * Reading the newest message's own timestamp keeps both sides of the
 * comparison on the database's clock, and says what it means — read up to
 * here.
 */
const readUpToLatest = async (conversationId: string, userId: string) => {
  const latest = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    // An empty thread has nothing to have read; `now()` from the database
    // keeps even that case off the application's clock.
    data: { lastReadAt: latest?.createdAt ?? new Date() },
  });
};

/**
 * This account's threads, newest activity first.
 *
 * The unread count is per thread rather than one total, because three unread
 * spread over three conversations and three unread in one are different
 * situations for whoever has to answer them.
 */
export const listFor = async (userId: string, page = 1, perPage = 20) => {
  const where = { participants: { some: { userId } } };

  const [total, rows] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        updatedAt: true,
        order: { select: { id: true, reference: true } },
        participants: {
          select: { userId: true, lastReadAt: true, user: { select: OTHER_SELECT } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, senderId: true, createdAt: true },
        },
      },
    }),
  ]);

  const threads = await Promise.all(
    rows.map(async (c) => {
      const me = c.participants.find((p) => p.userId === userId)!;
      const other = c.participants.find((p) => p.userId !== userId);
      const last = c.messages[0];

      return {
        id: c.id,
        updatedAt: c.updatedAt,
        order: c.order,
        // Null only if the other account was hard-deleted, which cascades its
        // join row away and leaves a thread with one side.
        with: other
          ? {
              id: other.user.id,
              name: nameOf(other.user),
              username: other.user.freelancerProfile?.username ?? null,
            }
          : null,
        lastMessage: last
          ? { body: last.body, mine: last.senderId === userId, createdAt: last.createdAt }
          : null,
        unread: await unreadIn(c.id, userId, me.lastReadAt),
      };
    })
  );

  return { threads, total, page, perPage };
};

/** One total, for the badge in the navigation. */
export const unreadTotal = async (userId: string) => {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });

  const counts = await Promise.all(
    rows.map((r) => unreadIn(r.conversationId, userId, r.lastReadAt))
  );

  return counts.reduce((a, b) => a + b, 0);
};

/**
 * One thread's messages.
 *
 * `after` is an ISO timestamp: a poll asks only for what it has not seen, so
 * an open thread costs one small query every few seconds rather than the
 * whole history each time.
 *
 * Reading marks read, `after` included — a browser polling an open thread is
 * a person looking at it.
 */
export const threadFor = async (
  conversationId: string,
  userId: string,
  options: { after?: string; limit?: number } = {}
) => {
  const conversation = await participantIn(conversationId, userId);

  const after = options.after ? new Date(options.after) : null;
  if (after && Number.isNaN(after.getTime())) {
    throw new MessagingError("Paramètre « after » invalide.", 400);
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(options.limit ?? 200, 1), 200),
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      flagged: true,
      attachments: {
        select: {
          file: {
            select: { id: true, url: true, fileName: true, mimeType: true, size: true },
          },
        },
      },
    },
  });

  const otherId = conversation.participants.find((p) => p.userId !== userId)?.userId;
  const other = otherId
    ? await prisma.user.findUnique({ where: { id: otherId }, select: OTHER_SELECT })
    : null;

  await readUpToLatest(conversationId, userId);

  return {
    conversation: {
      id: conversation.id,
      orderId: conversation.orderId,
      with: other
        ? { id: other.id, name: nameOf(other), username: other.freelancerProfile?.username ?? null }
        : null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      mine: m.senderId === userId,
      createdAt: m.createdAt,
      /* The sender is told their own message was flagged; the recipient is
       * not. Hiding it from the sender would be a shadow-ban, and showing it
       * to the recipient would turn a guess into an accusation. */
      flagged: m.senderId === userId ? m.flagged : false,
      attachments: m.attachments.map((a) => a.file),
    })),
  };
};

/* -------------------------------------------------------------------------- */
/*                                  Writing                                   */
/* -------------------------------------------------------------------------- */

/**
 * Sends a message.
 *
 * The thread's `updatedAt` is bumped in the same transaction as the insert, so
 * the list cannot order threads by an activity time that disagrees with their
 * own last message.
 */
export const send = async (
  conversationId: string,
  userId: string,
  body: string,
  fileIds: string[] = []
) => {
  await participantIn(conversationId, userId);

  const text = (body ?? "").trim();
  if (!text && !fileIds.length) throw new MessagingError("Message vide.", 400);
  if (text.length > MAX_BODY) {
    throw new MessagingError(`Message trop long (maximum ${MAX_BODY} caractères).`, 400);
  }

  const flags = text ? contactFlags(text) : [];

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: text || null,
        flagged: flags.length > 0,
        flagReason: flags.length ? flags.join(", ") : null,
        attachments: fileIds.length
          ? { create: fileIds.map((fileId) => ({ fileId })) }
          : undefined,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        flagged: true,
        flagReason: true,
        attachments: {
          select: {
            file: {
              select: { id: true, url: true, fileName: true, mimeType: true, size: true },
            },
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
      select: { id: true },
    }),
  ]);

  /* Replying means you have read what you are replying to, so the other
   * side's earlier messages stop counting as unread. Done after the insert
   * rather than inside the transaction because it marks read up to the
   * message just written, and that row's database-stamped timestamp does not
   * exist until the insert has run — see readUpToLatest for why the
   * application's own clock will not do. */
  await readUpToLatest(conversationId, userId);

  return {
    ...message,
    mine: true,
    attachments: message.attachments.map((a) => a.file),
  };
};

/** Marks a thread read without fetching it, for a list-level "tout lu". */
export const markRead = async (conversationId: string, userId: string) => {
  await participantIn(conversationId, userId);
  await readUpToLatest(conversationId, userId);
};

export default {
  MessagingError,
  contactFlags,
  openWith,
  userBehindUsername,
  clientBehindProject,
  otherSideOfOrder,
  listFor,
  unreadTotal,
  threadFor,
  send,
  markRead,
};
