"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, X } from "lucide-react";
import { toast } from "react-toastify";
import { ToolRecommendation } from "./ToolRecommendation";

interface TaskCompletionProps {
  taskId: string;
  onComplete?: () => void;
}

export function TaskCompletion({ taskId, onComplete }: TaskCompletionProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [effectiveness, setEffectiveness] = useState<number>(3);
  const [timeSpent, setTimeSpent] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [showProactiveSuggestion, setShowProactiveSuggestion] = useState(false);

  // Fetch tool recommendations for proactive suggestion
  const { data: toolRecommendations } = api.tool.recommend.useQuery(
    { taskId },
    { enabled: showProactiveSuggestion }
  );

  const completeTask = api.task.complete.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Task completed!");
      
      // Show proactive suggestion if effectiveness is poor (<3)
      if (variables.effectiveness !== undefined && variables.effectiveness < 3) {
        setShowProactiveSuggestion(true);
      } else {
        onComplete?.();
        setShowRating(false);
      }
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
      // Parse time spent (accepts formats like "30", "1.5", "2 hours", etc.)
      let timeSpentMinutes: number | undefined;
      if (timeSpent.trim()) {
        const timeValue = parseFloat(timeSpent.trim());
        if (!isNaN(timeValue)) {
          // If it's a small number (< 10), assume hours, otherwise minutes
          timeSpentMinutes = timeValue < 10 ? Math.round(timeValue * 60) : Math.round(timeValue);
        }
      }

      await completeTask.mutateAsync({
        taskId,
        effectiveness: effectiveness,
        timeSpent: timeSpentMinutes,
        notes: notes || undefined,
      });
    } catch {
      // Error handled in mutation
    }
  };

  if (showRating) {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <h4 className="font-medium text-gray-900 dark:text-white">
          How did it go?
        </h4>
        
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Effectiveness (1-5 stars)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setEffectiveness(rating)}
                className={`flex-1 rounded-lg border px-4 py-2 text-center transition-colors ${
                  effectiveness === rating
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {rating} ⭐
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Time spent (minutes, optional)
          </label>
          <input
            type="number"
            value={timeSpent}
            onChange={(e) => setTimeSpent(e.target.value)}
            placeholder="e.g., 30 or 1.5 (hours)"
            min="0"
            step="0.5"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What worked well? What didn't?"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

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

  // Show proactive tool suggestions if effectiveness was poor
  if (showProactiveSuggestion) {
    return (
      <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
              💡 Want to improve next time?
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Since this task was challenging, here are some tools that might help you work more effectively:
            </p>
          </div>
          <button
            onClick={() => {
              setShowProactiveSuggestion(false);
              onComplete?.();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close suggestions"
          >
            <X size={18} />
          </button>
        </div>

        {toolRecommendations && toolRecommendations.length > 0 ? (
          <div className="space-y-3">
            {toolRecommendations.slice(0, 2).map((rec) => (
              <ToolRecommendation
                key={rec.toolId}
                toolId={rec.toolId}
                toolName={rec.tool.name}
                description={rec.tool.description}
                reason={rec.reason}
                website={rec.tool.website}
                learningCurve={rec.learningCurve}
                howToGetStarted={rec.howToGetStarted}
                taskId={taskId}
                onResponse={() => {
                  setShowProactiveSuggestion(false);
                  onComplete?.();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Loading recommendations...
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => {
            setShowProactiveSuggestion(false);
            onComplete?.();
          }}
          className="w-full"
        >
          Thanks, I'm good
        </Button>
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

