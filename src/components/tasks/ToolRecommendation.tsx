"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { ExternalLink, CheckCircle2, X } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

interface ToolRecommendationProps {
  toolId: string;
  toolName: string;
  description: string;
  reason: string;
  website: string;
  learningCurve: string;
  howToGetStarted: string;
  taskId?: string;
  onResponse?: () => void;
}

export function ToolRecommendation({
  toolId,
  toolName,
  description,
  reason,
  website,
  learningCurve,
  howToGetStarted,
  taskId,
  onResponse,
}: ToolRecommendationProps) {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const recordSuggestion = api.tool.recordSuggestion.useMutation({
    onSuccess: () => {
      toast.success("Response recorded!");
      onResponse?.();
    },
    onError: (error) => {
      toast.error("Failed to record response: " + error.message);
      setIsLoading(false);
    },
  });

  const updateStudentTool = api.tool.updateStudentTool.useMutation({
    onSuccess: () => {
      toast.success("Tool status updated!");
      onResponse?.();
    },
    onError: (error) => {
      toast.error("Failed to update tool: " + error.message);
      setIsLoading(false);
    },
  });

  const handleResponse = async (responseType: "interested" | "not_interested" | "already_using") => {
    setIsLoading(true);
    setResponse(responseType);

    try {
      // Record the suggestion response
      if (taskId) {
        await recordSuggestion.mutateAsync({
          taskId,
          toolId,
          context: reason,
        });
      }

      // Update student-tool relationship if interested or already using
      if (responseType === "interested" || responseType === "already_using") {
        await updateStudentTool.mutateAsync({
          toolId,
          adoptedStatus: responseType === "already_using" ? "using" : "trying",
        });
      }
    } catch {
      // Error handled in mutations
    }
  };

  const learningCurveColors = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    very_low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  };

  const curveColor =
    learningCurveColors[learningCurve.toLowerCase() as keyof typeof learningCurveColors] ||
    learningCurveColors.medium;

  if (response) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <CheckCircle2 size={16} className="text-green-500" />
          <span>
            {response === "interested" && "Great! We'll help you get started."}
            {response === "already_using" && "Nice! We've noted you're using this."}
            {response === "not_interested" && "No problem! We'll keep that in mind."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="mb-3">
        <div className="mb-2 flex items-start justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            💡 Tool Suggestion: {toolName}
          </h4>
          <span
            className={`text-xs px-2 py-1 rounded ${curveColor}`}
          >
            {learningCurve} learning curve
          </span>
        </div>
        <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
          {description}
        </p>
        <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Why this helps:
        </p>
        <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
          {reason}
        </p>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Get started:</span> {howToGetStarted}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(website, "_blank")}
          className="flex items-center gap-1"
        >
          <ExternalLink size={14} />
          Learn More
        </Button>
        <Button
          size="sm"
          onClick={() => handleResponse("interested")}
          disabled={isLoading}
          className="flex-1"
        >
          I'm Interested
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleResponse("already_using")}
          disabled={isLoading}
        >
          Already Using
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleResponse("not_interested")}
          disabled={isLoading}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}

