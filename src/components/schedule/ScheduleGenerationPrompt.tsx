"use client";

import { api } from "@/lib/trpc/react";
import { Calendar, Loader2, Sparkles } from "lucide-react";
import { toast } from "react-toastify";

interface ScheduleGenerationPromptProps {
  date?: Date;
  onScheduleGenerated?: () => void;
  className?: string;
}

export function ScheduleGenerationPrompt({
  date,
  onScheduleGenerated,
  className = "",
}: ScheduleGenerationPromptProps) {
  const generateSchedule = api.schedule.generateDailySchedule.useMutation({
    onSuccess: (data) => {
      toast.success("Schedule generated successfully!");
      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((warning) => {
          toast.info(warning, { autoClose: 5000 });
        });
      }
      onScheduleGenerated?.();
    },
    onError: (error) => {
      toast.error(`Failed to generate schedule: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    generateSchedule.mutate({
      date: date || new Date(),
      forceRegenerate: false,
    });
  };

  return (
    <div
      className={`
        border border-blue-200 dark:border-blue-800 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/20
        ${className}
      `}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Ready to schedule your day?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            I can create an intelligent schedule for your tasks, considering your class schedule,
            preferences, and priorities. Click below to generate your personalized daily plan.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generateSchedule.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generateSchedule.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating schedule...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Generate Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

