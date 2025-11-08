"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PersonalizationStepProps {
  onNext: (data: { name: string; year?: string; biggestChallenge?: string }) => void;
  onBack: () => void;
}

export function PersonalizationStep({ onNext, onBack }: PersonalizationStepProps) {
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onNext({
      name: name.trim(),
      year: year || undefined,
      biggestChallenge: biggestChallenge || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Let's get to know you
        </h2>

        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            What should I call you? *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="year"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            What year are you?
          </label>
          <select
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select year</option>
            <option value="freshman">Freshman</option>
            <option value="sophomore">Sophomore</option>
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="challenge"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            What's your biggest challenge right now?
          </label>
          <textarea
            id="challenge"
            value={biggestChallenge}
            onChange={(e) => setBiggestChallenge(e.target.value)}
            placeholder="E.g., staying organized, managing time, finding effective study methods..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()} className="flex-1">
          Next
        </Button>
      </div>
    </div>
  );
}

