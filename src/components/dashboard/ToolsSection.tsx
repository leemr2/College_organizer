"use client";

import { api } from "@/lib/trpc/react";
import { ExternalLink, CheckCircle2, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ToolsSection() {
  const { data: myTools, isLoading } = api.tool.getMyTools.useQuery();

  const { data: recentSuggestions } = api.tool.getSuggestedTools.useQuery({
    limit: 3,
  });

  const suggestions = recentSuggestions || [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">Loading your tools...</p>
      </div>
    );
  }

  if (!myTools || myTools.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          My Tools
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          You haven't selected any tools yet. Let Scout know what tools you use to get better recommendations.
        </p>
        <Link href="/profile">
          <Button>Select Tools in Preferences</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tools You're Using */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="text-green-500" size={20} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            My Tools
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {myTools.map((st) => (
            <div
              key={st.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {st.tool.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {st.tool.description}
                  </p>
                  {st.effectivenessRating && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Rating: {st.effectivenessRating}/5 ⭐
                    </div>
                  )}
                </div>
                <a
                  href={st.tool.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
        {myTools.length > 4 && (
          <Link
            href="/profile"
            className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View all {myTools.length} tools →
          </Link>
        )}
      </div>

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

