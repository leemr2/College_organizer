"use client";

import { useMemo } from "react";
import { api } from "@/lib/trpc/react";
import { format } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";

export function TodayStats() {
  // Normalize today's date to avoid timezone issues
  const today = useMemo(() => {
    const date = new Date();
    // Create date at midnight in local timezone
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);

  const { data: tasks, isLoading, error } = api.task.listByDate.useQuery({
    date: today,
  });

  if (isLoading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Loading today's tasks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-4 text-red-500 dark:text-red-400">
          Error loading tasks: {error.message}
        </div>
      </div>
    );
  }

  const completedTasks = tasks?.filter((t) => t.completed).length || 0;
  const totalTasks = tasks?.length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Today's Progress - {format(today, "EEEE, MMMM d")}
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle className="text-gray-400" size={20} />
            <span className="text-gray-700 dark:text-gray-300">Total Tasks</span>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalTasks}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={20} />
            <span className="text-gray-700 dark:text-gray-300">Completed</span>
          </div>
          <span className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completedTasks}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {completionRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-brandBlue-500 to-brandBlue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

