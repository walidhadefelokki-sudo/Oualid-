-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN     "publicationAttempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signupSource" TEXT NOT NULL DEFAULT 'JOBS';
