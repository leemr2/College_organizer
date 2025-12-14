import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { conversationalAI } from "@/lib/ai/conversational";
import { getUserTimezone, getDateStartInTimezone, getDateEndInTimezone } from "@/lib/utils/timezone";

export const taskRouter = createTRPCRouter({
  // Extract tasks from natural language input
  extractFromText: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          preferences: true,
        },
      });

      if (!student) throw new Error("Student not found");

      // Get user's timezone for date parsing
      const timezone = getUserTimezone(student.preferences);
      
      // Use ConversationalAI to extract tasks with current time and timezone for time-aware scheduling
      const currentTime = new Date();
      const tasks = await conversationalAI.extractTasks(input.text, currentTime, timezone);

      // Create tasks in database
      const tasksToCreate: Array<{
        studentId: string;
        description: string;
        category: string;
        complexity: "simple" | "medium" | "complex";
        dueDate: Date | null;
        isRecurring: boolean;
        scheduledDate: Date | null;
        recurringTaskGroupId: string | null;
      }> = [];

      for (const task of tasks) {
        // Parse dueDate if provided
        let dueDate: Date | null = null;
        if (task.dueDate) {
          try {
            // Parse ISO 8601 date string
            const parsedDate = new Date(task.dueDate);
            // Validate the date is valid and not in the past
            if (!isNaN(parsedDate.getTime()) && parsedDate >= currentTime) {
              dueDate = parsedDate;
            }
          } catch {
            // If parsing fails, leave as null
            dueDate = null;
          }
        }

        const isRecurring = task.isRecurring === true && dueDate !== null;

        if (isRecurring && dueDate) {
          // Generate daily instances for recurring tasks
          // Limit to max 30 days to prevent excessive instances
          const todayStart = getDateStartInTimezone(currentTime, timezone);
          const dueDateStart = getDateStartInTimezone(dueDate, timezone);
          
          // Calculate days between today and due date
          const daysDiff = Math.ceil((dueDateStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
          const maxDays = Math.min(Math.max(daysDiff, 1), 30); // Limit to 30 days max, at least 1 day
          
          // Generate a group ID for linking related instances
          const groupId = `recurring_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          
          // Create one task instance per day from today until due date (max 30 days)
          for (let i = 0; i < maxDays; i++) {
            // Create scheduled date by adding days to today's start
            const scheduledDate = new Date(todayStart.getTime() + i * 24 * 60 * 60 * 1000);
            
            tasksToCreate.push({
              studentId: student.id,
              description: task.description,
              category: task.category,
              complexity: task.complexity as "simple" | "medium" | "complex",
              dueDate,
              isRecurring: true,
              scheduledDate,
              recurringTaskGroupId: groupId,
            });
          }
        } else {
          // One-time task - create single instance
          tasksToCreate.push({
            studentId: student.id,
            description: task.description,
            category: task.category,
            complexity: task.complexity as "simple" | "medium" | "complex",
            dueDate,
            isRecurring: false,
            scheduledDate: null,
            recurringTaskGroupId: null,
          });
        }
      }

      // Create all tasks in a single transaction
      const createdTasks = await prisma.$transaction(
        tasksToCreate.map((taskData) =>
          prisma.task.create({
            data: taskData,
          })
        )
      );

      return createdTasks;
    }),

  // Generate clarification questions for a task
  getClarificationQuestions: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        include: { student: true },
      });

      if (!task) throw new Error("Task not found");

      // Get student context
      const recentTasks = await prisma.task.findMany({
        where: {
          studentId: task.studentId,
          id: { not: task.id },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      const context = {
        name: task.student.name,
        recentTasks: recentTasks.map((t) => ({
          description: t.description,
          category: t.category,
          completed: t.completed,
        })),
      };

      // Generate questions based on complexity
      const questions = await conversationalAI.generateClarificationQuestions(
        task.description,
        task.complexity,
        context
      );

      return { questions };
    }),

  // Save clarification responses
  saveClarification: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        responses: z.record(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const task = await prisma.task.update({
        where: { id: input.taskId },
        data: {
          clarificationComplete: true,
          clarificationData: input.responses,
        },
      });

      return task;
    }),

  // List tasks for a specific date
  listByDate: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ input, ctx }) => {
      try {
        const student = await prisma.student.findUnique({
          where: { userId: ctx.session.user.id },
          include: {
            preferences: true, // Include preferences to get timezone
          },
        });

        if (!student) throw new Error("Student not found");

        // Get user's timezone from preferences
        const timezone = getUserTimezone(student.preferences);

        // Get start/end of the specified date in user's timezone (returns UTC dates for DB comparison)
        const startOfDay = getDateStartInTimezone(input.date, timezone);
        const endOfDay = getDateEndInTimezone(input.date, timezone);

        const tasks = await prisma.task.findMany({
          where: {
            studentId: student.id,
            OR: [
              // Recurring tasks: match by scheduledDate for the selected date
              {
                AND: [
                  { isRecurring: true },
                  { scheduledDate: { gte: startOfDay, lte: endOfDay } },
                ],
              },
              // One-time tasks: tasks due on the specified date in user's timezone
              {
                AND: [
                  { isRecurring: false },
                  { dueDate: { gte: startOfDay, lte: endOfDay } },
                ],
              },
              // One-time tasks: tasks created on the specified date in user's timezone that have no dueDate
              {
                AND: [
                  { isRecurring: false },
                  { createdAt: { gte: startOfDay, lte: endOfDay } },
                  { dueDate: null },
                ],
              },
              // One-time tasks: tasks with future due dates that were created on or before the selected date
              // These should appear every day until their due date
              {
                AND: [
                  { isRecurring: false },
                  { dueDate: { gt: endOfDay } }, // Due date is after the selected date
                  { createdAt: { lte: endOfDay } }, // Created on or before the selected date
                ],
              },
            ],
          },
          orderBy: [
            { scheduledDate: "asc" }, // Sort by scheduled date first (for recurring tasks)
            { dueDate: "asc" }, // Then by due date ascending (nulls last)
            { createdAt: "desc" }, // Then by creation date descending
          ],
        });

        return tasks;
      } catch (error) {
        console.error("Error in task.listByDate:", error);
        // If it's a database connection error, provide a helpful message
        if (error instanceof Error && error.message.includes("connect")) {
          throw new Error(
            "Database connection failed. Please check your DATABASE_URL and DIRECT_URL environment variables."
          );
        }
        throw error;
      }
    }),

  // Mark task as complete
  complete: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        effectiveness: z.number().min(1).max(5).optional(),
        timeSpent: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      // Update task completion
      const updatedTask = await prisma.task.update({
        where: { id: input.taskId },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      });

      // Create effectiveness log if effectiveness rating provided
      if (input.effectiveness !== undefined) {
        await prisma.effectivenessLog.create({
          data: {
            studentId: student.id,
            taskId: input.taskId,
            effectiveness: input.effectiveness,
            timeSpent: input.timeSpent,
            completed: true,
            notes: input.notes,
          },
        });

        // Trigger proactive tool suggestion if effectiveness is poor (<3)
        if (input.effectiveness < 3) {
          // This will be handled asynchronously - we'll add a background job or
          // handle it in the chat router when student asks for help
          // For now, we'll just return the task and let the frontend handle it
        }
      }

      return updatedTask;
    }),

  // Get task by ID
  getById: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      return task;
    }),

  // Update task due date
  updateDueDate: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        dueDate: z.date().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          preferences: true,
        },
      });

      if (!student) throw new Error("Student not found");

      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      // Get user's timezone
      const timezone = getUserTimezone(student.preferences);
      const currentTime = new Date();

      // If task is recurring, regenerate all instances
      if (task.isRecurring && task.recurringTaskGroupId) {
        // Delete all related instances
        await prisma.task.deleteMany({
          where: {
            recurringTaskGroupId: task.recurringTaskGroupId,
            studentId: student.id,
          },
        });

        // If new due date is provided, regenerate instances
        if (input.dueDate) {
          const todayStart = getDateStartInTimezone(currentTime, timezone);
          const dueDateStart = getDateStartInTimezone(input.dueDate, timezone);
          
          // Calculate days between today and due date
          const daysDiff = Math.ceil((dueDateStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
          const maxDays = Math.min(Math.max(daysDiff, 1), 30); // Limit to 30 days max, at least 1 day
          
          // Use the same group ID to maintain grouping
          const groupId = task.recurringTaskGroupId;
          
          // Create new instances
          const tasksToCreate = [];
          for (let i = 0; i < maxDays; i++) {
            const scheduledDate = new Date(todayStart.getTime() + i * 24 * 60 * 60 * 1000);
            
            tasksToCreate.push({
              studentId: student.id,
              description: task.description,
              category: task.category,
              complexity: task.complexity,
              dueDate: input.dueDate,
              isRecurring: true,
              scheduledDate,
              recurringTaskGroupId: groupId,
            });
          }

          // Create all new instances
          const createdTasks = await prisma.task.createMany({
            data: tasksToCreate,
          });

          // Return the first created task (or a representative one)
          const firstTask = await prisma.task.findFirst({
            where: {
              recurringTaskGroupId: groupId,
              studentId: student.id,
            },
            orderBy: {
              scheduledDate: "asc",
            },
          });

          return firstTask || task;
        } else {
          // If due date is cleared, convert to one-time task
          return await prisma.task.create({
            data: {
              studentId: student.id,
              description: task.description,
              category: task.category,
              complexity: task.complexity,
              dueDate: null,
              isRecurring: false,
              scheduledDate: null,
              recurringTaskGroupId: null,
            },
          });
        }
      } else {
        // One-time task - update normally
        const updatedTask = await prisma.task.update({
          where: { id: input.taskId },
          data: {
            dueDate: input.dueDate,
          },
        });

        return updatedTask;
      }
    }),
});

