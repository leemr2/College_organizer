"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { MessageList } from "./MessageList";
import { VoiceInput } from "./VoiceInput";
import { ScheduleGenerationPrompt } from "@/components/schedule/ScheduleGenerationPrompt";
import { DraftTaskPreview } from "./DraftTaskPreview";
import { SchedulePreview } from "./SchedulePreview";
import { toast } from "react-toastify";
import { Message, DraftTask, ScheduleSuggestion, ConversationMode } from "@/lib/types";

interface ChatInterfaceProps {
  conversationType?: "daily_planning" | "task_specific";
  taskId?: string;
}

export function ChatInterface({ conversationType = "daily_planning", taskId }: ChatInterfaceProps = {} as ChatInterfaceProps) {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSchedulePrompt, setShowSchedulePrompt] = useState(false);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [scheduleSuggestion, setScheduleSuggestion] = useState<ScheduleSuggestion | null>(null);

  const utils = api.useUtils();

  // Get or create conversation based on type
  const { data: dailyConversation, refetch: refetchDailyConversation } = api.chat.getDailyConversation.useQuery(
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

      // Extract draft tasks and schedule from planning session
      if (conversationType === "daily_planning" && conversation.conversationMode) {
        // Parse conversationMode from JSON string if needed
        let mode: ConversationMode | null = null;
        if (typeof conversation.conversationMode === 'string') {
          try {
            mode = JSON.parse(conversation.conversationMode) as ConversationMode;
          } catch {
            // Not JSON, treat as simple mode type string
            mode = { type: conversation.conversationMode as ConversationMode['type'] };
          }
        } else {
          mode = conversation.conversationMode as unknown as ConversationMode;
        }
        
        if (mode?.planningSession) {
          // Parse dates from strings to Date objects
          const parsedDraftTasks = (mode.planningSession.draftTasks || []).map((dt: DraftTask & { dueDate?: string | Date | null }) => ({
            ...dt,
            dueDate: dt.dueDate ? (typeof dt.dueDate === 'string' ? new Date(dt.dueDate) : dt.dueDate) : null,
          }));
          setDraftTasks(parsedDraftTasks);
          
          // Parse dates in schedule suggestion if it exists
          if (mode.planningSession.scheduleSuggestion) {
            const parsedSuggestion: ScheduleSuggestion = {
              ...mode.planningSession.scheduleSuggestion,
              blocks: mode.planningSession.scheduleSuggestion.blocks.map((block: ScheduleSuggestion['blocks'][0] & { startTime?: string | Date; endTime?: string | Date }) => ({
                ...block,
                startTime: typeof block.startTime === 'string' ? new Date(block.startTime) : block.startTime,
                endTime: typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime,
              })),
            };
            setScheduleSuggestion(parsedSuggestion);
          } else {
            setScheduleSuggestion(null);
          }
        } else {
          setDraftTasks([]);
          setScheduleSuggestion(null);
        }
      } else if (conversationType === "daily_planning") {
        // Reset if no conversationMode
        setDraftTasks([]);
        setScheduleSuggestion(null);
      }
    }
  }, [conversation, conversationType]);

  const sendDailyMessage = api.chat.sendDailyMessage.useMutation({
    onSuccess: async (data) => {
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
      // Fetch the updated conversation directly by ID to get planning session
      if (conversationType === "daily_planning" && data.conversationId) {
        // Small delay to ensure database transaction is committed
        setTimeout(async () => {
          try {
            const updatedConversation = await utils.chat.getConversation.fetch({ conversationId: data.conversationId });
            // Update local state with planning session from updated conversation
            if (updatedConversation?.conversationMode) {
              let mode: ConversationMode | null = null;
              if (typeof updatedConversation.conversationMode === 'string') {
                try {
                  mode = JSON.parse(updatedConversation.conversationMode) as ConversationMode;
                } catch {
                  mode = { type: updatedConversation.conversationMode as ConversationMode['type'] };
                }
              } else {
                mode = updatedConversation.conversationMode as unknown as ConversationMode;
              }
              
              if (mode?.planningSession) {
                const parsedDraftTasks = (mode.planningSession.draftTasks || []).map((dt: DraftTask & { dueDate?: string | Date | null }) => ({
                  ...dt,
                  dueDate: dt.dueDate ? (typeof dt.dueDate === 'string' ? new Date(dt.dueDate) : dt.dueDate) : null,
                }));
                setDraftTasks(parsedDraftTasks);
                
                if (mode.planningSession.scheduleSuggestion) {
                  const parsedSuggestion: ScheduleSuggestion = {
                    ...mode.planningSession.scheduleSuggestion,
                    blocks: mode.planningSession.scheduleSuggestion.blocks.map((block: ScheduleSuggestion['blocks'][0] & { startTime?: string | Date; endTime?: string | Date }) => ({
                      ...block,
                      startTime: typeof block.startTime === 'string' ? new Date(block.startTime) : block.startTime,
                      endTime: typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime,
                    })),
                  };
                  setScheduleSuggestion(parsedSuggestion);
                } else {
                  setScheduleSuggestion(null);
                }
              }
            }
          } catch (error) {
            console.error("Failed to fetch updated conversation:", error);
          }
        }, 200);
      }
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

  const completePlanning = api.chat.completePlanningSession.useMutation({
    onSuccess: async (data) => {
      // Parse dates from strings to Date objects
      const parsedDraftTasks = data.draftTasks.map(dt => ({
        ...dt,
        dueDate: dt.dueDate ? (typeof dt.dueDate === 'string' ? new Date(dt.dueDate) : dt.dueDate) : null,
      }));
      setDraftTasks(parsedDraftTasks);
      
      // Parse dates in schedule suggestion blocks
      if (data.scheduleSuggestion) {
        const parsedSuggestion: ScheduleSuggestion = {
          ...data.scheduleSuggestion,
          blocks: data.scheduleSuggestion.blocks.map(block => ({
            ...block,
            startTime: typeof block.startTime === 'string' ? new Date(block.startTime) : block.startTime,
            endTime: typeof block.endTime === 'string' ? new Date(block.endTime) : block.endTime,
          })),
        };
        setScheduleSuggestion(parsedSuggestion);
      } else {
        setScheduleSuggestion(null);
      }
      
      toast.success("Schedule generated!");
      // Don't invalidate - the state is already updated from the mutation response
      // Invalidating causes a refetch that may create a new conversation
    },
    onError: (error) => {
      toast.error(`Failed to generate schedule: ${error.message}`);
    },
  });

  const commitPlanning = api.chat.commitPlanningSession.useMutation({
    onSuccess: async () => {
      toast.success("Tasks and schedule saved!");
      setDraftTasks([]);
      setScheduleSuggestion(null);
      setShowSchedulePrompt(false);
      // Refetch to get the cleared conversation state
      if (conversationType === "daily_planning") {
        await refetchDailyConversation();
      }
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
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
      // Task extraction now happens inside processMessage on the backend
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
        <div className="px-4 py-4 space-y-4">
          {conversationType === "daily_planning" && draftTasks.length > 0 && (
            <DraftTaskPreview draftTasks={draftTasks} />
          )}

          {conversationType === "daily_planning" && scheduleSuggestion && (
            <SchedulePreview
              suggestion={scheduleSuggestion}
              onConfirm={() => {
                if (conversationId) {
                  commitPlanning.mutate({ conversationId });
                }
              }}
              onRegenerate={() => {
                if (conversationId) {
                  completePlanning.mutate({ conversationId });
                }
              }}
            />
          )}

          {/* Add "Complete Planning" button when there are draft tasks */}
          {conversationType === "daily_planning" && draftTasks.length > 0 && !scheduleSuggestion && (
            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  if (conversationId) {
                    completePlanning.mutate({ conversationId });
                  }
                }}
                disabled={completePlanning.isPending}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completePlanning.isPending ? "Generating Schedule..." : "Generate My Schedule"}
              </button>
            </div>
          )}
        </div>
        <MessageList messages={messages} isLoading={isLoading} />
        {showSchedulePrompt && conversationType === "daily_planning" && (
          <div className="px-4 pb-4">
            <ScheduleGenerationPrompt
              onScheduleGenerated={() => setShowSchedulePrompt(false)}
            />
          </div>
        )}
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

