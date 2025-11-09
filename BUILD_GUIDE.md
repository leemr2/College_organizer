# Scout Build Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Development Setup](#development-setup)
4. [Database Design & Implementation](#database-design--implementation)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [AI Integration](#ai-integration)
8. [Feature Implementation Roadmap](#feature-implementation-roadmap)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)

---

## Project Overview

**Scout** is an AI-powered daily assistant for college students that combines:
- Conversational task capture (voice-first)
- Intelligent clarification and context gathering
- Tool discovery and recommendation engine
- Smart scheduling and time blocking
- Proactive check-ins and learning system

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: tRPC, Prisma, NextAuth.js, Inngest
- **Database**: PostgreSQL (Supabase)
- **AI Providers**: OpenAI GPT-4 (conversation), Anthropic Claude (research)
- **Infrastructure**: Vercel (hosting), Resend (email)

### Key Differentiators
1. **Tool Discovery Engine**: AI actively researches and suggests better tools/methods
2. **Progressive Learning**: System learns what works for each student
3. **Voice-First Interaction**: Natural conversation via voice input
4. **Intelligent Scheduling**: AI-optimized time blocks based on personal patterns

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  • Chat Interface (Voice + Text)                             │
│  • Dashboard (Schedule View)                                 │
│  • Onboarding Flow                                           │
│  • Settings & Preferences                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      tRPC API Layer                          │
├─────────────────────────────────────────────────────────────┤
│  • studentRouter    • taskRouter      • scheduleRouter       │
│  • chatRouter       • toolRouter      • checkInRouter        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ConversationalAI  │  ResearchAI  │  MemorySystem            │
│  (GPT-4)           │  (Claude)    │  (Pattern Recognition)   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Background Jobs (Inngest)                 │
├─────────────────────────────────────────────────────────────┤
│  • Study Block Check-ins                                     │
│  • End of Day Reviews                                        │
│  • Follow-up Reminders                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Prisma + PostgreSQL)          │
├─────────────────────────────────────────────────────────────┤
│  Students │ Tasks │ Schedule │ Tools │ Conversations │ Logs  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

**Voice Task Capture Flow:**
```
User speaks → Web Speech API → Text transcription →
Task extraction (GPT-4) → Clarification questions (GPT-4) →
Store in DB → Schedule optimization (Claude) → Present to user
```

**Tool Discovery Flow:**
```
Student describes approach → Pattern recognition (GPT-4) →
Inefficiency detected → Research best tools (Claude + Web Search) →
Match to student context → Present as question → Track adoption
```

---

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (Supabase account)
- OpenAI API key
- Anthropic API key (optional for MVP)
- Git

### Initial Setup

1. **Clone and Install**
```bash
# Clone repository
git clone <your-repo-url>
cd College_organizer

# Install dependencies
npm install
```

2. **Environment Configuration**

Copy `.env.example` to `.env` and configure:

```bash
# Database (Supabase)
# IMPORTANT: Use Session Pooler (port 5432) for Prisma/NextAuth
# Transaction Pooler (port 6543) doesn't support prepared statements
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..." # For Phase 2+

# Background Jobs (get from inngest.com)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Optional
RESEND_API_KEY="..." # For email notifications
```

3. **Database Setup**

**Windows Users - DNS Resolution Fix:**
If you encounter connection errors (`P1001: Can't reach database server`), set Node.js to prefer IPv4:
```powershell
# Set permanently (recommended)
[System.Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--dns-result-order=ipv4first", "User")

# Or for current session only
$env:NODE_OPTIONS="--dns-result-order=ipv4first"
```
Restart your terminal after setting permanently.

```bash
# Generate Prisma client
npx prisma generate

# Run initial migration
npx prisma migrate dev --name init

# Verify database connection
npx prisma db push
```

4. **Start Development Server**
```bash
npm run dev
```

Visit http://localhost:3000

### Development Tools

**Prisma Studio** (Database GUI):
```bash
npx prisma studio
```

**Storybook** (Component Development):
```bash
npm run storybook
```

---

## Database Design & Implementation

### Core Schema Structure

The database schema follows the PRD requirements with additional optimizations for AI learning and pattern recognition.

#### Phase 1: MVP Schema

```prisma
// prisma/schema.prisma

// Student Profile
model Student {
  id                String              @id @default(cuid())
  userId            String              @unique // Links to User model
  name              String
  email             String              @unique
  year              String? // freshman, sophomore, junior, senior
  biggestChallenge  String? // From onboarding
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  onboardingComplete Boolean           @default(false)

  // Relations
  user              User                @relation(fields: [userId], references: [id])
  tasks             Task[]
  scheduleBlocks    ScheduleBlock[]
  classSchedules    ClassSchedule[]
  conversations     Conversation[]
  preferences       StudentPreferences?

  @@index([userId])
}

// Task Management
model Task {
  id                   String    @id @default(cuid())
  studentId            String
  description          String
  complexity           TaskComplexity // simple, medium, complex
  category             String? // exam, assignment, life, etc.
  dueDate              DateTime?
  clarificationComplete Boolean  @default(false)
  clarificationData    Json? // Stores Q&A responses
  completed            Boolean   @default(false)
  completedAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relations
  student              Student          @relation(fields: [studentId], references: [id])
  scheduleBlock        ScheduleBlock?
  toolSuggestions      ToolSuggestion[]
  effectivenessLog     EffectivenessLog?

  @@index([studentId])
  @@index([dueDate])
}

enum TaskComplexity {
  simple
  medium
  complex
}

// Schedule Management
model ScheduleBlock {
  id          String         @id @default(cuid())
  studentId   String
  taskId      String?        @unique
  startTime   DateTime
  endTime     DateTime
  type        BlockType      // class, task, break, commitment
  title       String
  description String?
  completed   Boolean        @default(false)
  completedAt DateTime?
  reasoning   String? // Why this time was suggested
  createdAt   DateTime       @default(now())

  // Relations
  student     Student        @relation(fields: [studentId], references: [id])
  task        Task?          @relation(fields: [taskId], references: [id])
  checkIn     CheckIn?

  @@index([studentId])
  @@index([startTime])
}

enum BlockType {
  class
  task
  break
  commitment
}

// Class Schedule
model ClassSchedule {
  id          String    @id @default(cuid())
  studentId   String
  courseName  String
  courseCode  String?
  professor   String?
  meetingTimes Json // Array of {day, startTime, endTime}
  semester    String
  syllabus    String? // URL or file path
  exams       Json? // Array of DateTime
  createdAt   DateTime  @default(now())

  student     Student   @relation(fields: [studentId], references: [id])

  @@index([studentId])
}

// Conversation History
model Conversation {
  id          String    @id @default(cuid())
  studentId   String
  messages    Json // Array of {role, content, timestamp}
  context     Json? // Relevant context for the conversation
  createdAt   DateTime  @default(now())

  student     Student   @relation(fields: [studentId], references: [id])

  @@index([studentId])
  @@index([createdAt])
}

// Student Preferences
model StudentPreferences {
  id                     String   @id @default(cuid())
  studentId              String   @unique
  peakEnergyTimes        Json // Array of time ranges
  preferredBreakLength   Int      @default(10) // minutes
  morningPerson          Boolean?
  studyAloneVsGroup      String? // alone, groups, mix
  studyEnvironmentPrefs  Json?
  effectiveStudyPatterns Json? // Learned patterns
  notificationSettings   Json?
  updatedAt              DateTime @updatedAt

  student                Student  @relation(fields: [studentId], references: [id])
}
```

#### Phase 2: Tool Discovery Schema

```prisma
// Tool Database
model Tool {
  id              String   @id @default(cuid())
  name            String   @unique
  category        String[] // study, productivity, etc.
  description     String
  useCases        String[]
  cost            ToolCost
  studentFriendly Boolean  @default(true)
  learningCurve   LearningCurve
  website         String?
  features        Json // Array of {name, description}
  createdAt       DateTime @default(now())

  // Relations
  studentTools    StudentTool[]
  suggestions     ToolSuggestion[]

  @@index([category])
}

enum ToolCost {
  free
  freemium
  paid
}

enum LearningCurve {
  easy
  medium
  hard
}

// Student-Tool Relationships
model StudentTool {
  id                String         @id @default(cuid())
  studentId         String
  toolId            String
  discoveredDate    DateTime       @default(now())
  adoptedStatus     AdoptionStatus @default(suggested)
  effectivenessRating Int?         @db.SmallInt // 1-5
  featuresDiscovered String[]
  notes             String?
  lastUsed          DateTime?

  student           Student        @relation(fields: [studentId], references: [id])
  tool              Tool           @relation(fields: [toolId], references: [id])

  @@unique([studentId, toolId])
  @@index([studentId])
}

enum AdoptionStatus {
  suggested
  trying
  using
  abandoned
}

// Tool Suggestions
model ToolSuggestion {
  id                String    @id @default(cuid())
  studentId         String
  taskId            String?
  toolId            String
  context           String // Why it was suggested
  suggestedDate     DateTime  @default(now())
  studentResponse   String?
  followUpScheduled Boolean   @default(false)
  followUpDate      DateTime?

  student           Student   @relation(fields: [studentId], references: [id])
  task              Task?     @relation(fields: [taskId], references: [id])
  tool              Tool      @relation(fields: [toolId], references: [id])

  @@index([studentId])
  @@index([followUpDate])
}
```

#### Phase 3: Learning & Analytics Schema

```prisma
// Effectiveness Tracking
model EffectivenessLog {
  id              String   @id @default(cuid())
  studentId       String
  taskId          String   @unique
  toolId          String?
  strategy        String?
  effectiveness   Int      @db.SmallInt // 1-5 rating
  timeSpent       Int // minutes
  timeEstimated   Int // minutes
  completed       Boolean
  notes           String?
  contextData     Json?
  loggedAt        DateTime @default(now())

  student         Student  @relation(fields: [studentId], references: [id])
  task            Task     @relation(fields: [taskId], references: [id])
  tool            Tool?    @relation(fields: [toolId], references: [id])

  @@index([studentId])
  @@index([loggedAt])
}

// Check-in Records
model CheckIn {
  id              String         @id @default(cuid())
  studentId       String
  scheduleBlockId String         @unique
  type            CheckInType
  promptSent      Boolean        @default(false)
  responsed       Boolean        @default(false)
  responseData    Json?
  sentiment       String? // positive, neutral, negative
  createdAt       DateTime       @default(now())

  student         Student        @relation(fields: [studentId], references: [id])
  scheduleBlock   ScheduleBlock  @relation(fields: [scheduleBlockId], references: [id])

  @@index([studentId])
  @@index([createdAt])
}

enum CheckInType {
  study_progress
  end_of_day
  tool_followup
}
```

### Migration Strategy

1. **Create Migration Files**
```bash
# Phase 1: Core functionality
npx prisma migrate dev --name add_core_student_and_tasks

# Phase 2: Tool discovery
npx prisma migrate dev --name add_tool_discovery

# Phase 3: Learning system
npx prisma migrate dev --name add_effectiveness_tracking
```

2. **Seed Database with Common Tools**
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMON_TOOLS = [
  {
    name: 'Quizlet',
    category: ['study', 'memorization', 'flashcards'],
    description: 'Digital flashcard and study tool with spaced repetition',
    useCases: ['vocabulary memorization', 'concept review', 'test preparation'],
    cost: 'freemium',
    studentFriendly: true,
    learningCurve: 'easy',
    website: 'https://quizlet.com',
    features: [
      { name: 'Auto-generate flashcards', description: 'Paste text to create cards' },
      { name: 'Learn mode', description: 'Adaptive learning' },
      { name: 'Test mode', description: 'Practice tests' }
    ]
  },
  {
    name: 'Notion',
    category: ['notes', 'organization', 'productivity'],
    description: 'All-in-one workspace for notes, tasks, and databases',
    useCases: ['note-taking', 'task management', 'project organization'],
    cost: 'free',
    studentFriendly: true,
    learningCurve: 'medium',
    website: 'https://notion.so',
    features: [
      { name: 'Pages and subpages', description: 'Hierarchical organization' },
      { name: 'Databases', description: 'Track assignments and projects' },
      { name: 'Templates', description: 'Pre-made layouts' }
    ]
  },
  // Add more tools...
];

async function seed() {
  console.log('Seeding database...');

  for (const tool of COMMON_TOOLS) {
    await prisma.tool.upsert({
      where: { name: tool.name },
      update: {},
      create: tool,
    });
  }

  console.log('Seeding complete!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.disconnect();
  });
```

Run seed:
```bash
npx prisma db seed
```

---

## Backend Implementation

### tRPC Router Structure

Create routers in `src/lib/api/routers/` directory:

#### 1. Student Router
```typescript
// src/lib/api/routers/studentRouter.ts

import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";

export const studentRouter = createTRPCRouter({
  // Create student profile during onboarding
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        year: z.string().optional(),
        biggestChallenge: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          email: ctx.session.user.email!,
          year: input.year,
          biggestChallenge: input.biggestChallenge,
        },
      });

      return student;
    }),

  // Get current student profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
      include: {
        preferences: true,
        classSchedules: true,
      },
    });

    return student;
  }),

  // Update preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        peakEnergyTimes: z.array(z.string()).optional(),
        preferredBreakLength: z.number().optional(),
        morningPerson: z.boolean().optional(),
        studyAloneVsGroup: z.string().optional(),
        notificationSettings: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error('Student not found');

      const preferences = await prisma.studentPreferences.upsert({
        where: { studentId: student.id },
        update: input,
        create: {
          studentId: student.id,
          ...input,
        },
      });

      return preferences;
    }),

  // Complete onboarding
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const student = await prisma.student.update({
      where: { userId: ctx.session.user.id },
      data: { onboardingComplete: true },
    });

    return student;
  }),
});
```

#### 2. Task Router
```typescript
// src/lib/api/routers/taskRouter.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { generateChatCompletion, AI_MODELS } from "@/lib/aiClient";

