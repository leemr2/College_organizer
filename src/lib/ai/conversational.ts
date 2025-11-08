import { generateChatCompletion, parseJsonResponse, AI_MODELS } from "../aiClient";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type StudentContext = {
  name: string;
  preferences?: any;
  recentTasks?: any[];
  recentConversations?: any[];
};

export class ConversationalAI {
  /**
   * Generate a chat response with student context
   */
  async chat(messages: Message[], context: StudentContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);

    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages,
    ];

    return await generateChatCompletion(fullMessages, "GPT_4O");
  }

  /**
   * Generate clarifying questions for a task
   */
  async generateClarificationQuestions(
    taskDescription: string,
    complexity: string,
    context: StudentContext
  ): Promise<string[]> {
    const prompt = `For this ${complexity} complexity task: "${taskDescription}"

Generate 2-4 clarifying questions to understand:
- Scope and requirements
- Timeline and urgency
- Current progress or approach
- Resources available

${context.name}'s context:
${context.recentTasks ? `- Recent tasks: ${JSON.stringify(context.recentTasks.slice(0, 3))}` : ""}

Return only a JSON array of questions: ["question 1", "question 2", ...]`;

    const response = await generateChatCompletion(
      [{ role: "user", content: prompt }],
      "GPT_4O"
    );

    try {
      const parsed = parseJsonResponse(response);
      return Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch (error) {
      // Fallback: try to extract questions from text
      const questions = response
        .split("\n")
        .filter((line) => line.trim().match(/^[-*]?\s*\d+[.)]?\s*.+/))
        .map((line) => line.replace(/^[-*]?\s*\d+[.)]?\s*/, "").trim())
        .filter((q) => q.length > 0 && q.endsWith("?"));
      return questions.length > 0 ? questions : ["When do you need to complete this?"];
    }
  }

  /**
   * Extract tasks from natural language
   */
  async extractTasks(text: string): Promise<any[]> {
    const prompt = `Extract individual tasks from: "${text}"

Return JSON:
{
  "tasks": [
    {
      "description": "clear task description",
      "category": "exam|assignment|life|other",
      "complexity": "simple|medium|complex",
      "urgency": "high|medium|low"
    }
  ]
}`;

    const response = await generateChatCompletion(
      [{ role: "user", content: prompt }],
      "GPT_4O"
    );

    try {
      const parsed = parseJsonResponse(response);
      return parsed.tasks || [];
    } catch (error) {
      // Fallback: create a single task from the text
      return [
        {
          description: text,
          category: "other",
          complexity: "medium",
          urgency: "medium",
        },
      ];
    }
  }

  private buildSystemPrompt(context: StudentContext): string {
    return `You are Scout, a friendly AI assistant helping ${context.name}, a college student.

Your role:
- Help organize tasks and study plans
- Ask clarifying questions to understand needs
- Suggest better tools and study methods when appropriate
- Be supportive and conversational
- Remember context from previous conversations

${context.preferences ? `Student preferences: ${JSON.stringify(context.preferences)}` : ""}

Be natural, supportive, and focused on helping them work smarter.`;
  }
}

// Export singleton instance
export const conversationalAI = new ConversationalAI();

