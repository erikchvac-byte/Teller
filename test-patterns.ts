import { PatternTracker } from "./src/agent/pattern-tracker.js";
import { ObservationFormatter } from "./src/agent/observation-formatter.js";
import type { PatternCode } from "./src/agent/pattern-types.js";

// Test pattern detection and escalation
console.log("=== Testing Pattern System ===");

const tracker = new PatternTracker();
const formatter = new ObservationFormatter();

// Simulate UI-TRIAL pattern occurrences
console.log("\n--- Testing UI-TRIAL Pattern ---");

const testObservation = "Developer iteratively adjusts visual elements through trial-and-error instead of calculating positioning requirements upfront, leading to inefficient micro-correction cycles.";

// Test escalation levels
for (let i = 1; i <= 4; i++) {
  const code: PatternCode = "UI-TRIAL";
  const count = tracker.increment(code);
  const label = tracker.createLabel(code);
  
  console.log(`\nOccurrence ${i} (count: ${count}):`);
  console.log(`Label: ${label.icon} ${label.code}${label.frequency > 1 ? ` (x${label.frequency})` : ''}`);
  console.log(`Escalation: ${label.escalationLevel}`);
  console.log(`Suggestion: ${label.suggestion || 'None yet'}`);
}

// Test formatting with multiple patterns
console.log("\n--- Testing Observation Formatting ---");

const patterns = [
  tracker.createLabel("UI-TRIAL"),
  tracker.createLabel("REPEAT-FAILURE")
];

const formatted = formatter.format(testObservation, patterns, Date.now());

console.log("\nFormatted Observation:");
console.log(formatted.displayText);

// Test session stats
console.log("\n--- Session Stats ---");
const stats = tracker.getSessionStats();
console.log(`Session duration: ${Math.round(stats.sessionDuration / 1000)}s`);
console.log(`Total patterns: ${stats.totalPatterns}`);
console.log(`Top patterns:`, stats.topPatterns);

console.log("\n=== Pattern System Test Complete ===");