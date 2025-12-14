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
 * Get the start of a specific date in the user's timezone as a UTC Date
 * Useful for querying tasks for a specific date (not just today)
 * 
 * @param date - A Date object representing the target date (year, month, day are extracted)
 * @param timezone - The user's timezone (e.g., "America/New_York")
 * @returns A UTC Date representing midnight at the start of that date in the user's timezone
 */
export function getDateStartInTimezone(date: Date, timezone: string): Date {
  // The date parameter comes from the client, where it was created as a local date
  // When serialized via tRPC, it becomes a UTC timestamp. We need to interpret
  // what date the client intended by formatting the UTC date in the user's timezone.
  
  // Format the incoming date in the user's timezone to see what date it represents
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const dateParts = dateFormatter.formatToParts(date);
  const targetYear = parseInt(dateParts.find(p => p.type === "year")?.value || "0");
  const targetMonth = parseInt(dateParts.find(p => p.type === "month")?.value || "0") - 1;
  const targetDay = parseInt(dateParts.find(p => p.type === "day")?.value || "0");
  
  // Now find what UTC time represents midnight on this date in the timezone
  // Strategy: Start with UTC noon for the target date (avoids DST edge cases),
  // then adjust to get the right date, then adjust to midnight
  
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  // Start with UTC noon for the target date (noon avoids DST transition issues)
  let candidateUtc = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0, 0));
  
  // Check what date this represents in the timezone
  let tzParts = timeFormatter.formatToParts(candidateUtc);
  let tzYear = parseInt(tzParts.find(p => p.type === "year")?.value || "0");
  let tzMonth = parseInt(tzParts.find(p => p.type === "month")?.value || "0") - 1;
  let tzDay = parseInt(tzParts.find(p => p.type === "day")?.value || "0");
  
  // If dates don't match, adjust by the difference
  // Use a simple iterative approach to handle DST and timezone edge cases
  let attempts = 0;
  while ((tzYear !== targetYear || tzMonth !== targetMonth || tzDay !== targetDay) && attempts < 3) {
    // Calculate day difference more accurately
    const targetDateNum = targetYear * 10000 + targetMonth * 100 + targetDay;
    const actualDateNum = tzYear * 10000 + tzMonth * 100 + tzDay;
    const dayDiff = targetDateNum - actualDateNum;
    
    // Adjust by the day difference (in milliseconds)
    candidateUtc = new Date(candidateUtc.getTime() + dayDiff * 24 * 60 * 60 * 1000);
    
    // Re-check
    tzParts = timeFormatter.formatToParts(candidateUtc);
    tzYear = parseInt(tzParts.find(p => p.type === "year")?.value || "0");
    tzMonth = parseInt(tzParts.find(p => p.type === "month")?.value || "0") - 1;
    tzDay = parseInt(tzParts.find(p => p.type === "day")?.value || "0");
    attempts++;
  }
  
  // Now get the hour/minute and adjust backwards to midnight
  tzParts = timeFormatter.formatToParts(candidateUtc);
  const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0");
  const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0");
  
  // Adjust backwards to get to midnight in the timezone
  const offsetMs = (tzHour * 60 + tzMinute) * 60 * 1000;
  return new Date(candidateUtc.getTime() - offsetMs);
}

/**
 * Get the end of a specific date in the user's timezone as a UTC Date
 */
