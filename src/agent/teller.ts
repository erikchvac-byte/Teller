import Anthropic from "@anthropic-ai/sdk";
import { Memory, type StoredEvent, type StoredObservation } from "./memory.js";

const SYSTEM_PROMPT = `You are Teller, an observational coding companion. You receive batches of terminal commands and AI conversation snippets every 2 minutes. Your job is to notice patterns: frustration loops, productive exploration, rituals, stuck points. Write brief, third-person observations. Be specific. Don't be preachy. You have access to a memory tool to recall past sessions.

Guidelines:
- Refer to the developer as "he" or "they" (third person)
- Keep each observation to 1-3 sentences max
- Focus on patterns, not individual commands
- If nothing notable happened, say nothing (return empty string)
- When you see repeated commands, note what they might indicate
- When you see a shift in activity, note the transition
- Draw on past session observations when relevant patterns recur`;

export interface TellerObservation {
  text: string;
  timestamp: number;
}

/**
 * The Teller agent. Periodically analyzes batched events via Claude
 * and produces narrative observations about coding behavior.
 */
export class TellerAgent {
  private client: Anthropic;
  private memory: Memory;
  private analysisInterval: ReturnType<typeof setInterval> | null = null;
  private lastAnalysisTime: number;
  private intervalMs: number;
  private onObservation: (obs: TellerObservation) => void;
  private onError: (err: Error) => void;
  private model: string;

  constructor(opts: {
    memory: Memory;
    intervalMs?: number;
    model?: string;
    onObservation: (obs: TellerObservation) => void;
    onError?: (err: Error) => void;
  }) {
    this.client = new Anthropic();
    this.memory = opts.memory;
    this.intervalMs = opts.intervalMs || 2 * 60 * 1000; // 2 minutes
    this.model = opts.model || "claude-sonnet-4-20250514";
    this.lastAnalysisTime = Date.now();
    this.onObservation = opts.onObservation;
    this.onError = opts.onError || (() => {});
  }

  start(): void {
    // Run first analysis after a short delay to collect initial events
    setTimeout(() => this.analyze(), 15_000);
    this.analysisInterval = setInterval(() => this.analyze(), this.intervalMs);
  }

  stop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  /** Force an immediate analysis cycle */
  async analyzeNow(): Promise<void> {
    await this.analyze();
  }

  private async analyze(): Promise<void> {
    try {
      const recentEvents = this.memory.getRecentEvents(this.lastAnalysisTime);
      this.lastAnalysisTime = Date.now();

      if (recentEvents.length === 0) return;

      const pastObservations = this.memory.getPastObservations(10);
      const sessionObservations = this.memory.getSessionObservations();

      const prompt = this.buildPrompt(
        recentEvents,
        pastObservations,
        sessionObservations,
      );

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        response.content[0].type === "text"
          ? response.content[0].text.trim()
          : "";

      if (text && text.length > 0) {
        const observation: TellerObservation = {
          text,
          timestamp: Date.now(),
        };
        this.memory.addObservation(text);
        this.onObservation(observation);
      }
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private buildPrompt(
    events: StoredEvent[],
    pastObservations: StoredObservation[],
    sessionObservations: StoredObservation[],
  ): string {
    const parts: string[] = [];

    // Recent events batch
    parts.push("## Recent Activity (last batch)\n");
    for (const e of events) {
      const time = new Date(e.timestamp).toLocaleTimeString();
      if (e.source === "terminal") {
        parts.push(`[${time}] $ ${e.content}`);
      } else {
        parts.push(`[${time}] [opencode/${e.type}] ${e.content.slice(0, 500)}`);
      }
    }

    // Session observations so far
    if (sessionObservations.length > 0) {
      parts.push("\n## Your earlier observations this session\n");
      for (const o of sessionObservations.slice(-5)) {
        parts.push(`- ${o.observation}`);
      }
    }

    // Cross-session memory
    if (pastObservations.length > 0) {
      parts.push("\n## Observations from past sessions\n");
      for (const o of pastObservations.slice(0, 5)) {
        const date = new Date(o.timestamp).toLocaleDateString();
        parts.push(`- [${date}] ${o.observation}`);
      }
    }

    parts.push(
      "\n## Instructions\nBased on the recent activity, provide a brief observation. If nothing notable, respond with an empty string.",
    );

    return parts.join("\n");
  }
}
