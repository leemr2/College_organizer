"use client";

import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";

export function TasksButton() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/tasks");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 text-lg"
    >
      <CheckSquare size={24} />
      <span>View Tasks</span>
    </button>
  );
}

