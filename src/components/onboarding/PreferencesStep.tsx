"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PreferencesStepProps {
  onNext: (data: {
    peakEnergyTimes?: string[];
    preferredBreakLength?: number;
    morningPerson?: boolean;
    studyAloneVsGroup?: string;
  }) => void;
  onBack: () => void;
}

export function PreferencesStep({ onNext, onBack }: PreferencesStepProps) {
  const [peakEnergy, setPeakEnergy] = useState<string>("");
  const [studyPreference, setStudyPreference] = useState<string>("");
  const [morningPerson, setMorningPerson] = useState<boolean | undefined>(
    undefined
  );

  const handleSubmit = () => {
    const peakEnergyTimes = peakEnergy
      ? [peakEnergy]
      : undefined;
    onNext({
      peakEnergyTimes,
      studyAloneVsGroup: studyPreference || undefined,
      morningPerson: morningPerson !== undefined ? morningPerson : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          A few quick preferences
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            When do you usually feel most productive?
          </label>
          <select
            value={peakEnergy}
            onChange={(e) => setPeakEnergy(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select time</option>
            <option value="6am-9am">Early Morning (6am-9am)</option>
            <option value="9am-12pm">Morning (9am-12pm)</option>
            <option value="12pm-3pm">Afternoon (12pm-3pm)</option>
            <option value="3pm-6pm">Late Afternoon (3pm-6pm)</option>
            <option value="6pm-9pm">Evening (6pm-9pm)</option>
            <option value="9pm-12am">Night (9pm-12am)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            How do you prefer to study?
          </label>
          <select
            value={studyPreference}
            onChange={(e) => setStudyPreference(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select preference</option>
            <option value="alone">Alone</option>
            <option value="groups">In groups</option>
            <option value="mix">Mix of both</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Are you a morning person?
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setMorningPerson(true)}
              className={`flex-1 rounded-lg border px-4 py-2 ${
                morningPerson === true
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setMorningPerson(false)}
              className={`flex-1 rounded-lg border px-4 py-2 ${
                morningPerson === false
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
              }`}
            >
              No
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}

