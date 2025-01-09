-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('Accepted', 'Pending', 'Dismiss');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "status" "ConversationStatus";
