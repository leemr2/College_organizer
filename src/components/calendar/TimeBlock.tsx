"use client";

import { TimeBlock as TimeBlockType, TimeBlockType as BlockType } from "@/lib/types/calendar";
import { formatTime } from "@/lib/utils/shared";

interface TimeBlockProps {
  block: TimeBlockType;
  onClick?: () => void;
  className?: string;
}

const typeColors: Record<BlockType, string> = {
  class: "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200",
  work: "bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200",
  lab: "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-200",
  commitment: "bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-200",
  task: "bg-gray-100 border-gray-300 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200",
  break: "bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200",
};

const typeLabels: Record<BlockType, string> = {
  class: "Class",
  work: "Work",
  lab: "Lab",
  commitment: "Commitment",
  task: "Task",
  break: "Break",
};

export function TimeBlock({ block, onClick, className = "" }: TimeBlockProps) {
  const colorClass = typeColors[block.type] || typeColors.task;
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border p-2 text-sm cursor-pointer transition-all
        ${colorClass}
        ${isClickable ? "hover:shadow-md hover:scale-[1.02]" : ""}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{block.title}</div>
          {block.courseCode && (
            <div className="text-xs opacity-75">{block.courseCode}</div>
          )}
          {block.meetingTimes.length > 0 && (
            <div className="text-xs mt-1">
              {formatTime(block.meetingTimes[0].startTime)} -{" "}
              {formatTime(block.meetingTimes[0].endTime)}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20">
            {typeLabels[block.type]}
          </span>
        </div>
      </div>
    </div>
  );
}

