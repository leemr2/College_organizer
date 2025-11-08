import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { conversationalAI } from "@/lib/ai/conversational";

export const chatRouter = createTRPCRouter({
  // Send message and get response
  sendMessage: protectedProcedure
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

      // Get or create conversation
      let conversation;
      if (input.conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: input.conversationId },
        });
      }

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            studentId: student.id,
            messages: [],
          },
        });
      }

      // Add user message to history
      const messages = (conversation.messages as any[]) || [];
      messages.push({
        role: "user",
        content: input.message,
        timestamp: new Date().toISOString(),
      });

      // Get recent tasks for context
      const recentTasks = await prisma.task.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      // Build context
      const context = {
        name: student.name,
        preferences: student.preferences,
        recentTasks: recentTasks.map((t) => ({
          description: t.description,
          category: t.category,
          completed: t.completed,
        })),
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

  // Get or create current conversation
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!student) throw new Error("Student not found");

    // Get most recent conversation or create new one
    let conversation = await prisma.conversation.findFirst({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          studentId: student.id,
          messages: [],
        },
      });
    }

    return conversation;
  }),
});

