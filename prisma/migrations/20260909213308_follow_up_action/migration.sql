-- CreateEnum
CREATE TYPE "FollowUpAction" AS ENUM ('CALL', 'EMAIL', 'LINKEDIN', 'WHATSAPP');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "nextFollowUpAction" "FollowUpAction";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "actionType" "FollowUpAction";
