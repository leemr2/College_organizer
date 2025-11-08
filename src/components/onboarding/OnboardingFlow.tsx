"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeStep } from "./WelcomeStep";
import { PersonalizationStep } from "./PersonalizationStep";
import { ClassScheduleStep } from "./ClassScheduleStep";
import { PreferencesStep } from "./PreferencesStep";
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";

type OnboardingData = {
  name?: string;
  year?: string;
  biggestChallenge?: string;
  classSchedules?: any[];
  preferences?: any;
};

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});

  const createStudent = api.student.create.useMutation({
    onSuccess: () => {
      if (data.preferences) {
        updatePreferences.mutate(data.preferences);
      } else {
        completeOnboarding.mutate();
      }
    },
    onError: (error) => {
      toast.error("Failed to create profile: " + error.message);
    },
  });

  const updatePreferences = api.student.updatePreferences.useMutation({
    onSuccess: () => {
      completeOnboarding.mutate();
    },
    onError: (error) => {
      toast.error("Failed to save preferences: " + error.message);
    },
  });

  const completeOnboarding = api.student.completeOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Welcome to Scout!");
      router.push("/chat");
    },
    onError: (error) => {
      toast.error("Failed to complete onboarding: " + error.message);
    },
  });

  const handleNext = (stepData: Partial<OnboardingData>) => {
    const newData = { ...data, ...stepData };
    setData(newData);

    if (step === steps.length - 1) {
      // Final step - submit all data
      if (!newData.name) {
        toast.error("Name is required");
        return;
      }
      createStudent.mutate({
        name: newData.name,
        year: newData.year,
        biggestChallenge: newData.biggestChallenge,
      });
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    handleNext({});
  };

  const steps = [
    <WelcomeStep key="welcome" onNext={() => setStep(1)} />,
    <PersonalizationStep
      key="personalization"
      onNext={handleNext}
      onBack={handleBack}
    />,
    <ClassScheduleStep
      key="schedule"
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
    />,
    <PreferencesStep
      key="preferences"
      onNext={(prefData) => handleNext({ preferences: prefData })}
      onBack={handleBack}
    />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full flex-1 ${
                  i <= step
                    ? "bg-blue-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Step {step + 1} of {steps.length}
          </p>
        </div>

        {/* Current Step */}
        {steps[step]}
      </div>
    </div>
  );
}

