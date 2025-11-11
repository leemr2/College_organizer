# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Scout** is an AI-powered daily assistant for college students. It combines conversational AI with intelligent task management to help students capture tasks, get organized, discover productivity tools, and optimize their study schedules through natural language interactions.

**Core Innovation**: Tool discovery and optimization engine that actively researches, suggests, and teaches students about digital tools, study techniques, and campus resources.

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start dev server with Turbopack (localhost:3000)

# Database
npx prisma migrate dev   # Create and apply migrations (REQUIRED for schema changes)
npx prisma generate      # Generate Prisma client (auto-runs on install)

# Build & Deploy
npm run build            # Build for production (ALWAYS run after changes)
npm run start            # Start production server

# Component Development
npm run storybook        # Start Storybook on port 6006
npm run build-storybook  # Build Storybook for deployment
```

### Critical Rules
- **NEVER use `npx prisma db push`** - Always create proper migrations with `migrate dev`
- **ALWAYS run `npm run build`** after making changes to verify no errors (ignore warnings)
- **Database schema changes**: Edit `prisma/schema.prisma` → Run `npx prisma migrate dev` → Name migration descriptively

## Architecture

### Core Stack & Patterns

**Full-Stack Framework**: Next.js 14 App Router (React Server Components by default)
- Routes: `src/app/` with kebab-case (e.g., `src/app/dashboard/page.tsx`)
- API routes: `src/app/api/[route]/route.ts`
- Server components by default; add `"use client"` only when needed

**Type-Safe API Layer**: tRPC with Zod validation
- Routers: `src/lib/api/routers/` (chatRouter, taskRouter, studentRouter)
- Root composition: `src/lib/api/root.ts`
- Client access: `import { api } from "@/lib/trpc/react"`
- Procedures: `publicProcedure` (unauthenticated) or `protectedProcedure` (authenticated)

**Database**: PostgreSQL via Prisma ORM
- Schema: `prisma/schema.prisma` (snake_case tables → camelCase fields)
- Client: `src/lib/db.ts`
- No raw SQL - use Prisma queries only

**Authentication**: NextAuth.js with Prisma adapter
- Config: `src/lib/auth/[...nextauth]/route.ts`
- Session access: `ctx.session` in tRPC procedures

**AI Integration**: Multi-provider abstraction in `src/lib/aiClient.ts`
- **Primary AI function**: `generateChatCompletion(messages, model, options)`
- **Default model**: `GPT_5` (preferred for all new AI features)
- **Available models**: GPT-5, O1, GPT-4o, GPT-4o-mini, Gemini (2.5-pro, 2.5-flash, 2.0-flash variants), Perplexity (sonar, sonar-pro)
- **Conversational AI**: `src/lib/ai/conversational.ts` - ConversationalAI class with student context awareness
- **Model selection**: Use `AI_MODELS.GPT_5` or model key like `"GPT_5"`, not raw strings

### Key Domain Models

**Student**: User profiles with onboarding status, preferences, and class schedules
- Relations: tasks, conversations, preferences, classSchedules
- Onboarding flow: `src/app/onboarding/` with multi-step form
- Profile updates: `/profile` page allows updating name, year, biggestChallenge, class schedules, and preferences after onboarding

**Task**: Tasks with complexity classification (simple/medium/complex)
- `clarificationData` (JSON): Stores Q&A responses from AI clarification
- `clarificationComplete`: Boolean flag for clarification status
- Relations: conversations (task-specific chat threads)

**Conversation**: Chat history with two types:
- `daily_planning`: Daily check-in conversations (linked to date)
- `task_specific`: Task-focused chat threads (linked to taskId)
- `messages` (JSON): Array of `{role, content, timestamp}`
- `context` (JSON): Conversation-relevant context

**StudentPreferences**: Study preferences and patterns
- `peakEnergyTimes`, `preferredBreakLength`, `morningPerson`, `studyAloneVsGroup`
- `effectiveStudyPatterns`: Learned patterns from AI analysis
- Editable via profile settings page

**ClassSchedule**: Course schedules with recurring meeting times
- `courseName`, `courseCode`, `professor`, `semester` (e.g., "Fall 2024")
- `meetingTimes` (JSON): Array of `{day, startTime, endTime}` objects
- Supports multiple meeting times per class (e.g., MWF classes)
- Editable via profile settings with visual week calendar

**Tool** (Phase 2): Productivity tools and study techniques database
- Stores tool metadata: name, category, description, useCases, cost, learningCurve, website, features
- Tools loaded from JSON database (`src/lib/data/tools.json`) and synced to database on first use
- Relations: studentTools, toolSuggestions

**StudentTool** (Phase 2): Student-tool relationship tracking
- `adoptedStatus`: "suggested" | "trying" | "using" | "abandoned"
- `effectivenessRating`: 1-5 rating (optional)
- `featuresDiscovered`: JSON array of discovered features
- `notes`: Student feedback
- Tracks which tools student has seen, tried, or adopted

**ToolSuggestion** (Phase 2): Tool recommendation records
- Links student, task, and tool
- `context`: Why the tool was suggested
- `studentResponse`: "interested" | "not_interested" | "already_using" | null
- `followUpScheduled`: Boolean for future follow-up

**EffectivenessLog** (Phase 2): Task completion effectiveness tracking
- `effectiveness`: 1-5 rating
- `timeSpent`: Minutes spent (optional)
- `completed`: Boolean
- `notes`: Student notes about what worked/didn't work
- Used for learning patterns and triggering proactive tool suggestions

### AI Chat Flow Pattern

```typescript
// 1. Get/create conversation
const conversation = await api.chat.getDailyConversation.query();

