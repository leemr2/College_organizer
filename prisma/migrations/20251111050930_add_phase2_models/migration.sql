-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT[],
    "description" TEXT NOT NULL,
    "useCases" TEXT[],
    "cost" TEXT NOT NULL,
    "studentFriendly" BOOLEAN NOT NULL,
    "learningCurve" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "platformAvailability" TEXT[],
    "integrations" TEXT[],
    "popularity" TEXT,
    "bestFor" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTool" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "discoveredDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adoptedStatus" TEXT NOT NULL DEFAULT 'suggested',
    "effectivenessRating" INTEGER,
    "featuresDiscovered" JSONB,
    "notes" TEXT,

    CONSTRAINT "StudentTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolSuggestion" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT,
    "toolId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "suggestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentResponse" TEXT,
    "followUpScheduled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ToolSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EffectivenessLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "effectiveness" INTEGER NOT NULL,
    "timeSpent" INTEGER,
    "completed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EffectivenessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tool_name_idx" ON "Tool"("name");

-- CreateIndex
CREATE INDEX "StudentTool_studentId_idx" ON "StudentTool"("studentId");

-- CreateIndex
CREATE INDEX "StudentTool_toolId_idx" ON "StudentTool"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTool_studentId_toolId_key" ON "StudentTool"("studentId", "toolId");

-- CreateIndex
CREATE INDEX "ToolSuggestion_studentId_idx" ON "ToolSuggestion"("studentId");

-- CreateIndex
CREATE INDEX "ToolSuggestion_taskId_idx" ON "ToolSuggestion"("taskId");

-- CreateIndex
CREATE INDEX "ToolSuggestion_toolId_idx" ON "ToolSuggestion"("toolId");

-- CreateIndex
CREATE INDEX "EffectivenessLog_studentId_idx" ON "EffectivenessLog"("studentId");

-- CreateIndex
CREATE INDEX "EffectivenessLog_taskId_idx" ON "EffectivenessLog"("taskId");

-- AddForeignKey
ALTER TABLE "StudentTool" ADD CONSTRAINT "StudentTool_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTool" ADD CONSTRAINT "StudentTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolSuggestion" ADD CONSTRAINT "ToolSuggestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolSuggestion" ADD CONSTRAINT "ToolSuggestion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolSuggestion" ADD CONSTRAINT "ToolSuggestion_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EffectivenessLog" ADD CONSTRAINT "EffectivenessLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EffectivenessLog" ADD CONSTRAINT "EffectivenessLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
