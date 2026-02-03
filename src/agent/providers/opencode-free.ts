import type { AIProvider } from "./index.js";

/**
 * OpenCode Free Provider
 * Free built-in LLM for Teller with no API key requirements
 */
export class OpencodeFreeProvider implements AIProvider {
  name = "opencode-free";
  private model: string;

  constructor(model?: string) {
    this.model = model || "teller-default";
  }

  async analyze(prompt: string): Promise<string> {
    return this.analyzeWithDepth(prompt, "standard");
  }

  async analyzeWithDepth(prompt: string, depth: "quick" | "standard" | "deep"): Promise<string> {
    // Since this is a placeholder, we'll return a simple message
    console.log("[OpenCode Free] Using free provider (no API call)");
    
    // In a real implementation, this would make API calls to a service
    return "This is a free observation from OpenCode. Please set up a real provider by adding ANTHROPIC_API_KEY or OPENAI_API_KEY in your .env file.";
  }
}