import type { AIProvider } from "./providers/index.js";
import type { PatternCode, PatternDetection } from "./pattern-types.js";
import { getPatternDefinition } from "./pattern-definitions.js";

/**
 * Detects patterns in observations using Claude analysis
 */
export class PatternDetector {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  /**
   * Analyze observation text and recent events to detect patterns
   */
  async detectPatterns(observationText: string, recentEvents: any[]): Promise<PatternDetection[]> {
    if (!observationText || observationText.length < 20) {
      return [];
    }

    const prompt = this.buildDetectionPrompt(observationText, recentEvents);

    try {
      const response = await this.provider.analyzeWithDepth(prompt, "quick");
      return this.parseDetectionResponse(response);
    } catch (err) {
      console.warn("Pattern detection failed:", err);
      return [];
    }
  }

  private buildDetectionPrompt(observationText: string, recentEvents: any[]): string {
    // Create a concise summary of recent events for context
    const eventsSummary = recentEvents.slice(-5).map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      if (e.source === "terminal") {
        return `[${time}] Terminal: ${e.content.slice(0, 100)}`;
      } else if (e.source === "git") {
        return `[${time}] Git: ${e.type}`;
      } else {
        return `[${time}] Opencode: ${e.content.slice(0, 100)}`;
      }
    }).join('\n');

    return `Analyze this observation and identify any of these specific patterns that match the observed behavior.

BEHAVIORAL PATTERNS:
- UI-TRIAL: Developer iteratively adjusts visual elements through trial-and-error instead of calculating positioning requirements upfront
- REPEAT-FAILURE: Developer re-running same failed action without changing state or diagnosis
- TECH-DEBT-RISK: Developer uses manual workarounds when automation breaks instead of fixing underlying issue
- SOURCE-SKIP: Developer acts without consulting primary documentation, opting for multiple AI consultations instead
- UNVERIFIED-COMPLETE: Developer marks progress as complete without deployment or execution verification
- REGRESSION: Developer changes cause unrelated functionality to break

TACTICAL PATTERNS:
- EXIT-CODE-IGNORED: Command failure not checked before continuing workflow
- BLIND-RETRY: Retrying commands without investigating root cause of failure
- AUTOMATION-BYPASS: Manual testing where automation exists
- CACHE-RISK: Deployment without cache invalidation
- PORT-CONFLICT-RISK: Restart without confirming process termination
- CWD-MISMATCH: File operations executed in wrong working directory

Recent Events Context:
${eventsSummary}

Observation to Analyze:
"""
${observationText.slice(0, 1000)}
"""

Respond with JSON array. Each detection should have:
- code: exact pattern code from list above
- confidence: 0.0 to 1.0 (use 0.5+ for moderate confidence, 0.8+ for high confidence)
- evidence: brief quote from observation that supports detection
- category: "behavioral" or "tactical"

Format:
[{"code": "PATTERN_CODE", "confidence": 0.7, "evidence": "quote from observation", "category": "behavioral"}]

If no patterns detected, respond with empty array: []`;
  }

  private parseDetectionResponse(response: string): PatternDetection[] {
    const trimmed = response.trim();
    
    if (trimmed === "[]" || trimmed.length === 0) {
      return [];
    }

    try {
      // Extract JSON from response (handle potential code blocks)
      let jsonStr = trimmed;
      
      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        const lines = jsonStr.split('\n');
        const jsonLines = lines.filter(line => !line.startsWith('```') && line.trim() !== '');
        jsonStr = jsonLines.join('\n').trim();
      }
      
      const detections = JSON.parse(jsonStr);
      if (!Array.isArray(detections)) {
        return [];
      }

      return detections
        .filter(d => d.code && typeof d.confidence === 'number' && d.evidence && d.category)
        .map(d => ({
          code: d.code,
          confidence: Math.max(0, Math.min(1, d.confidence)),
          evidence: d.evidence,
          category: d.category
        }))
        .filter(d => {
          // Validate pattern code is recognized
          const definition = getPatternDefinition(d.code);
          return definition && definition.category === d.category;
        });

    } catch (err) {
      console.warn("Failed to parse pattern detection response:", err);
      console.warn("Response was:", trimmed);
      return [];
    }
  }
}