export function getDateEndInTimezone(date: Date, timezone: string): Date {
  const start = getDateStartInTimezone(date, timezone);
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

/**
 * Parse an AI-generated ISO 8601 date string and convert it to a UTC Date
 * representing that time in the user's timezone.
 * 
 * This handles cases where the AI generates dates like:
 * - "2025-11-19T13:30:00" (no timezone - interpreted as user's local time)
 * - "2025-11-19T13:30:00Z" (UTC - we'll validate it's reasonable)
 * 
 * @param dateString - ISO 8601 date string from AI
 * @param timezone - User's timezone (e.g., "America/New_York")
 * @param targetDate - The target date for scheduling (to ensure dates are on the correct day)
 * @returns UTC Date object representing the time in the user's timezone
 */
export function parseAIDateInTimezone(
  dateString: string,
  timezone: string,
  targetDate: Date
): Date {
  // If timezone is explicitly specified (Z or +/-), parse as UTC
  if (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/)) {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    // Validate it's within reasonable range
    const minDate = new Date('1970-01-01');
    const maxDate = new Date('2100-01-01');
    if (parsed < minDate || parsed > maxDate) {
      throw new Error(`Date out of valid range: ${dateString}`);
    }
    return parsed;
  }
  
  // No timezone specified - parse components and interpret as local time in user's timezone
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid date format: ${dateString}. Expected ISO 8601 format (YYYY-MM-DDTHH:mm:ss).`);
  }
  
  const [, year, month, day, hour, minute, second, millisecond] = match;
  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);
  const secondNum = parseInt(second, 10) || 0;
  const msNum = millisecond ? parseInt(millisecond.slice(0, 3).padEnd(3, '0'), 10) : 0;
  
  // Get the target date's year/month/day in the user's timezone
  const targetDateStart = getDateStartInTimezone(targetDate, timezone);
  const targetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const targetParts = targetFormatter.formatToParts(targetDateStart);
  const targetYear = parseInt(targetParts.find(p => p.type === "year")?.value || "0");
  const targetMonth = parseInt(targetParts.find(p => p.type === "month")?.value || "0") - 1;
  const targetDay = parseInt(targetParts.find(p => p.type === "day")?.value || "0");
  
  // Create a formatter to check times in the timezone
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Find the UTC time that represents hour:minute:second on targetYear-month-day in the timezone
  // Strategy: Start with a reasonable UTC time and adjust iteratively
  // Use noon UTC as starting point to avoid DST edge cases
  let candidateUtc = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0, 0));
  
  // Calculate the offset needed
  // We'll try different UTC times and find one that formats to the desired local time
  let bestMatch = candidateUtc;
  let bestDiff = Infinity;
  
  // Try UTC times from -12 to +12 hours from the desired hour
  for (let utcHourOffset = -12; utcHourOffset <= 12; utcHourOffset++) {
    const testUtc = new Date(Date.UTC(targetYear, targetMonth, targetDay, hourNum + utcHourOffset, minuteNum, secondNum, msNum));
    const tzParts = timeFormatter.formatToParts(testUtc);
    const tzYear = parseInt(tzParts.find(p => p.type === "year")?.value || "0");
    const tzMonth = parseInt(tzParts.find(p => p.type === "month")?.value || "0") - 1;
    const tzDay = parseInt(tzParts.find(p => p.type === "day")?.value || "0");
    const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0");
    const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0");
    const tzSecond = parseInt(tzParts.find(p => p.type === "second")?.value || "0");
    
    // Check for exact match
    if (tzYear === targetYear && tzMonth === targetMonth && tzDay === targetDay &&
        tzHour === hourNum && tzMinute === minuteNum && tzSecond === secondNum) {
      candidateUtc = testUtc;
      break;
    }
    
    // Track closest match
    if (tzYear === targetYear && tzMonth === targetMonth && tzDay === targetDay) {
      const diff = Math.abs(tzHour - hourNum) * 60 + Math.abs(tzMinute - minuteNum);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = testUtc;
      }
    }
  }
  
  // If we didn't find an exact match, use the best match and adjust
  if (bestDiff > 0) {
    const tzParts = timeFormatter.formatToParts(bestMatch);
    const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0");
    const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0");
    const hourDiff = hourNum - tzHour;
    const minuteDiff = minuteNum - tzMinute;
    const offsetMs = (hourDiff * 3600 + minuteDiff * 60) * 1000;
    candidateUtc = new Date(bestMatch.getTime() + offsetMs);
  } else {
    candidateUtc = bestMatch;
  }
  
  // Final validation
  if (isNaN(candidateUtc.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  
  // Ensure the date is within a reasonable range
  const minDate = new Date('1970-01-01');
  const maxDate = new Date('2100-01-01');
  if (candidateUtc < minDate || candidateUtc > maxDate) {
    throw new Error(`Date out of valid range: ${dateString}`);
  }
  
  return candidateUtc;
}

/**
 * Create a UTC Date representing a specific time (hour:minute) on a specific date in a timezone.
 * 
 * @param date - The target date
 * @param hour - Hour (0-23) in the timezone
 * @param minute - Minute (0-59) in the timezone
 * @param timezone - The timezone (e.g., "America/New_York")
 * @returns UTC Date object
 */
export function createDateAtTimeInTimezone(
  date: Date,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Get the start of the date in the timezone
  const dateStart = getDateStartInTimezone(date, timezone);
  
  // Create a formatter to check times
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  // Find the UTC time that represents hour:minute in the timezone
  // Try different UTC times around the expected time
  let bestMatch = dateStart;
  let bestDiff = Infinity;
  
  for (let utcHourOffset = -12; utcHourOffset <= 12; utcHourOffset++) {
    const testUtc = new Date(dateStart.getTime() + (hour + utcHourOffset) * 3600000 + minute * 60000);
    const tzParts = timeFormatter.formatToParts(testUtc);
    const tzYear = parseInt(tzParts.find(p => p.type === "year")?.value || "0");
    const tzMonth = parseInt(tzParts.find(p => p.type === "month")?.value || "0") - 1;
    const tzDay = parseInt(tzParts.find(p => p.type === "day")?.value || "0");
    const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0");
    const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0");
    
    // Check if this matches the target date and time
    const dateParts = timeFormatter.formatToParts(dateStart);
    const targetYear = parseInt(dateParts.find(p => p.type === "year")?.value || "0");
    const targetMonth = parseInt(dateParts.find(p => p.type === "month")?.value || "0") - 1;
    const targetDay = parseInt(dateParts.find(p => p.type === "day")?.value || "0");
    
    if (tzYear === targetYear && tzMonth === targetMonth && tzDay === targetDay) {
      if (tzHour === hour && tzMinute === minute) {
        return testUtc; // Exact match
      }
      
      // Track closest match
      const diff = Math.abs(tzHour - hour) * 60 + Math.abs(tzMinute - minute);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = testUtc;
      }
    }
  }
  
  // If we found a close match, fine-tune it
  if (bestDiff > 0) {
    const tzParts = timeFormatter.formatToParts(bestMatch);
    const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0");
    const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0");
    const hourDiff = hour - tzHour;
    const minuteDiff = minute - tzMinute;
    const offsetMs = (hourDiff * 3600 + minuteDiff * 60) * 1000;
    return new Date(bestMatch.getTime() + offsetMs);
  }
  
  return bestMatch;
}