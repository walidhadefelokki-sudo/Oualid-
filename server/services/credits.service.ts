import { CreditEntryType, Prisma, PrismaClient } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * The credit ledger.
 *
 * Every movement is an append-only row. `CreditWallet.balance` is a cache of
 * the ledger, written inside the same transaction as the entry that moved
 * it, so the two cannot drift. Nothing outside this file may write either —
 * a balance that can be set rather than derived is a balance that can be
 * argued with, and this one is money.
 *
 * Three rules hold the whole thing up:
 *
 *   1. Spending reads and writes the balance in one serializable
 *      transaction. Two proposals submitted at the same moment cannot both
 *      see the same balance and both succeed.
 *   2. Every spend carries an idempotency key. A retried request — a double
 *      click, an axios retry, a Vercel replay — collides on a unique index
 *      and returns the first result instead of charging twice.
 *   3. The balance never goes below zero. There is no business rule that
 *      wants it to.
 */

export class InsufficientCreditsError extends Error {
  constructor(
    readonly required: number,
    readonly available: number
  ) {
    super(`Insufficient credits: ${required} required, ${available} available`);
    this.name = "InsufficientCreditsError";
  }
}

export interface LedgerResult {
  balance: number;
  entryId: string;
  /** True when this call matched an earlier one and changed nothing. */
  replayed: boolean;
}

type Tx = Prisma.TransactionClient | PrismaClient;

/** The wallet, created on first use so no signup path has to remember to. */
export const getOrCreateWallet = async (userId: string, tx: Tx = prisma) => {
  const existing = await tx.creditWallet.findUnique({ where: { userId } });
  if (existing) return existing;

  try {
    return await tx.creditWallet.create({ data: { userId } });
  } catch (err) {
    // Two first requests can race here. The unique index on userId decides,
    // and the loser reads what the winner wrote.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (wallet) return wallet;
    }
    throw err;
  }
};

export const getBalance = async (userId: string): Promise<number> => {
  const wallet = await prisma.creditWallet.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return wallet?.balance ?? 0;
};

interface MoveInput {
  userId: string;
  /** Signed. Negative spends, positive grants. */
  delta: number;
  type: CreditEntryType;
  /** Required for anything that can be retried. */
  idempotencyKey?: string;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  /** The admin behind a manual adjustment. */
  createdById?: string;
}

/**
 * Moves credits and records why.
 *
 * Serializable because the read-then-write of the balance is exactly the
 * pattern that loses money under concurrency at weaker isolation levels.
 * Postgres may abort a conflicting transaction with 40001; the caller sees a
 * failure and retries with the same idempotency key, which is safe.
 */
