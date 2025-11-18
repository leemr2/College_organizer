"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc/react";
import { ScheduleBlockData } from "@/lib/types";
import { ScheduleBlock } from "./ScheduleBlock";
import { RescheduleDialog } from "./RescheduleDialog";
import { toast } from "react-toastify";
import { Calendar, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ScheduleViewProps {
  date: Date;
  onDateChange?: (date: Date) => void;
  className?: string;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am to 10pm (6-22)

// Draggable schedule block wrapper
function DraggableScheduleBlock({
  block,
  onClick,
  onReschedule,
}: {
  block: ScheduleBlockData;
  onClick: () => void;
  onReschedule: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ScheduleBlock block={block} onClick={onClick} onReschedule={onReschedule} />
    </div>
  );
}

export function ScheduleView({ date, onDateChange, className = "" }: ScheduleViewProps) {
  const [reschedulingBlock, setReschedulingBlock] = useState<ScheduleBlockData | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get schedule for the selected date
  const startDate = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  const endDate = useMemo(() => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [date]);

  const { data: scheduleBlocks, isLoading, refetch } = api.schedule.getSchedule.useQuery({
    startDate,
    endDate,
  });

  const generateSchedule = api.schedule.generateDailySchedule.useMutation({
    onSuccess: () => {
      toast.success("Schedule generated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to generate schedule: ${error.message}`);
    },
  });

  const updateBlock = api.schedule.updateBlock.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  // Group blocks by hour for display
  const blocksByHour = useMemo(() => {
    if (!scheduleBlocks) return {};

    const grouped: Record<number, ScheduleBlockData[]> = {};
    HOURS.forEach((hour) => {
      grouped[hour] = [];
    });

    scheduleBlocks.forEach((block) => {
      const blockHour = block.startTime.getHours();
      // Find which hour slot this block belongs to
      for (let hour of HOURS) {
        if (blockHour >= hour && blockHour < hour + 1) {
          grouped[hour].push(block);
          break;
        }
      }
    });

    // Sort blocks within each hour by start time
    Object.keys(grouped).forEach((hour) => {
      grouped[Number(hour)].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    });

    return grouped;
  }, [scheduleBlocks]);

  const handleGenerateSchedule = () => {
    generateSchedule.mutate({ date, forceRegenerate: false });
  };

  const handleBlockClick = (block: ScheduleBlockData) => {
    // Toggle completion
    updateBlock.mutate({
      blockId: block.id,
      completed: !block.completed,
    });
  };

  const handleBlockReschedule = (block: ScheduleBlockData) => {
    setReschedulingBlock(block);
  };

  const handleRescheduleComplete = () => {
    setReschedulingBlock(null);
    refetch();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getBlockPosition = (block: ScheduleBlockData): { top: number; height: number } => {
    const startMinutes = block.startTime.getHours() * 60 + block.startTime.getMinutes();
    const endMinutes = block.endTime.getHours() * 60 + block.endTime.getMinutes();
    const duration = endMinutes - startMinutes;

    // Position relative to 6am (360 minutes)
    const top = ((startMinutes - 360) / 60) * 60; // 60px per hour
    const height = (duration / 60) * 60;

    return { top, height };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !scheduleBlocks) return;

    const draggedBlock = scheduleBlocks.find(b => b.id === active.id);
    if (!draggedBlock) return;

    // Calculate new time based on drop position
    // For simplicity, we'll use the reschedule dialog for now
    // Full drag-to-time-slot implementation would require more complex logic
    setReschedulingBlock(draggedBlock);
  };

  if (isLoading) {
    return (
      <div className={`border border-gray-200 dark:border-gray-700 rounded-lg p-8 bg-gray-50 dark:bg-gray-800/50 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading schedule...</span>
        </div>
      </div>
    );
  }

  const hasSchedule = scheduleBlocks && scheduleBlocks.length > 0;
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isToday ? "Today's Schedule" : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {hasSchedule ? `${scheduleBlocks.length} scheduled items` : "No schedule yet"}
          </p>
        </div>
        {isToday && (
          <button
            onClick={handleGenerateSchedule}
            disabled={generateSchedule.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generateSchedule.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Generate Schedule
              </>
            )}
          </button>
        )}
      </div>

      {!hasSchedule && isToday && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No schedule for today yet. Generate one to get started!
          </p>
          <button
            onClick={handleGenerateSchedule}
            disabled={generateSchedule.isPending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            Generate Schedule
          </button>
        </div>
      )}

      {hasSchedule && (
        <div className="relative">
          {/* Time labels */}
          <div className="absolute left-0 top-0 bottom-0 w-16">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute text-xs text-gray-500 dark:text-gray-400"
                style={{ top: `${(hour - 6) * 60}px` }}
              >
                {hour === 12 ? "12pm" : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
              </div>
            ))}
          </div>

          {/* Schedule blocks */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={scheduleBlocks.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="ml-20 relative" style={{ minHeight: "960px" }}>
                {scheduleBlocks.map((block) => {
                  const position = getBlockPosition(block);
                  return (
                    <div
                      key={block.id}
                      className="absolute w-full pr-4"
                      style={{
                        top: `${position.top}px`,
                        height: `${Math.max(position.height, 40)}px`,
                      }}
                    >
                      <DraggableScheduleBlock
                        block={block}
                        onClick={() => handleBlockClick(block)}
                        onReschedule={() => handleBlockReschedule(block)}
                      />
                    </div>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {reschedulingBlock && (
        <RescheduleDialog
          block={reschedulingBlock}
          onClose={() => setReschedulingBlock(null)}
          onComplete={handleRescheduleComplete}
        />
      )}
    </div>
  );
}

