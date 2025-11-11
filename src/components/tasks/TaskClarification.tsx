"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

interface TaskClarificationProps {
  taskId: string;
  onComplete?: () => void;
}

export function TaskClarification({
  taskId,
  onComplete,
}: TaskClarificationProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = api.task.getClarificationQuestions.useQuery({
    taskId,
  });

  const saveClarification = api.task.saveClarification.useMutation({
    onSuccess: () => {
      toast.success("Clarification saved!");
      onComplete?.();
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await saveClarification.mutateAsync({
        taskId,
        responses,
      });
    } catch {
      // Error handled in mutation
    }
  };

  if (isLoading) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        Loading questions...
      </div>
    );
  }

  const questions = data?.questions || [];

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-medium text-gray-900 dark:text-white">
        A few questions to better understand this task:
      </h3>
      <div className="space-y-4">
        {questions.map((question: string, index: number) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {question}
            </label>
            <textarea
              value={responses[question] || ""}
              onChange={(e) =>
                setResponses({ ...responses, [question]: e.target.value })
              }
              placeholder="Your answer..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        ))}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || Object.keys(responses).length === 0}
        className="w-full"
      >
        {isSubmitting ? "Saving..." : "Save Answers"}
      </Button>
    </div>
  );
}

