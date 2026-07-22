/*
  Warnings:

  - The values [APPROVED] on the enum `PreselectionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `score` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Quiz` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `CandidateScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicationId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- AlterEnum
BEGIN;
CREATE TYPE "PreselectionStatus_new" AS ENUM ('PENDING', 'SHORTLISTED', 'REJECTED');
ALTER TABLE "public"."Application" ALTER COLUMN "preselectionStatus" DROP DEFAULT;
ALTER TABLE "public"."Preselection" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Application" ALTER COLUMN "preselectionStatus" TYPE "PreselectionStatus_new" USING ("preselectionStatus"::text::"PreselectionStatus_new");
ALTER TABLE "Preselection" ALTER COLUMN "status" TYPE "PreselectionStatus_new" USING ("status"::text::"PreselectionStatus_new");
ALTER TYPE "PreselectionStatus" RENAME TO "PreselectionStatus_old";
ALTER TYPE "PreselectionStatus_new" RENAME TO "PreselectionStatus";
DROP TYPE "public"."PreselectionStatus_old";
ALTER TABLE "Application" ALTER COLUMN "preselectionStatus" SET DEFAULT 'PENDING';
ALTER TABLE "Preselection" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "CandidateScore" ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "score",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "applicationId" TEXT NOT NULL,
ADD COLUMN     "status" "QuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "completedAt" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
