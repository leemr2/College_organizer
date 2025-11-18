"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { ScheduleBlockData } from "@/lib/types";
import { X, Clock, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

interface RescheduleDialogProps {
  block: ScheduleBlockData;
  onClose: () => void;
  onComplete: () => void;
}

export function RescheduleDialog({ block, onClose, onComplete }: RescheduleDialogProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const requestReschedule = api.schedule.requestReschedule.useMutation({
    onError: (error) => {
      toast.error(`Failed to get reschedule options: ${error.message}`);
    },
  });

  const rescheduleOptions = requestReschedule.data;
  const isLoading = requestReschedule.isPending;

  // Request reschedule options when dialog opens
  useEffect(() => {
    requestReschedule.mutate({ blockId: block.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const applyReschedule = api.schedule.applyReschedule.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated!");
      onComplete();
    },
    onError: (error) => {
      toast.error(`Failed to reschedule: ${error.message}`);
    },
  });

  const handleApply = () => {
    if (selectedOption === null || !rescheduleOptions) return;

    const option = rescheduleOptions.suggestedTimes[selectedOption];
    applyReschedule.mutate({
      blockId: block.id,
      newStartTime: option.startTime,
      newEndTime: option.endTime,
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Reschedule: {block.title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Schedule:</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                {formatDate(block.startTime)} {formatTime(block.startTime)} - {formatTime(block.endTime)}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : rescheduleOptions && rescheduleOptions.suggestedTimes.length > 0 ? (
            <>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Suggested Times:
              </h4>
              <div className="space-y-3">
                {rescheduleOptions.suggestedTimes.map((option, index) => (
                  <label
                    key={index}
                    className={`
                      block p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${
                        selectedOption === index
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="reschedule-option"
                      value={index}
                      checked={selectedOption === index}
                      onChange={() => setSelectedOption(index)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatDate(option.startTime)} {formatTime(option.startTime)} - {formatTime(option.endTime)}
                          </span>
                        </div>
                        {option.reasoning && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {option.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={selectedOption === null || applyReschedule.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {applyReschedule.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No alternative times available. Try dragging the block to a new time slot.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

