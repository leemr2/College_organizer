/**
 * Scheduling Service
 * 
 * Uses AI to generate intelligent daily schedules from tasks, class schedules, and preferences.
 * Phase 3: Basic algorithm (fill available time slots)
 * Phase 4: Advanced algorithm (optimization, patterns, dependencies, energy levels)
 */

import { generateChatCompletion, parseJsonResponse } from "../aiClient";
import { SchedulingContext, ScheduleSuggestion, ScheduleBlockData, RescheduleOptions, TaskContext } from "../types";

export class SchedulingService {
  /**
   * Generate daily schedule from tasks and context
   * Phase 3: Basic algorithm (fill available slots)
   * Phase 4: Advanced algorithm (optimization, patterns, dependencies)
   */
  async generateDailySchedule(context: SchedulingContext): Promise<ScheduleSuggestion> {
    // Build system prompt with scheduling constraints
    const systemPrompt = this.buildSchedulingPrompt(context);

    // Prepare task list for AI
    const tasksDescription = this.formatTasksForScheduling(context.tasks);
    const classScheduleDescription = this.formatClassSchedule(context.classSchedules);
    const existingBlocksDescription = this.formatExistingBlocks(context.existingBlocks);

    const userPrompt = `Generate a daily schedule for ${context.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.

TASKS TO SCHEDULE:
${tasksDescription}

CLASS SCHEDULE (fixed blocks - cannot be moved):
${classScheduleDescription}

EXISTING SCHEDULE BLOCKS (already scheduled):
${existingBlocksDescription}

STUDENT PREFERENCES:
- Peak energy times: ${context.preferences.peakEnergyTimes?.join(", ") || "not specified"}
- Morning person: ${context.preferences.morningPerson ? "yes" : "no"}
- Preferred break length: ${context.preferences.preferredBreakLength || 10} minutes

INSTRUCTIONS:
1. Schedule all tasks into available time slots
2. Respect class schedule as fixed blocks
3. Consider task complexity and due dates for prioritization
4. Add breaks between study blocks (${context.preferences.preferredBreakLength || 10} minutes)
5. Provide reasoning for each time block placement
6. If the day is too packed, include warnings
7. Use realistic time estimates based on task complexity
8. Schedule recurring tasks with placeholder times (they can be adjusted)

Return JSON:
{
  "blocks": [
    {
      "title": "task title",
      "description": "optional description",
      "startTime": "ISO 8601 datetime string",
      "endTime": "ISO 8601 datetime string",
      "type": "task|break|lunch|dinner",
      "reasoning": "why this time slot",
      "taskId": "EXACT task ID from the task list above (must match exactly) or omit if not a task block"
    }
  ],
  "reasoning": "overall schedule strategy explanation",
  "warnings": ["warning 1", "warning 2"] // optional
}

IMPORTANT: When linking to a task, use the EXACT task ID shown in the task list. Do not generate new IDs or use descriptions as IDs.`;

    let response: string;
    try {
      // Try GPT-5 first
      response = await generateChatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        "GPT_5"
      );
    } catch (error) {
      // Fallback to GPT-4o if GPT-5 fails
      console.warn("GPT-5 unavailable, falling back to GPT-4o:", error instanceof Error ? error.message : String(error));
      response = await generateChatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        "GPT_4O"
      );
    }

    try {
      const parsed = parseJsonResponse(response) as {
        blocks?: Array<{
          title: string;
          description?: string;
          startTime: string;
          endTime: string;
          type: "task" | "break" | "lunch" | "dinner" | "commitment";
          reasoning?: string;
          taskId?: string;
        }>;
        reasoning?: string;
        warnings?: string[];
      };

      if (!parsed.blocks || parsed.blocks.length === 0) {
        throw new Error("No blocks generated");
      }

      // Convert to ScheduleBlockData format
      const blocks: ScheduleBlockData[] = parsed.blocks.map((block, index) => {
        // Parse dates with validation
        const startTime = new Date(block.startTime);
        const endTime = new Date(block.endTime);
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error(`Invalid date format in block ${index}: startTime=${block.startTime}, endTime=${block.endTime}`);
        }
        
        if (endTime <= startTime) {
          throw new Error(`Invalid time range in block ${index}: endTime must be after startTime`);
        }
        
        return {
          id: `temp-${index}`, // Will be replaced with actual ID when saved
          title: block.title,
          description: block.description,
          startTime,
          endTime,
          type: block.type === "commitment" ? "commitment" : block.type,
          completed: false,
          taskId: block.taskId,
          reasoning: block.reasoning,
        };
      });

      return {
        blocks,
        reasoning: parsed.reasoning || "Schedule generated based on available time slots and task priorities.",
        warnings: parsed.warnings,
      };
    } catch (error) {
      // If there are no tasks, return empty schedule
      if (context.tasks.length === 0) {
        return {
          blocks: [],
          reasoning: "No tasks to schedule.",
          warnings: ["No tasks found"],
        };
      }
      
      // Fallback: create simple schedule
      try {
        return this.createFallbackSchedule(context);
      } catch (fallbackError) {
        throw new Error(`Failed to generate schedule: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }

  /**
   * Suggest rescheduling options for a task
   */
  async suggestRescheduleOptions(
    blockId: string,
    context: SchedulingContext
  ): Promise<RescheduleOptions> {
    // Find the block to reschedule
    const blockToReschedule = context.existingBlocks.find(b => b.id === blockId);
    if (!blockToReschedule) {
      throw new Error("Block not found");
    }

    // Find available time slots
    const availableSlots = this.findAvailableSlots(
      blockToReschedule,
      context.existingBlocks,
      context.classSchedules,
      context.currentDate
    );

    // Use AI to rank slots by suitability
    const prompt = `A student wants to reschedule this task:
- Title: ${blockToReschedule.title}
- Current time: ${blockToReschedule.startTime.toLocaleTimeString()} - ${blockToReschedule.endTime.toLocaleTimeString()}
- Type: ${blockToReschedule.type}
- Reasoning: ${blockToReschedule.reasoning || "none"}

Available time slots:
${availableSlots.map((slot, i) => `${i + 1}. ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}`).join("\n")}

Student preferences:
- Peak energy times: ${context.preferences.peakEnergyTimes?.join(", ") || "not specified"}
- Morning person: ${context.preferences.morningPerson ? "yes" : "no"}

Rank the top 3 time slots and provide reasoning for each. Return JSON:
{
  "suggestions": [
    {
      "startTime": "ISO 8601 datetime",
      "endTime": "ISO 8601 datetime",
      "reasoning": "why this slot is good"
    }
  ]
}`;

    let response: string;
    try {
      // Try GPT-5 first
      response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "GPT_5"
      );
    } catch (error) {
      // Fallback to GPT-4o if GPT-5 fails
      console.warn("GPT-5 unavailable, falling back to GPT-4o:", error instanceof Error ? error.message : String(error));
      response = await generateChatCompletion(
        [{ role: "user", content: prompt }],
        "GPT_4O"
      );
    }

    try {
      const parsed = parseJsonResponse(response) as {
        suggestions?: Array<{
          startTime: string;
          endTime: string;
          reasoning: string;
        }>;
      };

      const suggestions = (parsed.suggestions || []).slice(0, 3).map(s => ({
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        reasoning: s.reasoning,
      }));

      return {
        taskId: blockToReschedule.taskId || "",
        currentBlockId: blockId,
        suggestedTimes: suggestions.length > 0 ? suggestions : availableSlots.slice(0, 3).map(slot => ({
          startTime: slot.start,
          endTime: slot.end,
          reasoning: "Available time slot",
        })),
      };
    } catch (error) {
      // Fallback: return first 3 available slots
      return {
        taskId: blockToReschedule.taskId || "",
        currentBlockId: blockId,
        suggestedTimes: availableSlots.slice(0, 3).map(slot => ({
          startTime: slot.start,
          endTime: slot.end,
          reasoning: "Available time slot",
        })),
      };
    }
  }

  /**
   * Phase 4 preparation: Calculate task priority score
   * Currently basic (due date + complexity)
   * Phase 4: Add learned patterns, dependencies, energy levels
   */
  private calculatePriority(task: TaskContext, context: SchedulingContext): number {
    let priority = 0;

    // Due date urgency (sooner = higher priority)
    if (task.dueDate) {
      const daysUntilDue = Math.ceil(
        (task.dueDate.getTime() - context.currentDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysUntilDue <= 0) priority += 100; // Overdue
      else if (daysUntilDue === 1) priority += 50; // Due tomorrow
      else if (daysUntilDue <= 3) priority += 30; // Due this week
      else if (daysUntilDue <= 7) priority += 15; // Due next week
    }

    // Complexity (complex tasks get higher priority for scheduling)
    if (task.complexity === "complex") priority += 20;
    else if (task.complexity === "medium") priority += 10;

    return priority;
  }

  private buildSchedulingPrompt(context: SchedulingContext): string {
    return `You are an intelligent scheduling assistant helping a college student plan their day.

Your goal is to create a realistic, achievable daily schedule that:
1. Respects fixed commitments (classes)
2. Prioritizes tasks by urgency and complexity
3. Accounts for student preferences (energy times, break needs)
4. Provides clear reasoning for each time block
5. Warns if the day is too packed

Current date: ${context.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
Timezone: ${context.timezone}

Be realistic about time estimates and include breaks between study sessions.`;
  }

  private formatTasksForScheduling(tasks: TaskContext[]): string {
    if (tasks.length === 0) return "No tasks to schedule.";

    return tasks.map((task, i) => {
      const dueDateStr = task.dueDate
        ? ` (due: ${task.dueDate.toLocaleDateString()})`
        : "";
      return `${i + 1}. ${task.description} [${task.complexity}]${dueDateStr} (ID: ${task.id})`;
    }).join("\n");
  }

  private formatClassSchedule(classSchedules: SchedulingContext["classSchedules"]): string {
    if (classSchedules.length === 0) return "No classes scheduled.";

    return classSchedules.map(schedule => {
      const times = schedule.meetingTimes.map(mt => 
        `${mt.day} ${mt.startTime}-${mt.endTime}`
      ).join(", ");
      return `- ${schedule.courseName}${schedule.courseCode ? ` (${schedule.courseCode})` : ""}: ${times}`;
    }).join("\n");
  }

  private formatExistingBlocks(blocks: ScheduleBlockData[]): string {
    if (blocks.length === 0) return "No existing schedule blocks.";

    return blocks.map(block => {
      const timeStr = `${block.startTime.toLocaleTimeString()} - ${block.endTime.toLocaleTimeString()}`;
      return `- ${block.title} [${block.type}]: ${timeStr}`;
    }).join("\n");
  }

  private findAvailableSlots(
    blockToReschedule: ScheduleBlockData,
    existingBlocks: ScheduleBlockData[],
    classSchedules: SchedulingContext["classSchedules"],
    currentDate: Date
  ): Array<{ start: Date; end: Date }> {
    const duration = blockToReschedule.endTime.getTime() - blockToReschedule.startTime.getTime();
    const slots: Array<{ start: Date; end: Date }> = [];

    // Define day boundaries (6am to 10pm)
    const dayStart = new Date(currentDate);
    dayStart.setHours(6, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(22, 0, 0, 0);

    // Get all occupied time slots (classes + existing blocks)
    const occupied: Array<{ start: Date; end: Date }> = [];

    // Add class schedule blocks for today
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    classSchedules.forEach(schedule => {
      schedule.meetingTimes.forEach(mt => {
        if (mt.day === dayName) {
          const [startHour, startMin] = mt.startTime.split(':').map(Number);
          const [endHour, endMin] = mt.endTime.split(':').map(Number);
          const start = new Date(currentDate);
          start.setHours(startHour, startMin, 0, 0);
          const end = new Date(currentDate);
          end.setHours(endHour, endMin, 0, 0);
          occupied.push({ start, end });
        }
      });
    });

    // Add existing schedule blocks (excluding the one being rescheduled)
    existingBlocks.forEach(block => {
      if (block.id !== blockToReschedule.id) {
        occupied.push({ start: block.startTime, end: block.endTime });
      }
    });

    // Sort occupied slots by start time
    occupied.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Find gaps between occupied slots
    let currentTime = dayStart;
    for (const occupiedSlot of occupied) {
      if (currentTime < occupiedSlot.start) {
        const gapDuration = occupiedSlot.start.getTime() - currentTime.getTime();
        if (gapDuration >= duration) {
          slots.push({
            start: new Date(currentTime),
            end: new Date(currentTime.getTime() + duration),
          });
        }
      }
      currentTime = occupiedSlot.end > currentTime ? occupiedSlot.end : currentTime;
    }

    // Check gap after last occupied slot
    if (currentTime < dayEnd) {
      const gapDuration = dayEnd.getTime() - currentTime.getTime();
      if (gapDuration >= duration) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(currentTime.getTime() + duration),
        });
      }
    }

    return slots;
  }

  private createFallbackSchedule(context: SchedulingContext): ScheduleSuggestion {
    // Simple fallback: schedule tasks sequentially starting at 9am
    const blocks: ScheduleBlockData[] = [];
    
    if (context.tasks.length === 0) {
      return {
        blocks: [],
        reasoning: "No tasks to schedule.",
        warnings: ["No tasks found"],
      };
    }
    
    // Create a new date object for the target date to avoid mutating the original
    const targetDate = new Date(context.currentDate);
    targetDate.setHours(9, 0, 0, 0);
    let currentTime = new Date(targetDate);

    for (const task of context.tasks) {
      // Estimate duration based on complexity
      let duration = 60; // 1 hour default
      if (task.complexity === "simple") duration = 30;
      else if (task.complexity === "complex") duration = 120;

      const endTime = new Date(currentTime.getTime() + duration * 60 * 1000);

      // Ensure we don't schedule past 10pm
      if (currentTime.getHours() >= 22) {
        blocks.push({
          id: `fallback-${task.id}`,
          title: task.description,
          startTime: new Date(targetDate),
          endTime: new Date(targetDate.getTime() + duration * 60 * 1000),
          type: "task",
          completed: false,
          taskId: task.id,
          reasoning: "Scheduled sequentially (time adjusted due to late hour)",
        });
        break;
      }

      blocks.push({
        id: `fallback-${task.id}`,
        title: task.description,
        startTime: new Date(currentTime),
        endTime,
        type: "task",
        completed: false,
        taskId: task.id,
        reasoning: "Scheduled sequentially",
      });

      // Add break after task
      currentTime = new Date(endTime.getTime() + 10 * 60 * 1000); // 10 min break
    }

    return {
      blocks,
      reasoning: "Fallback schedule: tasks scheduled sequentially starting at 9am.",
      warnings: ["This is a basic schedule. Consider regenerating for better optimization."],
    };
  }
}

export const schedulingService = new SchedulingService();

