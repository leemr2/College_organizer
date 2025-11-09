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

## ✨ Current Features (Phase 1 MVP)

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

### 📋 Task Management
- Task creation and tracking
- Complexity classification (simple, medium, complex)
- Due date management
- Completion tracking
- Task-specific conversations

### 👤 Student Profiles & Onboarding
- Personalized onboarding flow
- Student preferences (energy times, study style, etc.)
- Class schedule management
- Profile customization

### 📊 Dashboard
- Daily overview and statistics
- Today's tasks view
- Quick navigation to chat and tasks

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
- [**Anthropic Claude**](https://anthropic.com) - Research and analysis (planned)
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

# AI Provider
OPENAI_API_KEY="sk-..."

# Optional
ANTHROPIC_API_KEY="sk-ant-..." # For future research features
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
│   │   ├── chat/         # Chat interface components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── onboarding/   # Onboarding flow components
│   │   └── tasks/        # Task management components
│   ├── lib/
│   │   ├── ai/           # AI integration (conversational, research)
│   │   ├── api/          # tRPC routers
│   │   │   └── routers/  # chatRouter, taskRouter, studentRouter
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
- **Student** - User profiles and preferences
- **Task** - Tasks with complexity and clarification data
- **Conversation** - Chat history (daily planning and task-specific)
- **ClassSchedule** - Course information
- **StudentPreferences** - Study preferences and patterns

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

### ✅ Phase 1: MVP Core (Current)
- User authentication and onboarding
- Daily check-in chat interface
- Voice-to-text input
- Task capture and storage
- Basic clarification questions
- Simple task list view

### 🔄 Phase 2: Intelligence Layer (Next)
- Tool research integration (Claude + web search)
- Tool database and recommendation engine
- Advanced clarification questions
- Memory system basics
- Effectiveness tracking
- Enhanced dashboard

### 📅 Phase 3: Scheduling & Proactive (Planned)
- Intelligent time block generation
- Schedule optimization algorithm
- Visual calendar/timeline view
- Proactive check-ins during study blocks
- End of day review
- Pattern recognition

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
