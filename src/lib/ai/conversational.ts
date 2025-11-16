import { generateChatCompletion, parseJsonResponse } from "../aiClient";
import { Message, StudentContext } from "../types";

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
      const parsed = parseJsonResponse(response) as { questions?: string[] } | string[];
      return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } catch {
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
  async extractTasks(text: string, currentTime?: Date): Promise<Array<{ description: string; category: string; complexity: string; urgency: string; dueDate?: string | null; isRecurring?: boolean }>> {
    const now = currentTime || new Date();
    const timeOfDay = this.getTimeOfDay(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    const prompt = `Extract individual tasks from: "${text}"

IMPORTANT: Current date/time is ${currentDate} (${dayOfWeek}) at ${timeString} (${timeOfDay}).

When extracting tasks, look for due date/time references in the text such as:
- Relative dates: "tomorrow", "next Friday", "in 3 days", "next week", "this Friday"
- Absolute dates: "December 15th", "Friday the 20th", "next Monday"
- Time references: "by 5pm", "before noon", "end of day"
- Event-based: "before the test", "after the exam", "by the deadline"

RECURRING TASKS: Identify tasks that should be done daily until a due date/event. These include:
- Study tasks: "study for exam", "study for test", "review for", "prepare for exam"
- Practice tasks: "practice", "work on daily", "daily practice"
- Preparation tasks: "prepare for", "get ready for"
- Tasks that imply daily repetition until an event: "study until", "practice until"

For recurring tasks:
- Set isRecurring: true
- Extract the due date/event date as dueDate
- These tasks will be scheduled for each day from today until the due date

For one-time tasks (assignments, papers, single events):
- Set isRecurring: false
- Extract due date if mentioned

For each task, extract the due date if mentioned:
- Parse relative dates based on current date: ${currentDate} (${dayOfWeek})
- Convert to ISO 8601 format (YYYY-MM-DDTHH:mm:ss) or null if no due date mentioned
- If only a date is mentioned (no time), set time to end of day (23:59:59) in the user's local timezone
- If only a time is mentioned (no date), assume today if the time is in the future, otherwise tomorrow
- Never set due dates in the past
- Recurring tasks MUST have a dueDate (if no due date, treat as one-time task)

Return JSON:
{
  "tasks": [
    {
      "description": "clear task description",
      "category": "exam|assignment|life|other",
      "complexity": "simple|medium|complex",
      "urgency": "high|medium|low",
      "dueDate": "ISO 8601 date string or null if no due date mentioned",
      "isRecurring": true or false (true for daily tasks like "study for exam", false for one-time tasks like "write paper")
    }
  ]
}`;

    const response = await generateChatCompletion(
      [{ role: "user", content: prompt }],
      "GPT_4O"
    );

    try {
      const parsed = parseJsonResponse(response) as { tasks?: Array<{ description: string; category: string; complexity: string; urgency: string; dueDate?: string | null; isRecurring?: boolean }> };
      return parsed.tasks || [];
    } catch {
      // Fallback: create a single task from the text
      return [
        {
          description: text,
          category: "other",
          complexity: "medium",
          urgency: "medium",
          dueDate: null,
          isRecurring: false,
        },
      ];
    }
  }

  /**
   * Get time of day description (morning, afternoon, evening)
   */
  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }

  private buildSystemPrompt(context: StudentContext): string {
    const now = context.currentTime || new Date();
    const timeOfDay = this.getTimeOfDay(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const basePrompt = `You are Scout, a friendly AI assistant helping ${context.name}, a college student.

Your role:
- Help organize tasks and study plans
- Ask clarifying questions to understand needs
- Suggest better tools and study methods when appropriate
- Be supportive and conversational
- Remember context from previous conversations

${context.preferences ? `Student preferences: ${JSON.stringify(context.preferences)}` : ""}

${context.currentTools && context.currentTools.length > 0
  ? `\n\nTools ${context.name} currently uses:\n${context.currentTools.map((t) => `- ${t.name}`).join("\n")}\n\nWhen relevant to a task, remind them to use these tools. Do not suggest these tools again as new recommendations.`
  : ""}

Be natural, supportive, and focused on helping them work smarter.`;

    // Add context-specific instructions
    if (context.conversationType === "daily_planning") {
      return `${basePrompt}

Current context: Daily Planning Session
- Current date and time: ${dateString} at ${timeString} (${timeOfDay})
- Focus on helping ${context.name} plan their day
- Extract tasks from their natural language input
- Ask clarifying questions about tasks they mention
- Help prioritize and organize their day
- Be encouraging about what they want to accomplish today
- IMPORTANT: When suggesting times for tasks, be time-aware:
  * It is currently ${timeString} (${timeOfDay})
  * If it's morning (before 12pm), suggest times for today morning, afternoon, or evening
  * If it's afternoon (12pm-5pm), suggest times for today afternoon or evening
  * If it's evening (after 5pm), suggest times for today evening or tomorrow
  * Never suggest times in the past`;
    } else if (context.conversationType === "task_specific" && context.task) {
      return `${basePrompt}

Current context: Task-Specific Help
- You're helping ${context.name} with a specific task: "${context.task.description}"
- Task details:
  - Complexity: ${context.task.complexity}
  - Category: ${context.task.category || "general"}
  - Due date: ${context.task.dueDate ? new Date(context.task.dueDate).toLocaleDateString() : "not set"}
  - Status: ${context.task.completed ? "completed" : "in progress"}
- Focus on providing specific help, clarification, and guidance for THIS task
- Suggest tools, techniques, or strategies relevant to this specific task
- Ask questions to understand what they need help with
- Be encouraging and solution-oriented

TOOL RECOMMENDATION GUIDANCE:
- When the student asks for help with tools, methods, or better approaches, you can suggest relevant productivity tools
- If they mention inefficient methods (like copying notes, re-reading, manual organization), gently suggest better alternatives
- Available tool categories include: study apps (flashcards, spaced repetition), time management, note-taking, writing assistance, organization, study techniques, and AI learning tools
- When suggesting tools, explain WHY it helps with their specific task and HOW to get started
- Be conversational - frame suggestions as helpful tips, not commands
- If they ask "what tools can help?" or "is there a better way?", provide specific tool recommendations`;
    }

    return basePrompt;
  }
}

// Export singleton instance
export const conversationalAI = new ConversationalAI();

