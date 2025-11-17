import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { conversationalAI } from "@/lib/ai/conversational";
import { getUserTimezone, getTodayStartInTimezone, getTodayEndInTimezone } from "@/lib/utils/timezone";
import { Message, StudentContext, TaskSummary, ConversationMode, DiscoveryQuestion } from "@/lib/types";
import type { Prisma } from "@prisma/client";

// ConversationType enum values
const ConversationType = {
  daily_planning: "daily_planning" as const,
  task_specific: "task_specific" as const,
} as const;

// ============================================
// SHARED MESSAGE PROCESSING
// ============================================

interface ProcessMessageParams {
  studentId: string;
  userId: string;
  message: string;
  conversationType: "daily_planning" | "task_specific";
  taskId?: string;
  conversationId?: string;
}

async function processMessage(params: ProcessMessageParams) {
  const { studentId, userId, message, conversationType, taskId, conversationId } = params;

  // Get student with preferences
  const student = await prisma.student.findUnique({
    where: { userId },
    include: { preferences: true },
  });

  if (!student) throw new Error("Student not found");

  // Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  }

  if (!conversation) {
    if (conversationType === "daily_planning") {
      // Get user's timezone from preferences for timezone-aware date queries
      const timezone = getUserTimezone(student.preferences);
      const todayStart = getTodayStartInTimezone(timezone);
      const todayEnd = getTodayEndInTimezone(timezone);

      conversation = await prisma.conversation.findFirst({
        where: {
          studentId,
          conversationType: ConversationType.daily_planning,
          dailyConversationDate: { gte: todayStart, lte: todayEnd },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            studentId,
            conversationType: ConversationType.daily_planning,
            dailyConversationDate: new Date(),
            messages: [],
          },
        });
      }
    } else if (conversationType === "task_specific" && taskId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          studentId,
          conversationType: ConversationType.task_specific,
          taskId,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            studentId,
            conversationType: ConversationType.task_specific,
            taskId,
            messages: [],
          },
        });
      }
    } else {
      throw new Error("Invalid conversation configuration");
    }
  }

  // Add user message to history
  const messages = ((conversation.messages as unknown) as Message[]) || [];
  messages.push({
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  });

  // Get student's current tools
  const studentTools = await prisma.studentTool.findMany({
    where: {
      studentId,
      adoptedStatus: "using",
    },
    include: { tool: true },
  });

  // Build context based on conversation type
  let context: StudentContext;
  const currentTime = new Date();

  if (conversationType === "daily_planning") {
    // Get user's timezone from preferences for timezone-aware date queries
    const timezone = getUserTimezone(student.preferences);
    const todayStart = getTodayStartInTimezone(timezone);
    const todayEnd = getTodayEndInTimezone(timezone);
    
    const todayTasks = await prisma.task.findMany({
      where: {
        studentId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { createdAt: "desc" },
    });

    context = {
      name: student.name,
      preferences: (student.preferences as unknown) as StudentContext["preferences"],
      recentTasks: todayTasks.map((t): TaskSummary => ({
        description: t.description,
        category: t.category,
        completed: t.completed,
      })),
      conversationType: "daily_planning",
      currentTime,
      currentTools: studentTools.map((st) => ({
        id: st.tool.id,
        name: st.tool.name,
        category: st.tool.category,
      })),
    };
  } else {
    // task_specific context
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.studentId !== studentId) {
      throw new Error("Task not found");
    }

    context = {
      name: student.name,
      preferences: (student.preferences as unknown) as StudentContext["preferences"],
      task: {
        id: task.id,
        description: task.description,
        complexity: task.complexity,
        category: task.category,
        dueDate: task.dueDate,
        completed: task.completed,
      },
      conversationType: "task_specific",
      currentTools: studentTools.map((st) => ({
        id: st.tool.id,
        name: st.tool.name,
        category: st.tool.category,
      })),
    };
  }

  // Check conversation mode and handle deep dive if needed
  const conversationMode = (conversation.conversationMode as unknown) as ConversationMode | null;
  const currentPhase = conversation.currentPhase || "discovery";
  const discoveryData = (conversation.discoveryData as unknown) as {
    questions?: DiscoveryQuestion[];
    answers?: Record<string, string>;
  } | null;

  let response: string;
  let updatedMode: ConversationMode | null = conversationMode;
  let updatedPhase = currentPhase;
  let updatedDiscoveryData = discoveryData || {};

  if (conversationMode?.type === "deep_dive" && currentPhase === "discovery") {
    // Deep dive discovery phase - process answer and get next question
    const lastQuestion = conversationMode.discoveryQuestions?.find(
      (q) => !q.answered
    ) || conversationMode.discoveryQuestions?.[conversationMode.currentQuestionIndex || 0];

    if (lastQuestion) {
      const processResult = await conversationalAI.processDiscoveryAnswer(
        lastQuestion.id,
        message,
        conversationMode,
        context.task!
      );

      // Update discovery data
      if (!updatedDiscoveryData.questions) {
        updatedDiscoveryData.questions = conversationMode.discoveryQuestions || [];
      }
      const questionIndex = updatedDiscoveryData.questions.findIndex((q) => q.id === lastQuestion.id);
      if (questionIndex >= 0) {
        updatedDiscoveryData.questions[questionIndex].answered = true;
        updatedDiscoveryData.questions[questionIndex].answer = message;
      }

      if (!updatedDiscoveryData.answers) {
        updatedDiscoveryData.answers = {};
      }
      updatedDiscoveryData.answers[lastQuestion.id] = message;

      if (processResult.shouldProceedToRecommendations) {
        // Move to analysis phase
        updatedPhase = "analysis";
        
        // Analyze discovery data
        const analysisResult = await conversationalAI.analyzeDiscoveryData(
          updatedDiscoveryData.answers || {},
          context.task!,
          context
        );

        // Generate comprehensive recommendation
        response = await conversationalAI.generateComprehensiveRecommendation(
          analysisResult,
          context.task!,
          context
        );

        updatedPhase = "recommendation";
        updatedMode = {
          ...conversationMode,
          currentPhase: "recommendation",
        };
      } else {
        // Continue with next question
        response = processResult.nextQuestion || "Thank you for that information. Let me think about the best way to help you.";
        updatedMode = {
          ...conversationMode,
          currentQuestionIndex: (conversationMode.currentQuestionIndex || 0) + 1,
        };
      }
    } else {
      // Fallback to regular chat
      const chatMessages = messages.map((m): Message => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
      response = await conversationalAI.chat(chatMessages, context);
    }
  } else {
    // Regular chat or quick help mode
    const chatMessages = messages.map((m): Message => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    response = await conversationalAI.chat(chatMessages, context);
  }

  // Add assistant message
  messages.push({
    role: "assistant",
    content: response,
    timestamp: new Date().toISOString(),
  });

  // Save conversation with updated mode and phase
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: messages as unknown as Prisma.JsonArray,
      conversationMode: updatedMode?.type || null,
      currentPhase: updatedPhase,
      discoveryData: updatedDiscoveryData ? (updatedDiscoveryData as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  return {
    conversationId: conversation.id,
    message: response,
  };
}

export const chatRouter = createTRPCRouter({
  // Get or create today's daily planning conversation
  getDailyConversation: protectedProcedure.query(async ({ ctx }) => {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      include: { preferences: true },
    });

    if (!student) throw new Error("Student not found");

    // Get user's timezone from preferences for timezone-aware date queries
    const timezone = getUserTimezone(student.preferences);
    const todayStart = getTodayStartInTimezone(timezone);
    const todayEnd = getTodayEndInTimezone(timezone);

    // Check if daily conversation exists for today
    let conversation = await prisma.conversation.findFirst({
      where: {
        studentId: student.id,
        conversationType: ConversationType.daily_planning,
        dailyConversationDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Create new daily conversation if none exists for today
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          studentId: student.id,
          conversationType: ConversationType.daily_planning,
          dailyConversationDate: new Date(),
          messages: [],
        },
      });
    }

    return conversation;
  }),

  // Get or create conversation for specific task
  getTaskConversation: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Verify task belongs to student
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      // Check if conversation exists for this task
      let conversation = await prisma.conversation.findFirst({
        where: {
          studentId: student.id,
          conversationType: ConversationType.task_specific,
          taskId: input.taskId,
        },
        orderBy: { createdAt: "desc" },
      });

      // Create new task conversation if none exists
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            studentId: student.id,
            conversationType: ConversationType.task_specific,
            taskId: input.taskId,
            messages: [],
          },
        });
      }

      return conversation;
    }),

  // Send message in daily planning context
  sendDailyMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      return processMessage({
        studentId: student.id,
        userId: ctx.session.user.id,
        message: input.message,
        conversationType: "daily_planning",
        conversationId: input.conversationId,
      });
    }),

  // Send message in task-specific context
  sendTaskMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        taskId: z.string(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      // Verify task belongs to student
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      return processMessage({
        studentId: student.id,
        userId: ctx.session.user.id,
        message: input.message,
        conversationType: "task_specific",
        taskId: input.taskId,
        conversationId: input.conversationId,
      });
    }),

  // Start deep dive or quick help mode for a task
  startDeepDive: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        mode: z.enum(["quick_help", "deep_dive"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: { preferences: true },
      });

      if (!student) throw new Error("Student not found");

      // Verify task belongs to student
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      // Get or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          studentId: student.id,
          conversationType: ConversationType.task_specific,
          taskId: input.taskId,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            studentId: student.id,
            conversationType: ConversationType.task_specific,
            taskId: input.taskId,
            messages: [],
          },
        });
      }

      // Get student's current tools
      const studentTools = await prisma.studentTool.findMany({
        where: {
          studentId: student.id,
          adoptedStatus: "using",
        },
        include: { tool: true },
      });

      const taskContext = {
        id: task.id,
        description: task.description,
        complexity: task.complexity,
        category: task.category,
        dueDate: task.dueDate,
        completed: task.completed,
      };

      const studentContext: StudentContext = {
        name: student.name,
        preferences: (student.preferences as unknown) as StudentContext["preferences"],
        task: taskContext,
        conversationType: "task_specific",
        currentTools: studentTools.map((st) => ({
          id: st.tool.id,
          name: st.tool.name,
          category: st.tool.category,
        })),
      };

      if (input.mode === "deep_dive") {
        // Start deep dive discovery
        const { questions, initialMessage } = await conversationalAI.startDeepDive(
          taskContext,
          studentContext
        );

        const conversationMode: ConversationMode = {
          type: "deep_dive",
          currentPhase: "discovery",
          discoveryQuestions: questions,
          currentQuestionIndex: 0,
        };

        // Save conversation with mode
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            conversationMode: "deep_dive",
            currentPhase: "discovery",
            discoveryData: {
              questions,
              answers: {},
            } as unknown as Prisma.InputJsonValue,
            messages: [
              {
                role: "assistant",
                content: initialMessage,
                timestamp: new Date().toISOString(),
              },
            ] as unknown as Prisma.JsonArray,
          },
        });

        return {
          conversationId: conversation.id,
          message: initialMessage,
          mode: "deep_dive",
          questions,
        };
      } else {
        // Quick help mode - generate immediate response
        const messages: Message[] = [
          {
            role: "user",
            content: `I need help with: ${task.description}`,
            timestamp: new Date().toISOString(),
          },
        ];

        studentContext.conversationMode = {
          type: "quick_help",
          currentPhase: "recommendation",
        };

        const response = await conversationalAI.chat(messages, studentContext);

        // Save conversation
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            conversationMode: "quick_help",
            messages: [
              ...messages,
              {
                role: "assistant",
                content: response,
                timestamp: new Date().toISOString(),
              },
            ] as unknown as Prisma.JsonArray,
          },
        });

        return {
          conversationId: conversation.id,
          message: response,
          mode: "quick_help",
        };
      }
    }),

  // Send message and get response (backward compatibility)
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Backward compatibility - defaults to daily planning
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      return processMessage({
        studentId: student.id,
        userId: ctx.session.user.id,
        message: input.message,
        conversationType: "daily_planning",
        conversationId: input.conversationId,
      });
    }),

  // Get conversation history
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
      });

      if (!conversation || conversation.studentId !== student.id) {
        throw new Error("Conversation not found");
      }

      return conversation;
    }),

  // Get recent conversations
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error("Student not found");

      const conversations = await prisma.conversation.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });

      return conversations;
    }),

  // Get or create current conversation (backward compatibility - defaults to daily planning)
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      include: { preferences: true },
    });

    if (!student) throw new Error("Student not found");

    // Get user's timezone from preferences for timezone-aware date queries
    const timezone = getUserTimezone(student.preferences);
    const todayStart = getTodayStartInTimezone(timezone);
    const todayEnd = getTodayEndInTimezone(timezone);

    // Check if daily conversation exists for today
    let conversation = await prisma.conversation.findFirst({
      where: {
        studentId: student.id,
        conversationType: ConversationType.daily_planning,
        dailyConversationDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Create new daily conversation if none exists for today
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          studentId: student.id,
          conversationType: ConversationType.daily_planning,
          dailyConversationDate: new Date(),
          messages: [],
        },
      });
    }

    return conversation;
  }),
});

