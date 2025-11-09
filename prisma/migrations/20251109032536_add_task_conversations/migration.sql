-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('daily_planning', 'task_specific');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "conversationType" "ConversationType" NOT NULL DEFAULT 'daily_planning',
ADD COLUMN     "dailyConversationDate" TIMESTAMP(3),
ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_taskId_idx" ON "Conversation"("taskId");

-- CreateIndex
CREATE INDEX "Conversation_dailyConversationDate_idx" ON "Conversation"("dailyConversationDate");

-- CreateIndex
CREATE INDEX "Conversation_conversationType_idx" ON "Conversation"("conversationType");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
