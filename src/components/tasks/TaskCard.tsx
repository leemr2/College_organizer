"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import { TaskCompletion } from "./TaskCompletion";
import { TaskChat } from "./TaskChat";

interface TaskCardProps {
  task: {
    id: string;
    description: string;
    complexity: string;
    category?: string | null;
    dueDate?: Date | null;
    completed: boolean;
    clarificationComplete: boolean;
  };
  onComplete?: () => void;
}

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const complexityColors = {
    simple: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    complex: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {task.completed ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <Circle className="text-gray-400" size={20} />
            )}
            <h3
              className={`font-medium ${
                task.completed
                  ? "text-gray-500 line-through dark:text-gray-500"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {task.description}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {task.category && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {task.category}
              </span>
            )}
            <span
              className={`text-xs px-2 py-1 rounded ${
                complexityColors[task.complexity as keyof typeof complexityColors] ||
                complexityColors.medium
              }`}
            >
              {task.complexity}
            </span>
            {task.dueDate && (
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1">
                <Clock size={12} />
                {format(new Date(task.dueDate), "MMM d, h:mm a")}
              </span>
            )}
          </div>
        </div>
      </div>

      {!task.completed && (
        <div className="mt-4">
          <TaskCompletion taskId={task.id} onComplete={onComplete} />
        </div>
      )}

      {/* Task-specific chat */}
      {!task.completed && (
        <div className="mt-4">
          <TaskChat taskId={task.id} taskDescription={task.description} />
        </div>
      )}
    </div>
  );
}

