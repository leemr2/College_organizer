import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { conversationalAI } from "@/lib/ai/conversational";
import { schedulingService } from "@/lib/ai/scheduling";
import { getUserTimezone, getTodayStartInTimezone, getTodayEndInTimezone, getDateStartInTimezone, getDateEndInTimezone } from "@/lib/utils/timezone";
import { Message, StudentContext, TaskSummary, ConversationMode, DiscoveryQuestion, PlanningSessionState, DraftTask, SchedulingContext, ScheduleBlockData, TaskContext, ClassScheduleData, StudentPreferences } from "@/lib/types";
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
        // Get user's timezone for setting dailyConversationDate
        const timezone = getUserTimezone(student.preferences);
        const todayStart = getTodayStartInTimezone(timezone);
        
        conversation = await prisma.conversation.create({
          data: {
            studentId,
            conversationType: ConversationType.daily_planning,
            dailyConversationDate: todayStart, // Use timezone-aware date
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

  // Initialize planning session for daily_planning
  let planningSession: PlanningSessionState | null = null;
  if (conversationType === "daily_planning") {
    // Parse conversationMode from JSON string if it exists
    let parsedConversationMode: ConversationMode | null = null;
    if (conversation.conversationMode) {
      if (typeof conversation.conversationMode === 'string') {
        try {
          parsedConversationMode = JSON.parse(conversation.conversationMode) as ConversationMode;
        } catch {
          // Not JSON, treat as simple mode type string
          parsedConversationMode = { type: conversation.conversationMode as ConversationMode['type'] };
        }
      } else {
        parsedConversationMode = conversation.conversationMode as unknown as ConversationMode;
      }
    }
    
    // Get or initialize planning session from conversation mode
    if (parsedConversationMode?.planningSession) {
      // Parse Date objects from ISO strings
      planningSession = {
        ...parsedConversationMode.planningSession,
        draftTasks: parsedConversationMode.planningSession.draftTasks.map(dt => ({
          ...dt,
          dueDate: dt.dueDate ? (typeof dt.dueDate === 'string' ? new Date(dt.dueDate) : dt.dueDate) : null,
        })),
      };
    } else {
      // Initialize new planning session if not exists
      planningSession = {
        status: "active",
        draftTasks: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Extract draft tasks from user message
    if (planningSession.status === "active") {
      const timezone = getUserTimezone(student.preferences);
      const newDraftTasks = await conversationalAI.extractTasks(
        message,
        currentTime,
        timezone
      );
      
      // Merge with existing drafts (prevent duplicates)
      planningSession.draftTasks = conversationalAI.mergeDraftTasks(
        planningSession.draftTasks,
        newDraftTasks
      );
      planningSession.lastUpdated = new Date().toISOString();
    }
  }

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
      conversationMode: planningSession ? {
        type: "planning_session",
        currentPhase: "task_extraction",
        planningSession,
      } : undefined,
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
  // Parse conversationMode from JSON string if it's a planning session, otherwise treat as string
  let conversationMode: ConversationMode | null = null;
  if (conversation.conversationMode) {
    if (typeof conversation.conversationMode === 'string') {
      // Try to parse as JSON (planning session) or use as string (other modes)
      try {
        conversationMode = JSON.parse(conversation.conversationMode) as ConversationMode;
      } catch {
        // Not JSON, treat as simple mode type string
        conversationMode = { type: conversation.conversationMode as ConversationMode['type'] };
      }
    } else {
      conversationMode = conversation.conversationMode as unknown as ConversationMode;
    }
  }
  const currentPhase = conversation.currentPhase || "discovery";
  const discoveryData = (conversation.discoveryData as unknown) as {
    questions?: DiscoveryQuestion[];
    answers?: Record<string, string>;
  } | null;

  let response: string;
  let updatedMode: ConversationMode | null = conversationMode;
  let updatedPhase = currentPhase;
  let updatedDiscoveryData = discoveryData || {};

  // Update conversation mode with planning session if it exists
  if (planningSession && conversationType === "daily_planning") {
    updatedMode = {
      type: "planning_session",
      currentPhase: "task_extraction",
      planningSession,
    };
  }

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
  // For planning sessions, serialize the full mode object as JSON string
  // Need to serialize Date objects to ISO strings for JSON compatibility
  let conversationModeToSave: string | null = null;
  if (updatedMode) {
    if (updatedMode.type === "planning_session" && updatedMode.planningSession) {
      // Serialize planning session with Date objects converted to ISO strings
      const serializedSession = {
        ...updatedMode,
        planningSession: {
          ...updatedMode.planningSession,
          draftTasks: updatedMode.planningSession.draftTasks.map(dt => ({
            ...dt,
            dueDate: dt.dueDate ? dt.dueDate.toISOString() : null,
          })),
        },
      };
      conversationModeToSave = JSON.stringify(serializedSession);
    } else {
      // For other modes, just save the type string
      conversationModeToSave = updatedMode.type;
    }
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: messages as unknown as Prisma.JsonArray,
      conversationMode: conversationModeToSave,
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

  // Complete planning session and generate schedule
  completePlanningSession: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          preferences: true,
          classSchedules: true,
        },
      });

      if (!student) throw new Error("Student not found");

      const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
      });

      if (!conversation) throw new Error("Conversation not found");

      // Extract planning session - parse from JSON string if needed
      let mode: ConversationMode | null = null;
      if (conversation.conversationMode) {
        if (typeof conversation.conversationMode === 'string') {
          try {
            mode = JSON.parse(conversation.conversationMode) as ConversationMode;
          } catch {
            mode = { type: conversation.conversationMode as ConversationMode['type'] };
          }
        } else {
          mode = conversation.conversationMode as unknown as ConversationMode;
        }
      }
      
      // Parse Date objects from ISO strings in planning session
      let planningSession = mode?.planningSession;
      if (planningSession) {
        planningSession = {
          ...planningSession,
          draftTasks: planningSession.draftTasks.map(dt => ({
            ...dt,
            dueDate: dt.dueDate ? (typeof dt.dueDate === 'string' ? new Date(dt.dueDate) : dt.dueDate) : null,
          })),
        };
      }

      if (!planningSession || planningSession.draftTasks.length === 0) {
        throw new Error("No tasks to schedule");
      }

      // Update status to generating
      planningSession.status = "generating_schedule";
      
      // Serialize planning session with Date objects converted to ISO strings
      const serializedMode = {
        ...mode!,
        planningSession: {
          ...planningSession,
          draftTasks: planningSession.draftTasks.map(dt => ({
            ...dt,
            dueDate: dt.dueDate ? dt.dueDate.toISOString() : null,
          })),
        },
      };
      
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          conversationMode: JSON.stringify(serializedMode),
        },
      });

      // Build scheduling context from draft tasks
      const timezone = getUserTimezone(student.preferences);
      const todayStart = getTodayStartInTimezone(timezone);
      const todayEnd = getTodayEndInTimezone(timezone);

      // Get existing schedule blocks
      const existingBlocks = await prisma.scheduleBlock.findMany({
        where: {
          studentId: student.id,
          startTime: { gte: todayStart, lte: todayEnd },
        },
      });

      const existingBlockData: ScheduleBlockData[] = existingBlocks.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description || undefined,
        startTime: b.startTime,
        endTime: b.endTime,
        type: b.type as ScheduleBlockData["type"],
        completed: b.completed,
        taskId: b.taskId || undefined,
      }));

      const taskContexts: TaskContext[] = planningSession.draftTasks.map(dt => ({
        id: dt.tempId,
        description: dt.description,
        complexity: dt.complexity,
        category: dt.category,
        dueDate: dt.dueDate,
        completed: false,
      }));

      const classScheduleData: ClassScheduleData[] = student.classSchedules.map(cs => ({
        courseName: cs.courseName,
        courseCode: cs.courseCode || undefined,
        professor: cs.professor || undefined,
        meetingTimes: (cs.meetingTimes as unknown) as ClassScheduleData["meetingTimes"],
        semester: cs.semester,
      }));

      const schedulingContext: SchedulingContext = {
        tasks: taskContexts,
        classSchedules: classScheduleData,
        existingBlocks: existingBlockData,
        preferences: (student.preferences as unknown) as StudentPreferences,
        currentDate: new Date(),
        timezone,
      };

      // Generate schedule
      const suggestion = await schedulingService.generateDailySchedule(schedulingContext);

      // Save schedule suggestion to session
      planningSession.scheduleSuggestion = suggestion;
      planningSession.status = "completed";

      // Serialize completed planning session with Date objects converted to ISO strings
      const serializedCompletedMode = {
        ...mode!,
        currentPhase: "schedule_generation" as const,
        planningSession: {
          ...planningSession,
          draftTasks: planningSession.draftTasks.map(dt => ({
            ...dt,
            dueDate: dt.dueDate ? dt.dueDate.toISOString() : null,
          })),
          scheduleSuggestion: planningSession.scheduleSuggestion ? {
            ...planningSession.scheduleSuggestion,
            blocks: planningSession.scheduleSuggestion.blocks.map(block => ({
              ...block,
              startTime: block.startTime.toISOString(),
              endTime: block.endTime.toISOString(),
            })),
          } : undefined,
        },
      };

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          conversationMode: JSON.stringify(serializedCompletedMode),
        },
      });

      // Return with properly typed dates for frontend
      return {
        draftTasks: planningSession.draftTasks.map(dt => ({
          ...dt,
          dueDate: dt.dueDate,
        })),
        scheduleSuggestion: {
          ...suggestion,
          blocks: suggestion.blocks.map(block => ({
            ...block,
            startTime: block.startTime,
            endTime: block.endTime,
          })),
        },
      };
    }),

  // Commit planning session (tasks + schedule)
  commitPlanningSession: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: { preferences: true },
      });

      if (!student) throw new Error("Student not found");

      const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
      });

      if (!conversation) throw new Error("Conversation not found");

      // Extract planning session - parse from JSON string if needed
      let mode: ConversationMode | null = null;
      if (conversation.conversationMode) {
        if (typeof conversation.conversationMode === 'string') {
          try {
            mode = JSON.parse(conversation.conversationMode) as ConversationMode;
          } catch {
            mode = { type: conversation.conversationMode as ConversationMode['type'] };
          }
        } else {
          mode = conversation.conversationMode as unknown as ConversationMode;
        }
      }
      
      // Parse Date objects from ISO strings in planning session
      let planningSession = mode?.planningSession;
      if (planningSession) {
        planningSession = {
          ...planningSession,
          draftTasks: planningSession.draftTasks.map(dt => ({
            ...dt,
            dueDate: dt.dueDate ? (typeof dt.dueDate === 'string' ? new Date(dt.dueDate) : dt.dueDate) : null,
          })),
          // Also parse dates in schedule suggestion blocks
          scheduleSuggestion: planningSession.scheduleSuggestion ? {
            ...planningSession.scheduleSuggestion,
            blocks: planningSession.scheduleSuggestion.blocks.map(block => ({
              ...block,
              startTime: typeof block.startTime === 'string' ? new Date(block.startTime) : block.startTime,
              endTime: typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime,
            })),
          } : undefined,
        };
      }

      if (!planningSession || planningSession.status !== "completed") {
        throw new Error("Planning session not ready to commit");
      }

      const timezone = getUserTimezone(student.preferences);
      const todayStart = getTodayStartInTimezone(timezone);

      // Create all tasks and schedule blocks in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create tasks from drafts
        const createdTasks: Array<{ id: string }> = [];
        const taskIdMap = new Map<string, string>(); // tempId -> realId

        for (const draft of planningSession.draftTasks) {
          if (draft.isRecurring && draft.dueDate) {
            // Handle recurring tasks
            const daysUntilDue = Math.ceil(
              (draft.dueDate.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)
            );
            const maxDays = Math.min(Math.max(daysUntilDue, 1), 30);
            const groupId = `recurring_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            for (let i = 0; i < maxDays; i++) {
              const scheduledDate = new Date(todayStart.getTime() + i * 24 * 60 * 60 * 1000);
              const task = await tx.task.create({
                data: {
                  studentId: student.id,
                  description: draft.description,
                  category: draft.category,
                  complexity: draft.complexity,
                  dueDate: draft.dueDate,
                  isRecurring: true,
                  scheduledDate,
                  recurringTaskGroupId: groupId,
                },
              });
              if (i === 0) {
                createdTasks.push(task);
                taskIdMap.set(draft.tempId, task.id);
              }
            }
          } else {
            // One-time task
            const task = await tx.task.create({
              data: {
                studentId: student.id,
                description: draft.description,
                category: draft.category,
                complexity: draft.complexity,
                dueDate: draft.dueDate,
                isRecurring: false,
              },
            });
            createdTasks.push(task);
            taskIdMap.set(draft.tempId, task.id);
          }
        }

        // Create schedule blocks
        const createdBlocks = [];
        if (planningSession.scheduleSuggestion) {
          for (const block of planningSession.scheduleSuggestion.blocks) {
            // Map tempId to real taskId
            const realTaskId = block.taskId ? taskIdMap.get(block.taskId) : undefined;

            const scheduleBlock = await tx.scheduleBlock.create({
              data: {
                studentId: student.id,
                title: block.title,
                description: block.description,
                startTime: block.startTime,
                endTime: block.endTime,
                type: block.type,
                completed: false,
                taskId: realTaskId,
              },
            });
            createdBlocks.push(scheduleBlock);
          }
        }

        return { createdTasks, createdBlocks };
      });

      // Clear planning session
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          conversationMode: null,
        },
      });

      return result;
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

