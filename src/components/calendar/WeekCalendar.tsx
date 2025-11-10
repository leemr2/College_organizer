"use client";

import { useState, useMemo } from "react";
import { TimeBlock, CalendarEvent } from "@/lib/types/calendar";
import { TimeBlock as TimeBlockComponent } from "./TimeBlock";
import { getStartOfWeek, getShortDayName } from "@/lib/utils/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekCalendarProps {
  startDate?: Date;
  timeBlocks: TimeBlock[];
  onBlockClick?: (block: TimeBlock) => void;
  onBlockEdit?: (block: TimeBlock) => void;
  readOnly?: boolean;
  className?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm (6-22)

export function WeekCalendar({
  startDate,
  timeBlocks,
  onBlockClick,
  onBlockEdit,
  readOnly = false,
  className = "",
}: WeekCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startDate ? getStartOfWeek(startDate) : getStartOfWeek(new Date())
  );

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push({
        date,
        dayName: DAYS[i],
        shortName: getShortDayName(date),
      });
    }
    return days;
  }, [currentWeekStart]);

  // Convert TimeBlocks to CalendarEvents for display
  const events = useMemo(() => {
    const eventList: CalendarEvent[] = [];
    timeBlocks.forEach((block) => {
      block.meetingTimes.forEach((meetingTime) => {
        const dayIndex = DAYS.indexOf(meetingTime.day);
        if (dayIndex !== -1) {
          eventList.push({
            id: `${block.id}-${meetingTime.day}`,
            title: block.title,
            type: block.type,
            day: meetingTime.day,
            startTime: meetingTime.startTime,
            endTime: meetingTime.endTime,
            courseCode: block.courseCode,
            professor: block.professor,
          });
        }
      });
    });
    return eventList;
  }, [timeBlocks]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    DAYS.forEach((day) => {
      grouped[day] = [];
    });
    events.forEach((event) => {
      grouped[event.day].push(event);
    });
    // Sort events by start time
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => {
        const [aHours, aMinutes] = a.startTime.split(":").map(Number);
        const [bHours, bMinutes] = b.startTime.split(":").map(Number);
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
      });
    });
    return grouped;
  }, [events]);

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  const getEventPosition = (event: CalendarEvent) => {
    const [startHours, startMinutes] = event.startTime.split(":").map(Number);
    const [endHours, endMinutes] = event.endTime.split(":").map(Number);
    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;
    const duration = endMinutesTotal - startMinutesTotal;
    
    // Calculate position relative to 6am-10pm window (16 hours = 960 minutes)
    const startOfDay = 6 * 60; // 6am in minutes
    const windowStart = startMinutesTotal - startOfDay;
    const windowDuration = 16 * 60; // 16 hours in minutes
    
    const topPercent = (windowStart / windowDuration) * 100;
    const heightPercent = (duration / windowDuration) * 100;
    
    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  const handleBlockClick = (event: CalendarEvent) => {
    if (readOnly || !onBlockClick) return;
    
    // Find the original block
    const block = timeBlocks.find((b) => b.id === event.id.split("-")[0]);
    if (block && onBlockClick) {
      onBlockClick(block);
    }
    if (block && onBlockEdit) {
      onBlockEdit(block);
    }
  };

  const weekRange = `${weekDays[0].date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDays[6].date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousWeek}
            className="p-1"
          >
            <ChevronLeft size={20} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="px-3"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="p-1"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {weekRange}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
            Time
          </div>
          {weekDays.map((day) => (
            <div
              key={day.dayName}
              className="p-2 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {day.shortName}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {day.date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="relative" style={{ minHeight: "960px" }}>
          {/* Day columns for event positioning */}
          {weekDays.map((day, dayIndex) => (
            <div
              key={day.dayName}
              className="absolute top-0 bottom-0"
              style={{
                left: `${((dayIndex + 1) * 100) / 8}%`,
                width: `${100 / 8}%`,
              }}
            >
              {/* Events for this day */}
              {eventsByDay[day.dayName].map((event) => {
                const position = getEventPosition(event);
                const block = timeBlocks.find(
                  (b) => b.id === event.id.split("-")[0]
                );
                if (!block) return null;

                return (
                  <div
                    key={event.id}
                    className="absolute left-1 right-1 cursor-pointer z-10"
                    style={{
                      top: position.top,
                      height: position.height,
                    }}
                    onClick={() => handleBlockClick(event)}
                  >
                    <TimeBlockComponent
                      block={block}
                      onClick={readOnly ? undefined : () => handleBlockClick(event)}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {/* Hour Grid */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-8 border-b border-gray-100 dark:border-gray-800"
            >
              <div className="p-1 text-xs text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-700">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                  ? "12 PM"
                  : `${hour - 12} PM`}
              </div>
              {weekDays.map((day) => (
                <div
                  key={`${day.dayName}-${hour}`}
                  className="border-r border-gray-100 dark:border-gray-800 last:border-r-0 min-h-[60px]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

