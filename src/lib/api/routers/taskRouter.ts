import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { conversationalAI } from "@/lib/ai/conversational";

export const taskRouter = createTRPCRouter({
  // Extract tasks from natural language input
  extractFromText: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Use ConversationalAI to extract tasks with current time for time-aware scheduling
      const currentTime = new Date();
      const tasks = await conversationalAI.extractTasks(input.text, currentTime);

      // Create tasks in database
      const createdTasks = await prisma.$transaction(
        tasks.map((task: any) =>
          prisma.task.create({
            data: {
              studentId: student.id,
              description: task.description,
              category: task.category,
              complexity: task.complexity as "simple" | "medium" | "complex",
            },
          })
        )
      );

      return createdTasks;
    }),

  // Generate clarification questions for a task
  getClarificationQuestions: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input, ctx }) => {
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
        });

        if (!student) throw new Error("Student not found");

        const startOfDay = new Date(input.date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(input.date);
        endOfDay.setHours(23, 59, 59, 999);

        const tasks = await prisma.task.findMany({
          where: {
            studentId: student.id,
            OR: [
              { dueDate: { gte: startOfDay, lte: endOfDay } },
              {
                createdAt: { gte: startOfDay, lte: endOfDay },
              },
            ],
          },
          orderBy: { dueDate: "asc" },
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
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const task = await prisma.task.update({
        where: { id: input.taskId },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      });

      return task;
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
});

