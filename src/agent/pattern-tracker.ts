import type { PatternCode, PatternLabel } from "./pattern-types.js";
import { getPatternDefinition } from "./pattern-definitions.js";

/**
 * Session-scoped pattern frequency tracking with confidence escalation
 */
export class PatternTracker {
  private counts: Map<PatternCode, number> = new Map();
  private sessionStartTime: number;

  constructor() {
    this.sessionStartTime = Date.now();
  }

  /**
   * Increment pattern count and return new count
   */
  increment(code: PatternCode): number {
    const current = this.counts.get(code) || 0;
    const newCount = current + 1;
    this.counts.set(code, newCount);
    return newCount;
  }

  /**
   * Get current count for pattern
   */
  getCount(code: PatternCode): number {
    return this.counts.get(code) || 0;
  }

  /**
   * Get all pattern counts
   */
  getAllCounts(): Map<PatternCode, number> {
    return new Map(this.counts);
  }

  /**
   * Determine escalation level based on count
   * 1st occurrence: silent (just track)
   * 2nd occurrence: label (show frequency)
   * 3rd occurrence: confirm (show pattern definition)
   * 4th+ occurrence: active (show suggestion)
   */
  getEscalationLevel(code: PatternCode): "silent" | "label" | "confirm" | "active" {
    const count = this.getCount(code);
    
    if (count <= 1) return "silent";
    if (count === 2) return "label";
    if (count === 3) return "confirm";
    return "active";
  }

  /**
   * Create pattern label with appropriate icon and escalation
   */
  createLabel(code: PatternCode): PatternLabel {
    const count = this.getCount(code);
    const escalation = this.getEscalationLevel(code);
    const definition = getPatternDefinition(code);
    
    if (!definition) {
      throw new Error(`Unknown pattern code: ${code}`);
    }

    // Icon based on escalation level
    let icon: string;
    switch (escalation) {
      case "silent":
        icon = "📊";
        break;
      case "label":
        icon = "📊";
        break;
      case "confirm":
        icon = "⚠️";
        break;
      case "active":
        icon = "🔴";
        break;
    }

    // Suggestion only for confirmed/active patterns
    const suggestion = escalation === "confirm" || escalation === "active" 
      ? definition.suggestion 
      : undefined;

    return {
      code,
      icon,
      frequency: count,
      escalationLevel: escalation,
      suggestion
    };
  }

  /**
   * Reset all counters (called on session start)
   */
  reset(): void {
    this.counts.clear();
    this.sessionStartTime = Date.now();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    sessionDuration: number;
    totalPatterns: number;
    topPatterns: Array<{code: PatternCode, count: number}>;
  } {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const totalPatterns = Array.from(this.counts.values()).reduce((sum, count) => sum + count, 0);
    
    const topPatterns = Array.from(this.counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      sessionDuration,
      totalPatterns,
      topPatterns
    };
  }
}