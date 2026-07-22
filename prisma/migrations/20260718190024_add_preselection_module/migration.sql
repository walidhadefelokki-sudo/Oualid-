-- CreateEnum
CREATE TYPE "PreselectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "preselectionStatus" "PreselectionStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "Preselection" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "status" "PreselectionStatus" NOT NULL DEFAULT 'PENDING',
    "aiScore" DOUBLE PRECISION,
    "recruiterScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "comment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preselection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Preselection_applicationId_idx" ON "Preselection"("applicationId");

-- CreateIndex
CREATE INDEX "Preselection_recruiterId_idx" ON "Preselection"("recruiterId");

-- CreateIndex
CREATE INDEX "Preselection_status_idx" ON "Preselection"("status");

-- AddForeignKey
ALTER TABLE "Preselection" ADD CONSTRAINT "Preselection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preselection" ADD CONSTRAINT "Preselection_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "RecruiterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
