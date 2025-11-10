"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { TimeBlockType, MeetingTime } from "@/lib/types/calendar";

interface TimeBlockEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    type: TimeBlockType;
    meetingTimes: MeetingTime[];
    courseCode?: string;
    professor?: string;
    semester?: string;
  }) => void;
  initialData?: {
    title: string;
    type: TimeBlockType;
    meetingTimes: MeetingTime[];
    courseCode?: string;
    professor?: string;
    semester?: string;
  };
  mode?: "class" | "general";
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BLOCK_TYPES: TimeBlockType[] = ["class", "work", "lab", "commitment", "task", "break"];

export function TimeBlockEditor({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = "general",
}: TimeBlockEditorProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TimeBlockType>("class");
  const [courseCode, setCourseCode] = useState("");
  const [professor, setProfessor] = useState("");
  const [semester, setSemester] = useState("");
  const [semesterYear, setSemesterYear] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setType(initialData.type);
      setCourseCode(initialData.courseCode || "");
      setProfessor(initialData.professor || "");
      // Parse semester (e.g., "Fall 2024" -> "Fall" and "2024")
      const semesterMatch = initialData.semester?.match(/^(\w+)\s*(\d{4})?$/);
      if (semesterMatch) {
        setSemester(semesterMatch[1] || "");
        setSemesterYear(semesterMatch[2] || "");
      } else {
        setSemester(initialData.semester || "");
        setSemesterYear("");
      }
      if (initialData.meetingTimes.length > 0) {
        const firstMeeting = initialData.meetingTimes[0];
        setStartTime(firstMeeting.startTime);
        setEndTime(firstMeeting.endTime);
        setSelectedDays(initialData.meetingTimes.map((mt) => mt.day));
      }
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setTitle("");
    setType("class");
    setCourseCode("");
    setProfessor("");
    setSemester("");
    setSemesterYear(new Date().getFullYear().toString());
    setSelectedDays([]);
    setStartTime("");
    setEndTime("");
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!title || selectedDays.length === 0 || !startTime || !endTime) {
      return;
    }

    const meetingTimes: MeetingTime[] = selectedDays.map((day) => ({
      day,
      startTime,
      endTime,
    }));

    const fullSemester = semester && semesterYear 
      ? `${semester} ${semesterYear}`.trim()
      : semester || undefined;

    onSave({
      title,
      type,
      meetingTimes,
      courseCode: courseCode || undefined,
      professor: professor || undefined,
      semester: fullSemester,
    });

    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initialData ? "Edit" : "Add"} {mode === "class" ? "Class" : "Time Block"}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {mode === "class" ? "Course Name" : "Title"} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "class" ? "e.g., Biology 101" : "e.g., Work Shift"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TimeBlockType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {BLOCK_TYPES.map((blockType) => (
                <option key={blockType} value={blockType}>
                  {blockType.charAt(0).toUpperCase() + blockType.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Course Code (for classes) */}
          {mode === "class" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g., BIO 101"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          {/* Professor (for classes) */}
          {mode === "class" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Professor
              </label>
              <input
                type="text"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="Professor name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          {/* Semester (for classes) */}
          {mode === "class" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Term
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select term</option>
                  <option value="Fall">Fall</option>
                  <option value="Winter">Winter</option>
                  <option value="Spring">Spring</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Year
                </label>
                <input
                  type="number"
                  value={semesterYear}
                  onChange={(e) => setSemesterYear(e.target.value)}
                  placeholder="2024"
                  min="2020"
                  max="2100"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Days Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Days * (Select all days this occurs)
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`
                      rounded-lg border px-3 py-2 text-sm font-medium transition-colors
                      ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      }
                    `}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 flex gap-4 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title || selectedDays.length === 0 || !startTime || !endTime}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

