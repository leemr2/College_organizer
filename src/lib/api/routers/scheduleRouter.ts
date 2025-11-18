import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { schedulingService } from "@/lib/ai/scheduling";
import { getUserTimezone, getDateStartInTimezone, getDateEndInTimezone } from "@/lib/utils/timezone";
import type { SchedulingContext, ScheduleBlockData, TaskContext, ClassScheduleData } from "@/lib/types";

export const scheduleRouter = createTRPCRouter({
  // Generate schedule for today's tasks
  generateDailySchedule: protectedProcedure
    .input(
      z.object({
        date: z.date().optional(), // defaults to today
        forceRegenerate: z.boolean().optional(), // override existing schedule
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          preferences: true,
          classSchedules: true,
        },
      });

      if (!student) throw new Error("Student not found");

      const timezone = getUserTimezone(student.preferences);
      const targetDate = input.date || new Date();
      const dateStart = getDateStartInTimezone(targetDate, timezone);
      const dateEnd = getDateEndInTimezone(targetDate, timezone);

      // Check if schedule already exists for this date
      if (!input.forceRegenerate) {
        const existingBlocks = await prisma.scheduleBlock.findMany({
          where: {
            studentId: student.id,
            startTime: {
              gte: dateStart,
              lte: dateEnd,
            },
          },
        });

        if (existingBlocks.length > 0) {
          // Return existing schedule
          return {
            blocks: existingBlocks.map(block => ({
              id: block.id,
              title: block.title,
              description: block.description || undefined,
              startTime: block.startTime,
              endTime: block.endTime,
              type: block.type as ScheduleBlockData["type"],
              completed: block.completed,
              taskId: block.taskId || undefined,
              reasoning: block.reasoning || undefined,
            })),
            reasoning: "Using existing schedule",
            warnings: [],
          };
        }
      }

      // Get tasks for this date
      // Include: tasks with scheduledDate = targetDate OR (dueDate = targetDate AND !isRecurring)
      const tasks = await prisma.task.findMany({
        where: {
          studentId: student.id,
          completed: false,
          OR: [
            {
              scheduledDate: {
                gte: dateStart,
                lte: dateEnd,
              },
            },
            {
              dueDate: {
                gte: dateStart,
                lte: dateEnd,
              },
              isRecurring: false,
            },
          ],
        },
        orderBy: [
          { dueDate: "asc" },
          { complexity: "desc" },
        ],
      });

      // Get existing schedule blocks for this date
      const existingBlocks = await prisma.scheduleBlock.findMany({
        where: {
          studentId: student.id,
          startTime: {
            gte: dateStart,
            lte: dateEnd,
          },
        },
      });

      // Convert to TaskContext format
      const taskContexts: TaskContext[] = tasks.map(task => ({
        id: task.id,
        description: task.description,
        complexity: task.complexity,
        category: task.category,
        dueDate: task.dueDate,
        completed: task.completed,
      }));

      // Convert to ClassScheduleData format
      const classScheduleData: ClassScheduleData[] = student.classSchedules.map(schedule => ({
        courseName: schedule.courseName,
        courseCode: schedule.courseCode || undefined,
        professor: schedule.professor || undefined,
        meetingTimes: (schedule.meetingTimes as unknown as ClassScheduleData["meetingTimes"]) || [],
        semester: schedule.semester,
      }));

      // Convert existing blocks to ScheduleBlockData format
      const existingBlockData: ScheduleBlockData[] = existingBlocks.map(block => ({
        id: block.id,
        title: block.title,
        description: block.description || undefined,
        startTime: block.startTime,
        endTime: block.endTime,
        type: block.type as ScheduleBlockData["type"],
        completed: block.completed,
        taskId: block.taskId || undefined,
        reasoning: block.reasoning || undefined,
      }));

      // Check if there are any tasks to schedule
      if (tasks.length === 0) {
        return {
          blocks: [],
          reasoning: "No tasks to schedule for this date. Add tasks first, then generate a schedule.",
          warnings: ["No tasks found for this date"],
        };
      }

      // Build scheduling context
      const preferences = student.preferences ? {
        peakEnergyTimes: (student.preferences.peakEnergyTimes as unknown as string[]) || undefined,
        preferredBreakLength: student.preferences.preferredBreakLength || undefined,
        morningPerson: student.preferences.morningPerson ?? undefined,
        studyAloneVsGroup: student.preferences.studyAloneVsGroup as "alone" | "group" | "flexible" | undefined,
        studyEnvironmentPrefs: (student.preferences.studyEnvironmentPrefs as Record<string, unknown>) || undefined,
        effectiveStudyPatterns: (student.preferences.effectiveStudyPatterns as Record<string, unknown>) || undefined,
        notificationSettings: (student.preferences.notificationSettings as Record<string, unknown>) || undefined,
        timezone: student.preferences.timezone || undefined,
      } : {};

      const schedulingContext: SchedulingContext = {
        tasks: taskContexts,
        classSchedules: classScheduleData,
        existingBlocks: existingBlockData,
        preferences,
        currentDate: targetDate,
        timezone,
      };

      // Generate schedule using AI
      let suggestion;
      try {
        suggestion = await schedulingService.generateDailySchedule(schedulingContext);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(`Failed to generate schedule: ${errorMessage}`);
      }

      // Create ScheduleBlock records
      let createdBlocks;
      try {
        // Create a map of valid task IDs for validation
        const validTaskIds = new Set(tasks.map(t => t.id));
        
        createdBlocks = await prisma.$transaction(
          suggestion.blocks.map(block => {
            // Validate taskId - only use it if it exists in our tasks
            const taskId = block.taskId && validTaskIds.has(block.taskId) ? block.taskId : null;
            const linkedTask = taskId ? tasks.find(t => t.id === taskId) : null;
            
            return prisma.scheduleBlock.create({
              data: {
                studentId: student.id,
                taskId: taskId, // Will be null if invalid or not provided
                title: block.title,
                description: block.description || null,
                startTime: block.startTime,
                endTime: block.endTime,
                type: block.type,
                reasoning: block.reasoning || null,
                isRecurring: linkedTask?.isRecurring || false,
              },
            });
          })
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(`Failed to save schedule: ${errorMessage}`);
      }

      return {
        blocks: createdBlocks.map(block => ({
          id: block.id,
          title: block.title,
          description: block.description || undefined,
          startTime: block.startTime,
          endTime: block.endTime,
          type: block.type as ScheduleBlockData["type"],
          completed: block.completed,
          taskId: block.taskId || undefined,
          reasoning: block.reasoning || undefined,
        })),
        reasoning: suggestion.reasoning,
        warnings: suggestion.warnings,
      };
    }),

  // Get schedule blocks for a date range
  getSchedule: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          preferences: true,
          classSchedules: true,
        },
      });

      if (!student) throw new Error("Student not found");

      const timezone = getUserTimezone(student.preferences);
      const start = getDateStartInTimezone(input.startDate, timezone);
      const end = getDateEndInTimezone(input.endDate, timezone);

      // Fetch ScheduleBlocks for date range
      const scheduleBlocks = await prisma.scheduleBlock.findMany({
        where: {
          studentId: student.id,
          startTime: {
            gte: start,
            lte: end,
          },
        },
        include: {
          task: true,
        },
        orderBy: {
          startTime: "asc",
        },
      });

      // Convert ClassSchedules to time blocks format
      // Note: This is a simplified version - full implementation would need to
      // convert recurring class schedules to specific date instances
      const classBlocks: ScheduleBlockData[] = [];
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

      for (const schedule of student.classSchedules) {
        const meetingTimes = (schedule.meetingTimes as unknown as ClassScheduleData["meetingTimes"]) || [];
        for (const meetingTime of meetingTimes) {
          // For each day in the range, check if this class meets
          const currentDate = new Date(start);
          while (currentDate <= end) {
            const dayName = dayNames[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1]; // Convert to Monday=0
            if (meetingTime.day === dayName) {
              const [startHour, startMin] = meetingTime.startTime.split(":").map(Number);
              const [endHour, endMin] = meetingTime.endTime.split(":").map(Number);
              const blockStart = new Date(currentDate);
              blockStart.setHours(startHour, startMin, 0, 0);
              const blockEnd = new Date(currentDate);
              blockEnd.setHours(endHour, endMin, 0, 0);

              classBlocks.push({
                id: `class-${schedule.id}-${currentDate.toISOString()}`,
                title: schedule.courseName,
                description: schedule.courseCode || undefined,
                startTime: blockStart,
                endTime: blockEnd,
                type: "class",
                completed: false,
              });
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }

      // Combine schedule blocks and class blocks
      const allBlocks = [
        ...scheduleBlocks.map(block => ({
          id: block.id,
          title: block.title,
          description: block.description || undefined,
          startTime: block.startTime,
          endTime: block.endTime,
          type: block.type as ScheduleBlockData["type"],
          completed: block.completed,
          taskId: block.taskId || undefined,
          reasoning: block.reasoning || undefined,
        })),
        ...classBlocks,
      ];

      // Sort by start time
      allBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      return allBlocks;
    }),

  // Update a schedule block (time, completion, etc.)
  updateBlock: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        completed: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Get the block
      const block = await prisma.scheduleBlock.findUnique({
        where: { id: input.blockId },
        include: { task: true },
      });

      if (!block || block.studentId !== student.id) {
        throw new Error("Schedule block not found");
      }

      // Update block
      const updateData: {
        startTime?: Date;
        endTime?: Date;
        completed?: boolean;
        completionTime?: Date | null;
      } = {};

      if (input.startTime !== undefined) updateData.startTime = input.startTime;
      if (input.endTime !== undefined) updateData.endTime = input.endTime;
      if (input.completed !== undefined) {
        updateData.completed = input.completed;
        updateData.completionTime = input.completed ? new Date() : null;
      }

      const updatedBlock = await prisma.scheduleBlock.update({
        where: { id: input.blockId },
        data: updateData,
      });

      // If task-linked and completed=true, also mark task complete
      if (input.completed === true && block.taskId) {
        await prisma.task.update({
          where: { id: block.taskId },
          data: {
            completed: true,
            completedAt: new Date(),
          },
        });
      }

      return {
        id: updatedBlock.id,
        title: updatedBlock.title,
        description: updatedBlock.description || undefined,
        startTime: updatedBlock.startTime,
        endTime: updatedBlock.endTime,
        type: updatedBlock.type as ScheduleBlockData["type"],
        completed: updatedBlock.completed,
        taskId: updatedBlock.taskId || undefined,
        reasoning: updatedBlock.reasoning || undefined,
      };
    }),

  // Reschedule a task (AI-suggested alternatives)
  requestReschedule: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          preferences: true,
          classSchedules: true,
        },
      });

      if (!student) throw new Error("Student not found");

      // Get the block to reschedule
      const block = await prisma.scheduleBlock.findUnique({
        where: { id: input.blockId },
        include: { task: true },
      });

      if (!block || block.studentId !== student.id) {
        throw new Error("Schedule block not found");
      }

      const timezone = getUserTimezone(student.preferences);
      const blockDate = block.startTime;

      // Get all existing blocks for this date
      const dateStart = getDateStartInTimezone(blockDate, timezone);
      const dateEnd = getDateEndInTimezone(blockDate, timezone);

      const existingBlocks = await prisma.scheduleBlock.findMany({
        where: {
          studentId: student.id,
          startTime: {
            gte: dateStart,
            lte: dateEnd,
          },
        },
      });

      // Convert to context format
      const classScheduleData: ClassScheduleData[] = student.classSchedules.map(schedule => ({
        courseName: schedule.courseName,
        courseCode: schedule.courseCode || undefined,
        professor: schedule.professor || undefined,
        meetingTimes: (schedule.meetingTimes as unknown as ClassScheduleData["meetingTimes"]) || [],
        semester: schedule.semester,
      }));

      const existingBlockData: ScheduleBlockData[] = existingBlocks.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description || undefined,
        startTime: b.startTime,
        endTime: b.endTime,
        type: b.type as ScheduleBlockData["type"],
        completed: b.completed,
        taskId: b.taskId || undefined,
        reasoning: b.reasoning || undefined,
      }));

      const blockData: ScheduleBlockData = {
        id: block.id,
        title: block.title,
        description: block.description || undefined,
        startTime: block.startTime,
        endTime: block.endTime,
        type: block.type as ScheduleBlockData["type"],
        completed: block.completed,
        taskId: block.taskId || undefined,
        reasoning: block.reasoning || undefined,
      };

      const preferences = student.preferences ? {
        peakEnergyTimes: (student.preferences.peakEnergyTimes as unknown as string[]) || undefined,
        preferredBreakLength: student.preferences.preferredBreakLength || undefined,
        morningPerson: student.preferences.morningPerson ?? undefined,
        studyAloneVsGroup: student.preferences.studyAloneVsGroup as "alone" | "group" | "flexible" | undefined,
        studyEnvironmentPrefs: (student.preferences.studyEnvironmentPrefs as Record<string, unknown>) || undefined,
        effectiveStudyPatterns: (student.preferences.effectiveStudyPatterns as Record<string, unknown>) || undefined,
        notificationSettings: (student.preferences.notificationSettings as Record<string, unknown>) || undefined,
        timezone: student.preferences.timezone || undefined,
      } : {};

      const schedulingContext: SchedulingContext = {
        tasks: block.task ? [{
          id: block.task.id,
          description: block.task.description,
          complexity: block.task.complexity,
          category: block.task.category,
          dueDate: block.task.dueDate,
          completed: block.task.completed,
        }] : [],
        classSchedules: classScheduleData,
        existingBlocks: existingBlockData,
        preferences,
        currentDate: blockDate,
        timezone,
      };

      // Get reschedule options
      const options = await schedulingService.suggestRescheduleOptions(
        input.blockId,
        schedulingContext
      );

      return options;
    }),

  // Apply a reschedule option
  applyReschedule: protectedProcedure
    .input(
      z.object({
        blockId: z.string(),
        newStartTime: z.date(),
        newEndTime: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Get the block
      const block = await prisma.scheduleBlock.findUnique({
        where: { id: input.blockId },
      });

      if (!block || block.studentId !== student.id) {
        throw new Error("Schedule block not found");
      }

      // Update block with new times
      const updatedBlock = await prisma.scheduleBlock.update({
        where: { id: input.blockId },
        data: {
          startTime: input.newStartTime,
          endTime: input.newEndTime,
        },
      });

      return {
        id: updatedBlock.id,
        title: updatedBlock.title,
        description: updatedBlock.description || undefined,
        startTime: updatedBlock.startTime,
        endTime: updatedBlock.endTime,
        type: updatedBlock.type as ScheduleBlockData["type"],
        completed: updatedBlock.completed,
        taskId: updatedBlock.taskId || undefined,
        reasoning: updatedBlock.reasoning || undefined,
      };
    }),

  // Delete a schedule block
  deleteBlock: protectedProcedure
    .input(z.object({ blockId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Get the block
      const block = await prisma.scheduleBlock.findUnique({
        where: { id: input.blockId },
      });

      if (!block || block.studentId !== student.id) {
        throw new Error("Schedule block not found");
      }

      // Delete ScheduleBlock (doesn't delete task, just unscheduled)
      await prisma.scheduleBlock.delete({
        where: { id: input.blockId },
      });

      return { success: true };
    }),
});

