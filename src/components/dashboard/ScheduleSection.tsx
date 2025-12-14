"use client";

import { ScheduleView } from "@/components/schedule/ScheduleView";
import { useState } from "react";

export function ScheduleSection() {
  const [selectedDate] = useState(new Date());

  return (
    <div className="mt-8">
      <ScheduleView date={selectedDate} />
    </div>
  );
}

