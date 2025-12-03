// ============================================
// MESSAGE TYPES
// ============================================

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: string;
}

export type MessageArray = Message[];

// ============================================
// STUDENT PREFERENCES
// ============================================

export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  daily_reminder?: boolean;
  task_reminders?: boolean;
}

export interface StudentPreferences {
  peakEnergyTimes?: string[];
  preferredBreakLength?: number;
  morningPerson?: boolean;
  studyAloneVsGroup?: "alone" | "group" | "flexible";
  studyEnvironmentPrefs?: Record<string, unknown>;
  effectiveStudyPatterns?: Record<string, unknown>;
  notificationSettings?: NotificationSettings;
  timezone?: string;
}

// ============================================
// CLASS SCHEDULE
// ============================================

export interface MeetingTime {
  day: string;
  startTime: string;
  endTime: string;
}

export interface ClassScheduleData {
  courseName: string;
  courseCode?: string;
  professor?: string;
  meetingTimes: MeetingTime[];
  semester: string;
  syllabus?: string;
  exams?: string[];
}

// ============================================
// AI CONTEXT TYPES
// ============================================

export interface TaskSummary {
  description: string;
  category?: string | null;
  completed: boolean;
}

export interface TaskContext {
  id: string;
  description: string;
  complexity: string;
  category?: string | null;
  dueDate?: Date | null;
  completed: boolean;
}

export interface DiscoveryQuestion {
  id: string;
  question: string;
  purpose: string; // What we're trying to learn
  answered: boolean;
  answer?: string;
}

// Draft task (not yet in DB)
export interface DraftTask {
  tempId: string; // temporary ID for tracking
  description: string;
  category: string;
  complexity: "simple" | "medium" | "complex";
  urgency: string;
  dueDate: Date | null;
  isRecurring: boolean;
}

// Planning session state
export interface PlanningSessionState {
  status: "active" | "generating_schedule" | "completed";
  draftTasks: DraftTask[];
  scheduleSuggestion?: ScheduleSuggestion;
  lastUpdated: string; // ISO timestamp
}

export interface ConversationMode {
  type: "quick_help" | "deep_dive" | "planning_session";
  currentPhase?: "discovery" | "analysis" | "recommendation" | "task_extraction" | "schedule_generation";
  discoveryQuestions?: DiscoveryQuestion[];
  currentQuestionIndex?: number;
  planningSession?: PlanningSessionState;
}

export interface StudentContext {
  name: string;
  preferences?: StudentPreferences | null;
  recentTasks?: TaskSummary[];
  recentConversations?: unknown[];
  conversationType?: "daily_planning" | "task_specific";
  currentTime?: Date;
  task?: TaskContext;
  currentTools?: Array<{
    id: string;
    name: string;
    category: string[];
  }>;
  conversationMode?: ConversationMode;
}

// ============================================
// SCHEDULING TYPES
// ============================================

export interface ScheduleBlockData {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: "class" | "task" | "break" | "commitment" | "lunch" | "dinner";
  completed: boolean;
  taskId?: string;
  reasoning?: string; // AI explanation
}

export interface SchedulingContext {
  tasks: TaskContext[];
  classSchedules: ClassScheduleData[];
  existingBlocks: ScheduleBlockData[];
  preferences: StudentPreferences;
  currentDate: Date;
  timezone: string;
}

export interface ScheduleSuggestion {
  blocks: ScheduleBlockData[];
  reasoning: string; // Overall explanation of schedule strategy
  warnings?: string[]; // e.g., "This is a packed day, consider rescheduling non-urgent tasks"
}

export interface RescheduleOptions {
  taskId: string;
  currentBlockId: string;
  suggestedTimes: Array<{
    startTime: Date;
    endTime: Date;
    reasoning: string;
  }>;
}

// ============================================
// ONBOARDING
// ============================================

export interface OnboardingData {
  name?: string;
  year?: string;
  biggestChallenge?: string;
  classSchedules?: ClassScheduleData[];
  preferences?: Partial<StudentPreferences>;
}

