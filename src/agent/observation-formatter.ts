import type { PatternCode, PatternLabel, FormattedObservation } from "./pattern-types.js";

/**
 * Formats observations with pattern labels and escalation wording
 * Maintains Outside Observer philosophy: no blocking, no questions, label behavior only
 */
export class ObservationFormatter {
  
  /**
   * Format observation text with pattern labels based on escalation level
   */
  format(originalText: string, patterns: PatternLabel[], timestamp: number): FormattedObservation {
    if (patterns.length === 0) {
      return {
        originalText,
        displayText: originalText,
        patterns: [],
        timestamp
      };
    }

    // Create pattern prefixes for display
    const patternPrefixes = patterns.map(p => this.formatPatternPrefix(p)).join('\n');
    
    // Format display text based on highest escalation level
    const highestEscalation = this.getHighestEscalation(patterns);
    let displayText: string;

    switch (highestEscalation) {
      case "silent":
        // Just label, no extra formatting
        displayText = `${patternPrefixes}\n${originalText}`;
        break;
        
      case "label": {
        // Show frequency
        displayText = `${patternPrefixes}\n${originalText}`;
        break;
      }
        
      case "confirm": {
        // Show pattern definition
        const confirmLines = patterns.map(p => 
          p.escalationLevel === "confirm" 
            ? `→ Pattern: ${this.getPatternDefinition(p.code)}`
            : ""
        ).filter(Boolean);
        
        displayText = `${patternPrefixes}\n${confirmLines.join('\n')}\n${originalText}`;
        break;
      }
        
      case "active": {
        // Show suggestions
        const suggestionLines = patterns.map(p => 
          p.escalationLevel === "active"
            ? `→ Consider: ${p.suggestion}`
            : ""
        ).filter(Boolean);
        
        displayText = `${patternPrefixes}\n${suggestionLines.join('\n')}\n${originalText}`;
        break;
      }
        
      default:
        displayText = originalText;
    }

    return {
      originalText,
      displayText: displayText.trim(),
      patterns,
      timestamp
    };
  }

  /**
   * Format individual pattern label based on escalation level
   */
  private formatPatternPrefix(pattern: PatternLabel): string {
    const { icon, code, frequency, escalationLevel } = pattern;

    switch (escalationLevel) {
      case "silent":
        return `${icon} ${code}`;
        
      case "label":
        return `${icon} ${code} (x${frequency})`;
        
      case "confirm":
        return `${icon} ${code} confirmed (x${frequency})`;
        
      case "active":
        return `${icon} ${code} active (x${frequency})`;
        
      default:
        return `${icon} ${code}`;
    }
  }

  /**
   * Get pattern definition for display
   */
  private getPatternDefinition(code: PatternCode): string {
    // Map to definitions defined in pattern-definitions.ts
    const definitions = {
      "UI-TRIAL": "Iterative visual adjustment without measuring constraints first",
      "REPEAT-FAILURE": "Re-running same failed action without changing approach",
      "TECH-DEBT-RISK": "Using manual workarounds instead of fixing automation",
      "SOURCE-SKIP": "Acting without consulting primary documentation",
      "UNVERIFIED-COMPLETE": "Marking complete without deployment verification",
      "REGRESSION": "Unrelated functionality breaking after changes",
      "EXIT-CODE-IGNORED": "Command failure not checked before continuing",
      "BLIND-RETRY": "Retrying commands without investigating root cause",
      "AUTOMATION-BYPASS": "Manual testing where automation exists",
      "CACHE-RISK": "Deployment without cache invalidation",
      "PORT-CONFLICT-RISK": "Restart without confirming process termination",
      "CWD-MISMATCH": "File operations executed in wrong directory"
    };

    return definitions[code as keyof typeof definitions] || "Unknown pattern";
  }

  /**
   * Get highest escalation level from pattern list
   */
  private getHighestEscalation(patterns: PatternLabel[]): "silent" | "label" | "confirm" | "active" {
    const escalationOrder: Record<string, number> = { "silent": 1, "label": 2, "confirm": 3, "active": 4 };
    
    return patterns.reduce((highestEscalation, pattern) => {
      const currentLevel = escalationOrder[pattern.escalationLevel] || 1;
      const highestLevel = escalationOrder[highestEscalation] || 1;
      return currentLevel > highestLevel ? pattern.escalationLevel : highestEscalation;
    }, "silent" as "silent" | "label" | "confirm" | "active");
  }
}