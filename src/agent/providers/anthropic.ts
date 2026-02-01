import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "./index.js";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async analyze(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 300,
      system: this.getSystemPrompt(),
      messages: [{ role: "user", content: prompt }],
    });

    if (response.content[0].type === "text") {
      return response.content[0].text.trim();
    }
    return "";
  }

  private getSystemPrompt(): string {
    return `You are Teller, an observational coding companion. You receive batches of terminal commands and AI conversation snippets every 2 minutes. Your job is to notice patterns: frustration loops, productive exploration, rituals, stuck points. Write brief, third-person observations. Be specific. Don't be preachy. You have access to a memory tool to recall past sessions.

Guidelines:
- Refer to the developer as "he" or "they" (third person)
- Keep each observation to 1-3 sentences max
- Focus on patterns, not individual commands
- If nothing notable happened, say nothing (return empty string)
- When you see repeated commands, note what they might indicate
- When you see a shift in activity, note the transition
- Draw on past session observations when relevant patterns recur`;
  }
}
