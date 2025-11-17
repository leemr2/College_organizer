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
  const [selectedMode, setSelectedMode] = useState<"quick_help" | "deep_dive" | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showToolRecommendations, setShowToolRecommendations] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);

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

  // Start deep dive mutation
  const startDeepDive = api.chat.startDeepDive.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      const mode = data.mode as "quick_help" | "deep_dive";
      setSelectedMode(mode);
      setCurrentPhase(mode === "deep_dive" ? "discovery" : "recommendation");
      setMessages([
        {
          role: "assistant",
          content: data.message,
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error("Failed to start conversation: " + error.message);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (conversation && isExpanded) {
      setConversationId(conversation.id);
      // Load existing mode and phase with proper type guards
      // Access optional fields using bracket notation (fields exist in schema but may not be in generated types yet)
      // This is safe because we check for existence and type before using
      const mode = (conversation as Record<string, unknown>).conversationMode;
      if (mode && typeof mode === "string") {
        if (mode === "quick_help" || mode === "deep_dive") {
          setSelectedMode(mode);
        }
      }
      // Type guard for current phase
      const phase = (conversation as Record<string, unknown>).currentPhase;
      if (phase && typeof phase === "string") {
        setCurrentPhase(phase);
      }
      // Load existing messages with proper type casting
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
      // Update phase if we're in deep dive mode
      if (selectedMode === "deep_dive") {
        // Check if we've moved to recommendation phase (comprehensive response)
        if (data.message.length > 500) {
          setCurrentPhase("recommendation");
        }
      }
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

  // Show mode selection if no mode is selected yet
  if (isExpanded && !selectedMode) {
    return (
      <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            How would you like help with this task?
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Choose how you'd like Scout to help you
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => {
              setIsLoading(true);
              startDeepDive.mutate({ taskId, mode: "quick_help" });
            }}
            disabled={isLoading}
            className="w-full flex flex-col items-start gap-2 px-4 py-3 text-left text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          >
            <span className="font-semibold">Quick Help</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Get immediate suggestions and recommendations
            </span>
          </button>
          <button
            onClick={() => {
              setIsLoading(true);
              startDeepDive.mutate({ taskId, mode: "deep_dive" });
            }}
            disabled={isLoading}
            className="w-full flex flex-col items-start gap-2 px-4 py-3 text-left text-sm font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
          >
            <span className="font-semibold">Deep Dive</span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Let's understand your workflow first for personalized guidance
            </span>
          </button>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="mt-4 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
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

      {/* Phase indicator for deep dive */}
      {selectedMode === "deep_dive" && currentPhase && (
        <div className="mb-3 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
            <span className="font-medium">
              {currentPhase === "discovery" && "Discovery Phase - Answering questions"}
              {currentPhase === "analysis" && "Analysis Phase - Scout is thinking..."}
              {currentPhase === "recommendation" && "Recommendations Ready"}
            </span>
          </div>
        </div>
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

