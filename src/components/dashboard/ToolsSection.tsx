"use client";

import { api } from "@/lib/trpc/react";
import { ExternalLink, CheckCircle2, Lightbulb } from "lucide-react";
import Link from "next/link";

export function ToolsSection() {
  const { data: studentTools } = api.tool.getStudentTools.useQuery({
    status: "using",
  });

  const { data: recentSuggestions } = api.tool.getSuggestedTools.useQuery({
    limit: 3,
  });

  const toolsUsing = studentTools || [];
  const suggestions = recentSuggestions || [];

  if (toolsUsing.length === 0 && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Tools You're Using */}
      {toolsUsing.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tools You're Using
            </h3>
          </div>
          <div className="space-y-3">
            {toolsUsing.slice(0, 3).map((studentTool) => (
              <div
                key={studentTool.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {studentTool.tool.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {studentTool.tool.description.slice(0, 80)}...
                  </p>
                </div>
                <a
                  href={studentTool.tool.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            ))}
          </div>
          {toolsUsing.length > 3 && (
            <Link
              href="/profile"
              className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all {toolsUsing.length} tools →
            </Link>
          )}
        </div>
      )}

      {/* Recommended Tools */}
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-6 shadow-sm dark:border-purple-800 dark:bg-purple-900/20">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="text-purple-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recommended for You
            </h3>
          </div>
          <div className="space-y-3">
            {suggestions.slice(0, 3).map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border border-purple-200 bg-white p-3 dark:border-purple-800 dark:bg-gray-800"
              >
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {suggestion.tool.name}
                </h4>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  {suggestion.context}
                </p>
                <a
                  href={suggestion.tool.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Learn more →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

