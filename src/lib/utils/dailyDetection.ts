/**
 * Utilities for detecting and managing daily conversations
 */

/**
 * Check if a date is today (handles timezone)
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const inputDate = typeof date === "string" ? new Date(date) : date;
  const today = new Date();

  // Compare year, month, and day
  return (
    inputDate.getFullYear() === today.getFullYear() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getDate() === today.getDate()
  );
}

/**
 * Get the start of today in UTC (for database comparisons)
 */
export function getTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the end of today in UTC (for database comparisons)
 */
export function getTodayEnd(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

/**
 * Check if a conversation date belongs to today
 */
export function isConversationFromToday(
  conversationDate: Date | string | null | undefined
): boolean {
  return isToday(conversationDate);
}

/**
 * Format date for daily conversation tracking (YYYY-MM-DD)
 */
export function formatDateForDailyConversation(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

