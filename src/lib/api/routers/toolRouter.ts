import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { toolRecommendationService } from "@/lib/ai/toolRecommendation";
import { getAllTools, getToolById, searchTools } from "@/lib/utils/toolDatabase";
import type { ToolSearchQuery } from "@/lib/ai/toolRecommendation";
import type { StudentContext } from "@/lib/types";
import type { Prisma } from "@prisma/client";
import { generateChatCompletion, parseJsonResponse } from "@/lib/aiClient";
import type { Tool } from "@/lib/utils/toolDatabase";

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

      // Fetch student's current tools
      const studentTools = await prisma.studentTool.findMany({
        where: {
          studentId: student.id,
          adoptedStatus: "using",
        },
        include: { tool: true },
      });

      const studentContext = {
        name: student.name,
        preferences: student.preferences as unknown as StudentContext["preferences"],
        conversationType: "task_specific" as const,
        currentTools: studentTools.map((st) => ({
          id: st.tool.id,
          name: st.tool.name,
          category: st.tool.category,
        })),
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

      // Check if tool exists in database, create if not
      let dbTool = await prisma.tool.findUnique({
        where: { id: input.toolId },
      });

      if (!dbTool) {
        // Get tool from JSON database
        const tool = getToolById(input.toolId);
        if (!tool) {
          throw new Error("Tool not found");
        }

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

  // Get student's current tools (adoptedStatus: "using")
  getMyTools: protectedProcedure.query(async ({ ctx }) => {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!student) throw new Error("Student not found");

    return await prisma.studentTool.findMany({
      where: {
        studentId: student.id,
        adoptedStatus: "using",
      },
      include: { tool: true },
      orderBy: { discoveredDate: "desc" },
    });
  }),

  // Get all available tools organized by category
  getAllToolsByCategory: protectedProcedure.query(async () => {
    const allTools = getAllTools();

    // Group by category
    const byCategory: Record<string, Tool[]> = {};
    allTools.forEach((tool) => {
      tool.category.forEach((cat) => {
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(tool);
      });
    });

    return byCategory;
  }),

  // Analyze diagnostic and recommend tools
  analyzeDiagnostic: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        whatDidntWork: z.string(),
        challengesFaced: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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

      // Get student's current tools
      const studentTools = await prisma.studentTool.findMany({
        where: { studentId: student.id, adoptedStatus: "using" },
        include: { tool: true },
      });

      // Use AI to analyze the diagnostic and recommend tools
      const prompt = `A student just completed a task with low effectiveness. Here's the diagnostic:

Task: "${task.description}"
Category: ${task.category || "general"}
Complexity: ${task.complexity}

What didn't work: "${input.whatDidntWork}"
Challenges faced: "${input.challengesFaced}"

Tools they're already using: ${studentTools.map((st) => st.tool.name).join(", ") || "None"}

Based on this diagnostic:
1. Provide a brief 1-2 sentence analysis of what went wrong
2. Recommend 1-2 alternative tools/techniques that address the specific challenges mentioned
3. Use tool IDs from the tools.json database (anki, quizlet, notion, etc.)

Return JSON:
{
  "analysis": "brief analysis of the issue",
  "toolIds": ["tool-id-1", "tool-id-2"],
  "reasons": ["why tool 1 helps with this specific challenge", "why tool 2 helps"]
}`;

      const response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "GPT_5"
      );

      const parsed = parseJsonResponse(response) as {
        analysis: string;
        toolIds: string[];
        reasons: string[];
      };

      // Get the recommended tools
      const candidateTools = getAllTools();
      const recommendations = parsed.toolIds
        .map((toolId, idx) => {
          const tool = candidateTools.find((t) => t.id === toolId);
          if (!tool) return null;

          return {
            toolId: tool.id,
            tool: tool,
            reason: parsed.reasons[idx] || "Could help improve effectiveness",
            learningCurve: tool.learningCurve,
            howToGetStarted: `Visit ${tool.website} to get started`,
          };
        })
        .filter((rec): rec is NonNullable<typeof rec> => rec !== null);

      // Create ToolSuggestion records for tracking (status 4c)
      for (const rec of recommendations) {
        // First ensure tool exists in DB
        let dbTool = await prisma.tool.findUnique({
          where: { id: rec.toolId },
        });

        if (!dbTool) {
          // Create tool in database from JSON data
          dbTool = await prisma.tool.create({
            data: {
              id: rec.tool.id,
              name: rec.tool.name,
              category: rec.tool.category,
              description: rec.tool.description,
              useCases: rec.tool.useCases,
              cost: rec.tool.cost,
              studentFriendly: rec.tool.studentFriendly,
              learningCurve: rec.tool.learningCurve,
              website: rec.tool.website,
              features: rec.tool.features as unknown as Prisma.InputJsonValue,
              platformAvailability: rec.tool.platformAvailability,
              integrations: rec.tool.integrations,
              popularity: rec.tool.popularity,
              bestFor: rec.tool.bestFor,
            },
          });
        }

        // Create suggestion with diagnostic context
        await prisma.toolSuggestion.create({
          data: {
            studentId: student.id,
            taskId: task.id,
            toolId: dbTool.id,
            context: `Diagnostic: ${input.whatDidntWork} | ${input.challengesFaced} | Reason: ${rec.reason}`,
          },
        });
      }

      return {
        analysis: parsed.analysis,
        recommendations,
      };
    }),
});

