/**
 * Tool Recommendation Service
 * 
 * Uses AI to analyze tasks and recommend relevant tools from the database.
 * Detects inefficient approaches and suggests better alternatives.
 */

import { generateChatCompletion, parseJsonResponse } from "../aiClient";
import { getAllTools, getToolsForTaskType, searchTools, type Tool } from "../utils/toolDatabase";
import type { StudentContext, TaskContext } from "../types";

export interface ToolRecommendation {
  toolId: string;
  tool: Tool;
  reason: string;
  timeSavings?: string;
  learningCurve: string;
  howToGetStarted: string;
  relevanceScore: number;
}

export interface InefficiencyDetection {
  currentApproach: string;
  inefficiency: string;
  suggestedImprovement: string;
  toolOpportunities: string[];
}

export interface ToolSearchQuery {
  category?: string[];
  searchTerm?: string;
  studentFriendly?: boolean;
  learningCurve?: string[];
  maxResults?: number;
}

export class ToolRecommendationService {
  /**
   * Search tools by query parameters
   */
  async searchTools(query: ToolSearchQuery): Promise<Tool[]> {
    return searchTools(query);
  }

  /**
   * Recommend tools for a specific task
   */
  async recommendForTask(
    task: TaskContext,
    studentContext: StudentContext
  ): Promise<ToolRecommendation[]> {
    // Get initial candidate tools based on task category and description
    const candidateTools = this.getCandidateTools(task);

    // Use AI to analyze task and rank tools
    const recommendations = await this.analyzeAndRankTools(
      task,
      studentContext,
      candidateTools
    );

    // Return top 3 recommendations
    return recommendations.slice(0, 3);
  }

  /**
   * Detect inefficient approaches in clarification responses
   */
  async detectInefficiency(
    task: TaskContext,
    clarificationData: Record<string, string>
  ): Promise<InefficiencyDetection | null> {
    const prompt = `Analyze this task and student's approach to identify inefficiencies:

Task: "${task.description}"
Category: ${task.category || "general"}
Complexity: ${task.complexity}

Student's Responses:
${JSON.stringify(clarificationData, null, 2)}

Identify if the student is using an inefficient approach. Look for:
- Time-consuming manual methods (copying notes, rewriting)
- Passive learning techniques (re-reading, highlighting)
- Lack of active recall or spaced repetition
- Missing tools that could save time
- Ineffective study methods for the task type

If inefficiency is detected, return JSON:
{
  "detected": true,
  "currentApproach": "description of what they're doing",
  "inefficiency": "why it's inefficient",
  "suggestedImprovement": "what would be better",
  "toolOpportunities": ["list of tool categories that could help"]
}

If no significant inefficiency, return:
{
  "detected": false
}`;

    try {
      const response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "GPT_5"
      );

      const parsed = parseJsonResponse(response) as {
        detected: boolean;
        currentApproach?: string;
        inefficiency?: string;
        suggestedImprovement?: string;
        toolOpportunities?: string[];
      };

      if (!parsed.detected) {
        return null;
      }

      return {
        currentApproach: parsed.currentApproach || "",
        inefficiency: parsed.inefficiency || "",
        suggestedImprovement: parsed.suggestedImprovement || "",
        toolOpportunities: parsed.toolOpportunities || [],
      };
    } catch (error) {
      console.error("Error detecting inefficiency:", error);
      return null;
    }
  }

  /**
   * Generate tool suggestion prompt for AI conversation
   */
  async generateToolSuggestionPrompt(
    task: TaskContext,
    inefficiency: InefficiencyDetection
  ): Promise<string> {
    // Find relevant tools for the detected opportunities
    const relevantTools = this.findToolsForOpportunities(
      inefficiency.toolOpportunities
    );

    if (relevantTools.length === 0) {
      return "";
    }

    const toolSummaries = relevantTools
      .slice(0, 3)
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description} (${tool.cost}, ${tool.learningCurve} learning curve)`
      )
      .join("\n");

    return `I noticed you're ${inefficiency.currentApproach}. ${inefficiency.inefficiency}

${inefficiency.suggestedImprovement}

Here are some tools that could help:
${toolSummaries}

