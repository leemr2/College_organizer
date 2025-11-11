"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { MessageBubble } from "../chat/MessageBubble";
import { VoiceInput } from "../chat/VoiceInput";
import { ToolRecommendation } from "./ToolRecommendation";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Message } from "@/lib/types";

interface TaskChatProps {
  taskId: string;
  taskDescription: string;
}

export function TaskChat({ taskId, taskDescription }: TaskChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showToolRecommendations, setShowToolRecommendations] = useState(false);

  // Fetch tool recommendations
  const { data: toolRecommendations, refetch: refetchRecommendations } =
    api.tool.recommend.useQuery(
      { taskId },
      { enabled: isExpanded && showToolRecommendations }
    );

  // Get or create task conversation
  const { data: conversation } = api.chat.getTaskConversation.useQuery(
    { taskId },
    { enabled: isExpanded }
  );

  useEffect(() => {
    if (conversation && isExpanded) {
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
  }, [conversation, isExpanded]);

  const sendMessage = api.chat.sendTaskMessage.useMutation({
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
      // Send to backend for chat response
      await sendMessage.mutateAsync({
        message: text,
        taskId,
        conversationId,
      });
    } catch (error) {
      // Error handling is done in mutation onError
      console.error("Error sending message:", error);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <span>Ask for help with this task</span>
        <ChevronDown size={16} />
      </button>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Chat about: {taskDescription}
        </h4>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Collapse chat"
        >
          <ChevronUp size={18} />
        </button>
      </div>

      {/* Tool Recommendations Section */}
      {showToolRecommendations && toolRecommendations && toolRecommendations.length > 0 && (
        <div className="mb-3 space-y-3">
          {toolRecommendations.map((rec) => (
            <ToolRecommendation
              key={rec.toolId}
              toolId={rec.toolId}
              toolName={rec.tool.name}
              description={rec.tool.description}
              reason={rec.reason}
              website={rec.tool.website}
              learningCurve={rec.learningCurve}
              howToGetStarted={rec.howToGetStarted}
              taskId={taskId}
              onResponse={() => {
                refetchRecommendations();
              }}
            />
          ))}
        </div>
      )}

      {/* Get Tool Recommendations Button */}
      {!showToolRecommendations && (
        <button
          onClick={() => setShowToolRecommendations(true)}
          className="mb-3 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          <Lightbulb size={16} />
          <span>Get tool recommendations</span>
        </button>
      )}

      {/* Compact Message List */}
      <div className="max-h-64 overflow-y-auto mb-3 space-y-2 px-2">
        {messages.length === 0 && !showToolRecommendations && (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            <p>How can I help you with this task?</p>
            <p className="mt-2 text-xs">Ask for help or get tool recommendations!</p>
          </div>
        )}
        {messages
          .filter((message) => message.role !== "system")
          .map((message, index) => (
            <div key={index} className="text-sm">
              <MessageBubble
                role={message.role as "user" | "assistant"}
                content={message.content}
                timestamp={message.timestamp}
              />
            </div>
          ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compact Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <VoiceInput
          onTranscript={handleTranscript}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

