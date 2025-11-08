"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";

interface TaskCompletionProps {
  taskId: string;
  onComplete?: () => void;
}

export function TaskCompletion({ taskId, onComplete }: TaskCompletionProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [effectiveness, setEffectiveness] = useState<number>(3);
  const [notes, setNotes] = useState("");

  const completeTask = api.task.complete.useMutation({
    onSuccess: () => {
      toast.success("Task completed!");
      onComplete?.();
      setShowRating(false);
    },
    onError: (error) => {
      toast.error("Failed to complete task: " + error.message);
      setIsCompleting(false);
    },
  });

  const handleComplete = async () => {
    if (!showRating) {
      setShowRating(true);
      return;
    }

    setIsCompleting(true);
    try {
      await completeTask.mutateAsync({
        taskId,
        effectiveness: effectiveness,
        notes: notes || undefined,
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  if (showRating) {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <h4 className="font-medium text-gray-900 dark:text-white">
          How effective was this task?
        </h4>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => setEffectiveness(rating)}
              className={`flex-1 rounded-lg border px-4 py-2 text-center ${
                effectiveness === rating
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowRating(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="flex-1"
          >
            {isCompleting ? "Completing..." : "Complete"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleComplete}
      variant="outline"
      size="sm"
      className="w-full"
    >
      <CheckCircle2 size={16} className="mr-2" />
      Mark Complete
    </Button>
  );
}