export const move = async (input: MoveInput): Promise<LedgerResult> => {
  const { userId, delta, type, idempotencyKey, referenceType, referenceId, note, createdById } =
    input;

  if (!Number.isInteger(delta)) throw new Error("Credit delta must be a whole number");
  if (delta === 0) throw new Error("Credit delta must not be zero");

  // Checked before opening a transaction: a replay is the common case on a
  // flaky connection and does not deserve a serializable lock.
  if (idempotencyKey) {
    const seen = await prisma.creditLedgerEntry.findUnique({
      where: { idempotencyKey },
      select: { id: true, balanceAfter: true },
    });
    if (seen) return { balance: seen.balanceAfter, entryId: seen.id, replayed: true };
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const wallet = await getOrCreateWallet(userId, tx);
        const next = wallet.balance + delta;

        if (next < 0) throw new InsufficientCreditsError(Math.abs(delta), wallet.balance);

        const entry = await tx.creditLedgerEntry.create({
          data: {
            walletId: wallet.id,
            type,
            delta,
            balanceAfter: next,
            idempotencyKey,
            referenceType,
            referenceId,
            note,
            createdById,
          },
          select: { id: true },
        });

        await tx.creditWallet.update({
          where: { id: wallet.id },
          data: { balance: next },
        });

        return { balance: next, entryId: entry.id, replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    // Two identical requests that both passed the pre-check above meet here.
    // The index is the arbiter; the loser reports the winner's result.
    if (
      idempotencyKey &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const winner = await prisma.creditLedgerEntry.findUnique({
        where: { idempotencyKey },
        select: { id: true, balanceAfter: true },
      });
      if (winner) return { balance: winner.balanceAfter, entryId: winner.id, replayed: true };
    }
    throw err;
  }
};

/*
 * Both are `async` so every failure arrives the same way.
 *
 * A plain arrow that validates and then returns move(...) throws
 * synchronously for a bad amount but rejects for a bad delta — so
 * `spend(...).catch(h)` handles one and lets the other escape to an
 * unhandled rejection. `async` turns the synchronous throw into a rejection
 * and the caller has one thing to handle.
 */

/** Spends. `amount` is positive; the sign is applied here. */
export const spend = async (
  input: Omit<MoveInput, "delta"> & { amount: number }
): Promise<LedgerResult> => {
  if (input.amount <= 0) throw new Error("Spend amount must be positive");
  return move({ ...input, delta: -input.amount });
};

/** Grants. Used by purchases, refunds, promotions and admin adjustments. */
export const grant = async (
  input: Omit<MoveInput, "delta"> & { amount: number }
): Promise<LedgerResult> => {
  if (input.amount <= 0) throw new Error("Grant amount must be positive");
  return move({ ...input, delta: input.amount });
};

/**
 * Returns what a refused service cost, so moderation can give it back.
 *
 * Keyed off the original spend rather than off a configured price: the price
 * may have changed since, and what is owed is what was taken.
 */
export const refundFor = async (
  referenceType: string,
  referenceId: string,
  note: string
): Promise<LedgerResult | null> => {
  const original = await prisma.creditLedgerEntry.findFirst({
    where: { referenceType, referenceId, delta: { lt: 0 } },
    orderBy: { createdAt: "asc" },
    select: { id: true, delta: true, wallet: { select: { userId: true } } },
  });

  if (!original) return null;

  return grant({
    userId: original.wallet.userId,
    amount: Math.abs(original.delta),
    type: CreditEntryType.REFUND,
    // Derived from the entry being refunded, so a second attempt to refund
    // the same spend is a replay rather than a second payout.
    idempotencyKey: `refund:${original.id}`,
    referenceType,
    referenceId,
    note,
  });
};

/** One page of history, newest first. */
export const history = async (userId: string, page = 1, pageSize = 25) => {
  const wallet = await prisma.creditWallet.findUnique({
    where: { userId },
    select: { id: true, balance: true },
  });

  if (!wallet) return { balance: 0, entries: [], total: 0, page, pageSize, totalPages: 1 };

  const [total, entries] = await Promise.all([
    prisma.creditLedgerEntry.count({ where: { walletId: wallet.id } }),
    prisma.creditLedgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        delta: true,
        balanceAfter: true,
        note: true,
        referenceType: true,
        referenceId: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    balance: wallet.balance,
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

/**
 * What things cost, read from PlatformSetting so an admin can change them
 * without a deploy. The fallbacks are the specification's opening figures.
 */
export const getCreditCosts = async () => {
  const keys = [
    "freelance.credits.servicePublication",
    "freelance.credits.proposal",
    "freelance.service.durationDays",
    "freelance.trial.services",
    "freelance.trial.proposals",
  ];

  const rows = await prisma.platformSetting.findMany({ where: { key: { in: keys } } });
  const read = (key: string, fallback: number) => {
    const raw = rows.find((r) => r.key === key)?.value;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    servicePublication: read("freelance.credits.servicePublication", 10),
    proposal: read("freelance.credits.proposal", 2),
    serviceDurationDays: read("freelance.service.durationDays", 30),
    trialServices: read("freelance.trial.services", 1),
    trialProposals: read("freelance.trial.proposals", 5),
  };
};

export default {
  getOrCreateWallet,
  getBalance,
  move,
  spend,
  grant,
  refundFor,
  history,
  getCreditCosts,
  InsufficientCreditsError,
};
