/*
  Warnings:

  - The values [NOT_STARTED,COMPLETED] on the enum `QuizStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `aiScore` on the `OralPresentation` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `OralPresentation` table. All the data in the column will be lost.
  - You are about to drop the column `durationSeconds` on the `OralPresentation` table. All the data in the column will be lost.
  - You are about to drop the column `transcript` on the `OralPresentation` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `passingScore` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Quiz` table. All the data in the column will be lost.
  - You are about to drop the column `answers` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `applicationId` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `correctAnswer` on the `QuizQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `explanation` on the `QuizQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `QuizQuestion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[candidateId]` on the table `OralPresentation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[candidateId]` on the table `Quiz` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[quizId]` on the table `QuizAttempt` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `candidateId` to the `OralPresentation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candidateId` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candidateId` to the `QuizAttempt` table without a default value. This is not possible if the table is not empty.

*/

-- CreateEnum
CREATE TYPE "QuizDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterEnum
BEGIN;
CREATE TYPE "QuizStatus_new" AS ENUM ('PENDING', 'GENERATED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED');
ALTER TABLE "Quiz" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Quiz" ALTER COLUMN "status" TYPE "QuizStatus_new" USING ("status"::text::"QuizStatus_new");
ALTER TYPE "QuizStatus" RENAME TO "QuizStatus_old";
ALTER TYPE "QuizStatus_new" RENAME TO "QuizStatus";
DROP TYPE "public"."QuizStatus_old";
ALTER TABLE "Quiz" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "OralPresentation" DROP CONSTRAINT "OralPresentation_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "Quiz" DROP CONSTRAINT "Quiz_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_applicationId_fkey";

-- DropIndex
DROP INDEX "OralPresentation_applicationId_key";

-- DropIndex
DROP INDEX "Quiz_applicationId_key";

-- AlterTable
ALTER TABLE "OralPresentation" DROP COLUMN "aiScore",
DROP COLUMN "applicationId",
DROP COLUMN "durationSeconds",
DROP COLUMN "transcript",
ADD COLUMN     "candidateId" TEXT NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Quiz" DROP COLUMN "applicationId",
DROP COLUMN "description",
DROP COLUMN "durationMinutes",
DROP COLUMN "passingScore",
DROP COLUMN "title",
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "candidateId" TEXT NOT NULL,
ADD COLUMN     "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "QuizStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuizAttempt" DROP COLUMN "answers",
DROP COLUMN "applicationId",
DROP COLUMN "completedAt",
DROP COLUMN "score",
DROP COLUMN "startedAt",
DROP COLUMN "status",
ADD COLUMN     "aiScore" DOUBLE PRECISION,
ADD COLUMN     "candidateId" TEXT NOT NULL,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "recruiterScore" DOUBLE PRECISION,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuizQuestion" DROP COLUMN "correctAnswer",
DROP COLUMN "explanation",
DROP COLUMN "options",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "difficulty" "QuizDifficulty" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "skill" TEXT;

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "aiScore" DOUBLE PRECISION,
    "recruiterScore" DOUBLE PRECISION,
    "aiFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OralPresentation_candidateId_key" ON "OralPresentation"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_candidateId_key" ON "Quiz"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_quizId_key" ON "QuizAttempt"("quizId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralPresentation" ADD CONSTRAINT "OralPresentation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
