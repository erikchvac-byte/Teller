---
name: teller-cross-session
description: Identifies patterns across multiple coding sessions using semantic analysis
license: MIT
compatibility: opencode
metadata:
  role: observer-only
  isolation: strict
---

# Cross-Session Pattern Analyzer

This skill performs semantic analysis across multiple sessions to identify:

1. **Recurring Mistakes** - Same errors happening across different sessions
2. **Learning Gaps** - Technologies or concepts repeatedly causing problems
3. **Productivity Cycles** - Time-of-day or day-of-week patterns in flow state
4. **Success Patterns** - What approaches consistently lead to completed work

## Cross-Session Analysis Methods

### Vector Similarity Search
- Each session is encoded into vector embeddings
- Current session is compared against historical sessions
- "Semantic rhyming" identifies patterns that are conceptually similar even with different code/commands
- Top matches are analyzed for behavioral insights

### Temporal Pattern Detection
- Analyzes session timing, duration, and outcomes
- Identifies optimal coding hours based on success rate
- Detects fatigue patterns and diminishing returns
- Maps productivity to time-of-day and day-of-week

### Technology-Specific Pattern Matching
- Groups sessions by primary technologies used
- Identifies technologies that consistently cause problems
- Highlights knowledge gaps across multiple sessions
- Tracks learning progress over time

### Success vs. Failure Analysis
- Compares successful sessions with unsuccessful ones
- Identifies environmental/approach differences between them
- Analyzes command patterns that correlate with success
- Highlights warning signs that precede abandonment

## Data Points Tracked

The analyzer collects these metrics across sessions:

1. **Technology Stack**: Primary languages, frameworks, tools used
2. **Session Timing**: Start time, duration, days between sessions
3. **Completion Rate**: Percentage of sessions that achieved stated goals
4. **Error Frequency**: Common errors and their recurrence rate
5. **Flow Indicators**: Command velocity, context switching frequency
6. **Sentiment Markers**: Frustration signals, celebration signals

## Usage Example

```
// Current session:
React component refactoring, 4 hours, evening, many useState issues

// Vector search finds similar past sessions:
- 3 weeks ago: React hook refactoring (78% similarity)
- 2 months ago: React state management problems (71% similarity)
- 5 days ago: Component architecture changes (68% similarity)

// Cross-session analysis results:
CROSS-SESSION PATTERN DETECTED:
- React state management causes recurring issues
- Evening sessions show 40% lower completion rate than morning sessions
- Success pattern: When you start with tests, completion rate increases by 65%
- Gap identified: React hooks conceptual model needs reinforcement
```