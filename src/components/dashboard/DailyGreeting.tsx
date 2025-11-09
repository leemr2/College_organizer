"use client";

import { getDailyGreeting, getCurrentDayOfWeek } from "@/lib/utils/dailyGreetings";

interface DailyGreetingProps {
  name: string;
}

export function DailyGreeting({ name }: DailyGreetingProps) {
  const dayOfWeek = getCurrentDayOfWeek();
  const greeting = getDailyGreeting(name, dayOfWeek);

  return (
    <div className="text-center space-y-4">
      <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brandBlue-500 to-brandBlue-700 dark:from-brandBlue-400 dark:to-brandBlue-600">
        {greeting}
      </h1>
    </div>
  );
}