export const taskRouter = createTRPCRouter({
  // Extract tasks from natural language input
  extractFromText: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error('Student not found');

      // Use GPT-4 to extract tasks
      const prompt = `Extract individual tasks from this text: "${input.text}"

Return a JSON array of tasks with this structure:
{
  "tasks": [
    {
      "description": "task description",
      "category": "exam|assignment|life|other",
      "complexity": "simple|medium|complex",
      "urgency": "high|medium|low"
    }
  ]
}`;

      const response = await generateChatCompletion(
        [{ role: 'user', content: prompt }],
        'GPT_4O'
      );

      const { tasks } = JSON.parse(response);

      // Create tasks in database
      const createdTasks = await prisma.$transaction(
        tasks.map((task: any) =>
          prisma.task.create({
            data: {
              studentId: student.id,
              description: task.description,
              category: task.category,
              complexity: task.complexity,
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

      if (!task) throw new Error('Task not found');

      // Generate questions based on complexity
      const prompt = `For this ${task.complexity} complexity task: "${task.description}"

Generate 2-4 clarifying questions to better understand:
- Scope and requirements
- Timeline and urgency
- Current progress or approach
- Resources available

Return JSON:
{
  "questions": ["question 1", "question 2", ...]
}`;

      const response = await generateChatCompletion(
        [{ role: 'user', content: prompt }],
        'GPT_4O'
      );

      return JSON.parse(response);
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
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error('Student not found');

      const startOfDay = new Date(input.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(input.date);
      endOfDay.setHours(23, 59, 59, 999);

      const tasks = await prisma.task.findMany({
        where: {
          studentId: student.id,
          OR: [
            { dueDate: { gte: startOfDay, lte: endOfDay } },
            { scheduleBlock: { startTime: { gte: startOfDay, lte: endOfDay } } },
          ],
        },
        include: {
          scheduleBlock: true,
          toolSuggestions: { include: { tool: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      return tasks;
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

      // Create effectiveness log if rating provided
      if (input.effectiveness) {
        await prisma.effectivenessLog.create({
          data: {
            studentId: task.studentId,
            taskId: task.id,
            effectiveness: input.effectiveness,
            notes: input.notes,
            completed: true,
            timeSpent: 0, // TODO: calculate from schedule blocks
            timeEstimated: 0, // TODO: get from schedule
          },
        });
      }

      return task;
    }),
});
```

#### 3. Schedule Router
```typescript
// src/lib/api/routers/scheduleRouter.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { generateChatCompletion } from "@/lib/aiClient";

export const scheduleRouter = createTRPCRouter({
  // Generate optimized schedule for tasks
  optimizeSchedule: protectedProcedure
    .input(
      z.object({
        date: z.date(),
        taskIds: z.array(z.string()),
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

      if (!student) throw new Error('Student not found');

      const tasks = await prisma.task.findMany({
        where: { id: { in: input.taskIds } },
      });

      // Build context for AI
      const context = {
        date: input.date,
        tasks: tasks.map(t => ({
          id: t.id,
          description: t.description,
          complexity: t.complexity,
          dueDate: t.dueDate,
        })),
        preferences: student.preferences,
        classSchedule: student.classSchedules,
      };

      const prompt = `Create an optimized schedule for these tasks:
${JSON.stringify(context, null, 2)}

Return JSON with schedule blocks:
{
  "blocks": [
    {
      "taskId": "task-id",
      "startTime": "ISO timestamp",
      "endTime": "ISO timestamp",
      "reasoning": "why this time slot"
    }
  ]
}

Consider:
- Peak energy times
- Task complexity and mental energy required
- Class schedule conflicts
- Break times
- Realistic durations`;

      const response = await generateChatCompletion(
        [{ role: 'user', content: prompt }],
        'GPT_4O'
      );

      const { blocks } = JSON.parse(response);

      // Create schedule blocks
      const scheduleBlocks = await prisma.$transaction(
        blocks.map((block: any) =>
          prisma.scheduleBlock.create({
            data: {
              studentId: student.id,
              taskId: block.taskId,
              startTime: new Date(block.startTime),
              endTime: new Date(block.endTime),
              type: 'task',
              title: tasks.find(t => t.id === block.taskId)?.description || 'Task',
              reasoning: block.reasoning,
            },
          })
        )
      );

      return scheduleBlocks;
    }),

  // Get schedule for a date
  getByDate: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error('Student not found');

      const startOfDay = new Date(input.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(input.date);
      endOfDay.setHours(23, 59, 59, 999);

      const blocks = await prisma.scheduleBlock.findMany({
        where: {
          studentId: student.id,
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        include: { task: true },
        orderBy: { startTime: 'asc' },
      });

      return blocks;
    }),

  // Mark schedule block as complete
  completeBlock: protectedProcedure
    .input(z.object({ blockId: z.string() }))
    .mutation(async ({ input }) => {
      const block = await prisma.scheduleBlock.update({
        where: { id: input.blockId },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      });

      return block;
    }),
});
```

#### 4. Chat Router
```typescript
// src/lib/api/routers/chatRouter.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { generateChatCompletion } from "@/lib/aiClient";

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
      });

      if (!student) throw new Error('Student not found');

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
      const messages = conversation.messages as any[];
      messages.push({
        role: 'user',
        content: input.message,
        timestamp: new Date().toISOString(),
      });

      // Generate response using GPT-4
      const systemPrompt = `You are Scout, a friendly AI assistant for college students.
Help ${student.name} with their tasks, studying, and productivity.
Be conversational, supportive, and ask clarifying questions when needed.`;

      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ];

      const response = await generateChatCompletion(chatMessages, 'GPT_4O');

      // Add assistant message
      messages.push({
        role: 'assistant',
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
    .query(async ({ input }) => {
      const conversation = await prisma.conversation.findUnique({
        where: { id: input.conversationId },
      });

      return conversation;
    }),

  // Get recent conversations
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error('Student not found');

      const conversations = await prisma.conversation.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      return conversations;
    }),
});
```

#### 5. Tool Router (Phase 2)
```typescript
// src/lib/api/routers/toolRouter.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/db";
import { generateChatCompletion } from "@/lib/aiClient";

export const toolRouter = createTRPCRouter({
  // Research tools for a specific task/context
  research: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        currentApproach: z.string().optional(),
        struggle: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          studentTools: { include: { tool: true } },
        },
      });

      if (!student) throw new Error('Student not found');

      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task) throw new Error('Task not found');

      const knownTools = student.studentTools.map(st => st.tool.name);

      // Use Claude for research (better at tool discovery)
      const prompt = `Student Context:
- Task: ${task.description}
- Current method: ${input.currentApproach || 'Not specified'}
- Challenge: ${input.struggle || 'Not specified'}
- Tools already using: ${knownTools.join(', ') || 'None'}

Research and recommend:
1. The most effective digital tools for this specific use case
2. Study techniques/methods that could help
3. Any campus resources that might be relevant

Prioritize:
- Free or student-discounted options
- Tools with gentle learning curves
- Methods backed by learning science
- Options that save time vs. current approach

Return JSON:
{
  "recommendations": [
    {
      "type": "tool" | "technique" | "resource",
      "name": "string",
      "reason": "why this helps",
      "timeSavings": "estimate",
      "learningCurve": "easy|medium|hard",
      "howToGetStarted": "brief steps"
    }
  ]
}`;

      const response = await generateChatCompletion(
        [{ role: 'user', content: prompt }],
        'GPT_4O' // Use SONNET when available for better research
      );

      const recommendations = JSON.parse(response);

      return recommendations;
    }),

  // Suggest a tool to student
  suggest: protectedProcedure
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

      if (!student) throw new Error('Student not found');

      const suggestion = await prisma.toolSuggestion.create({
        data: {
          studentId: student.id,
          taskId: input.taskId,
          toolId: input.toolId,
          context: input.context,
        },
      });

      return suggestion;
    }),

  // Track tool adoption status
  trackAdoption: protectedProcedure
    .input(
      z.object({
        toolId: z.string(),
        status: z.enum(['suggested', 'trying', 'using', 'abandoned']),
        effectivenessRating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const student = await prisma.student.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!student) throw new Error('Student not found');

      const studentTool = await prisma.studentTool.upsert({
        where: {
          studentId_toolId: {
            studentId: student.id,
            toolId: input.toolId,
          },
        },
        update: {
          adoptedStatus: input.status,
          effectivenessRating: input.effectivenessRating,
          notes: input.notes,
          lastUsed: input.status === 'using' ? new Date() : undefined,
        },
        create: {
          studentId: student.id,
          toolId: input.toolId,
          adoptedStatus: input.status,
          effectivenessRating: input.effectivenessRating,
          notes: input.notes,
          featuresDiscovered: [],
        },
      });

      return studentTool;
    }),

  // Get student's tools
  getMyTools: protectedProcedure.query(async ({ ctx }) => {
    const student = await prisma.student.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!student) throw new Error('Student not found');

    const tools = await prisma.studentTool.findMany({
      where: { studentId: student.id },
      include: { tool: true },
      orderBy: { lastUsed: 'desc' },
    });

    return tools;
  }),
});
```

### Update Root Router

```typescript
// src/lib/api/root.ts

