/**
 * Timezone utility functions for handling user timezones
 * 
 * These functions help convert between UTC (stored in database) and user's local timezone
 */

/**
 * Get the user's timezone from preferences, or fallback to browser timezone
 */
export function getUserTimezone(preferences?: { timezone?: string | null } | null): string {
  if (preferences?.timezone) {
    return preferences.timezone;
  }
  
  // Fallback to browser timezone
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York"; // Final fallback
  }
}

/**
 * Get the start of today in the user's timezone as a UTC Date
 * This is useful for database queries where we need to find all records for "today" in the user's timezone
 */
export function getTodayStartInTimezone(timezone: string): Date {
  const now = new Date();
  
  // Get what "today" is in the user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1;
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  
  // Create a date representing midnight in the timezone
  // We need to construct a date that, when formatted in the timezone, gives us midnight
  // The trick: create a date string and use Intl to convert it
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`;
  
  // Use a more reliable method: create a date and find what UTC time corresponds to midnight in the timezone
  // We'll use the fact that we can format a UTC date in the timezone to see what it represents
  const testUtc = new Date(`${dateStr}Z`); // UTC midnight for that date
  
  // Format this UTC date in the timezone to see what time it represents there
  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const tzParts = tzFormatter.formatToParts(testUtc);
  const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0");
  const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0");
  
  // Calculate the offset
  const offsetMinutes = (tzHour * 60 + tzMinute);
  
  // Adjust the UTC date to represent midnight in the timezone
  const midnightUtc = new Date(testUtc.getTime() - offsetMinutes * 60 * 1000);
  
  return midnightUtc;
}

/**
 * Get the end of today in the user's timezone as a UTC Date
 */
export function getTodayEndInTimezone(timezone: string): Date {
  const start = getTodayStartInTimezone(timezone);
  const end = new Date(start);
  // Add 23 hours, 59 minutes, 59 seconds, 999 milliseconds
  end.setTime(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return end;
}

/**
 * Convert a date to a formatted string in the user's timezone
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    ...options,
  }).format(date);
}

/**
 * Check if a date is today in the user's timezone
 */
export function isTodayInTimezone(
  date: Date | string | null | undefined,
  timezone: string
): boolean {
  if (!date) return false;
  
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const todayStart = getTodayStartInTimezone(timezone);
  const todayEnd = getTodayEndInTimezone(timezone);
  
  return inputDate >= todayStart && inputDate <= todayEnd;
}
