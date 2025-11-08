"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface ClassScheduleStepProps {
  onNext: (data: { classSchedules: any[] }) => void;
  onBack: () => void;
  onSkip: () => void;
}

interface Class {
  courseName: string;
  courseCode: string;
  professor: string;
  day: string;
  startTime: string;
  endTime: string;
}

export function ClassScheduleStep({
  onNext,
  onBack,
  onSkip,
}: ClassScheduleStepProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [currentClass, setCurrentClass] = useState<Partial<Class>>({
    courseName: "",
    courseCode: "",
    professor: "",
    day: "",
    startTime: "",
    endTime: "",
  });

  const addClass = () => {
    if (!currentClass.courseName || !currentClass.day || !currentClass.startTime || !currentClass.endTime) {
      return;
    }
    setClasses([...classes, currentClass as Class]);
    setCurrentClass({
      courseName: "",
      courseCode: "",
      professor: "",
      day: "",
      startTime: "",
      endTime: "",
    });
  };

  const removeClass = (index: number) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const classSchedules = classes.map((cls) => ({
      courseName: cls.courseName,
      courseCode: cls.courseCode || undefined,
      professor: cls.professor || undefined,
      meetingTimes: [
        {
          day: cls.day,
          startTime: cls.startTime,
          endTime: cls.endTime,
        },
      ],
      semester: new Date().getFullYear().toString(),
    }));
    onNext({ classSchedules });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add your class schedule
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Let's add your class schedule so I can help plan around it. You can
          add more later.
        </p>

        {/* Existing classes */}
        {classes.length > 0 && (
          <div className="space-y-2">
            {classes.map((cls, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cls.courseName}
                    {cls.courseCode && ` (${cls.courseCode})`}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {cls.day} {cls.startTime} - {cls.endTime}
                  </p>
                </div>
                <button
                  onClick={() => removeClass(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new class form */}
        <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Course Name *
              </label>
              <input
                type="text"
                value={currentClass.courseName}
                onChange={(e) =>
                  setCurrentClass({ ...currentClass, courseName: e.target.value })
                }
                placeholder="e.g., Biology 101"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Course Code
              </label>
              <input
                type="text"
                value={currentClass.courseCode}
                onChange={(e) =>
                  setCurrentClass({ ...currentClass, courseCode: e.target.value })
                }
                placeholder="e.g., BIO 101"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Professor
              </label>
              <input
                type="text"
                value={currentClass.professor}
                onChange={(e) =>
                  setCurrentClass({ ...currentClass, professor: e.target.value })
                }
                placeholder="Professor name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Day *
              </label>
              <select
                value={currentClass.day}
                onChange={(e) =>
                  setCurrentClass({ ...currentClass, day: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Time *
              </label>
              <input
                type="time"
                value={currentClass.startTime}
                onChange={(e) =>
                  setCurrentClass({ ...currentClass, startTime: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Time *
              </label>
              <input
                type="time"
                value={currentClass.endTime}
                onChange={(e) =>
                  setCurrentClass({ ...currentClass, endTime: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={addClass}
            variant="outline"
            className="w-full"
            disabled={
              !currentClass.courseName ||
              !currentClass.day ||
              !currentClass.startTime ||
              !currentClass.endTime
            }
          >
            <Plus size={16} className="mr-2" />
            Add Class
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip for now
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}

