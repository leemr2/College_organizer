"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Search, CheckCircle2, Circle } from "lucide-react";
import type { Tool } from "@/lib/utils/toolDatabase";

export function ToolsPreferenceEditor() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Get all tools organized by category
  const { data: toolsByCategory, isLoading: isLoadingTools } = api.tool.getAllToolsByCategory.useQuery();
  
  // Get student's current tools
  const { data: myTools, isLoading: isLoadingMyTools, refetch: refetchMyTools } = api.tool.getMyTools.useQuery();
  
  const updateStudentTool = api.tool.updateStudentTool.useMutation({
    onSuccess: () => {
      toast.success("Tool preferences updated!");
      refetchMyTools();
    },
    onError: (error) => {
      toast.error("Failed to update tool: " + error.message);
    },
  });

  // Get list of tool IDs that student is currently using
  const usingToolIds = useMemo(() => {
    return new Set((myTools || []).map(st => st.toolId));
  }, [myTools]);

  // Flatten tools by category into a single array for searching (deduplicate by ID)
  const allTools = useMemo(() => {
    if (!toolsByCategory) return [];
    const flattened = Object.values(toolsByCategory).flat();
    // Deduplicate by tool ID since tools can appear in multiple categories
    return Array.from(
      new Map(flattened.map((tool) => [tool.id, tool])).values()
    );
  }, [toolsByCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!toolsByCategory) return [];
    return ["all", ...Object.keys(toolsByCategory).sort()];
  }, [toolsByCategory]);

  // Filter tools based on search and category
  const filteredTools = useMemo(() => {
    if (!toolsByCategory) return [];
    
    let tools: Tool[] = [];
    
    // Get tools from selected category
    if (selectedCategory === "all") {
      tools = allTools;
    } else {
      tools = toolsByCategory[selectedCategory] || [];
      // Deduplicate in case a tool appears multiple times in the same category
      tools = Array.from(
        new Map(tools.map((tool) => [tool.id, tool])).values()
      );
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      tools = tools.filter(tool =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower) ||
        tool.category.some(cat => cat.toLowerCase().includes(searchLower))
      );
    }
    
    // Final deduplication to ensure no duplicates
    return Array.from(
      new Map(tools.map((tool) => [tool.id, tool])).values()
    );
  }, [toolsByCategory, selectedCategory, searchTerm, allTools]);

  const handleToolToggle = async (toolId: string, isCurrentlyUsing: boolean) => {
    // Update student-tool relationship (updateStudentTool will create tool in DB if needed)
    updateStudentTool.mutate({
      toolId,
      adoptedStatus: isCurrentlyUsing ? "abandoned" : "using",
    });
  };

  if (isLoadingTools || isLoadingMyTools) {
    return <div className="text-center py-4">Loading tools...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tools..."
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                selectedCategory === category
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {category === "all" ? "All Categories" : category.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tools List */}
      <div className="max-h-[600px] space-y-3 overflow-y-auto">
        {filteredTools.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? "No tools found matching your search." : "No tools in this category."}
          </div>
        ) : (
          filteredTools.map((tool) => {
            const isUsing = usingToolIds.has(tool.id);
            return (
              <div
                key={tool.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isUsing
                    ? "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/20"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {tool.name}
                      </h4>
                      {isUsing && (
                        <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                          Using
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {tool.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tool.learningCurve} learning curve
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {tool.cost}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToolToggle(tool.id, isUsing)}
                    disabled={updateStudentTool.isPending}
                    className={`ml-4 rounded-full p-2 transition-colors ${
                      isUsing
                        ? "text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    aria-label={isUsing ? "Stop using this tool" : "Start using this tool"}
                  >
                    {isUsing ? (
                      <CheckCircle2 size={24} className="fill-current" />
                    ) : (
                      <Circle size={24} />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {myTools && myTools.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm text-green-800 dark:text-green-300">
            You're currently using {myTools.length} tool{myTools.length !== 1 ? "s" : ""}. 
            Scout will use this information to provide better recommendations.
          </p>
        </div>
      )}
    </div>
  );
}

