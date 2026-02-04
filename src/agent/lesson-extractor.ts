import type { AIProvider } from "./providers/index.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import type { Memory } from "./memory.js";

export interface ExtractedLesson {
  category: "mistake_pattern" | "habit" | "skill_gap" | "anti_pattern" | "workflow_inefficiency";
  content: string;
  confidence: number;
}

/**
 * Extracts transferable lessons from observations.
 * 
 * Design principles:
 * - Minimal prompt to keep costs low
 * - Only sees the observation text, not raw events
 * - Fire-and-forget: extraction failure doesn't block observations
 * - Runs at "quick" depth for speed and cost
 */
export class LessonExtractor {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("No AI provider specified and ANTHROPIC_API_KEY not set");
      }
      this.provider = new AnthropicProvider(apiKey, process.env.ANTHROPIC_MODEL);
    }
  }

  /**
   * Extract lessons from a single observation.
   * Returns null if no transferable lesson is found.
   * 
   * This is designed to be cheap and fast - uses "quick" depth.
   */
  async extract(observationText: string): Promise<ExtractedLesson | null> {
    if (!observationText || observationText.length < 20) {
      return null;
    }

    const prompt = this.buildExtractionPrompt(observationText);

    try {
      const response = await this.provider.analyzeWithDepth(prompt, "quick");
      return this.parseResponse(response);
    } catch (err) {
      console.warn("Lesson extraction failed:", err);
      return null;
    }
  }

  /**
   * Extract lessons and immediately store them in the global lessons table.
   * This is the fire-and-forget method that agents should call.
   */
  async extractAndStore(observationText: string, memory: Memory): Promise<void> {
    const lesson = await this.extract(observationText);
    if (lesson) {
      memory.addLesson(lesson.category, lesson.content, lesson.confidence);
    }
  }

  private buildExtractionPrompt(observationText: string): string {
    return `Analyze this observation and extract any transferable lesson about the developer's patterns, habits, or mistakes.

The lesson should be:
- Generalizable (applies to coding work broadly, not specific to this project)
- Actionable insight the developer could benefit from knowing
- A single sentence or short phrase

If no transferable lesson exists, respond with "NONE".

Categories:
- mistake_pattern: Recurring errors or oversights
- habit: Behavioral tendencies (positive or negative)
- skill_gap: Areas needing development
- anti_pattern: Inefficient approaches that repeat
- workflow_inefficiency: Process or tooling issues

Observation:
"""
${observationText.slice(0, 1000)}
"""

Respond in this exact format:
Category: <category>
Lesson: <single sentence lesson>
Confidence: <0.0-1.0>

Or respond with just: NONE`;
  }

  private parseResponse(response: string): ExtractedLesson | null {
    const trimmed = response.trim();
    
    if (trimmed === "NONE" || trimmed.length === 0) {
      return null;
    }

    const categoryMatch = trimmed.match(/Category:\s*(\w+)/i);
    const lessonMatch = trimmed.match(/Lesson:\s*(.+?)(?:\n|$)/is);
    const confidenceMatch = trimmed.match(/Confidence:\s*([0-9.]+)/i);

    if (!lessonMatch) {
      return null;
    }

    const category = (categoryMatch?.[1] || "habit") as ExtractedLesson["category"];
    const content = lessonMatch[1].trim();
    const confidence = parseFloat(confidenceMatch?.[1] || "0.5");

    // Validate category
    const validCategories: ExtractedLesson["category"][] = [
      "mistake_pattern",
      "habit",
      "skill_gap",
      "anti_pattern",
      "workflow_inefficiency",
    ];

    if (!validCategories.includes(category)) {
      return null;
    }

    return {
      category,
      content,
      confidence: Math.max(0, Math.min(1, confidence)),
    };
  }
}