Would you like me to tell you more about any of these?`;
  }

  /**
   * Get candidate tools based on task characteristics
   */
  private getCandidateTools(task: TaskContext): Tool[] {
    const candidates: Tool[] = [];

    // Search by task category
    if (task.category) {
      const categoryTools = getToolsForTaskType(task.category);
      candidates.push(...categoryTools);
    }

    // Search by task description keywords
    const descriptionTools = getToolsForTaskType(task.description);
    candidates.push(...descriptionTools);

    // Add complexity-based suggestions
    if (task.complexity === "complex") {
      const complexTools = searchTools({
        category: ["study_techniques", "ai_learning_tools"],
        maxResults: 5,
      });
      candidates.push(...complexTools);
    }

    // Remove duplicates
    const uniqueCandidates = Array.from(
      new Map(candidates.map((tool) => [tool.id, tool])).values()
    );

    return uniqueCandidates;
  }

  /**
   * Use AI to analyze task and rank tools
   */
  private async analyzeAndRankTools(
    task: TaskContext,
    studentContext: StudentContext,
    candidateTools: Tool[]
  ): Promise<ToolRecommendation[]> {
    if (candidateTools.length === 0) {
      return [];
    }

    // Prepare tool summaries for AI
    const toolSummaries = candidateTools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      category: tool.category.join(", "),
      description: tool.description,
      useCases: tool.useCases.slice(0, 3).join(", "),
      cost: tool.cost,
      learningCurve: tool.learningCurve,
      studentFriendly: tool.studentFriendly,
      bestFor: tool.bestFor.slice(0, 3).join(", "),
    }));

    const prompt = `Analyze this task and recommend the most relevant tools from the list:

Task: "${task.description}"
Category: ${task.category || "general"}
Complexity: ${task.complexity}
Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "not set"}

Student Context:
- Name: ${studentContext.name}
- Preferences: ${JSON.stringify(studentContext.preferences || {})}

Available Tools:
${JSON.stringify(toolSummaries, null, 2)}

For each tool, analyze:
1. How relevant is it to this specific task? (0-10 score)
2. Why would it help? (specific reason)
3. What time savings could it provide?
4. How easy is it to get started?

Return JSON array of recommendations (max 3), sorted by relevance:
[
  {
    "toolId": "tool-id",
    "reason": "why this tool helps with this specific task",
    "timeSavings": "estimated time savings",
    "learningCurve": "easy/medium/hard",
    "howToGetStarted": "brief 1-2 sentence guide",
    "relevanceScore": 8.5
  }
]`;

    try {
      const response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "GPT_5"
      );

      const parsed = parseJsonResponse(response) as ToolRecommendation[];

      // Map tool IDs back to full tool objects
      const recommendations: ToolRecommendation[] = parsed
        .map((rec) => {
          const tool = candidateTools.find((t) => t.id === rec.toolId);
          if (!tool) return null;

          return {
            ...rec,
            tool,
          };
        })
        .filter((rec): rec is ToolRecommendation => rec !== null)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      return recommendations;
    } catch (error) {
      console.error("Error analyzing tools:", error);
      // Fallback: return first 3 candidates with basic recommendations
      return candidateTools.slice(0, 3).map((tool) => ({
        toolId: tool.id,
        tool,
        reason: `This tool could help with ${task.description}`,
        learningCurve: tool.learningCurve,
        howToGetStarted: `Visit ${tool.website} to get started`,
        relevanceScore: 5,
      }));
    }
  }

  /**
   * Find tools for detected inefficiency opportunities
   */
  private findToolsForOpportunities(opportunities: string[]): Tool[] {
    const tools: Tool[] = [];

    for (const opportunity of opportunities) {
      const oppLower = opportunity.toLowerCase();

      // Map opportunity keywords to tool categories
      if (
        oppLower.includes("flashcard") ||
        oppLower.includes("memorization") ||
        oppLower.includes("spaced repetition")
      ) {
        tools.push(...getToolsForTaskType("flashcards"));
      }

      if (
        oppLower.includes("note") ||
        oppLower.includes("organiz") ||
        oppLower.includes("writing")
      ) {
        tools.push(
          ...searchTools({
            category: ["note_taking", "writing_assistance"],
            maxResults: 3,
          })
        );
      }

      if (
        oppLower.includes("time") ||
        oppLower.includes("focus") ||
        oppLower.includes("pomodoro")
      ) {
        tools.push(
          ...searchTools({
            category: ["time_management", "study_techniques"],
            maxResults: 3,
          })
        );
      }

      if (oppLower.includes("ai") || oppLower.includes("tutor")) {
        tools.push(
          ...searchTools({
            category: ["ai_learning_tools"],
            maxResults: 3,
          })
        );
      }
    }

    // Remove duplicates and return
    return Array.from(new Map(tools.map((tool) => [tool.id, tool])).values());
  }
}

// Export singleton instance
export const toolRecommendationService = new ToolRecommendationService();

