import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { conversationalAI } from "@/lib/ai/conversational";
import { getTodayStart, getTodayEnd } from "@/lib/utils/dailyDetection";

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
        conversationType: "daily_planning",
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
          conversationType: "daily_planning",
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
          conversationType: "task_specific",
          taskId: input.taskId,
        },
        orderBy: { createdAt: "desc" },
      });

      // Create new task conversation if none exists
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            studentId: student.id,
            conversationType: "task_specific",
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
        include: {
          preferences: true,
        },
      });

      if (!student) throw new Error("Student not found");

      // Get or create daily conversation
      let conversation;
      if (input.conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: input.conversationId },
        });
      }

      if (!conversation) {
        const todayStart = getTodayStart();
        const todayEnd = getTodayEnd();

        conversation = await prisma.conversation.findFirst({
          where: {
            studentId: student.id,
            conversationType: "daily_planning",
            dailyConversationDate: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              studentId: student.id,
              conversationType: "daily_planning",
              dailyConversationDate: new Date(),
              messages: [],
            },
          });
        }
      }

      // Add user message to history
      const messages = (conversation.messages as any[]) || [];
      messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date().toISOString(),
      });

      // Get today's tasks for context
      const todayStart = getTodayStart();
      const todayEnd = getTodayEnd();
      const todayTasks = await prisma.task.findMany({
        where: {
          studentId: student.id,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Build context for daily planning
      const context = {
        name: student.name,
        preferences: student.preferences,
        recentTasks: todayTasks.map((t) => ({
          description: t.description,
          category: t.category,
          completed: t.completed,
        })),
        conversationType: "daily_planning" as const,
      };

      // Generate response using ConversationalAI
      const chatMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await conversationalAI.chat(chatMessages, context);

      // Add assistant message
      messages.push({
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      });

      // Save conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { messages },
      });

      return {
        conversationId: conversation.id,
        message: response,
      };
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
        include: {
          preferences: true,
        },
      });

      if (!student) throw new Error("Student not found");

      // Verify task belongs to student
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.studentId !== student.id) {
        throw new Error("Task not found");
      }

      // Get or create task conversation
      let conversation;
      if (input.conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: input.conversationId },
        });
      }

      if (!conversation) {
        conversation = await prisma.conversation.findFirst({
          where: {
            studentId: student.id,
            conversationType: "task_specific",
            taskId: input.taskId,
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              studentId: student.id,
              conversationType: "task_specific",
              taskId: input.taskId,
              messages: [],
            },
          });
        }
      }

      // Add user message to history
      const messages = (conversation.messages as any[]) || [];
      messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date().toISOString(),
      });

      // Build context for task-specific conversation
      const context = {
        name: student.name,
        preferences: student.preferences,
        task: {
          id: task.id,
          description: task.description,
          complexity: task.complexity,
          category: task.category,
          dueDate: task.dueDate,
          completed: task.completed,
        },
        conversationType: "task_specific" as const,
      };

      // Generate response using ConversationalAI
      const chatMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await conversationalAI.chat(chatMessages, context);

      // Add assistant message
      messages.push({
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      });

      // Save conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { messages },
      });

      return {
        conversationId: conversation.id,
        message: response,
      };
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
      // Default to daily planning for backward compatibility
      // Reuse the sendDailyMessage logic
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          preferences: true,
        },
      });

      if (!student) throw new Error("Student not found");

      // Get or create daily conversation
      let conversation;
      if (input.conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: input.conversationId },
        });
      }

      if (!conversation) {
        const todayStart = getTodayStart();
        const todayEnd = getTodayEnd();

        conversation = await prisma.conversation.findFirst({
          where: {
            studentId: student.id,
            conversationType: "daily_planning",
            dailyConversationDate: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              studentId: student.id,
              conversationType: "daily_planning",
              dailyConversationDate: new Date(),
              messages: [],
            },
          });
        }
      }

      // Add user message to history
      const messages = (conversation.messages as any[]) || [];
      messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date().toISOString(),
      });

      // Get today's tasks for context
      const todayStart = getTodayStart();
      const todayEnd = getTodayEnd();
      const todayTasks = await prisma.task.findMany({
        where: {
          studentId: student.id,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Build context for daily planning
      const context = {
        name: student.name,
        preferences: student.preferences,
        recentTasks: todayTasks.map((t) => ({
          description: t.description,
          category: t.category,
          completed: t.completed,
        })),
        conversationType: "daily_planning" as const,
      };

      // Generate response using ConversationalAI
      const chatMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await conversationalAI.chat(chatMessages, context);

      // Add assistant message
      messages.push({
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      });

      // Save conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { messages },
      });

      return {
        conversationId: conversation.id,
        message: response,
      };
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
        conversationType: "daily_planning",
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
          conversationType: "daily_planning",
          dailyConversationDate: new Date(),
          messages: [],
        },
      });
    }

    return conversation;
  }),
});

