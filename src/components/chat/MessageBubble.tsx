"use client";

import { format } from "date-fns";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | Date;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";
  const timeStr = timestamp
    ? format(new Date(timestamp), "h:mm a")
    : null;

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {timeStr && (
          <p
            className={`mt-1 text-xs ${
              isUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {timeStr}
          </p>
        )}
      </div>
    </div>
  );
}

