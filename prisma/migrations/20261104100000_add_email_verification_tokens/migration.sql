-- Confirming an email address.
--
-- `User.status` had no meaning before this: every password signup was created
-- PENDING and nothing moved it. A row here is one single-use link; clicking it
-- sets `emailVerified` and promotes PENDING to ACTIVE, so the status column
-- answers one question — has anyone proved they can read this address.
--
-- Only the SHA-256 of the token is stored, never the value in the link.

CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

ALTER TABLE "EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Accounts already confirmed by Google are ACTIVE with emailVerified = true.
-- A handful were created ACTIVE before emailVerified was set alongside it;
-- bring the two columns into step so "ACTIVE" never means "unconfirmed".
UPDATE "User"
   SET "emailVerified" = true
 WHERE "status" = 'ACTIVE'
   AND "emailVerified" = false
   AND EXISTS (SELECT 1 FROM "Account" a WHERE a."userId" = "User"."id");

-- Everything else stays PENDING on purpose. Those addresses have genuinely
-- never been confirmed, and inventing a confirmation for them would put the
-- column back to meaning nothing.
