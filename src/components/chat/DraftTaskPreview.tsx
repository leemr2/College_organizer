"use client";

import { DraftTask } from "@/lib/types";

interface DraftTaskPreviewProps {
  draftTasks: DraftTask[];
  onEdit?: (tempId: string) => void;
  onRemove?: (tempId: string) => void;
}

export function DraftTaskPreview({ draftTasks, onEdit, onRemove }: DraftTaskPreviewProps) {
  if (draftTasks.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
      <h3 className="font-semibold text-sm mb-2">Draft Tasks ({draftTasks.length})</h3>
      <div className="space-y-2">
        {draftTasks.map((task) => (
          <div key={task.tempId} className="flex items-start gap-2 text-sm">
            <span className="text-blue-600 dark:text-blue-400">•</span>
            <div className="flex-1">
              <p>{task.description}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {task.complexity} • {task.category}
                {task.dueDate && ` • Due: ${new Date(task.dueDate).toLocaleDateString()}`}
              </p>
            </div>
            {onRemove && (
              <button
                onClick={() => onRemove(task.tempId)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