import { createCallerFactory, createTRPCRouter } from "./trpc";
import { studentRouter } from "./routers/studentRouter";
import { taskRouter } from "./routers/taskRouter";
import { scheduleRouter } from "./routers/scheduleRouter";
import { chatRouter } from "./routers/chatRouter";
import { toolRouter } from "./routers/toolRouter";

export const appRouter = createTRPCRouter({
  student: studentRouter,
  task: taskRouter,
  schedule: scheduleRouter,
  chat: chatRouter,
  tool: toolRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

---

## Frontend Implementation

### Component Structure

```
src/components/
├── chat/
│   ├── ChatInterface.tsx       # Main chat UI
│   ├── MessageList.tsx         # Message history
│   ├── VoiceInput.tsx          # Voice recording button
│   ├── TextInput.tsx           # Text input fallback
│   └── MessageBubble.tsx       # Individual message
├── dashboard/
│   ├── DashboardView.tsx       # Main dashboard
│   ├── DailyOverview.tsx       # Stats card
│   ├── TimeBlockSchedule.tsx   # Visual timeline
│   └── QuickActions.tsx        # Action buttons
├── onboarding/
│   ├── OnboardingFlow.tsx      # Wizard container
│   ├── WelcomeStep.tsx         # Introduction
│   ├── PersonalizationStep.tsx # Name, year
│   ├── ClassScheduleStep.tsx   # Course info
│   └── PreferencesStep.tsx     # Study preferences
├── tasks/
│   ├── TaskList.tsx            # Task list view
│   ├── TaskCard.tsx            # Individual task
│   ├── TaskClarification.tsx   # Q&A interface
│   └── TaskCompletion.tsx      # Completion form
└── shared/
    ├── Button.tsx              # Reusable button
    ├── Card.tsx                # Container card
    └── LoadingSpinner.tsx      # Loading state
```

### Key Components

#### 1. Voice Input Component
```typescript
// src/components/chat/VoiceInput.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
}

export function VoiceInput({ onTranscript, onStart, onStop }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart + ' ';
          } else {
            interimTranscript += transcriptPart;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        onStop?.();
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, onStop]);

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
      onStart?.();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      onStop?.();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white transition-colors`}
      >
        {isRecording ? <FaStop size={24} /> : <FaMicrophone size={24} />}
      </motion.button>

      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-8 bg-blue-500 rounded-full"
                animate={{
                  height: [8, 32, 8],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">Listening...</span>
        </motion.div>
      )}

      {transcript && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-gray-100 rounded-lg max-w-md"
        >
          <p className="text-sm text-gray-700">{transcript}</p>
        </motion.div>
      )}
    </div>
  );
}
```

#### 2. Chat Interface
```typescript
// src/components/chat/ChatInterface.tsx
'use client';

