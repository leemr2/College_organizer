"use client";

import { useMemo } from "react";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { TimeBlock, MeetingTime } from "@/lib/types/calendar";
import { api } from "@/lib/trpc/react";

/**
 * WeekCalendarView component for dashboard
 * Displays a week view calendar with class schedules
 * Ready for Phase 3 integration with ScheduleBlocks
 */
export function WeekCalendarView() {
  const { data: student, isLoading } = api.student.me.useQuery();

  // Convert ClassSchedule to TimeBlock format for calendar
  const timeBlocks: TimeBlock[] = useMemo(() => {
    if (!student?.classSchedules) return [];
    return student.classSchedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.courseName,
      type: "class" as const,
      meetingTimes: (schedule.meetingTimes as unknown as MeetingTime[]) || [],
      courseCode: schedule.courseCode || undefined,
      professor: schedule.professor || undefined,
      semester: schedule.semester,
    }));
  }, [student?.classSchedules]);

  // TODO: Phase 3 - Add ScheduleBlocks to timeBlocks
  // const scheduleBlocks = api.schedule.list.useQuery({ weekStart: ... });
  // Merge scheduleBlocks with classSchedules for full week view

  if (isLoading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Loading calendar...
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Weekly Schedule
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your classes and scheduled activities for the week
        </p>
      </div>
      <WeekCalendar timeBlocks={timeBlocks} readOnly={true} />
    </div>
  );
}

