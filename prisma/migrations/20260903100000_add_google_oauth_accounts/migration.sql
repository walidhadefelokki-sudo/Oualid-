-- Google OAuth support.
--
-- 1. User.password becomes nullable. A Google-only account has no local
--    password, and writing a random hash into the column would create a
--    password-shaped value that is never a real credential. NULL says plainly
--    that this user authenticates through a provider; `login` checks for it
--    and directs the user to the provider instead of comparing hashes.
--    Widening NOT NULL -> NULL is backwards compatible: every existing row
--    keeps its password.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- 2. Account holds one external identity per row, linked to a User. The User
--    stays the application's single identity, so a person can sign in with a
--    password and with Google without becoming two users.
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- The database-level guarantee behind duplicate-account prevention: one
-- provider identity can never map to two Users, even under a race.
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE INDEX "Account_userId_idx" ON "Account"("userId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