import { useState } from 'react';
import { VoiceInput } from './VoiceInput';
import { MessageList } from './MessageList';
import { api } from '@/lib/trpc/client';
import { toast } from 'react-toastify';

export function ChatInterface() {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, timestamp: new Date() },
      ]);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error('Failed to send message');
      setIsLoading(false);
    },
  });

  const handleTranscript = (text: string) => {
    // Add user message to UI
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, timestamp: new Date() },
    ]);

    setIsLoading(true);

    // Send to backend
    sendMessage.mutate({
      message: text,
      conversationId,
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Scout</h1>
        <p className="text-sm text-gray-600">Your AI study assistant</p>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-6">
        <VoiceInput onTranscript={handleTranscript} />
      </div>
    </div>
  );
}
```

#### 3. Dashboard View
```typescript
// src/components/dashboard/DashboardView.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc/client';
import { DailyOverview } from './DailyOverview';
import { TimeBlockSchedule } from './TimeBlockSchedule';
import { QuickActions } from './QuickActions';

export function DashboardView() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: tasks, isLoading: tasksLoading } = api.task.listByDate.useQuery({
    date: selectedDate,
  });

  const { data: schedule, isLoading: scheduleLoading } = api.schedule.getByDate.useQuery({
    date: selectedDate,
  });

  if (tasksLoading || scheduleLoading) {
    return <div>Loading...</div>;
  }

  const completedTasks = tasks?.filter(t => t.completed).length || 0;
  const totalTasks = tasks?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Daily Overview */}
        <DailyOverview
          date={selectedDate}
          completedTasks={completedTasks}
          totalTasks={totalTasks}
        />

        {/* Time Block Schedule */}
        <TimeBlockSchedule
          date={selectedDate}
          blocks={schedule || []}
        />

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}
```

#### 4. Onboarding Flow
```typescript
// src/components/onboarding/OnboardingFlow.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeStep } from './WelcomeStep';
import { PersonalizationStep } from './PersonalizationStep';
import { ClassScheduleStep } from './ClassScheduleStep';
import { PreferencesStep } from './PreferencesStep';
import { api } from '@/lib/trpc/client';
import { toast } from 'react-toastify';

