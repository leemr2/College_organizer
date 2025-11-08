"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import SpeechToTextArea from "@/components/SpeechToTextArea";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  disabled?: boolean;
}

export function VoiceInput({
  onTranscript,
  onStart,
  onStop,
  disabled,
}: VoiceInputProps) {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (message: string) => {
    if (!message.trim()) return;
    setIsLoading(true);
    try {
      await onTranscript(message);
      setValue("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <SpeechToTextArea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading || (disabled ?? false)}
        placeholder="Type your message or use the microphone..."
        shouldSubmitOnEnter={true}
      />
    </div>
  );
}

