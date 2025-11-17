-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "analysisResult" JSONB,
ADD COLUMN     "conversationMode" TEXT,
ADD COLUMN     "currentPhase" TEXT,
ADD COLUMN     "discoveryData" JSONB;
