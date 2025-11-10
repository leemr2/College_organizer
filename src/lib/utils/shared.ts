/**
 * Format time string (HH:mm) to readable format (H:MM AM/PM)
 */
export function formatTime(timeString: string): string {
  if (!timeString) return "";
  
  const [hours, minutes] = timeString.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

/**
 * Get short day name (Mon, Tue, etc.)
 */
export function getShortDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Get start of week (Monday) for a given date
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

