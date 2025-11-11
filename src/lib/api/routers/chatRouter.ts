import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { conversationalAI } from "@/lib/ai/conversational";
import { getTodayStart, getTodayEnd } from "@/lib/utils/dailyDetection";
import { getUserTimezone, getTodayStartInTimezone, getTodayEndInTimezone } from "@/lib/utils/timezone";
import { Message, MessageArray, StudentContext, TaskSummary } from "@/lib/types";

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
  const messages = ((conversation.messages as unknown) as MessageArray) || [];
  messages.push({
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
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
    };
  }

  // Generate AI response
  const chatMessages = messages.map((m): Message => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));

  // Note: conversationalAI.chat expects Message[] but currently the Message type in conversational.ts
  // doesn't include timestamp. We'll update that in Phase 2B. For now, map to the expected format.
  const response = await conversationalAI.chat(
    chatMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    context
  );

  // Add assistant message
  messages.push({
    role: "assistant",
    content: response,
    timestamp: new Date().toISOString(),
  });

  // Save conversation
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { messages: messages as any },
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
    });

    if (!student) throw new Error("Student not found");

    const todayStart = getTodayStart();
    const todayEnd = getTodayEnd();

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
    });

    if (!student) throw new Error("Student not found");

    // Default to today's daily planning conversation
    const todayStart = getTodayStart();
    const todayEnd = getTodayEnd();

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

