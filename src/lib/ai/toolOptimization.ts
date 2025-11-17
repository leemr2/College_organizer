/**
 * Tool Optimization Service
 * 
 * Analyzes how students are using existing tools and suggests advanced features
 * and optimization techniques using web search for real-time tips.
 */

import { generateChatCompletion, parseJsonResponse } from "../aiClient";
import { searchToolOptimization, searchToolFeature, searchBestPractices } from "./webSearch";
import type { TaskContext } from "../types";

export interface Feature {
  name: string;
  description: string;
  benefit: string;
  howToUse: string;
}

export interface ToolOptimizationResult {
  toolName: string;
  currentUsage: string;
  untappedFeatures: Feature[];
  stepByStepGuide: string;
  relevanceScore: number;
}

export class ToolOptimizationService {
  /**
   * Analyze current tool usage and find optimization opportunities
   */
  async analyzeCurrentToolUsage(
    toolName: string,
    studentUsage: string,
    taskContext: TaskContext
  ): Promise<ToolOptimizationResult> {
    try {
      // Search for advanced features and optimization tips
      const searchResults = await searchToolOptimization(
        toolName,
        `${taskContext.description} ${taskContext.category || ""}`
      );

      // Use Claude to analyze and synthesize the search results
      const analysisPrompt = `Analyze how a student is using ${toolName} and suggest optimizations.

Student's Current Usage: "${studentUsage}"

Task Context:
- Task: "${taskContext.description}"
- Category: ${taskContext.category || "general"}
- Complexity: ${taskContext.complexity}

Web Search Results:
${searchResults.answer}

Based on the search results and current usage, identify:
1. What advanced features of ${toolName} could help with this specific task?
2. What optimization techniques could save time or improve effectiveness?
3. How to use these features step-by-step

Return JSON:
{
  "untappedFeatures": [
    {
      "name": "Feature name",
      "description": "What this feature does",
      "benefit": "Why it helps with this specific task",
      "howToUse": "Step-by-step instructions"
    }
  ],
  "stepByStepGuide": "Comprehensive guide on how to optimize ${toolName} for this task",
  "relevanceScore": 8.5
}`;

      const response = await generateChatCompletion(
        [{ role: "user", content: analysisPrompt }],
        "SONNET"
      );

      const parsed = parseJsonResponse(response) as {
        untappedFeatures: Feature[];
        stepByStepGuide: string;
        relevanceScore: number;
      };

      return {
        toolName,
        currentUsage: studentUsage,
        untappedFeatures: parsed.untappedFeatures || [],
        stepByStepGuide: parsed.stepByStepGuide || "",
        relevanceScore: parsed.relevanceScore || 5,
      };
    } catch (error) {
      console.error("Error analyzing tool usage:", error);
      // Return basic result
      return {
        toolName,
        currentUsage: studentUsage,
        untappedFeatures: [],
        stepByStepGuide: `Consider exploring advanced features of ${toolName} for better results.`,
        relevanceScore: 5,
      };
    }
  }

  /**
   * Research advanced features for a specific tool
   */
  async researchAdvancedFeatures(
    toolName: string,
    studentContext: string
  ): Promise<Feature[]> {
    try {
      // Search for advanced features
      const searchResults = await searchToolOptimization(toolName, studentContext);

      // Extract features from search results
      const extractionPrompt = `Extract advanced features and tips for ${toolName} from this search result:

${searchResults.answer}

Student Context: ${studentContext}

Return JSON array of features:
[
  {
    "name": "Feature name",
    "description": "What this feature does",
    "benefit": "Why it's useful",
    "howToUse": "Brief instructions"
  }
]`;

      const response = await generateChatCompletion(
        [{ role: "user", content: extractionPrompt }],
        "SONNET"
      );

      const parsed = parseJsonResponse(response) as Feature[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error researching advanced features:", error);
      return [];
    }
  }

  /**
   * Generate step-by-step guide for using a specific tool feature
   */
  async generateFeatureGuide(
    toolName: string,
    feature: string,
    useCase: string
  ): Promise<string> {
    try {
      const searchResults = await searchToolFeature(toolName, feature, useCase);

      const guidePrompt = `Create a clear, step-by-step guide for using ${toolName}'s ${feature} feature for: ${useCase}

Search Results:
${searchResults.answer}

Create a guide that:
- Is easy to follow
- Includes specific steps (click here, type this, etc.)
- Explains why each step matters
- Provides examples

Return the guide as plain text, formatted with clear steps.`;

      const response = await generateChatCompletion(
        [{ role: "user", content: guidePrompt }],
        "SONNET"
      );

      return response;
    } catch (error) {
      console.error("Error generating feature guide:", error);
      return `To use ${feature} in ${toolName}, explore the feature in the ${toolName} interface and follow the official documentation.`;
    }
  }

  /**
   * Detect if student is using a tool inefficiently
   */
  async detectInefficiency(
    toolName: string,
    currentUsage: string,
    taskContext: TaskContext
  ): Promise<{
    detected: boolean;
    inefficiency: string;
    suggestedImprovement: string;
  }> {
    const prompt = `Analyze if the student is using ${toolName} inefficiently for this task:

Task: "${taskContext.description}"
Current Usage: "${currentUsage}"

Look for:
- Time-consuming manual methods
- Missing advanced features that could automate work
- Ineffective use of tool capabilities
- Better approaches available in the tool

Return JSON:
{
  "detected": true/false,
  "inefficiency": "description of the inefficiency",
  "suggestedImprovement": "what would be better"
}`;

    try {
      const response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "SONNET"
      );

      const parsed = parseJsonResponse(response) as {
        detected: boolean;
        inefficiency?: string;
        suggestedImprovement?: string;
      };

      return {
        detected: parsed.detected || false,
        inefficiency: parsed.inefficiency || "",
        suggestedImprovement: parsed.suggestedImprovement || "",
      };
    } catch (error) {
      console.error("Error detecting inefficiency:", error);
      return {
        detected: false,
        inefficiency: "",
        suggestedImprovement: "",
      };
    }
  }
}

// Export singleton instance
export const toolOptimizationService = new ToolOptimizationService();

