"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { TimeBlockEditor } from "@/components/calendar/TimeBlockEditor";
import { TimeBlock, TimeBlockType } from "@/lib/types/calendar";

export function ClassScheduleEditor() {
  const { data: student, isLoading, refetch } = api.student.me.useQuery();
  const createClassSchedule = api.student.createClassSchedule.useMutation({
    onSuccess: () => {
      toast.success("Class schedule added successfully!");
      refetch();
      setIsEditorOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add class schedule: " + error.message);
    },
  });

  const updateClassSchedule = api.student.updateClassSchedule.useMutation({
    onSuccess: () => {
      toast.success("Class schedule updated successfully!");
      refetch();
      setIsEditorOpen(false);
      setEditingSchedule(null);
    },
    onError: (error) => {
      toast.error("Failed to update class schedule: " + error.message);
    },
  });

  const deleteClassSchedule = api.student.deleteClassSchedule.useMutation({
    onSuccess: () => {
      toast.success("Class schedule deleted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to delete class schedule: " + error.message);
    },
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<{
    id: string;
    title: string;
    type: TimeBlockType;
    meetingTimes: { day: string; startTime: string; endTime: string }[];
    courseCode?: string;
    professor?: string;
    semester?: string;
  } | null>(null);

  // Convert ClassSchedule to TimeBlock format for calendar
  const timeBlocks: TimeBlock[] = useMemo(() => {
    if (!student?.classSchedules) return [];
    return student.classSchedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.courseName,
      type: "class" as TimeBlockType,
      meetingTimes: (schedule.meetingTimes as any[]) || [],
      courseCode: schedule.courseCode || undefined,
      professor: schedule.professor || undefined,
      semester: schedule.semester,
    }));
  }, [student?.classSchedules]);

  const handleAdd = () => {
    setEditingSchedule(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (block: TimeBlock) => {
    const schedule = student?.classSchedules?.find((cs) => cs.id === block.id);
    if (schedule) {
      setEditingSchedule({
        id: schedule.id,
        title: schedule.courseName,
        type: "class",
        meetingTimes: (schedule.meetingTimes as any[]) || [],
        courseCode: schedule.courseCode || undefined,
        professor: schedule.professor || undefined,
        semester: schedule.semester,
      });
      setIsEditorOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this class schedule?")) {
      deleteClassSchedule.mutate({ id });
    }
  };

  const handleSave = (data: {
    title: string;
    type: TimeBlockType;
    meetingTimes: { day: string; startTime: string; endTime: string }[];
    courseCode?: string;
    professor?: string;
    semester?: string;
  }) => {
    if (editingSchedule) {
      // Update existing
      updateClassSchedule.mutate({
        id: editingSchedule.id,
        courseName: data.title,
        courseCode: data.courseCode,
        professor: data.professor,
        meetingTimes: data.meetingTimes,
        semester: data.semester,
      });
    } else {
      // Create new
      createClassSchedule.mutate({
        courseName: data.title,
        courseCode: data.courseCode,
        professor: data.professor,
        meetingTimes: data.meetingTimes,
        semester: data.semester || new Date().getFullYear().toString(),
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Class Schedule
        </h2>
        <Button onClick={handleAdd}>
          <Plus size={18} className="mr-2" />
          Add Class
        </Button>
      </div>

      {/* Week Calendar View */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <WeekCalendar
          timeBlocks={timeBlocks}
          onBlockClick={handleEdit}
          onBlockEdit={handleEdit}
        />
      </div>

      {/* List View */}
      {student?.classSchedules && student.classSchedules.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Classes
          </h3>
          <div className="space-y-2">
            {student.classSchedules.map((schedule) => {
              const meetingTimes = (schedule.meetingTimes as any[]) || [];
              return (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {schedule.courseName}
                      {schedule.courseCode && (
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          ({schedule.courseCode})
                        </span>
                      )}
                    </div>
                    {schedule.professor && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {schedule.professor}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {meetingTimes.map((mt, idx) => (
                        <span key={idx}>
                          {mt.day} {mt.startTime}-{mt.endTime}
                          {idx < meetingTimes.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                    {schedule.semester && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {schedule.semester}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const block = timeBlocks.find((b) => b.id === schedule.id);
                        if (block) handleEdit(block);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(!student?.classSchedules || student.classSchedules.length === 0) && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No class schedules yet. Click "Add Class" to get started.
        </div>
      )}

      {/* Editor Modal */}
      <TimeBlockEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingSchedule(null);
        }}
        onSave={handleSave}
        initialData={editingSchedule || undefined}
        mode="class"
      />
    </div>
  );
}

