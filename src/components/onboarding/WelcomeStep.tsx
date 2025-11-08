"use client";

import { Button } from "@/components/ui/button";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Hi! I'm Scout, your personal AI assistant for college.
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          I'll help you plan your days, discover better tools, and optimize how
          you study.
        </p>
      </div>
      <Button onClick={onNext} className="w-full sm:w-auto">
        Continue
      </Button>
    </div>
  );
}

