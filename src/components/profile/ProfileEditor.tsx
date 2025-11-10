"use client";

import { useState } from "react";
import { PersonalInfoEditor } from "./PersonalInfoEditor";
import { ClassScheduleEditor } from "./ClassScheduleEditor";
import { PreferencesEditor } from "./PreferencesEditor";
import { User, Calendar, Settings } from "lucide-react";

type Tab = "personal" | "schedule" | "preferences";

export function ProfileEditor() {
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  const tabs = [
    { id: "personal" as Tab, label: "Personal Info", icon: User },
    { id: "schedule" as Tab, label: "Class Schedule", icon: Calendar },
    { id: "preferences" as Tab, label: "Preferences", icon: Settings },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }
                `}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "personal" && <PersonalInfoEditor />}
        {activeTab === "schedule" && <ClassScheduleEditor />}
        {activeTab === "preferences" && <PreferencesEditor />}
      </div>
    </div>
  );
}

