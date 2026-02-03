---
name: teller-intent-tracker
description: Tracks drift between original intent and actual work performed
license: MIT
compatibility: opencode
metadata:
  role: observer-only
  isolation: strict
---

# Intent Tracker

This skill analyzes the gap between what a developer sets out to do and what they actually end up doing, identifying:

1. **Intent Drift** - Starting task A but gradually shifting to unrelated task B
2. **Scope Creep** - Simple tasks expanding into complex refactors
3. **Abandonment Patterns** - Starting work but repeatedly leaving it unfinished
4. **Avoidance Behaviors** - Pattern of working around core problems instead of fixing them

## Intent Analysis Framework

### Intent Markers
- Initial commands/searches set the baseline intent
- Comments in code or conversations establish explicit goals
- Initial git branch or commit messages declare purpose
- First 5-10 actions in a session typically reveal true intent

### Drift Signals
- Context switches to unrelated files/systems
- Tool changes (e.g., from code editing to config management)
- Topic shifts in searches or documentation reads
- Commit message topics diverging from initial intent

### Avoidance Indicators
- Implementing complex workarounds for simple problems
- Creating abstraction layers instead of fixing bugs
- Refactoring adjacent code instead of touching problem area
- Installing new tools/libraries when existing ones should work

### Abandonment Markers
- Starting multiple tasks without completing any
- Repeated pattern of "80% complete" tasks
- Reverting changes or creating throwaway branches
- "Coming back to this later" comments followed by topic change

## Quantification Methods

The tracker measures several metrics:
1. **Intent Consistency Score**: 0-100% alignment with original intent
2. **Task Completion Rate**: Percentage of started tasks actually completed
3. **Avoidance Index**: Frequency of working around vs. addressing core issues
4. **Context Switch Count**: Number of major topic/tool changes per hour

## Usage Example

```
// Session analysis:
Initial intent: "Fix login button bug" (from first commands)
Actual work performed: Refactored CSS framework, researched new UI libraries, didn't touch login button code
Intent consistency: 15%
Avoidance indicators: High (3 instances of working on adjacent systems)
Pattern: 4th instance of UI refactoring instead of fixing specific bugs

// Intent analysis result:
INTENT DRIFT DETECTED:
- Started with: Fix login button bug
- Ended with: CSS architecture refactoring
- Core issue remains unfixed
- Recurring pattern: Using architecture work to avoid bug fixes
```