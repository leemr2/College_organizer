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
  const [diagnosticStep, setDiagnosticStep] = useState<'initial' | 'collecting' | 'suggesting'>('initial');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');

  // Diagnostic analysis mutation
  const analyzeDiagnostic = api.tool.analyzeDiagnostic.useMutation({
    onSuccess: () => {
      setDiagnosticStep('suggesting');
    },
    onError: (error) => {
      toast.error("Failed to analyze diagnostic: " + error.message);
      setDiagnosticStep('initial');
    },
  });

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
    if (diagnosticStep === 'initial') {
      return (
        <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                Let's figure out what didn't work 💡
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                I noticed this task was challenging. Understanding what went wrong will help me suggest better approaches.
              </p>
            </div>
            <button
              onClick={() => {
                setShowProactiveSuggestion(false);
                onComplete?.();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              What specifically didn't work well?
            </label>
            <textarea
              value={whatDidntWork}
              onChange={(e) => setWhatDidntWork(e.target.value)}
              placeholder="e.g., 'I kept getting distracted', 'The material was confusing', 'I ran out of time'"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              What challenges did you face?
            </label>
            <textarea
              value={challengesFaced}
              onChange={(e) => setChallengesFaced(e.target.value)}
              placeholder="e.g., 'Hard to focus', 'Material was dense', 'Not sure if I was studying right'"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowProactiveSuggestion(false);
                onComplete?.();
              }}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button 
              onClick={() => {
                analyzeDiagnostic.mutate({ 
                  taskId, 
                  whatDidntWork, 
                  challengesFaced 
                });
                setDiagnosticStep('collecting');
              }}
              disabled={(!whatDidntWork.trim() && !challengesFaced.trim()) || analyzeDiagnostic.isPending}
              className="flex-1"
            >
              Get suggestions
            </Button>
          </div>
        </div>
      );
    }
    
    if (diagnosticStep === 'collecting') {
      return (
        <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="text-center py-4">
            <p className="text-gray-700 dark:text-gray-300">Analyzing and finding tools to help...</p>
          </div>
        </div>
      );
    }
    
    if (diagnosticStep === 'suggesting' && analyzeDiagnostic.data) {
      return (
        <div className="space-y-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Based on your feedback, here's what might help:
            </h4>
            <button
              onClick={() => {
                setShowProactiveSuggestion(false);
                onComplete?.();
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {analyzeDiagnostic.data.analysis}
          </div>
          
          {analyzeDiagnostic.data.recommendations.map((rec) => (
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
          
          <Button
            variant="outline"
            onClick={() => {
              setShowProactiveSuggestion(false);
              onComplete?.();
            }}
            className="w-full"
          >
            Thanks, I'll consider these
          </Button>
        </div>
      );
    }
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

