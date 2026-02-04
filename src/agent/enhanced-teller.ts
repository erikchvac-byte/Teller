import { Memory, type StoredEvent, type StoredObservation, type StoredLesson } from "./memory.js";
import type { AIProvider } from "./providers/index.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { LessonExtractor } from "./lesson-extractor.js";
import * as vectra from "vectra"; // Vector embedding + similarity search

// Type definition for vector-enhanced memory
export interface VectorMemory extends Memory {
  // Store and retrieve vector embeddings for observations
  addObservationWithEmbedding(observation: string): Promise<void>;
  findSimilarObservations(query: string, count?: number, threshold?: number): Promise<StoredObservation[]>;
}

export interface TellerObservation {
  text: string;
  timestamp: number;
  depth?: "quick" | "standard" | "deep";
  
  // New fields for enhanced pattern tracking
  patterns?: {
    loops?: string[];
    intentDrift?: string;
    similarPast?: string[];
  };
}

/**
 * Enhanced Teller agent with skills and vector memory for behavioral analysis
 * Extends the original TellerAgent with advanced pattern recognition
 */
export class EnhancedTellerAgent {
  private provider: AIProvider;
  private memory: Memory;
  private vectorMemory?: VectorMemory;
  private analysisInterval: ReturnType<typeof setInterval> | null = null;
  private lastAnalysisTime: number;
  private intervalMs: number;
  private onObservation: (obs: TellerObservation) => void;
  private onError: (err: Error) => void;
  private analysisDepth: "quick" | "standard" | "deep";
  private patternCounter: number = 0;
  private skillLoader: (name: string) => Promise<any>;
  private lessonExtractor: LessonExtractor;

  constructor(opts: {
    memory: Memory;
    vectorMemory?: VectorMemory;
    provider?: AIProvider;
    intervalMs?: number;
    analysisDepth?: "quick" | "standard" | "deep";
    onObservation: (obs: TellerObservation) => void;
    onError?: (err: Error) => void;
    skillLoader?: (name: string) => Promise<any>;
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
    this.vectorMemory = opts.vectorMemory;
    this.intervalMs = opts.intervalMs || 2 * 60 * 1000;
    this.lastAnalysisTime = 0;
    this.analysisDepth = opts.analysisDepth || "standard";
    this.onObservation = opts.onObservation;
    this.onError = opts.onError || (() => {});
    this.skillLoader = opts.skillLoader || (async (name: string) => null);
    this.lessonExtractor = new LessonExtractor(this.provider);
  }

  // The rest of the methods remain similar, with enhanced analyze()
  start(): void {
    setTimeout(() => this.analyze(), 15_000);
    this.analysisInterval = setInterval(() => this.analyze(), this.intervalMs);
  }

  stop(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

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
      const globalLessons = this.memory.getLessons(5);

      // NEW: Apply skills for pattern pre-analysis
      const patterns = await this.applySkills(recentEvents, sessionObservations);
      
      // NEW: Find similar past sessions using vector similarity (if available)
      const similarPastObservations = await this.findSimilarObservations(recentEvents);
      
      // Build prompt with enhanced context
      const prompt = this.buildPrompt(
        recentEvents,
        pastObservations,
        sessionObservations,
        patterns,
        similarPastObservations,
        globalLessons,
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
          depth: currentDepth,
          patterns: patterns // Include the pattern data for UI display
        };
        
        // Regular memory storage
        this.memory.addObservation(text);
        
        // Vector memory storage (if available)
        if (this.vectorMemory) {
          await this.vectorMemory.addObservationWithEmbedding(text);
        }
        
        // Fire-and-forget: extract global lessons from this observation
        this.lessonExtractor.extractAndStore(text, this.memory).catch(() => {
          // Non-critical: lesson extraction failure should not affect observation flow
        });
        
        this.onObservation(observation);
      }
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Load and apply skills to detect patterns in the recent events
   */
  private async applySkills(events: StoredEvent[], sessionObservations: StoredObservation[]): Promise<any> {
    const patterns: any = {};
    
    try {
      // Try to load loop detector skill
      const loopDetector = await this.skillLoader("teller-loop-detector");
      if (loopDetector) {
        patterns.loops = await loopDetector.detectLoops(events);
      }
      
      // Try to load intent tracker skill
      const intentTracker = await this.skillLoader("teller-intent-tracker");
      if (intentTracker) {
        patterns.intentDrift = await intentTracker.trackIntent(events, sessionObservations);
      }
      
      // More skills can be added here
    } catch (err) {
      console.warn("Error loading skills:", err);
      // Non-critical error, continue without skills
    }
    
    return patterns;
  }
  
  /**
   * Find similar past observations using vector embeddings
   */
  private async findSimilarObservations(events: StoredEvent[]): Promise<StoredObservation[]> {
    if (!this.vectorMemory) {
      return [];
    }
    
    try {
      // Create a query from recent events
      const query = events.map(e => e.content).join(" ");
      
      // Find similar past observations
      const similarObservations = await this.vectorMemory.findSimilarObservations(
        query,
        5, // Top 5 most similar
        0.7 // Similarity threshold
      );
      
      return similarObservations;
    } catch (err) {
      console.warn("Error finding similar observations:", err);
      return [];
    }
  }

  private buildPrompt(
    events: StoredEvent[],
    pastObservations: StoredObservation[],
    sessionObservations: StoredObservation[],
    patterns: any = {},
    similarPastObservations: StoredObservation[] = [],
    globalLessons: StoredLesson[] = [],
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
    
    if (patterns.loops && patterns.loops.length > 0) {
      parts.push("\n## Detected Command Loops\n");
      for (const loop of patterns.loops) {
        parts.push(`- ${loop}`);
      }
    }
    
    if (patterns.intentDrift) {
      parts.push("\n## Intent Tracking Analysis\n");
      parts.push(patterns.intentDrift);
    }
    
    if (similarPastObservations.length > 0) {
      parts.push("\n## Similar Past Patterns\n");
      for (const o of similarPastObservations) {
        const date = new Date(o.timestamp).toLocaleDateString();
        parts.push(`- [${date}] ${o.observation}`);
      }
    }

    // Global lessons - read-only behavioral intelligence from all workspaces
    if (globalLessons.length > 0) {
      parts.push("\n## Lessons learned (global)\n");
      parts.push("These patterns were observed across your coding work:\n");
      for (const lesson of globalLessons) {
        const confidenceLabel = lesson.confidence > 0.8 ? "high" : lesson.confidence > 0.5 ? "medium" : "low";
        parts.push(`- [${lesson.category}] ${lesson.content} (${confidenceLabel} confidence)`);
      }
    }

    parts.push(
      "\n## Instructions\nBased on the recent activity and pattern analysis, provide observations about coding patterns and behavior. Include confidence levels, evidence references, and potential risks. If nothing notable, respond with an empty string.",
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