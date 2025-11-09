/**
 * Generate day-specific greeting messages for students
 */

export function getDailyGreeting(name: string, dayOfWeek: number): string {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const dayName = dayNames[dayOfWeek];

  const greetings: Record<number, string> = {
    0: `Welcome back, ${name}! It's Sunday - a perfect day to plan your week ahead. I'm here to help you get organized.`,
    1: `Welcome back, ${name}! It's Monday and I'm here to help you tackle the week ahead. Let's make it a productive one!`,
    2: `Welcome back, ${name}! It's Tuesday - you're already making progress this week. I'm here to keep you on track.`,
    3: `Welcome back, ${name}! It's Wednesday - you're halfway through the week! I'm here to help you stay focused.`,
    4: `Welcome back, ${name}! It's Thursday - almost there! I'm here to help you finish the week strong.`,
    5: `Welcome back, ${name}! It's Friday - let's finish the week on a high note! I'm here to help you wrap things up.`,
    6: `Welcome back, ${name}! It's Saturday - time to catch up and plan ahead. I'm here to help you stay organized.`,
  };

  return greetings[dayOfWeek] || `Welcome back, ${name}! It's ${dayName} and I'm here to help you accomplish your goals.`;
}

/**
 * Get the current day of week (0 = Sunday, 6 = Saturday)
 */
export function getCurrentDayOfWeek(): number {
  return new Date().getDay();
}

