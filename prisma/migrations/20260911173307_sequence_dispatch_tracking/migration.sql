-- AlterTable
ALTER TABLE "SequenceEnrollment" ADD COLUMN     "lastStepSentAt" TIMESTAMP(3),
ADD COLUMN     "lastMessageId" TEXT,
ADD COLUMN     "stopReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SequenceEnrollment_lastMessageId_key" ON "SequenceEnrollment"("lastMessageId");
