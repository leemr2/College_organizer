"use client";

import { ScheduleSuggestion } from "@/lib/types";
import { format } from "date-fns";

interface SchedulePreviewProps {
  suggestion: ScheduleSuggestion;
  onConfirm: () => void;
  onRegenerate: () => void;
}

export function SchedulePreview({ suggestion, onConfirm, onRegenerate }: SchedulePreviewProps) {
  return (
    <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
      <h3 className="font-semibold mb-2">Your Schedule for Today</h3>
      
      {suggestion.warnings && suggestion.warnings.length > 0 && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded mb-3 text-sm">
          {suggestion.warnings.join(", ")}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {suggestion.blocks.map((block, idx) => (
          <div key={idx} className="flex gap-3 text-sm">
            <span className="font-mono text-gray-600 dark:text-gray-400">
              {format(block.startTime, "h:mm a")}
            </span>
            <div className="flex-1">
              <p className="font-medium">{block.title}</p>
              {block.reasoning && (
                <p className="text-xs text-gray-600 dark:text-gray-400">{block.reasoning}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{suggestion.reasoning}</p>

      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Confirm Schedule
        </button>
        <button
          onClick={onRegenerate}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}