// 2. Send user message
const response = await api.chat.sendMessage.mutate({
  conversationId: conversation.id,
  message: userInput,
});

// 3. ConversationalAI builds context-aware system prompt
const systemPrompt = buildSystemPrompt({
  name: student.name,
  preferences: student.preferences,
  conversationType: "daily_planning",
  currentTime: new Date(),
});

// 4. Generate AI response with full context
const aiResponse = await generateChatCompletion(
  [{ role: "system", content: systemPrompt }, ...messages],
  "GPT_5"
);
```

### Background Jobs

**Inngest**: Scheduled tasks and background jobs
- Config: `inngest.config.ts`
- API route: `src/app/api/inngest/route.ts`
- **Important**: Use polling to update UI when Inngest events complete, NOT tRPC success responses

## Component Guidelines

### Structure & Naming
- Location: `src/components/[feature]/ComponentName.tsx`
- Naming: PascalCase for components, kebab-case for route files
- Style: Functional components only with TypeScript interfaces
- Stories: `src/stories/ComponentName.stories.tsx` (one per component, matching name)

### Styling
- **Tailwind CSS only** - No Radix UI or shadcn/ui components
- Mobile-first responsive design
- Dark mode: Use `dark:` prefix classes
- Animations: Framer Motion for complex animations
- Icons: `lucide-react` (PascalCase names), custom icons in `src/components/icons`

### UI Patterns
- Notifications: `react-toastify` - `toast.success()`, `toast.error()`, `toast.info()`
- Forms: Controlled components with Zod validation
- Loading states: Server components handle initial load, client components manage interactions
- Calendar components: Reusable `WeekCalendar` (M-Sunday, 6am-10pm) and `TimeBlockEditor` for Phase 3 scheduling integration

### Client Component Triggers
Add `"use client"` when using:
- React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, navigator)
- tRPC hooks (api.*.useQuery, api.*.useMutation)
- Toast notifications

## File Organization

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, tRPC, Inngest)
│   ├── auth/              # Auth pages (signin, signup)
│   ├── chat/              # Daily check-in chat interface
│   ├── dashboard/         # Student dashboard
│   ├── onboarding/        # Multi-step onboarding flow
│   ├── profile/           # Profile settings and updates
│   └── tasks/             # Task management pages
├── components/            # React components by feature
│   ├── calendar/         # Calendar components (WeekCalendar, TimeBlockEditor, TimeBlock)
│   ├── chat/             # Chat interface components
│   ├── dashboard/        # Dashboard components
│   ├── onboarding/       # Onboarding flow components
│   ├── profile/          # Profile editing components
│   ├── tasks/            # Task management components
│   │   ├── TaskCard.tsx
│   │   ├── TaskChat.tsx  # Task-specific chat with tool recommendations (Phase 2)
│   │   ├── TaskCompletion.tsx  # Task completion with effectiveness tracking (Phase 2)
│   │   └── ToolRecommendation.tsx  # Tool suggestion UI component (Phase 2)
│   └── ui/               # Shared UI primitives
├── lib/
│   ├── ai/               # AI integration
│   │   ├── conversational.ts  # ConversationalAI class
│   │   └── toolRecommendation.ts  # ToolRecommendationService (Phase 2)
│   ├── api/              # tRPC setup
│   │   ├── routers/      # tRPC routers (chat, task, student, tool)
│   │   │   ├── studentRouter.ts  # Profile updates, class schedule CRUD
│   │   │   └── toolRouter.ts  # Tool operations (Phase 2)
│   │   ├── root.ts       # Router composition
│   │   └── trpc.ts       # tRPC config
│   ├── auth/             # NextAuth configuration
│   ├── data/             # Static data files
│   │   └── tools.json    # Tool database (Phase 2)
│   ├── trpc/             # tRPC client setup
│   ├── types/            # TypeScript type definitions
│   │   └── calendar.ts   # Calendar and time block types
│   ├── utils/            # Shared utilities
│   │   ├── shared.ts     # Client-side utilities (time formatting, date helpers)
│   │   ├── server.ts     # Server-side utilities
│   │   └── toolDatabase.ts  # Tool database utilities (Phase 2)
│   ├── aiClient.ts       # AI provider facade
│   └── db.ts             # Prisma client
└── stories/              # Storybook stories
```

