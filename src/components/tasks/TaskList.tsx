"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { TaskCard } from "./TaskCard";
import { format } from "date-fns";

export function TaskList() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: tasks, isLoading, refetch } = api.task.listByDate.useQuery({
    date: selectedDate,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading tasks...</div>
      </div>
    );
  }

  const completedTasks = tasks?.filter((t) => t.completed).length || 0;
  const totalTasks = tasks?.length || 0;

  return (
    <div className="space-y-6">
      {/* Date selector and stats */}
      <div className="flex items-center justify-between">
        <div>
          <input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => {
              // Parse date string and create Date in local timezone to avoid timezone issues
              const dateString = e.target.value;
              const [year, month, day] = dateString.split("-").map(Number);
              const date = new Date(year, month - 1, day); // month is 0-indexed
              setSelectedDate(date);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {completedTasks} of {totalTasks} completed
        </div>
      </div>

      {/* Task list */}
      {tasks && tasks.length > 0 ? (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => refetch()}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No tasks for this date.</p>
          <p className="text-sm mt-2">
            Go to Chat to add tasks using voice or text!
          </p>
        </div>
      )}
    </div>
  );
}

