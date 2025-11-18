"use client";

import { ScheduleBlockData } from "@/lib/types";
import { GripVertical, Clock, CheckCircle2, Circle } from "lucide-react";

interface ScheduleBlockProps {
  block: ScheduleBlockData;
  onClick?: () => void;
  onReschedule?: () => void;
  className?: string;
}

const typeColors: Record<ScheduleBlockData["type"], string> = {
  class: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  task: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  break: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
  commitment: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  lunch: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
  dinner: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
};

const typeLabels: Record<ScheduleBlockData["type"], string> = {
  class: "Class",
  task: "Task",
  break: "Break",
  commitment: "Commitment",
  lunch: "Lunch",
  dinner: "Dinner",
};

export function ScheduleBlock({ block, onClick, onReschedule, className = "" }: ScheduleBlockProps) {
  const colorClass = typeColors[block.type] || typeColors.task;
  const isClickable = !!onClick;

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      className={`
        rounded-lg border p-2 text-sm transition-all
        ${colorClass}
        ${isClickable ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""}
        ${block.completed ? "opacity-60" : ""}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {block.completed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
            <div className="font-medium truncate">{block.title}</div>
          </div>
          {block.description && (
            <div className="text-xs mt-1 text-gray-600 dark:text-gray-400 line-clamp-1">
              {block.description}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            <span>
              {formatTime(block.startTime)} - {formatTime(block.endTime)}
            </span>
          </div>
          {block.reasoning && (
            <div className="text-xs mt-1 text-gray-500 dark:text-gray-500 italic line-clamp-1" title={block.reasoning}>
              {block.reasoning}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20">
            {typeLabels[block.type]}
          </span>
          {onReschedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReschedule();
              }}
              className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded"
              title="Reschedule"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