## Important Conventions

### TypeScript
- Strict mode enabled - avoid `any`
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Union types over enums
- Shared types: `src/lib/types.ts`

### Imports
Sort order: external → internal → sibling → styles
```typescript
import { useState } from "react";           // External
import { api } from "@/lib/trpc/react";    // Internal
import { Button } from "./Button";          // Sibling
import "./styles.css";                      // Styles
```

### Database Patterns
- Use Prisma relations to fetch related data (avoid N+1 queries)
- Include relevant relations in queries: `include: { preferences: true, tasks: true }`
- Filter by date ranges for daily conversations using `getTodayStart()` and `getTodayEnd()`

### AI Best Practices
- Always pass student context to ConversationalAI for personalized responses
- Use `parseJsonResponse()` when expecting JSON from AI models
- Handle AI errors gracefully with try-catch and user-friendly messages
- Store conversation history in database for context continuity

### Tool Recommendation Patterns (Phase 2)

**Tool Database**:
- Tools stored in `src/lib/data/tools.json` (20+ tools across 7 categories)
- Loaded via `src/lib/utils/toolDatabase.ts` utility functions
- Tools synced to database on first suggestion (lazy loading)

**Tool Recommendation Flow**:
```typescript
// 1. Get tool recommendations for a task
const recommendations = await api.tool.recommend.query({ taskId });

// 2. Display recommendations in UI (ToolRecommendation component)
// 3. Student responds: "interested", "not_interested", or "already_using"
// 4. Record suggestion and update StudentTool relationship
await api.tool.recordSuggestion.mutate({ taskId, toolId, context });
await api.tool.updateStudentTool.mutate({ toolId, adoptedStatus: "trying" });
```

**Proactive Suggestions**:
- Triggered when task effectiveness rating < 3 stars
- Displayed in TaskCompletion component after poor rating
- Uses same recommendation service but with context of poor performance

**Tool Router Procedures**:
- `tool.search`: Search tools by category, keyword, learning curve
- `tool.recommend`: Get AI-powered recommendations for a task
- `tool.recordSuggestion`: Save tool suggestion record
- `tool.updateStudentTool`: Update adoption status (suggested/trying/using/abandoned)
- `tool.getStudentTools`: Get tools student is using/trying
- `tool.getSuggestedTools`: Get recent tool suggestions

