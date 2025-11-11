"use client";

import { format } from "date-fns";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";
import { useState } from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | Date;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";
  const [isHovered, setIsHovered] = useState(false);
  const timeStr = timestamp
    ? format(new Date(timestamp), "h:mm a")
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isUser && isHovered && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Copy message"
            title="Copy message"
          >
            <Copy size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        )}
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

