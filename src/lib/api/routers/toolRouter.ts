import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { toolRecommendationService } from "@/lib/ai/toolRecommendation";
import { getAllTools, getToolById, searchTools } from "@/lib/utils/toolDatabase";
import type { ToolSearchQuery } from "@/lib/ai/toolRecommendation";
import type { StudentContext } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export const toolRouter = createTRPCRouter({
  // Search tools by query parameters
  search: protectedProcedure
    .input(
      z.object({
        category: z.array(z.string()).optional(),
        searchTerm: z.string().optional(),
        studentFriendly: z.boolean().optional(),
        learningCurve: z.array(z.string()).optional(),
        maxResults: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const query: ToolSearchQuery = {
        category: input.category,
        searchTerm: input.searchTerm,
        studentFriendly: input.studentFriendly,
        learningCurve: input.learningCurve,
        maxResults: input.maxResults,
      };

      return toolRecommendationService.searchTools(query);
    }),

  // Get tool recommendations for a specific task
  recommend: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: { preferences: true },
      });

      if (!student) throw new Error("Student not found");

      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      const taskContext = {
        id: task.id,
        description: task.description,
        complexity: task.complexity,
        category: task.category,
        dueDate: task.dueDate,
        completed: task.completed,
      };

      const studentContext = {
        name: student.name,
        preferences: student.preferences as unknown as StudentContext["preferences"],
        conversationType: "task_specific" as const,
      };

      const recommendations =
        await toolRecommendationService.recommendForTask(
          taskContext,
          studentContext
        );

      return recommendations;
    }),

  // Record a tool suggestion (when AI suggests a tool)
  recordSuggestion: protectedProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        toolId: z.string(),
        context: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Verify task belongs to student if provided
      if (input.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: input.taskId },
        });

        if (!task || task.studentId !== student.id) {
          throw new Error("Task not found");
        }
      }

      // Verify tool exists
      const tool = getToolById(input.toolId);
      if (!tool) {
        throw new Error("Tool not found");
      }

      // Check if tool exists in database, create if not
      let dbTool = await prisma.tool.findUnique({
        where: { id: input.toolId },
      });

      if (!dbTool) {
        // Create tool in database from JSON data
        dbTool = await prisma.tool.create({
          data: {
            id: tool.id,
            name: tool.name,
            category: tool.category,
            description: tool.description,
            useCases: tool.useCases,
            cost: tool.cost,
            studentFriendly: tool.studentFriendly,
            learningCurve: tool.learningCurve,
            website: tool.website,
            features: tool.features as unknown as Prisma.InputJsonValue,
            platformAvailability: tool.platformAvailability,
            integrations: tool.integrations,
            popularity: tool.popularity,
            bestFor: tool.bestFor,
          },
        });
      }

      // Create suggestion record
      const suggestion = await prisma.toolSuggestion.create({
        data: {
          studentId: student.id,
          taskId: input.taskId || null,
          toolId: dbTool.id,
          context: input.context,
        },
      });

      return suggestion;
    }),

  // Update student-tool relationship (adoption status)
  updateStudentTool: protectedProcedure
    .input(
      z.object({
        toolId: z.string(),
        adoptedStatus: z.enum(["suggested", "trying", "using", "abandoned"]),
        effectivenessRating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Verify tool exists in database
      const dbTool = await prisma.tool.findUnique({
        where: { id: input.toolId },
      });

      if (!dbTool) {
        throw new Error("Tool not found");
      }

      // Update or create student-tool relationship
      const studentTool = await prisma.studentTool.upsert({
        where: {
          studentId_toolId: {
            studentId: student.id,
            toolId: input.toolId,
          },
        },
        create: {
          studentId: student.id,
          toolId: input.toolId,
          adoptedStatus: input.adoptedStatus,
          effectivenessRating: input.effectivenessRating,
          notes: input.notes,
        },
        update: {
          adoptedStatus: input.adoptedStatus,
          effectivenessRating: input.effectivenessRating,
          notes: input.notes,
        },
      });

      return studentTool;
    }),

  // Get tools the student is using
  getStudentTools: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["suggested", "trying", "using", "abandoned"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      const where: { studentId: string; adoptedStatus?: string } = {
        studentId: student.id,
      };

      if (input?.status) {
        where.adoptedStatus = input.status;
      }

      const studentTools = await prisma.studentTool.findMany({
        where,
        include: {
          tool: true,
        },
        orderBy: {
          discoveredDate: "desc",
        },
      });

      return studentTools;
    }),

  // Get tools suggested to the student
  getSuggestedTools: protectedProcedure
    .input(
      z
        .object({
          taskId: z.string().optional(),
          limit: z.number().default(10),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      const where: {
        studentId: string;
        taskId?: string;
      } = {
        studentId: student.id,
      };

      if (input?.taskId) {
        where.taskId = input.taskId;
      }

      const suggestions = await prisma.toolSuggestion.findMany({
        where,
        include: {
          tool: true,
          task: true,
        },
        orderBy: {
          suggestedDate: "desc",
        },
        take: input?.limit || 10,
      });

      return suggestions;
    }),

  // Get a specific tool by ID
  getById: protectedProcedure
    .input(z.object({ toolId: z.string() }))
    .query(async ({ input }) => {
      const tool = getToolById(input.toolId);
      if (!tool) {
        throw new Error("Tool not found");
      }

      // Check if tool exists in database
      let dbTool = await prisma.tool.findUnique({
        where: { id: input.toolId },
      });

      if (!dbTool) {
        // Create tool in database from JSON data
        dbTool = await prisma.tool.create({
          data: {
            id: tool.id,
            name: tool.name,
            category: tool.category,
            description: tool.description,
            useCases: tool.useCases,
            cost: tool.cost,
            studentFriendly: tool.studentFriendly,
            learningCurve: tool.learningCurve,
            website: tool.website,
            features: tool.features as unknown as Prisma.InputJsonValue,
            platformAvailability: tool.platformAvailability,
            integrations: tool.integrations,
            popularity: tool.popularity,
            bestFor: tool.bestFor,
          },
        });
      }

      return dbTool;
    }),

  // Get all available tools (for admin/browsing)
  getAll: protectedProcedure.query(async () => {
    return getAllTools();
  }),
});