## Environment Setup

Required environment variables (see `.env.example`):
```bash
DATABASE_URL="postgresql://..."      # Prisma connection string
DIRECT_URL="postgresql://..."        # Direct database connection
NEXTAUTH_SECRET="..."                # Generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."              # Required for AI features
ANTHROPIC_API_KEY="sk-ant-..."       # Optional (future research features)
INNGEST_EVENT_KEY="..."              # Optional (background jobs)
INNGEST_SIGNING_KEY="..."            # Optional (background jobs)
```

## Development Workflow

### Starting New Features
1. Create branch: `git checkout -b feature/feature-name`
2. If schema changes needed:
   - Edit `prisma/schema.prisma`
   - Run `npx prisma migrate dev --name descriptive_name`
3. Create tRPC router procedures in `src/lib/api/routers/`
4. Build React components in `src/components/[feature]/`
5. Create routes in `src/app/[route]/page.tsx`
6. Test with `npm run dev`
7. Build with `npm run build` - fix all errors
8. Commit with semantic message

### Task Complexity Flow
When creating tasks, the AI classifies complexity and generates clarifying questions:
1. User describes task → AI extracts and classifies (`simple`/`medium`/`complex`)
2. For medium/complex tasks → AI generates 2-4 clarification questions
3. Store answers in `task.clarificationData` (JSON)
4. Mark `task.clarificationComplete = true` when done

### Daily Check-In Pattern
- One `daily_planning` conversation per day per student
- Uses `dailyConversationDate` to determine today's conversation
- System prompt includes time awareness, preferences, and recent context
- Voice input supported via Web Speech API

### Profile Update System & Calendar Components

**Profile Update Flow**:
- Route: `/profile` (protected, requires onboarding completion)
- Components: `ProfileEditor` (tabbed container), `PersonalInfoEditor`, `ClassScheduleEditor`, `PreferencesEditor`
- API: `studentRouter.updateProfile`, `studentRouter.createClassSchedule`, `studentRouter.updateClassSchedule`, `studentRouter.deleteClassSchedule`

**Calendar Components Architecture** (Phase 3 Ready):
- **`WeekCalendar`**: M-Sunday week view displaying 6am-10pm time range
  - Accepts `TimeBlock[]` array for display
  - Supports click handlers for editing blocks
  - Position calculation relative to 6am start (16-hour window)
  - Reusable for both ClassSchedule and future ScheduleBlock types
  
- **`TimeBlockEditor`**: Modal editor for recurring time blocks
  - Supports multiple day selection (MWF patterns)
  - Mode: "class" (with course fields) or "general" (for future ScheduleBlocks)
  - Semester dropdown: Fall, Winter, Spring, Summer (works for semester/quarter systems)
  - Returns normalized `MeetingTime[]` array

- **`TimeBlock`**: Display component with type badges
  - Color-coded by type (class, work, lab, commitment, task, break)
  - Shows title, course code, time range

- **Types**: `src/lib/types/calendar.ts`
  - `TimeBlock`, `TimeBlockType`, `MeetingTime`, `CalendarEvent`
  - Designed to support both ClassSchedule (semester-long) and ScheduleBlock (daily tasks)

**Phase 3 Integration Notes**:
- Calendar components are designed to accept both ClassSchedule and ScheduleBlock data
- `WeekCalendarView` component exists in dashboard for future integration
- When ScheduleBlock model is added, same calendar components can be used
- TimeBlockEditor can be extended for task scheduling without major refactoring

## Storybook Development

Stories should include:
- Multiple variants (default, loading, error states)
- Different sizes and configurations
- Interactive features with actions
- Autodocs enabled for automatic documentation

Example story structure:
```typescript
export default {
  component: ComponentName,
  tags: ['autodocs'],
};

export const Default = {};
export const Loading = { args: { isLoading: true } };
export const WithData = { args: { data: mockData } };
```

## Documentation Maintenance

