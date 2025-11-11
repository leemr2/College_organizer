/**
 * Tool Database Utility
 * 
 * Loads and searches tools from the JSON database.
 * Provides functions for querying tools by category, name, use case, etc.
 */

import toolsData from "../data/tools.json";

export interface Tool {
  id: string;
  name: string;
  category: string[];
  description: string;
  useCases: string[];
  cost: string;
  studentFriendly: boolean;
  learningCurve: string;
  website: string;
  platformAvailability: string[];
  integrations: string[];
  popularity?: string;
  bestFor: string[];
  features: Array<{
    name: string;
    description: string;
  }>;
}

export interface ToolSearchQuery {
  category?: string[];
  searchTerm?: string;
  studentFriendly?: boolean;
  learningCurve?: string[];
  maxResults?: number;
}

/**
 * Get all tools from the database
 */
export function getAllTools(): Tool[] {
  return toolsData.tools as Tool[];
}

/**
 * Get a tool by ID
 */
export function getToolById(id: string): Tool | undefined {
  return getAllTools().find((tool) => tool.id === id);
}

/**
 * Search tools by query parameters
 */
export function searchTools(query: ToolSearchQuery): Tool[] {
  let results = getAllTools();

  // Filter by category
  if (query.category && query.category.length > 0) {
    results = results.filter((tool) =>
      query.category!.some((cat) => tool.category.includes(cat))
    );
  }

  // Filter by student-friendly
  if (query.studentFriendly !== undefined) {
    results = results.filter(
      (tool) => tool.studentFriendly === query.studentFriendly
    );
  }

  // Filter by learning curve
  if (query.learningCurve && query.learningCurve.length > 0) {
    results = results.filter((tool) =>
      query.learningCurve!.includes(tool.learningCurve)
    );
  }

  // Search by term (name, description, use cases, bestFor)
  if (query.searchTerm) {
    const searchLower = query.searchTerm.toLowerCase();
    results = results.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower) ||
        tool.useCases.some((uc) => uc.toLowerCase().includes(searchLower)) ||
        tool.bestFor.some((bf) => bf.toLowerCase().includes(searchLower)) ||
        tool.category.some((cat) => cat.toLowerCase().includes(searchLower))
    );
  }

  // Limit results
  if (query.maxResults) {
    results = results.slice(0, query.maxResults);
  }

  return results;
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): Tool[] {
  return getAllTools().filter((tool) => tool.category.includes(category));
}

/**
 * Get tools recommended for a specific task type or subject
 */
export function getToolsForTaskType(taskType: string): Tool[] {
  const taskLower = taskType.toLowerCase();
  return getAllTools().filter(
    (tool) =>
      tool.useCases.some((uc) => uc.toLowerCase().includes(taskLower)) ||
      tool.bestFor.some((bf) => bf.toLowerCase().includes(taskLower)) ||
      tool.description.toLowerCase().includes(taskLower)
  );
}

/**
 * Get tools by learning curve (easiest first)
 */
export function getToolsByLearningCurve(curve: string): Tool[] {
  return getAllTools().filter((tool) => tool.learningCurve === curve);
}

/**
 * Get free tools only
 */
export function getFreeTools(): Tool[] {
  return getAllTools().filter((tool) =>
    tool.cost.toLowerCase().includes("free")
  );
}

/**
 * Get tools that are student-friendly and free or low-cost
 */
export function getBudgetFriendlyTools(): Tool[] {
  return getAllTools().filter(
    (tool) =>
      tool.studentFriendly &&
      (tool.cost.toLowerCase().includes("free") ||
        tool.cost.toLowerCase().includes("$") &&
          parseFloat(tool.cost.match(/\$(\d+\.?\d*)/)?.[1] || "999") < 50)
  );
}

