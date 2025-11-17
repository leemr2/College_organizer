"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";
import { ToolsPreferenceEditor } from "./ToolsPreferenceEditor";

// Common timezones with user-friendly labels
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/Mexico_City", label: "Mexico City (CST)" },
];

// Get user's timezone from browser
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York"; // Fallback
  }
}

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
  const [timezone, setTimezone] = useState<string>("");

  useEffect(() => {
    if (student?.preferences) {
      const prefs = student.preferences;
      const peakEnergyTimes = prefs.peakEnergyTimes as string[] | null;
      if (peakEnergyTimes && peakEnergyTimes.length > 0) {
        setPeakEnergy(peakEnergyTimes[0]);
      }
      setStudyPreference(prefs.studyAloneVsGroup || "");
      setMorningPerson(prefs.morningPerson ?? undefined);
      
      // Set timezone from preferences, or auto-detect if not set
      // Type assertion needed because TypeScript types may be cached
      const prefsWithTimezone = prefs as typeof prefs & { timezone?: string | null };
      if (prefsWithTimezone.timezone) {
        setTimezone(prefsWithTimezone.timezone);
      } else {
        // Auto-detect but don't auto-save (user can save manually)
        const detectedTimezone = getUserTimezone();
        setTimezone(detectedTimezone);
      }
    } else if (student && !student.preferences) {
      // Student exists but no preferences yet - auto-detect timezone
      const detectedTimezone = getUserTimezone();
      setTimezone(detectedTimezone);
    }
  }, [student?.preferences, student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const peakEnergyTimes = peakEnergy ? [peakEnergy] : undefined;
    updatePreferences.mutate({
      peakEnergyTimes,
      studyAloneVsGroup: studyPreference || undefined,
      morningPerson: morningPerson !== undefined ? morningPerson : undefined,
      timezone: timezone || undefined,
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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select timezone</option>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {timezone
              ? `Detected: ${getUserTimezone()}. You can change this if needed.`
              : "We'll automatically detect your timezone."}
          </p>
        </div>

        {/* My Tools Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            My Tools
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the tools you currently use. Scout will use this to provide better recommendations.
          </p>
          <ToolsPreferenceEditor />
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