Maintaining accurate, synchronized documentation is critical for code quality and future development. This section provides comprehensive guidelines for reviewing and updating documentation.

### Documentation File Responsibilities

Each documentation file serves a specific purpose:

- **`README.md`**: Public-facing overview, current features list, getting started guide, user-facing documentation
- **`CLAUDE.md`**: Technical implementation details, architecture patterns, development workflows, code patterns (this file)
- **`AGENTS.md`**: Quick reference for agent guidelines and conventions
- **`.cursorrules`**: Cursor-specific rules and conventions
- **`PRD-Kiras-Scout.md`**: Product requirements document (review before new features, rarely updated by agents)
- **`BUILD_GUIDE.md`**: Build and deployment instructions

### Pre-Change Documentation Review

**BEFORE making any changes**, review relevant documentation to understand existing patterns, requirements, and architecture. This ensures consistency and prevents breaking changes.

#### Review Checklist by Change Type

**New Features**:
1. Review `PRD-Kiras-Scout.md` to understand product requirements and feature scope
2. Review `CLAUDE.md` sections:
   - Architecture (similar existing features)
   - Domain Models (data structures)
   - Component Guidelines (UI patterns)
   - AI Integration (if AI is involved)
3. Review `README.md` "Current Features" to understand feature categorization
4. Search codebase for similar implementations to understand patterns

**API Changes (tRPC routers, procedures)**:
1. Review `CLAUDE.md`:
   - "Type-Safe API Layer" section (tRPC patterns)
   - Existing router implementations in `src/lib/api/routers/`
   - "AI Chat Flow Pattern" (if conversational)
   - `studentRouter.ts` has examples of profile update and class schedule CRUD operations
2. Review `AGENTS.md` "Backend" section for conventions
3. Check existing procedures for naming conventions and error handling patterns

**Schema Changes (Prisma)**:
1. Review `CLAUDE.md`:
   - "Key Domain Models" section
   - "Database Patterns" section
2. Review existing migrations in `prisma/migrations/` to understand migration patterns
3. Review `README.md` "Database Schema" section for public-facing schema documentation
4. Check related models for relationship patterns

**Component Changes**:
1. Review `CLAUDE.md`:
   - "Component Guidelines" section
   - "File Organization" section
   - "UI Patterns" section
2. Review `AGENTS.md` "Frontend" section
3. Search for similar components to understand patterns and conventions
4. Check Storybook stories for component documentation patterns

**AI Integration Changes**:
1. Review `CLAUDE.md`:
   - "AI Integration" section
   - "AI Best Practices" section
   - "AI Chat Flow Pattern" (if conversational)
2. Review existing AI implementations in `src/lib/ai/`
3. Check `src/lib/aiClient.ts` for provider patterns

**Architecture Changes**:
1. Review `CLAUDE.md` "Architecture" section comprehensively
2. Review `BUILD_GUIDE.md` if deployment is affected
3. Review all related sections in `CLAUDE.md` that might be impacted

### Post-Change Documentation Updates

**AFTER making changes**, update relevant documentation files to keep them synchronized. Documentation should reflect the current state of the codebase.

#### Update Checklist by Change Type

**New Features**:
- [ ] Update `README.md` "Current Features" section with the new feature
- [ ] Update `CLAUDE.md`:
  - Add to "Current Phase" completed features if MVP feature
  - Update "Architecture" section if new patterns introduced
  - Update "Domain Models" if new data structures
  - Add flow patterns if new user flows
  - Update "File Organization" if new directories
- [ ] Update relevant sections based on feature type (Component Guidelines, AI Integration, etc.)

**API Changes**:
- [ ] Update `CLAUDE.md`:
  - Update router documentation in relevant sections
  - Update "AI Chat Flow Pattern" if conversational API changed
  - Add new patterns to "Development Workflow" if significant
- [ ] Update code examples if patterns changed

**Schema Changes**:
- [ ] Update `CLAUDE.md` "Key Domain Models" section with new/changed models
- [ ] Update `README.md` "Database Schema" section if significant public-facing changes
- [ ] Update migration documentation if patterns changed

