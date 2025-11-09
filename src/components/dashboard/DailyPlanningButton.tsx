"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

export function DailyPlanningButton() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/chat");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-brandBlue-500 to-brandBlue-600 hover:from-brandBlue-600 hover:to-brandBlue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg"
    >
      <MessageSquare size={24} />
      <span>What do you want to accomplish today?</span>
    </button>
  );
}

