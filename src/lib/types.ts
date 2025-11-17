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

export interface ConversationMode {
  type: "quick_help" | "deep_dive";
  currentPhase?: "discovery" | "analysis" | "recommendation";
  discoveryQuestions?: DiscoveryQuestion[];
  currentQuestionIndex?: number;
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
// ONBOARDING
// ============================================

export interface OnboardingData {
  name?: string;
  year?: string;
  biggestChallenge?: string;
  classSchedules?: ClassScheduleData[];
  preferences?: Partial<StudentPreferences>;
}

