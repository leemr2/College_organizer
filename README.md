# Scout - AI-Powered Daily Assistant for College Students

**Scout** is an AI-powered daily assistant designed specifically for college students. Unlike traditional task managers, Scout acts as a personalized coach that helps students discover the right tools, optimize their study strategies, and build effective routines through conversational guidance and intelligent recommendations.

## 🎯 Overview

Scout combines conversational AI with intelligent task management to help college students:
- **Capture tasks** naturally through voice or text input
- **Get organized** with intelligent clarification and context gathering
- **Discover tools** that can help them work smarter, not harder
- **Stay on schedule** with AI-optimized time blocking and proactive check-ins
- **Learn and improve** as the system adapts to each student's unique patterns

The product's core innovation is its **tool discovery and optimization engine** - Scout doesn't just track what needs to be done, it actively researches, suggests, and teaches students about digital tools, study techniques, and campus resources.

> 📖 For detailed product requirements and feature specifications, see [PRD-Kiras-Scout.md](./PRD-Kiras-Scout.md)

## ✨ Current Features (Phase 1 & 2)

### 🗣️ Daily Check-In & Task Capture
- Voice-to-text input using Web Speech API
- Natural language task extraction
- Daily planning conversations
- Task-specific chat threads

### 💬 Intelligent Conversation System
- AI-powered daily check-ins
- Context-aware responses based on student profile
- Task clarification through intelligent questioning
- Persistent conversation history
- **Task-specific chat threads**: Each task has its own dedicated conversation thread where students can ask questions, get help, or discuss details about that specific task. Conversations are context-aware and include task details (description, complexity, due date) in the AI's context.
- **Deep dive conversations**: Choose between "Quick Help" for immediate suggestions or "Deep Dive" for personalized workflow discovery. Deep dive mode asks intelligent questions one at a time to understand your approach before providing comprehensive recommendations.
- **Tool optimization**: Scout analyzes how you're using existing tools and suggests advanced features and optimization techniques using real-time web search.

### 📋 Task Management
- Task creation and tracking
- Complexity classification (simple, medium, complex)
- Due date management
- Completion tracking with effectiveness ratings
- **Task-specific conversations**: Chat directly within each task to get help, ask clarifying questions, or discuss task details. Each task maintains its own conversation history separate from daily planning chats.
- **Effectiveness tracking**: Rate task completion effectiveness (1-5 stars), track time spent, and add notes for learning

### 🛠️ Tool Discovery & Recommendations (Phase 2)
- **AI-powered tool recommendations**: Get personalized tool suggestions based on task type and context
- **Tool database**: 20+ curated productivity tools, study apps, and techniques
- **On-demand recommendations**: Request tool suggestions directly in task chat
- **Proactive suggestions**: Automatic tool recommendations when task effectiveness is poor (<3 stars)
- **Tool adoption tracking**: Track which tools you're using, trying, or have abandoned
- **Tool management**: View tools you're using and recommended tools on dashboard
- **Tool optimization**: Scout analyzes your existing tool usage and suggests advanced features, optimization techniques, and step-by-step guides using real-time web search
- **Web search integration**: Real-time research for tool tips, tutorials, and best practices using Gemini web grounding and Perplexity

### 👤 Student Profiles & Onboarding
- Personalized onboarding flow
- Student preferences (energy times, study style, etc.)
- Class schedule management with visual week calendar (M-Sunday, 6am-10pm)
- Profile customization and updates after onboarding
- Edit personal info (name, year, biggest challenge)
- Manage class schedules (add, edit, delete with recurring patterns)
- Update study preferences

### 📊 Dashboard
- Daily overview and statistics
- Today's tasks view
- Quick navigation to chat and tasks
- Week calendar view (ready for Phase 3 scheduling integration)
- **Tools section**: View tools you're using and recommended tools

## 🏗️ Technical Architecture

### Core Stack

