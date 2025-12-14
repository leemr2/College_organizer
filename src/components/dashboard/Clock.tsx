"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/trpc/react";

/**
 * Clock component that displays the current date and time in the user's timezone
 * This serves as a visual reference for both the user and helps ensure the AI
 * understands what "today" and "current time" means in the user's context.
 * 
 * @param compact - If true, displays in a compact format suitable for navigation bar
 */
export function Clock({ compact = false }: { compact?: boolean }) {
  const { data: student } = api.student.me.useQuery();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState<string>("UTC");

  // Get user's timezone from preferences
  useEffect(() => {
    if (student?.preferences?.timezone) {
      setTimezone(student.preferences.timezone);
    } else {
      // Fallback to browser timezone
      try {
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
      } catch {
        setTimezone("UTC");
      }
    }
  }, [student?.preferences?.timezone]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format date and time in user's timezone
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: compact ? undefined : "2-digit",
    hour12: true,
  });

  const dateString = dateFormatter.format(currentTime);
  const timeString = timeFormatter.format(currentTime);

  // Get timezone abbreviation if possible
  const timezoneFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  });
  const timezoneParts = timezoneFormatter.formatToParts(currentTime);
  const timezoneName = timezoneParts.find((p) => p.type === "timeZoneName")?.value || timezone;

  // Compact version for navigation bar
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="tabular-nums font-medium text-gray-700 dark:text-gray-300">
          {timeString}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500">
          {timezoneName}
        </div>
      </div>
    );
  }

  // Full version for dashboard
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {dateString}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {timeString}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {timezoneName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

