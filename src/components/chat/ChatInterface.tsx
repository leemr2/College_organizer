"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { MessageList } from "./MessageList";
import { VoiceInput } from "./VoiceInput";
import { toast } from "react-toastify";
import { Message } from "@/lib/types";

interface ChatInterfaceProps {
  conversationType?: "daily_planning" | "task_specific";
  taskId?: string;
}

export function ChatInterface({ conversationType = "daily_planning", taskId }: ChatInterfaceProps = {} as ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get or create conversation based on type
  const { data: dailyConversation } = api.chat.getDailyConversation.useQuery(
    undefined,
    { enabled: conversationType === "daily_planning" }
  );

  const { data: taskConversation } = api.chat.getTaskConversation.useQuery(
    { taskId: taskId! },
    { enabled: conversationType === "task_specific" && !!taskId }
  );

  const conversation = conversationType === "daily_planning" ? dailyConversation : taskConversation;

  useEffect(() => {
    if (conversation) {
      setConversationId(conversation.id);
      // Load existing messages
      if (conversation.messages && Array.isArray(conversation.messages)) {
        const loadedMessages = (conversation.messages as unknown as Message[]).map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));
        setMessages(loadedMessages);
      }
    }
  }, [conversation]);

  const sendDailyMessage = api.chat.sendDailyMessage.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
      setIsLoading(false);
    },
  });

  const sendTaskMessage = api.chat.sendTaskMessage.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Only extract tasks in daily planning mode
      if (conversationType === "daily_planning") {
        extractTasks.mutate({ text });
      }

      // Send to backend for chat response
      if (conversationType === "task_specific" && taskId) {
        await sendTaskMessage.mutateAsync({
          message: text,
          taskId,
          conversationId,
        });
      } else {
        await sendDailyMessage.mutateAsync({
          message: text,
          conversationId,
        });
      }
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
          {conversationType === "daily_planning"
            ? "Daily Planning - What do you want to accomplish today?"
            : "Task Help - How can I assist you?"}
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

