"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";

export function PersonalInfoEditor() {
  const { data: student, isLoading } = api.student.me.useQuery();
  const updateProfile = api.student.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");

  useEffect(() => {
    if (student) {
      setName(student.name || "");
      setYear(student.year || "");
      setBiggestChallenge(student.biggestChallenge || "");
    }
  }, [student]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      name: name.trim() || undefined,
      year: year || undefined,
      biggestChallenge: biggestChallenge.trim() || undefined,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Personal Information
        </h2>

        <div className="space-y-2">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Name *
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
            Year
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
            Biggest Challenge
          </label>
          <textarea
            id="challenge"
            value={biggestChallenge}
            onChange={(e) => setBiggestChallenge(e.target.value)}
            placeholder="E.g., staying organized, managing time, finding effective study methods..."
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!name.trim() || updateProfile.isPending}
        >
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

