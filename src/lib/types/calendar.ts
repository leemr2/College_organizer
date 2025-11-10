export type TimeBlockType =
  | "class"
  | "work"
  | "lab"
  | "commitment"
  | "task"
  | "break";

export interface MeetingTime {
  day: string;
  startTime: string;
  endTime: string;
}

export interface TimeBlock {
  id: string;
  title: string;
  type: TimeBlockType;
  meetingTimes: MeetingTime[];
  courseCode?: string;
  professor?: string;
  semester?: string;
  // For future ScheduleBlock integration
  startDateTime?: Date;
  endDateTime?: Date;
  taskId?: string;
}

export interface RecurringPattern {
  days: string[]; // ["Monday", "Wednesday", "Friday"]
  startTime: string;
  endTime: string;
}

export interface WeekView {
  startDate: Date;
  endDate: Date;
  days: {
    date: Date;
    dayName: string;
    blocks: TimeBlock[];
  }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: TimeBlockType;
  day: string;
  startTime: string;
  endTime: string;
  courseCode?: string;
  professor?: string;
}

