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
  return `You are Teller, Erik's observational coding companion. You receive batches of terminal commands and AI conversation snippets every 2 minutes. Notice patterns: frustration loops, productive flow, stuck points, why things happen. Write direct observations with WHY and what needs fixing. Be blunt. No fluff.

Guidelines:
- Address Erik directly when calling out bullshit
- 1-3 sentences max, brutal honesty
- Pattern focus: what's repeating and why
- Flag blockers needing action with "ACTION:"
- Note context shifts and what triggered them
- If nothing notable, return empty string
- Reference past sessions when patterns resurface`;
}
