import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across invocations instead of creating a
// new one every time this module loads. This matters most on Vercel's
// serverless functions, where a warm instance can otherwise spin up a
// fresh client (and DB connection) far more often than intended.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
