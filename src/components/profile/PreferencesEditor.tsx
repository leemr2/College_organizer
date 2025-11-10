"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";

export function PreferencesEditor() {
  const { data: student, isLoading } = api.student.me.useQuery();
  const updatePreferences = api.student.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Preferences updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update preferences: " + error.message);
    },
  });

  const [peakEnergy, setPeakEnergy] = useState<string>("");
  const [studyPreference, setStudyPreference] = useState<string>("");
  const [morningPerson, setMorningPerson] = useState<boolean | undefined>(
    undefined
  );

  useEffect(() => {
    if (student?.preferences) {
      const prefs = student.preferences;
      const peakEnergyTimes = prefs.peakEnergyTimes as string[] | null;
      if (peakEnergyTimes && peakEnergyTimes.length > 0) {
        setPeakEnergy(peakEnergyTimes[0]);
      }
      setStudyPreference(prefs.studyAloneVsGroup || "");
      setMorningPerson(prefs.morningPerson ?? undefined);
    }
  }, [student?.preferences]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const peakEnergyTimes = peakEnergy ? [peakEnergy] : undefined;
    updatePreferences.mutate({
      peakEnergyTimes,
      studyAloneVsGroup: studyPreference || undefined,
      morningPerson: morningPerson !== undefined ? morningPerson : undefined,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Preferences
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
              className={`flex-1 rounded-lg border px-4 py-2 transition-colors ${
                morningPerson === true
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setMorningPerson(false)}
              className={`flex-1 rounded-lg border px-4 py-2 transition-colors ${
                morningPerson === false
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              No
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={updatePreferences.isPending}>
          {updatePreferences.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