**Component Changes**:
- [ ] Update `CLAUDE.md` "Component Guidelines" if patterns changed
- [ ] Update "UI Patterns" if new patterns introduced
- [ ] Update Storybook documentation if component structure changed

**AI Integration Changes**:
- [ ] Update `CLAUDE.md` "AI Integration" section
- [ ] Update "AI Best Practices" if new patterns
- [ ] Update `README.md` "AI Integration" section if user-facing changes
- [ ] Update "AI Chat Flow Pattern" if conversational flows changed

### Code Quality Checkpoints

After making changes, verify:

1. **Consistency Check**: Does the implementation match documented patterns?
   - Review similar existing code
   - Ensure naming conventions match
   - Verify architectural patterns are followed

2. **Documentation Completeness**: Are all relevant docs updated?
   - Check all files listed in the update checklist
   - Verify examples and code snippets are current
   - Ensure feature lists are accurate

3. **Pattern Alignment**: Do changes align with established patterns?
   - Compare with similar implementations
   - Verify conventions are followed
   - Check for consistency with existing codebase

### Example: Adding Task-Specific Chat Feature

**Pre-Change Review**:
- Reviewed `PRD-Kiras-Scout.md` for task conversation requirements
- Reviewed `CLAUDE.md` "AI Chat Flow Pattern" for daily planning pattern
- Reviewed existing `chatRouter.ts` for API patterns
- Reviewed `Conversation` model in schema

**Post-Change Updates**:
- Updated `README.md` "Current Features" → "Task Management" section: Added "Task-specific conversations"
- Updated `CLAUDE.md`:
  - "Key Domain Models" → "Conversation": Documented `task_specific` type
  - "AI Chat Flow Pattern": Added task-specific flow example
  - "Development Workflow": Added task conversation pattern

### Verification Process

Before considering documentation complete:

1. **Read through updated sections** to ensure they accurately describe the implementation
2. **Check for broken references** or outdated code examples
3. **Verify feature lists** match current implementation
4. **Ensure consistency** across all documentation files
5. **Test code examples** if included in documentation

## Current Phase: Intelligence Layer (Phase 2)

Completed features (Phase 1):
- ✅ User authentication and onboarding
- ✅ Daily check-in chat interface with voice input
- ✅ Task capture and AI classification
- ✅ Basic clarification questions
- ✅ Task list view with completion tracking
- ✅ Student profiles and preferences
- ✅ Task-specific chat conversations
- ✅ Profile update system: Users can update name, year, biggestChallenge, class schedules, and preferences after onboarding
- ✅ Calendar components: WeekCalendar (M-Sunday, 6am-10pm) and TimeBlockEditor for managing recurring class schedules
- ✅ Class schedule management: Full CRUD operations with visual week calendar view

Completed features (Phase 2):
- ✅ Tool database: 20+ curated productivity tools stored in JSON (`src/lib/data/tools.json`)
- ✅ Tool recommendation service: AI-powered tool matching using GPT-5 (`src/lib/ai/toolRecommendation.ts`)
- ✅ Tool router: tRPC procedures for tool operations (`src/lib/api/routers/toolRouter.ts`)
- ✅ On-demand tool recommendations: Request tools in task chat via "Get tool recommendations" button
- ✅ Proactive tool suggestions: Automatic recommendations when task effectiveness < 3 stars
- ✅ Effectiveness tracking: 1-5 star ratings, time spent, notes on task completion
- ✅ Tool adoption tracking: Track tools (suggested, trying, using, abandoned) via StudentTool model
- ✅ Enhanced conversational AI: Tool recommendation awareness in task-specific chats
- ✅ Dashboard tools section: Display tools being used and recommended tools

Next phase (Phase 3 - Scheduling & Proactive):
- Intelligent time block generation
- Schedule optimization algorithm
- Proactive check-ins during study blocks
- End of day review
- Pattern recognition

Phase 3 preparation:
- Calendar components designed for ScheduleBlock integration
- WeekCalendarView component ready for dashboard integration
- TimeBlockEditor supports both ClassSchedule and future ScheduleBlock types
