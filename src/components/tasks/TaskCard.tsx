"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, Edit2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { api } from "@/lib/trpc/react";
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
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(() => {
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      // Format for datetime-local input: YYYY-MM-DDTHH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return "";
  });

  const updateDueDate = api.task.updateDueDate.useMutation({
    onSuccess: () => {
      toast.success("Due date updated!");
      setIsEditingDueDate(false);
      onComplete?.(); // Refresh the task list
    },
    onError: (error) => {
      toast.error("Failed to update due date: " + error.message);
    },
  });

  const handleSaveDueDate = () => {
    if (dueDateValue) {
      const date = new Date(dueDateValue);
      updateDueDate.mutate({
        taskId: task.id,
        dueDate: date,
      });
    } else {
      // Clear due date
      updateDueDate.mutate({
        taskId: task.id,
        dueDate: null,
      });
    }
  };

  const handleCancelEdit = () => {
    // Reset to original value
    if (task.dueDate) {
      const date = new Date(task.dueDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      setDueDateValue(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setDueDateValue("");
    }
    setIsEditingDueDate(false);
  };

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
            {!task.completed && (
              <div className="flex items-center gap-1">
                {isEditingDueDate ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="datetime-local"
                      value={dueDateValue}
                      onChange={(e) => setDueDateValue(e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      disabled={updateDueDate.isPending}
                    />
                    <button
                      onClick={handleSaveDueDate}
                      disabled={updateDueDate.isPending}
                      className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateDueDate.isPending}
                      className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {task.dueDate ? (
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 flex items-center gap-1">
                        <Clock size={12} />
                        {format(new Date(task.dueDate), "MMM d, h:mm a")}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        No due date
                      </span>
                    )}
                    <button
                      onClick={() => setIsEditingDueDate(true)}
                      className="text-xs p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      title="Edit due date"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {task.completed && task.dueDate && (
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

