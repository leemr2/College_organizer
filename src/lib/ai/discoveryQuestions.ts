/**
 * Discovery Questions Service
 * 
 * Generates intelligent discovery questions to understand student workflows,
 * identify inefficiencies, and determine optimal tool recommendations.
 */

import { generateChatCompletion, parseJsonResponse } from "../aiClient";
import type { TaskContext, StudentContext, DiscoveryQuestion } from "../types";

export class DiscoveryQuestionsService {
  /**
   * Generate initial discovery questions for deep dive mode
   */
  async generateDiscoveryQuestions(
    task: TaskContext,
    context: StudentContext
  ): Promise<DiscoveryQuestion[]> {
    const prompt = `Generate 3-5 discovery questions to deeply understand how a student is approaching this task.

Task: "${task.description}"
Category: ${task.category || "general"}
Complexity: ${task.complexity}
Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "not set"}

Student Context:
- Name: ${context.name}
- Current tools: ${context.currentTools?.map((t) => t.name).join(", ") || "None"}

Generate questions that:
1. Start broad: What are they doing? How are they doing it?
2. Get specific: Exact tools, exact methods, pain points
3. Identify inefficiencies: Time-consuming methods, passive learning, missing tools
4. Understand context: Resources available, past experiences, constraints

Return JSON array:
[
  {
    "id": "q1",
    "question": "What topics will the exam cover?",
    "purpose": "Understand scope and requirements"
  },
  {
    "id": "q2",
    "question": "What have you been doing to study so far?",
    "purpose": "Identify current approach and methods"
  },
  {
    "id": "q3",
    "question": "How confident do you feel about the material?",
    "purpose": "Assess current knowledge level"
  },
  {
    "id": "q4",
    "question": "When you read through notes, do you test yourself?",
    "purpose": "Identify passive vs active learning methods"
  }
]

Questions should be:
- Conversational and natural
- One question at a time (not multiple questions in one)
- Focused on understanding their specific approach
- Designed to reveal inefficiencies`;

    try {
      const response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "SONNET" // Use Claude for better reasoning
      );

      const parsed = parseJsonResponse(response) as DiscoveryQuestion[];
      
      // Ensure all questions have required fields
      return parsed.map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        question: q.question,
        purpose: q.purpose || "Understand student approach",
        answered: false,
        answer: undefined,
      }));
    } catch (error) {
      console.error("Error generating discovery questions:", error);
      // Fallback to basic questions
      return [
        {
          id: "q1",
          question: "What have you been doing to prepare for this task?",
          purpose: "Understand current approach",
          answered: false,
        },
        {
          id: "q2",
          question: "What tools or methods are you currently using?",
          purpose: "Identify existing tools and methods",
          answered: false,
        },
        {
          id: "q3",
          question: "What challenges are you facing?",
          purpose: "Identify pain points and inefficiencies",
          answered: false,
        },
      ];
    }
  }

  /**
   * Generate follow-up question based on previous answers
   */
  async generateFollowUpQuestion(
    previousAnswers: Record<string, string>,
    task: TaskContext,
    allQuestions: DiscoveryQuestion[]
  ): Promise<string | null> {
    // Check if we have enough information
    const answeredCount = Object.keys(previousAnswers).length;
    const totalQuestions = allQuestions.length;
    
    // If we've answered all questions, return null to proceed to analysis
    if (answeredCount >= totalQuestions) {
      return null;
    }

    // Find the next unanswered question
    const nextQuestion = allQuestions.find((q) => !q.answered);
    if (nextQuestion) {
      return nextQuestion.question;
    }

    // Generate dynamic follow-up based on answers
    const prompt = `Based on these answers, generate ONE follow-up question to dig deeper:

Task: "${task.description}"

Previous Answers:
${Object.entries(previousAnswers)
  .map(([id, answer]) => `Q: ${allQuestions.find((q) => q.id === id)?.question || id}\nA: ${answer}`)
  .join("\n\n")}

Generate ONE specific follow-up question that:
- Builds on what we've learned
- Gets more specific about their approach
- Helps identify inefficiencies or better methods
- Is conversational and natural

Return only the question text, no JSON, no quotes.`;

    try {
      const response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "SONNET"
      );

      const question = response.trim().replace(/^["']|["']$/g, "");
      return question || null;
    } catch (error) {
      console.error("Error generating follow-up question:", error);
      return null;
    }
  }

  /**
   * Determine if we have enough information to proceed to analysis
   */
  shouldProceedToAnalysis(
    answeredQuestions: DiscoveryQuestion[],
    totalQuestions: DiscoveryQuestion[]
  ): boolean {
    // Proceed if we've answered at least 3 questions or all questions
    const answeredCount = answeredQuestions.filter((q) => q.answered).length;
    return answeredCount >= Math.min(3, totalQuestions.length);
  }
}

// Export singleton instance
export const discoveryQuestionsService = new DiscoveryQuestionsService();