- [**Next.js 14**](https://nextjs.org/) - React framework with App Router
- [**TypeScript**](https://www.typescriptlang.org/) - Type safety throughout
- [**tRPC**](https://trpc.io/) - End-to-end type-safe APIs
- [**Prisma**](https://www.prisma.io/) - Database ORM and schema management
- [**NextAuth.js**](https://next-auth.js.org/) - Authentication with Prisma adapter
- [**PostgreSQL**](https://www.postgresql.org/) - Database (via Supabase or other provider)

### 🎨 UI & Styling

- [**Tailwind CSS**](https://tailwindcss.com/) - Utility-first CSS framework
- [**Framer Motion**](https://www.framer.com/motion/) - Animation library
- [**Lucide Icons**](https://lucide.dev/) - Icon set
- Dark mode support with Tailwind CSS

### 🤖 AI Integration

- [**OpenAI GPT-4**](https://openai.com) - Primary conversational interface
- [**OpenAI GPT-5**](https://openai.com) - Advanced reasoning and tool recommendations
- [**Anthropic Claude Sonnet**](https://anthropic.com) - Research, analysis, and deep dive conversations
- [**Google Gemini**](https://gemini.google.com) - Web-grounded search for real-time tool tips and tutorials
- [**Perplexity**](https://www.perplexity.ai) - Web search fallback for research queries
- Web Speech API - Voice-to-text transcription
- Custom AI client abstraction for easy provider switching

### 🛠️ Development Tools

- [**Storybook**](https://storybook.js.org/) - Component development environment
- [**Inngest**](https://www.inngest.com/) - Background jobs and scheduled tasks
- [**react-toastify**](https://fkhadra.github.io/react-toastify/) - Toast notifications

### 🔧 Infrastructure & Services

- [**Vercel**](https://vercel.com) - Hosting and deployment
- [**Supabase**](https://supabase.com) - PostgreSQL database (or any PostgreSQL provider)
- [**Resend**](https://resend.com) - Email delivery (optional)
- [**AWS S3**](https://aws.amazon.com/s3/) - File storage (optional)

> **Note**: The database can be any PostgreSQL provider. While Supabase is recommended, you can use any provider via the `DATABASE_URL` and `DIRECT_URL` environment variables.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd College_organizer
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Configure the following required variables in `.env`:
```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..." # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..." # Required for deep dive conversations and tool optimization
GEMINI_API_KEY="..." # Required for web search (tool tips and tutorials)
PERPLEXITY_API_KEY="..." # Optional (web search fallback)

# Optional
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
```

4. **Set up the database**:
```bash
npx prisma migrate dev
```

5. **Start the development server**:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see Scout.

### First-Time Setup

1. Sign up for an account at `/auth/signin`
2. Complete the onboarding flow:
   - Personal information (name, year)
   - Class schedule (optional)
   - Study preferences
3. Start your first daily check-in conversation!

## 📁 Project Structure

```
├── app/                    # Next.js app router pages and API routes
│   ├── api/               # API routes (auth, tRPC, Inngest, etc.)
│   ├── auth/              # Authentication pages
│   ├── chat/              # Chat interface page
│   ├── dashboard/         # Dashboard page
│   ├── onboarding/        # Onboarding flow
│   └── tasks/             # Tasks management page
├── src/
│   ├── components/        # React components
│   │   ├── calendar/    # Calendar components (WeekCalendar, TimeBlockEditor)
│   │   ├── chat/         # Chat interface components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── onboarding/   # Onboarding flow components
│   │   ├── profile/      # Profile editing components
│   │   └── tasks/        # Task management components
│   ├── lib/
│   │   ├── ai/           # AI integration (conversational, toolRecommendation, toolOptimization, discoveryQuestions, webSearch)
│   │   ├── api/          # tRPC routers
│   │   │   └── routers/  # chatRouter, taskRouter, studentRouter (with profile/class schedule CRUD)
│   │   ├── types/        # TypeScript type definitions
│   │   │   └── calendar.ts  # Calendar and time block types
│   │   ├── auth/         # NextAuth configuration
│   │   ├── trpc/         # tRPC client/server setup
│   │   └── utils/        # Shared utilities
│   └── stories/          # Storybook component stories
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
└── agent-helpers/        # AI agent tools and documentation
```

## 🗄️ Database Schema

Key models:
- **Student** - User profiles and preferences (editable via `/profile`)
- **Task** - Tasks with complexity and clarification data
- **Conversation** - Chat history (daily planning and task-specific) with conversation modes (quick_help, deep_dive) and discovery data
- **ClassSchedule** - Course information with recurring meeting times (editable via profile)
- **StudentPreferences** - Study preferences and patterns (editable via profile)
- **Tool** - Productivity tools and study techniques database (Phase 2)
- **StudentTool** - Student-tool relationships and adoption tracking (Phase 2)
- **ToolSuggestion** - Tool recommendation records (Phase 2)
- **EffectivenessLog** - Task completion effectiveness tracking (Phase 2)

See `prisma/schema.prisma` for the complete schema.

## 🚀 Deployment

### Vercel Deployment

This application is optimized for deployment on [Vercel](https://vercel.com).

1. **Database Setup**:
   - Create a PostgreSQL database (Supabase recommended)
   - Get connection strings: `DATABASE_URL` and `DIRECT_URL`

2. **Vercel Setup**:
   - Push your code to GitHub
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Configure environment variables (see Installation section)
   - Deploy!

3. **Post-Deployment**:
   ```bash
   npx vercel env pull .env.production.local
   npx prisma migrate deploy
   ```

4. **Custom Domain** (optional):
   - Go to project settings → Domains
   - Add your domain and configure DNS

## 🛣️ Development Roadmap

Based on the PRD, Scout is being developed in phases:

### ✅ Phase 1: MVP Core (Completed)
- User authentication and onboarding
- Daily check-in chat interface
- Voice-to-text input
- Task capture and storage
- Basic clarification questions
- Simple task list view
- Profile update system with visual calendar for class schedules
- Week calendar components (ready for Phase 3 scheduling)

### ✅ Phase 2: Intelligence Layer (Completed)
- Tool database and recommendation engine (20+ tools)
- AI-powered tool recommendations (GPT-5)
- On-demand tool suggestions in task chat
- Proactive tool suggestions when effectiveness is poor
- Effectiveness tracking (1-5 star ratings, time spent, notes)
- Tool adoption tracking (using, trying, abandoned)
- Enhanced dashboard with tools section
- Enhanced clarification questions with tool awareness
- **Deep dive conversations**: Multi-turn discovery mode that asks intelligent questions to understand workflows before providing recommendations
- **Tool optimization**: Analyzes existing tool usage and suggests advanced features using web search
- **Web search integration**: Real-time research for tool tips, tutorials, and best practices (Gemini + Perplexity)
- **Discovery questions engine**: Generates layered questions to identify inefficiencies and optimization opportunities

### 📅 Phase 3: Scheduling & Proactive (Planned)
- Intelligent time block generation
- Schedule optimization algorithm
- Visual calendar/timeline view (calendar components already built)
- Proactive check-ins during study blocks
- End of day review
- Pattern recognition
- **Note**: Calendar components (`WeekCalendar`, `TimeBlockEditor`) are already implemented and ready for ScheduleBlock integration

### 🎯 Phase 4: Learning & Optimization (Future)
- Advanced effectiveness tracking
- Pattern recognition and insights
- Progressive tool feature disclosure
- Study strategy optimization
- Personalized time estimates

See [PRD-Kiras-Scout.md](./PRD-Kiras-Scout.md) for detailed feature specifications.

## 🤖 Agent Helpers

This project includes agent-specific tools and documentation:

- [**Agent Helpers**](./agent-helpers) - Folder for agent-specific files and tools
- [**Agent Instructions**](./agent-helpers/README.md) - Instructions for AI coding assistants
- [**Agent Tasks**](./agent-helpers/tasks) - Task checklists
- [**Agent Scratchpad**](./agent-helpers/scratchpad.md) - Agent notes and ideas

> **ℹ️ Add these lines to your `.gitignore` to avoid agent-helper conflicts:**
>
> ```.gitignore
> # agent-helpers
> agent-helpers/logs
> agent-helpers/sample-code
> agent-helpers/scratchpad.md
> ```

## 📝 License

MIT License

---

**Built with ❤️ for college students who want to work smarter, not harder.**
