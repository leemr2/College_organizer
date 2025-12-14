-- CreateEnum
CREATE TYPE "ScheduleBlockType" AS ENUM ('class', 'task', 'break', 'commitment', 'lunch', 'dinner');

-- CreateTable
CREATE TABLE "ScheduleBlock" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "type" "ScheduleBlockType" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completionTime" TIMESTAMP(3),
    "reasoning" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleBlock_studentId_idx" ON "ScheduleBlock"("studentId");

-- CreateIndex
CREATE INDEX "ScheduleBlock_taskId_idx" ON "ScheduleBlock"("taskId");

-- CreateIndex
CREATE INDEX "ScheduleBlock_startTime_idx" ON "ScheduleBlock"("startTime");

-- CreateIndex
CREATE INDEX "ScheduleBlock_completed_idx" ON "ScheduleBlock"("completed");

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
