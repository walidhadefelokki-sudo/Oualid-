import { defineConfig } from "vitest/config";

/**
 * Tests run against a real PostgreSQL database, not a mock.
 *
 * What is being tested here is concurrency, isolation levels and unique
 * constraints — the behaviour of the database itself. A mocked Prisma client
 * would assert that the code calls the functions it calls, which is the one
 * thing that was never in doubt.
 *
 * TEST_DATABASE_URL must point at a throwaway database. The suite truncates
 * what it touches, and it refuses to run against a URL that is not local
 * unless ALLOW_REMOTE_TEST_DB is set.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts"],
    // Serial: these tests share one database and several deliberately
    // provoke write conflicts. Parallel files would produce failures that
    // say nothing about the code.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
