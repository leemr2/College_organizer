/**
 * Web Search Service
 * 
 * Provides unified interface for web search across providers (Gemini web grounding, Perplexity).
 * Used for finding real-time tool optimization tips, tutorials, and best practices.
 */

import { generateGeminiWebResponse, generateChatCompletion, AI_MODELS } from "../aiClient";
import type { AIModel } from "../aiClient";

export interface WebSearchResult {
  answer: string;
  sources: string[];
  sourceLink?: string;
}

export type SearchProvider = "gemini" | "perplexity";

/**
 * Search the web for information
 */
export async function searchWeb(
  query: string,
  provider: SearchProvider = "gemini"
): Promise<WebSearchResult> {
  try {
    if (provider === "gemini") {
      // Use Gemini web grounding as primary provider
      const result = await generateGeminiWebResponse(
        [{ role: "user", content: query }],
        "GEMINI_FLASH_WEB",
        true // Enable web grounding
      );

      return {
        answer: result.text,
        sources: result.sourceLink ? [result.sourceLink] : [],
        sourceLink: result.sourceLink,
      };
    } else {
      // Fallback to Perplexity for web-grounded searches
      const response = await generateChatCompletion(
        [{ role: "user", content: query }],
        "PERPLEXITY_LARGE"
      );

      // Perplexity includes citations in the response
      const sources: string[] = [];
      const sourceRegex = /\[(\d+)\]/g;
      const matches = response.match(sourceRegex);
      if (matches) {
        // Extract source numbers (would need to parse full response for actual URLs)
        sources.push(...matches.map((m) => m));
      }

      return {
        answer: response,
        sources,
      };
    }
  } catch (error) {
    console.error("Error in web search:", error);
    throw error;
  }
}

/**
 * Search for tool optimization tips and tutorials
 */
export async function searchToolOptimization(
  toolName: string,
  studentUseCase: string
): Promise<WebSearchResult> {
  const query = `${toolName} advanced features ${studentUseCase} tutorial tips`;
  return searchWeb(query, "gemini");
}

/**
 * Search for study method effectiveness and best practices
 */
export async function searchStudyMethod(
  method: string,
  subject: string
): Promise<WebSearchResult> {
  const query = `effective ${method} technique for ${subject} college students`;
  return searchWeb(query, "gemini");
}

/**
 * Search for best practices for a specific task type
 */
export async function searchBestPractices(
  taskType: string
): Promise<WebSearchResult> {
  const query = `${taskType} best practices college students step by step`;
  return searchWeb(query, "gemini");
}

/**
 * Search for how to use a specific tool feature
 */
export async function searchToolFeature(
  toolName: string,
  feature: string,
  useCase: string
): Promise<WebSearchResult> {
  const query = `how to use ${toolName} ${feature} for ${useCase} tutorial`;
  return searchWeb(query, "gemini");
}

