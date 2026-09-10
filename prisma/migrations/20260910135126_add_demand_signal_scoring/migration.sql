-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('COMPANY', 'CONTACT', 'HIRING', 'TECHNOLOGY', 'GROWTH', 'FUNDING', 'EXPANSION', 'LEADERSHIP', 'NEWS', 'OTHER');

-- CreateEnum
CREATE TYPE "SignalConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NextBestAction" AS ENUM ('CONTACT', 'INVESTIGATE', 'CONNECT_LINKEDIN', 'SEND_MESSAGE', 'SCHEDULE_FOLLOWUP', 'WAIT', 'DO_NOT_CONTACT');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "companySignalScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contactSignalScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fitScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextBestAction" "NextBestAction",
ADD COLUMN     "timingScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whyNow" TEXT;

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "companyId" TEXT,
    "type" "SignalType" NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "confidence" "SignalConfidence" NOT NULL DEFAULT 'MEDIUM',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_workspaceId_idx" ON "Signal"("workspaceId");

-- CreateIndex
CREATE INDEX "Signal_contactId_idx" ON "Signal"("contactId");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