type OnboardingData = {
  name?: string;
  year?: string;
  biggestChallenge?: string;
  classSchedule?: any[];
  preferences?: any;
};

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});

  const createStudent = api.student.create.useMutation({
    onSuccess: () => {
      completeOnboarding.mutate();
    },
    onError: () => {
      toast.error('Failed to create profile');
    },
  });

  const completeOnboarding = api.student.completeOnboarding.useMutation({
    onSuccess: () => {
      toast.success('Welcome to Scout!');
      router.push('/dashboard');
    },
  });

  const updatePreferences = api.student.updatePreferences.useMutation();

  const handleNext = (stepData: Partial<OnboardingData>) => {
    setData({ ...data, ...stepData });

    if (step === steps.length - 1) {
      // Final step - submit all data
      createStudent.mutate({
        name: data.name!,
        year: data.year,
        biggestChallenge: data.biggestChallenge,
      });

      if (data.preferences) {
        updatePreferences.mutate(data.preferences);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <PersonalizationStep key="personalization" onNext={handleNext} onBack={handleBack} />,
    <ClassScheduleStep key="schedule" onNext={handleNext} onBack={handleBack} />,
    <PreferencesStep key="preferences" onNext={handleNext} onBack={handleBack} />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-full h-2 rounded-full mx-1 ${
                  i <= step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center">
            Step {step + 1} of {steps.length}
          </p>
        </div>

        {/* Current Step */}
        {steps[step]}
      </div>
    </div>
  );
}
```

---

## AI Integration

### Service Layer Architecture

Create AI service classes to encapsulate AI functionality:

#### 1. Conversational AI Service
```typescript
// src/lib/ai/conversational.ts

import { generateChatCompletion } from '../aiClient';

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type StudentContext = {
  name: string;
  preferences?: any;
  recentTasks?: any[];
  recentConversations?: any[];
};

export class ConversationalAI {
  /**
   * Generate a chat response with student context
   */
  async chat(messages: Message[], context: StudentContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ];

    return await generateChatCompletion(fullMessages, 'GPT_4O');
  }

  /**
   * Generate clarifying questions for a task
   */
  async generateClarificationQuestions(
    taskDescription: string,
    complexity: string,
    context: StudentContext
  ): Promise<string[]> {
    const prompt = `For this ${complexity} complexity task: "${taskDescription}"

Generate 2-4 clarifying questions to understand:
- Scope and requirements
- Timeline and urgency
- Current progress or approach
- Resources available

${context.name}'s context:
- Recent tasks: ${JSON.stringify(context.recentTasks?.slice(0, 3))}

Return only a JSON array of questions: ["question 1", "question 2", ...]`;

    const response = await generateChatCompletion(
      [{ role: 'user', content: prompt }],
      'GPT_4O'
    );

    return JSON.parse(response);
  }

  /**
   * Extract tasks from natural language
   */
  async extractTasks(text: string): Promise<any[]> {
    const prompt = `Extract individual tasks from: "${text}"

Return JSON:
{
  "tasks": [
    {
      "description": "clear task description",
      "category": "exam|assignment|life|other",
      "complexity": "simple|medium|complex",
      "urgency": "high|medium|low"
    }
  ]
}`;

    const response = await generateChatCompletion(
      [{ role: 'user', content: prompt }],
      'GPT_4O'
    );

    const parsed = JSON.parse(response);
    return parsed.tasks;
  }

  private buildSystemPrompt(context: StudentContext): string {
    return `You are Scout, a friendly AI assistant helping ${context.name}, a college student.

Your role:
- Help organize tasks and study plans
- Ask clarifying questions to understand needs
- Suggest better tools and study methods when appropriate
- Be supportive and conversational
- Remember context from previous conversations

${context.preferences ? `Student preferences: ${JSON.stringify(context.preferences)}` : ''}

Be natural, supportive, and focused on helping them work smarter.`;
  }
}

// Export singleton instance
export const conversationalAI = new ConversationalAI();
```

#### 2. Research AI Service (Phase 2)
```typescript
// src/lib/ai/research.ts

import { generateChatCompletion } from '../aiClient';

export type ToolSearchContext = {
  taskDescription: string;
  currentApproach?: string;
  struggle?: string;
  knownTools: string[];
  studentLevel?: string;
};

export type ToolRecommendation = {
  type: 'tool' | 'technique' | 'resource';
  name: string;
  reason: string;
  timeSavings?: string;
  learningCurve: 'easy' | 'medium' | 'hard';
  howToGetStarted: string;
};

export class ResearchAI {
  /**
   * Research and recommend tools for a specific context
   */
  async findTools(context: ToolSearchContext): Promise<ToolRecommendation[]> {
    const prompt = `Student is working on: "${context.taskDescription}"

Current approach: ${context.currentApproach || 'Not specified'}
Challenge: ${context.struggle || 'Not specified'}
Already using: ${context.knownTools.join(', ') || 'None'}

Research and recommend the MOST EFFECTIVE:
1. Digital tools (apps, software)
2. Study techniques
3. Campus resources

Prioritize:
- Free or student-friendly pricing
- Easy to learn (${context.studentLevel || 'beginner'} level)
- Significant time savings vs. current method
- Evidence-based effectiveness

Return JSON:
{
  "recommendations": [
    {
      "type": "tool|technique|resource",
      "name": "specific name",
      "reason": "why this specifically helps this situation",
      "timeSavings": "realistic estimate",
      "learningCurve": "easy|medium|hard",
      "howToGetStarted": "3-5 simple steps"
    }
  ]
}

Limit to 2-3 best recommendations. Quality over quantity.`;

    const response = await generateChatCompletion(
      [{ role: 'user', content: prompt }],
      'GPT_4O' // Use Claude/Sonnet when available for better research
    );

    const parsed = JSON.parse(response);
    return parsed.recommendations;
  }

  /**
   * Analyze effectiveness patterns and provide insights
   */
  async analyzeEffectiveness(logs: any[]): Promise<any> {
    const prompt = `Analyze these effectiveness logs to identify patterns:

${JSON.stringify(logs, null, 2)}

Identify:
1. Which tools/techniques work best for this student
2. Which subjects they struggle with most
3. Optimal study times and durations
4. Recommendations for improvement

Return JSON with insights and recommendations.`;

    const response = await generateChatCompletion(
      [{ role: 'user', content: prompt }],
      'GPT_4O'
    );

    return JSON.parse(response);
  }

  /**
   * Generate optimized schedule based on tasks and constraints
   */
  async optimizeSchedule(tasks: any[], constraints: any): Promise<any> {
    const prompt = `Create an optimized schedule for today:

Tasks:
${JSON.stringify(tasks, null, 2)}

Constraints:
${JSON.stringify(constraints, null, 2)}

Create time blocks considering:
- Task complexity and required mental energy
- Student's peak energy times
- Class schedule conflicts
- Realistic durations with breaks
- Task priorities and due dates

Return JSON:
{
  "blocks": [
    {
      "taskId": "id",
      "startTime": "ISO timestamp",
      "endTime": "ISO timestamp",
      "reasoning": "why this time slot is optimal"
    }
  ],
  "overallStrategy": "explanation of schedule approach"
}`;

    const response = await generateChatCompletion(
      [{ role: 'user', content: prompt }],
      'GPT_4O'
    );

    return JSON.parse(response);
  }
}

// Export singleton instance
export const researchAI = new ResearchAI();
```

#### 3. Memory System (Phase 3)
```typescript
// src/lib/ai/memory.ts

import { prisma } from '../db';

export type RelevantContext = {
  pastTasks: any[];
  effectiveTools: any[];
  preferences: any;
  patterns: any;
};

export class MemorySystem {
  /**
   * Get relevant context for a task type
   */
  async getRelevantContext(
    studentId: string,
    taskType: string
  ): Promise<RelevantContext> {
    // Get past similar tasks
    const pastTasks = await prisma.task.findMany({
      where: {
        studentId,
        category: taskType,
        completed: true,
      },
      include: {
        effectivenessLog: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    // Get effective tools for this task type
    const effectiveTools = await prisma.studentTool.findMany({
      where: {
        studentId,
        effectivenessRating: { gte: 4 },
      },
      include: { tool: true },
    });

    // Get preferences
    const preferences = await prisma.studentPreferences.findUnique({
      where: { studentId },
    });

    // Analyze patterns
    const patterns = await this.analyzePatterns(studentId, taskType);

    return {
      pastTasks,
      effectiveTools,
      preferences,
      patterns,
    };
  }

  /**
   * Log effectiveness data
   */
  async logEffectiveness(data: any): Promise<void> {
    await prisma.effectivenessLog.create({
      data,
    });

    // Update patterns asynchronously
    this.updatePatterns(data.studentId, data.taskId);
  }

  /**
   * Analyze patterns from effectiveness logs
   */
  private async analyzePatterns(studentId: string, taskType: string) {
    const logs = await prisma.effectivenessLog.findMany({
      where: { studentId },
      include: {
        task: true,
        tool: true,
      },
      orderBy: { loggedAt: 'desc' },
      take: 20,
    });

    // Simple pattern recognition
    // TODO: Use AI for more sophisticated pattern analysis

    const avgTimeAccuracy = logs.reduce((acc, log) => {
      if (log.timeEstimated > 0) {
        const accuracy = 1 - Math.abs(log.timeSpent - log.timeEstimated) / log.timeEstimated;
        return acc + accuracy;
      }
      return acc;
    }, 0) / logs.length;

    const mostEffectiveTools = logs
      .filter(log => log.effectiveness >= 4)
      .map(log => log.tool)
      .filter(Boolean);

    return {
      timeEstimationAccuracy: avgTimeAccuracy,
      mostEffectiveTools,
      completionRate: logs.filter(l => l.completed).length / logs.length,
    };
  }

  private async updatePatterns(studentId: string, taskId: string) {
    // Update student preferences based on new data
    const patterns = await this.analyzePatterns(studentId, '');

    await prisma.studentPreferences.upsert({
      where: { studentId },
      update: {
        effectiveStudyPatterns: patterns,
      },
      create: {
        studentId,
        effectiveStudyPatterns: patterns,
      },
    });
  }
}

// Export singleton instance
export const memorySystem = new MemorySystem();
```

---

## Feature Implementation Roadmap

### Phase 1: MVP Core (Weeks 1-4)

**Goal**: Basic daily assistant with voice input and task capture

#### Week 1: Foundation
- [x] Set up database schema (Student, Task, Conversation)
- [x] Implement authentication (NextAuth)
- [ ] Create base tRPC routers (student, task, chat)
- [ ] Build onboarding flow components
- [ ] Implement voice input component

#### Week 2: Chat Interface
- [ ] Build chat UI with message history
- [ ] Integrate voice-to-text
- [ ] Connect to GPT-4 for conversations
- [ ] Implement task extraction from voice/text
- [ ] Create task list view

#### Week 3: Clarification System
- [ ] Build clarification question generator
- [ ] Create Q&A interface components
- [ ] Implement task complexity detection
- [ ] Store clarification responses

#### Week 4: Polish & Testing
- [ ] Add error handling and loading states
- [ ] Implement toast notifications
- [ ] Manual task completion flow
- [ ] User testing with Kira
- [ ] Bug fixes and refinements

**Success Criteria**:
- ✅ User can sign up and complete onboarding
- ✅ Voice input captures tasks accurately
- ✅ System asks relevant clarifying questions
- ✅ Tasks are stored and viewable

---

### Phase 2: Intelligence Layer (Weeks 5-8)

**Goal**: Add AI-powered tool discovery and recommendations

#### Week 5: Tool Database
- [ ] Extend database schema (Tool, StudentTool, ToolSuggestion)
- [ ] Seed common tools database
- [ ] Create tool router
- [ ] Build research AI service

#### Week 6: Tool Discovery
- [ ] Implement inefficiency detection
- [ ] Integrate web search for tool research (optional)
- [ ] Build recommendation engine
- [ ] Create tool suggestion UI

#### Week 7: Memory System Basics
- [ ] Add class schedule storage
- [ ] Implement preference tracking
- [ ] Build memory service
- [ ] Context-aware conversations

#### Week 8: Dashboard
- [ ] Create dashboard layout
- [ ] Build daily overview card
- [ ] Show task list with tool suggestions
- [ ] Add effectiveness tracking form

**Success Criteria**:
- ✅ Scout suggests relevant tools for tasks
- ✅ Recommendations feel personalized
- ✅ System remembers class schedule
- ✅ Dashboard shows daily overview

---

### Phase 3: Scheduling & Proactive (Weeks 9-12)

**Goal**: Time blocking and intelligent check-ins

#### Week 9: Schedule Generation
- [ ] Extend schema (ScheduleBlock)
- [ ] Build schedule router
- [ ] Implement optimization algorithm
- [ ] Create timeline view component

#### Week 10: Visual Calendar
- [ ] Build interactive time block UI
- [ ] Add drag-and-drop rescheduling
- [ ] Show reasoning for time slots
- [ ] Task completion from schedule

#### Week 11: Inngest Integration
- [ ] Set up Inngest functions
- [ ] Implement study block check-ins
- [ ] Create end of day review
- [ ] Build check-in UI components

#### Week 12: Proactive Features
- [ ] Add notification system
- [ ] Implement rescheduling flow
- [ ] Build feedback collection
- [ ] Pattern recognition basics

**Success Criteria**:
- ✅ Scout suggests realistic schedules
- ✅ Check-ins feel helpful
- ✅ Easy to reschedule tasks
- ✅ End of day reviews provide value

---

### Phase 4: Learning & Optimization (Weeks 13-16)

**Goal**: System learns and improves recommendations

#### Week 13: Advanced Effectiveness
- [ ] Expand effectiveness logging
- [ ] Track tool feature discovery
- [ ] Build analytics service
- [ ] Create insights dashboard

#### Week 14: Pattern Recognition
- [ ] Implement pattern analysis AI
- [ ] Time estimation improvements
- [ ] Study strategy recommendations
- [ ] Personalized insights

#### Week 15: Progressive Disclosure
- [ ] Build feature discovery system
- [ ] Implement follow-up scheduling
- [ ] Create tutorial system
- [ ] Smart notifications

#### Week 16: Polish & Launch Prep
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Launch preparation

**Success Criteria**:
- ✅ Recommendations improve with usage
- ✅ Time estimates become accurate
- ✅ Students report Scout "knows them"
- ✅ Measurable productivity improvements

---

## Testing Strategy

### Unit Testing
```bash
# Install testing libraries
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

Example test:
```typescript
// src/lib/ai/__tests__/conversational.test.ts

import { describe, it, expect, vi } from 'vitest';
import { conversationalAI } from '../conversational';

describe('ConversationalAI', () => {
  it('should extract tasks from natural language', async () => {
    const text = "I need to study for my biology exam and do laundry";
    const tasks = await conversationalAI.extractTasks(text);

    expect(tasks).toHaveLength(2);
    expect(tasks[0].description).toContain('biology exam');
    expect(tasks[1].description).toContain('laundry');
  });
});
```

### Integration Testing
Test tRPC routes with real database:

```typescript
// src/lib/api/__tests__/taskRouter.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { createCaller } from '../root';
import { prisma } from '@/lib/db';

describe('taskRouter', () => {
  let caller: any;

  beforeEach(async () => {
    // Set up test context
    caller = createCaller({
      session: { user: { id: 'test-user-id' } },
    });

    // Clean up test data
    await prisma.task.deleteMany({
      where: { studentId: 'test-student-id' },
    });
  });

  it('should create task from natural language', async () => {
    const result = await caller.task.extractFromText({
      text: 'Study for physics exam tomorrow',
    });

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('exam');
  });
});
```

### E2E Testing
Use Playwright for end-to-end tests:

```typescript
// tests/e2e/onboarding.spec.ts

import { test, expect } from '@playwright/test';

test('complete onboarding flow', async ({ page }) => {
  await page.goto('/onboarding');

  // Welcome step
  await page.click('text=Continue');

  // Personalization
  await page.fill('input[name="name"]', 'Test Student');
  await page.selectOption('select[name="year"]', 'sophomore');
  await page.click('text=Next');

  // Class schedule
  await page.fill('input[name="courseName"]', 'Biology 101');
  await page.click('text=Next');

  // Preferences
  await page.click('text=Morning');
  await page.click('text=Finish');

  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Deployment Guide

### Environment Variables

Required for production:

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="production-secret-here"
NEXTAUTH_URL="https://your-domain.com"

# AI
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."

# Inngest
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Optional
RESEND_API_KEY="..."
```

### Vercel Deployment

1. **Connect Repository**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link
```

2. **Configure Environment Variables**

**IMPORTANT: Database Connection for Prisma/NextAuth**

For applications using Prisma with NextAuth (database sessions), you **must** use **Session Pooler** (port 5432), NOT Transaction Pooler (port 6543).

Transaction Pooler doesn't support prepared statements, which Prisma requires.

**Setup:**
1. Go to Supabase Dashboard → Settings → Database → Connection string
2. Select **"Session Pooler"** (port 5432)
3. Copy the connection string
4. Add `?sslmode=require` if not present
5. Set this as `DATABASE_URL` in Vercel environment variables

```bash
# Add production env vars
vercel env add DATABASE_URL  # Use Session Pooler (port 5432)
vercel env add DIRECT_URL    # Use Session Pooler (port 5432) for migrations
vercel env add NEXTAUTH_SECRET
# ... add all required vars
```

3. **Deploy**
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

4. **Post-Deployment**
```bash
# Run migrations on production database
DATABASE_URL="production-url" npx prisma migrate deploy

# Seed tools database
DATABASE_URL="production-url" npx prisma db seed
```

### Database Migrations in Production

**IMPORTANT**: Always test migrations in staging first

```bash
# 1. Create migration locally
npx prisma migrate dev --name add_new_feature

# 2. Test migration on staging
DATABASE_URL="staging-url" npx prisma migrate deploy

# 3. Deploy to production
DATABASE_URL="production-url" npx prisma migrate deploy
```

### Monitoring & Analytics

**Set up monitoring**:
1. Vercel Analytics (built-in)
2. Error tracking (Sentry, etc.)
3. Performance monitoring
4. Database query performance

**Key metrics to track**:
- API response times
- Error rates
- User engagement (DAU, session length)
- Task completion rates
- Tool adoption rates

### Backup Strategy

**Database backups**:
- Supabase automatic daily backups
- Manual export before major migrations
- Store backups in S3 or similar

```bash
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore if needed
psql $DATABASE_URL < backup-YYYYMMDD.sql
```

---

## Development Best Practices

### Code Organization

1. **Keep files small** (≤500 LOC)
2. **Use TypeScript strictly** (no `any`)
3. **Reusable components** in `src/components/shared/`
4. **Utility functions** in `src/lib/utils/`

### Git Workflow

```bash
# Feature branches
git checkout -b feature/task-clarification

# Commit frequently with meaningful messages
git commit -m "feat: add clarification question generator"

# Push and create PR
git push origin feature/task-clarification
```

### Performance Optimization

1. **Database queries**:
   - Use indexes on frequently queried fields
   - Limit query results
   - Use pagination for lists

2. **Frontend**:
   - Use React.memo for expensive components
   - Implement virtual scrolling for long lists
   - Lazy load heavy components

3. **API**:
   - Cache frequently accessed data
   - Rate limit endpoints
   - Use Vercel Edge functions where appropriate

---

## Troubleshooting Guide

### Common Issues

**Issue**: Prisma client not found
```bash
# Solution: Generate Prisma client
npx prisma generate
```

**Issue**: Database migration conflicts
```bash
# Reset development database (DESTRUCTIVE)
npx prisma migrate reset

# Or resolve conflicts manually
npx prisma migrate resolve
```

**Issue**: tRPC type errors
```bash
# Ensure types are up to date
npm run build

# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

**Issue**: Voice input not working
- Check browser compatibility (Chrome/Edge only)
- Ensure HTTPS (required for Web Speech API)
- Check microphone permissions

---

## Next Steps

### After MVP Launch

1. **Gather User Feedback**
   - Conduct user interviews
   - Track usage analytics
   - Monitor support requests

2. **Iterate on Tool Discovery**
   - Expand tool database
   - Improve recommendation accuracy
   - Add campus-specific resources

3. **Enhance Scheduling**
   - Learn optimal time estimates
   - Improve break scheduling
   - Add calendar integrations

4. **Build Social Features**
   - Study group matching
   - Peer tool recommendations
   - Success story sharing

### Future Enhancements

See PRD Appendix for full list:
- LMS integrations (Canvas, Blackboard)
- Multi-student group coordination
- Mental health check-ins
- Financial tracking
- Career planning features

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Inngest Docs](https://www.inngest.com/docs)

### AI Provider Docs
- [OpenAI API](https://platform.openai.com/docs)
- [Anthropic API](https://docs.anthropic.com)

### Community
- Next.js Discord
- tRPC Discord
- Stack Overflow

---

## Appendix

### File Structure Reference
```
College_organizer/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   ├── onboarding/
│   │   └── api/
│   ├── components/
│   │   ├── chat/
│   │   ├── dashboard/
│   │   ├── onboarding/
│   │   ├── tasks/
│   │   └── shared/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── conversational.ts
│   │   │   ├── research.ts
│   │   │   └── memory.ts
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   ├── studentRouter.ts
│   │   │   │   ├── taskRouter.ts
│   │   │   │   ├── scheduleRouter.ts
│   │   │   │   ├── chatRouter.ts
│   │   │   │   └── toolRouter.ts
│   │   │   ├── root.ts
│   │   │   └── trpc.ts
│   │   ├── trpc/
│   │   ├── auth/
│   │   ├── db.ts
│   │   ├── aiClient.ts
│   │   └── inngest.ts
│   └── stories/
├── public/
├── .env
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

**Good luck building Scout!** 🚀

Remember: Start small, iterate based on real user feedback, and focus on the core value proposition - helping students work smarter through better tools and strategies.
