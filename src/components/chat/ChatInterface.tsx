"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { MessageList } from "./MessageList";
import { VoiceInput } from "./VoiceInput";
import { toast } from "react-toastify";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string | Date;
}

export function ChatInterface() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get or create current conversation
  const { data: conversation } = api.chat.getCurrent.useQuery();

  useEffect(() => {
    if (conversation) {
      setConversationId(conversation.id);
      // Load existing messages
      if (conversation.messages && Array.isArray(conversation.messages)) {
        const loadedMessages = (conversation.messages as any[]).map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(loadedMessages);
      }
    }
  }, [conversation]);

  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
      setIsLoading(false);
    },
  });

  const extractTasks = api.task.extractFromText.useMutation({
    onSuccess: (tasks) => {
      if (tasks.length > 0) {
        toast.success(`Extracted ${tasks.length} task${tasks.length > 1 ? "s" : ""} from your message!`);
      }
    },
    onError: (error) => {
      // Silently fail task extraction - don't interrupt chat flow
      console.error("Task extraction failed:", error);
    },
  });

  const handleTranscript = async (text: string) => {
    if (!text.trim()) return;

    // Add user message to UI immediately
    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Try to extract tasks from the message (non-blocking)
      extractTasks.mutate({ text });

      // Send to backend for chat response
      await sendMessage.mutateAsync({
        message: text,
        conversationId,
      });
    } catch (error) {
      // Error handling is done in mutation onError
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Scout
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your AI study assistant
        </p>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <VoiceInput
          onTranscript={handleTranscript}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

