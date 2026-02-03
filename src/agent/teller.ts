import { Memory, type StoredEvent, type StoredObservation } from "./memory.js";
import type { AIProvider } from "./providers/index.js";
import { AnthropicProvider } from "./providers/anthropic.js";

export interface TellerObservation {
  text: string;
  timestamp: number;
  depth?: "quick" | "standard" | "deep";
}

/**
 * The Teller agent. Periodically analyzes batched events via Claude
 * and produces narrative observations about coding behavior.
 */
export class TellerAgent {
  private provider: AIProvider;
  private memory: Memory;
  private analysisInterval: ReturnType<typeof setInterval> | null = null;
  private lastAnalysisTime: number;
  private intervalMs: number;
  private onObservation: (obs: TellerObservation) => void;
  private onError: (err: Error) => void;
  private analysisDepth: "quick" | "standard" | "deep";
  private patternCounter: number = 0; // Tracks number of analyses to periodically use deep analysis

  constructor(opts: {
    memory: Memory;
    provider?: AIProvider;
    intervalMs?: number;
    analysisDepth?: "quick" | "standard" | "deep";
    onObservation: (obs: TellerObservation) => void;
    onError?: (err: Error) => void;
  }) {
    if (opts.provider) {
      this.provider = opts.provider;
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("No AI provider specified and ANTHROPIC_API_KEY not set");
      }
      this.provider = new AnthropicProvider(apiKey, process.env.ANTHROPIC_MODEL);
    }
    this.memory = opts.memory;
    this.intervalMs = opts.intervalMs || 2 * 60 * 1000; // 2 minutes
    this.lastAnalysisTime = 0; // Capture all events on first run
    this.analysisDepth = opts.analysisDepth || "standard";
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
      const analysisThreshold = this.lastAnalysisTime === 0 ? 0 : this.lastAnalysisTime + 1;
      const recentEvents = this.memory.getRecentEvents(analysisThreshold);

      if (recentEvents.length === 0) {
        return;
      }

      const maxTimestamp = Math.max(...recentEvents.map(e => e.timestamp));
      this.lastAnalysisTime = maxTimestamp;

      const pastObservations = this.memory.getPastObservations(10);
      const sessionObservations = this.memory.getSessionObservations();

      const prompt = this.buildPrompt(
        recentEvents,
        pastObservations,
        sessionObservations,
      );
      
      // Dynamically determine analysis depth
      let currentDepth = this.analysisDepth;
      
      // Every 5th analysis, do a deep analysis to find longer-term patterns
      this.patternCounter++;
      if (this.patternCounter % 5 === 0) {
        currentDepth = "deep";
      }
      
      // If we have a lot of events or the session is long, use deeper analysis
      if (recentEvents.length > 15) {
        currentDepth = "deep";
      } else if (recentEvents.length < 3) {
        currentDepth = "quick";
      }
      
      // Use the depth-aware analysis method
      const text = await this.provider.analyzeWithDepth(prompt, currentDepth);

      if (text && text.length > 0) {
        const observation: TellerObservation = {
          text,
          timestamp: Date.now(),
          depth: currentDepth, // Store the depth used
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

    parts.push("## Recent Activity (last batch)\n");
    for (const e of events) {
      const time = new Date(e.timestamp).toLocaleTimeString();
      if (e.source === "terminal") {
        parts.push(`[${time}] $ ${e.content}`);
      } else if (e.source === "git") {
        parts.push(`[${time}] [GIT ${e.type}]\n${e.content.slice(0, 1000)}`);
      } else {
        parts.push(`[${time}] [opencode/${e.type}] ${e.content.slice(0, 500)}`);
      }
    }

    parts.push("\n## Development Progression (Git Commit Analysis)\n");
    const gitEvents = events.filter(e => e.source === "git");
    if (gitEvents.length > 0) {
      const completedWork = gitEvents.filter(e => e.type === "git_commit");
      if (completedWork.length > 0) {
        parts.push(`Completed Work (${completedWork.length} commits):`);
        for (const e of completedWork.slice(-5)) {
          const time = new Date(e.timestamp).toLocaleTimeString();
          const fileChanges = this.extractFileChanges(e.content);
          parts.push(`  [${time}] ${fileChanges}`);
        }
      }
    } else {
      parts.push("(No git activity detected in this batch)");
    }

    if (sessionObservations.length > 0) {
      parts.push("\n## Your earlier observations this session\n");
      for (const o of sessionObservations.slice(-5)) {
        parts.push(`- ${o.observation}`);
      }
    }

    if (pastObservations.length > 0) {
      parts.push("\n## Observations from past sessions\n");
      for (const o of pastObservations.slice(0, 5)) {
        const date = new Date(o.timestamp).toLocaleDateString();
        parts.push(`- [${date}] ${o.observation}`);
      }
    }

    parts.push(
      "\n## Instructions\nBased on the recent activity, provide observations about coding patterns and behavior. Include confidence levels, evidence references, and potential risks. If nothing notable, respond with an empty string.",
    );

    return parts.join("\n");
  }

  private extractFileChanges(gitContent: string): string {
    const changes: string[] = [];
    const lines = gitContent.split("\n");
    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        const match = line.match(/diff --git a\/(\S+)/);
        if (match) {
          changes.push(match[1]);
        }
      }
      if (changes.length >= 3) break;
    }
    return changes.length > 0 ? changes.join(", ") : "(file details not available)";
  }
}
