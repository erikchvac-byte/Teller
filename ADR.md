# Termeller - Architecture Decision Records

> Decision tracking for why we do what we do

## Overview

This document captures architectural and implementation decisions made in the Termeller project. Each decision includes context, rationale, and consequences.

---

## ADR-001: Increase Event Content Display Limit

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

The teller was displaying "two words for every word" with only ~10 spaces before content started. Events from OpenCode were being truncated mid-word, causing the semantic colorization parser to produce fragmented output.

### Decision

Increased the content slice limit from 60 to 120 characters in `src/ui/window.tsx` line 55:

```typescript
// Before
text = `${tagPart}(${oc.role}) ${oc.content.slice(0, 60)}`;

// After
text = `${tagPart}(${oc.role}) ${oc.content.slice(0, 120)}`;
```

### Rationale

- 60 characters was too short, causing words to be cut in half
- Fragmented words broke the semantic parser's word boundary detection
- 120 characters provides better balance between screen real estate and readability
- Terminal width is typically 80+ columns, so 120 chars is reasonable for most displays

### Consequences

**Good:**
- Events display with complete words, not fragments
- Semantic colorization works correctly on whole words
- Better user readability with more context visible

**Bad:**
- Longer lines may wrap on narrow terminals (< 120 cols)
- Slightly more memory usage per event (negligible)

---

## ADR-002: Fix Semantic Mode Word Duplication

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

In semantic coloring mode, every word was being rendered twice (e.g., "The" → "The|The", "user" → "user|user"). This made text unreadable and doubled the visual output.

### Decision

Added `hasSegments` flag in `parseSemanticText()` function in `src/utils/colorize.tsx` to prevent fallback word addition when prefix/core/suffix segments already exist:

```typescript
// Before
if (!prefixMatch && !suffixMatch) {
  segments.push({ text: part });
}

// After
let hasSegments = false;
// ... set hasSegments = true when adding segments ...
if (!hasSegments) {
  segments.push({ text: part });
}
```

### Rationale

The original logic always added the full word as fallback, even when the word was already split into prefix/core/suffix segments. This caused duplication because:

1. Words WITH prefix/suffix: Added as segments (prefix + core + suffix) AND as fallback (full word)
2. Words WITHOUT prefix/suffix: Correctly added only once via fallback

The `hasSegments` flag tracks whether any segments were added, preventing the fallback from firing when unnecessary.

### Consequences

**Good:**
- Words render exactly once, as intended
- Semantic highlighting works correctly (prefixes/suffixes colored, core normal)
- Text is readable and not duplicated

**Bad:**
- None identified

### Confirmation

Tested with manual script:
```javascript
parseColoredText("The user is experiencing spacing issues", "semantic")
// Before: The|The| |user|user| |is|is| ...
// After:  The| |user| |is| ...
```

---

## ADR-003: Implement Floor-to-Ceiling Black Background

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

The Teller UI had a default terminal background which didn't provide the desired visual aesthetic. User requested a completely black background for the entire interface while maintaining text readability and existing color schemes.

### Decision

Implemented floor-to-ceiling black background by:

1. **Background Color Changes**: Added `backgroundColor="black"` to all Box components in `src/ui/window.tsx`
2. **Text Color Corrections**: Added explicit `color="white"` for event text, removed redundant background colors from Text components
3. **Space Filling**: Added empty Box with flexGrow=1 to ensure black fills entire remaining vertical space
4. **Component Structure**: Simplified ColoredText component to render inline without nesting issues

### Rationale

- User explicitly requested black background aesthetic
- Box components inherit background to children, Text elements only need foreground colors
- Explicit white text ensures visibility against black background
- Empty filler box prevents gaps in black coverage

### Consequences

**Good:**
- Complete black background as requested
- Maintains all existing colorization functionality (keywords, semantic modes)
- Better visual contrast and readability
- Cleaner component structure

**Bad:**
- None identified - implementation meets user requirements exactly

### Confirmation

Manual testing confirmed:
- Entire UI renders with black background
- Text colors remain visible and functional
- Semantic and keyword highlighting work correctly
- No visual gaps in background coverage

---

## ADR-004: Add Event Type Visual Differentiation

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

Terminal commands and Opencode events were displayed identically in the event feed, making it difficult for users to quickly distinguish between local terminal activity and AI interactions. This reduced scannability and visual clarity.

### Decision

Added visual differentiation between event types:

1. **Extended LogEntry interface** to include `source` field ("terminal" | "opencode")
2. **Terminal events** display with 🖥️ [CMD] prefix in cyan color
3. **Opencode events** display with 🤖 [AI] prefix in magenta color
4. **Modified rendering** to use flex row layout for proper inline prefix display

### Code Changes

```typescript
// LogEntry interface extension
interface LogEntry {
  // ... existing fields
  source?: "terminal" | "opencode";
}

// Event rendering with prefixes
<Box key={e.id} flexDirection="row">
  <Text dimColor>{time(e.timestamp)} </Text>
  {e.source === "terminal" ? (
    <Text color="cyan">🖥️ [CMD] </Text>
  ) : e.source === "opencode" ? (
    <Text color="magenta">🤖 [AI] </Text>
  ) : null}
  <Text color="white" wrap="truncate">{e.text}</Text>
</Box>
```

### Rationale

- Icons provide immediate visual recognition (🖥️ = computer/terminal, 🤖 = AI/robot)
- Color coding reinforces differentiation (cyan for local commands, magenta for AI)
- [CMD] and [AI] labels provide text fallback for accessibility
- Flex row layout ensures proper alignment and truncation handling

### Consequences

**Good:**
- Users can instantly distinguish terminal vs AI events
- Improved scannability of event feed
- Color coding aligns with terminal/AI mental models
- No breaking changes to existing functionality

**Bad:**
- Slightly increased horizontal space usage (6-8 chars per event)
- Terminal width < 60 cols may experience wrapping

### Confirmation

Build passes successfully. Visual layout tested with Box flexDirection="row" structure.

---

## ADR-005: Implement Content Truncation Indicators

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

Event content was being sliced at 120 characters without any indication that truncation occurred. Users had no visual cue that content was incomplete, potentially missing important information at the end of long commands or AI responses.

### Decision

Added explicit truncation indicators:

1. **Extended LogEntry interface** to include `truncated` boolean field
2. **Modified terminal event handling** to check command length and append "..."
3. **Modified opencode event handling** to check content length and append "..."
4. **Stored truncation state** for potential future use (expandable events)

### Code Changes

```typescript
// Terminal events
const cmd = (e as TerminalEvent).command;
text = cmd.length > 120 ? cmd.slice(0, 120) + "..." : cmd;
truncated = cmd.length > 120;

// Opencode events
const content = oc.content.slice(0, 120);
truncated = oc.content.length > 120;
text = `${tagPart}(${oc.role}) ${content}${truncated ? "..." : ""}`;
```

### Rationale

- "..." is universally recognized as "more content available"
- Users immediately know when content is truncated
- Truncation state stored for future expandable event feature
- Consistent behavior across both event types

### Consequences

**Good:**
- Users aware of truncated content
- Standard "..." ellipsis convention
- Foundation for future "expand to see full content" feature
- Minimal code complexity increase

**Bad:**
- 3 additional characters used when truncated
- Very narrow terminals (< 50 cols) may show mostly "..."

### Confirmation

Build passes. Truncation logic tested with both short and long content.

---

## ADR-006: Standardize Timestamp Format to 24h

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

Timestamps used `toLocaleTimeString()` without locale specification, producing inconsistent formats across systems (e.g., "2:32:00 PM" vs "14:32:00"). This created visual inconsistency and wasted horizontal space with seconds and AM/PM markers that weren't necessary for event tracking.

### Decision

Standardized on compact 24-hour format:

1. **Changed time function** to use explicit 'en-US' locale
2. **Added hour12: false** option for 24-hour format
3. **Kept hour: '2-digit', minute: '2-digit'** for compact display
4. **Result format**: "14:32" (HH:MM)

### Code Changes

```typescript
// Before
return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// After
return new Date(ts).toLocaleTimeString('en-US', { 
  hour: '2-digit', 
  minute: '2-digit', 
  hour12: false 
});
```

### Rationale

- 24h format is standard in technical/terminal environments
- Consistent 5-character width (HH:MM) vs variable locale formats
- Removes unnecessary seconds precision for event tracking
- Explicit locale ensures consistent behavior across systems

### Consequences

**Good:**
- Consistent timestamp format across all systems
- Compact 5-character width (e.g., "14:32")
- No AM/PM ambiguity
- Professional/technical aesthetic

**Bad:**
- Users preferring 12h format may need adjustment
- Less immediately readable for non-technical users (though terminal users are typically technical)

### Confirmation

Build passes. Format verified to produce "HH:MM" consistently.

---

## ADR-007: Add Visual Section Borders

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

The Events and Observations sections blended together visually with only small dividers. Users struggled to distinguish between the two main content areas at a glance, reducing information hierarchy clarity.

### Decision

Added single-line borders around both sections using Ink's borderStyle prop:

1. **Events section**: Added `borderStyle="single"` with `borderColor="gray"`
2. **Observations section**: Added `borderStyle="single"` with `borderColor="gray"`
3. **Increased Events height** from 8 to 10 lines to accommodate border
4. **Added section icons**: ⚡ for Events, 💡 for Observations

### Code Changes

```tsx
<Box
  flexDirection="column"
  height={10}
  paddingX={1}
  overflow="hidden"
  backgroundColor="black"
  borderStyle="single"
  borderColor="gray"
>
  <Text bold underline color="gray">⚡ Events</Text>
  ...
</Box>
```

### Rationale

- Borders create clear visual separation between sections
- Gray borders maintain subtle aesthetic against black background
- Icons provide immediate visual recognition of section purpose
- Consistent styling creates cohesive design language

### Consequences

**Good:**
- Clear visual hierarchy between Events and Observations
- Users can instantly identify each section
- Professional bordered appearance
- Maintains black background aesthetic

**Bad:**
- Borders consume 2 additional lines (top and bottom)
- Slightly reduced content area within each section
- Terminal height < 20 lines may feel cramped

### Confirmation

Build passes. Visual separation tested with border rendering.

---

## ADR-008: Improve Empty State Messages

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

Empty state messages "Waiting for activity..." and "Teller is watching..." were vague and didn't explain what Teller actually monitors. Users might think the app was frozen or not understand the 2-minute analysis cycle.

### Decision

Rewrote empty states to be more informative:

1. **Events empty state**: "Monitoring terminal commands and AI conversations..."
2. **Observations empty state**: "Analyzing patterns every 2 minutes... First insight coming soon."

### Code Changes

```tsx
// Before
<Text dimColor>Waiting for activity...</Text>
<Text dimColor>Teller is watching... first analysis in ~15s</Text>

// After
<Text dimColor>Monitoring terminal commands and AI conversations...</Text>
<Text dimColor>Analyzing patterns every 2 minutes... First insight coming soon.</Text>
```

### Rationale

- Explicitly states what Teller monitors (terminal + AI)
- Explains the 2-minute analysis cycle
- Sets expectation for when first insights appear
- More professional and informative tone

### Consequences

**Good:**
- Users understand what Teller watches
- Clear expectation setting for analysis timing
- Reduced confusion about app functionality
- Better onboarding experience for new users

**Bad:**
- Slightly longer messages (more horizontal space)
- May wrap on very narrow terminals (< 50 cols)

### Confirmation

Build passes. Messages are informative without being verbose.

---

## ADR-009: Center Status in Header Layout

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

The header had branding, event count, and status competing for attention with equal visual weight. Status messages (most important for user awareness) were positioned on the right and used dimColor, making them easy to overlook.

### Decision

Reorganized header layout to prioritize status:

1. **Left**: TELLER_CLCC branding (bold cyan)
2. **Center**: Status message (white, most prominent)
3. **Right**: Event count (dimColor cyan, least important)

### Code Changes

```tsx
// Before
<Box flexDirection="row" justifyContent="space-between" ...>
  <Text bold color="cyan">TELLER_CLCC</Text>
  <Text dimColor color="cyan">[{eventCount} events]</Text>
  <Text dimColor color="cyan">{status}</Text>
</Box>

// After
<Box flexDirection="row" justifyContent="space-between" ...>
  <Text bold color="cyan">TELLER_CLCC</Text>
  <Text color="white">{status}</Text>
  <Text dimColor color="cyan">[{eventCount} events]</Text>
</Box>
```

### Rationale

- Status is most important information (what's happening now)
- Center position draws natural attention
- White color makes status pop against black background
- Event count is least important, moved to right with dimColor

### Consequences

**Good:**
- Status is immediately visible and prominent
- Clear visual hierarchy: status > branding > count
- Users always know current Teller state
- Professional header layout

**Bad:**
- Long status messages may overlap with branding/count on narrow terminals
- Users may need to adjust to new layout if familiar with old one

### Confirmation

Build passes. Header layout tested with various status message lengths.

---

## ADR-010: Add Overflow Indicators for Hidden Content

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

Users had no indication when there were more events or observations than the visible 6 items. Content scrolled out of view silently, causing users to miss potentially important information without realizing it.

### Decision

Added overflow indicators showing count of hidden items:

1. **Events overflow**: Shows "↑ {N} more events" when events.length > 6
2. **Observations overflow**: Shows "↑ {N} more observations" when observations.length > OBSERVATIONS_VISIBLE_COUNT
3. **Positioned at bottom** of each section for natural reading flow
4. **Uses dimColor** to avoid distracting from main content

### Code Changes

```tsx
// Events section
{events.length > 6 && (
  <Text dimColor>↑ {events.length - 6} more events</Text>
)}

// Observations section
{observations.length > OBSERVATIONS_VISIBLE_COUNT && (
  <Text dimColor>↑ {observations.length - OBSERVATIONS_VISIBLE_COUNT} more observations</Text>
)}
```

### Rationale

- Up arrow (↑) indicates content above the visible area
- Explicit count tells users exactly how much they're missing
- dimColor keeps indicator subtle but visible
- Helps users understand the buffer size (50 items)

### Consequences

**Good:**
- Users aware of hidden content
- No silent information loss
- Encourages users to check the full history if needed
- Transparent about data retention

**Bad:**
- Additional line used when overflow exists
- May cause slight layout shift when indicator appears/disappears

### Confirmation

Build passes. Overflow logic tested with varying event/observation counts.

---

## ADR-011: Expand Footer with System Information

**Status**: Accepted  
**Date**: 2026-02-02  
**Decision-makers**: Assistant, Stupid Human

### Context and Problem Statement

The footer only showed "Ctrl+C to quit" which wasted valuable screen real estate that could provide useful context about Teller's operation. Users had to remember or infer monitoring sources and analysis timing.

### Decision

Expanded footer to three-column layout with system information:

1. **Left**: "Ctrl+C quit" - essential control
2. **Center**: "Monitoring: Terminal + AI" - data sources
3. **Right**: "Analysis: Every 2 min" - timing information

### Code Changes

```tsx
// Before
<Box paddingX={1} backgroundColor="black">
  <Text dimColor>Ctrl+C to quit</Text>
</Box>

// After
<Box flexDirection="row" justifyContent="space-between" paddingX={1} backgroundColor="black">
  <Text dimColor>Ctrl+C quit</Text>
  <Text dimColor>Monitoring: Terminal + AI</Text>
  <Text dimColor>Analysis: Every 2 min</Text>
</Box>
```

### Rationale

- Footer is always visible - perfect place for persistent info
- Three-column layout maximizes information density
- Reinforces what Teller monitors and how often
- Consistent with header's space-between layout

### Consequences

**Good:**
- Constant reminder of Teller's capabilities
- Users always know monitoring sources and timing
- Professional appearance with balanced layout
- No additional screen space required

**Bad:**
- May wrap on very narrow terminals (< 60 cols)
- Information could be considered redundant with empty states

### Confirmation

Build passes. Footer layout tested with various terminal widths.

---

## Decision Log

| ADR | Date | Status | Title |
|-----|------|--------|-------|
| 001 | 2026-02-02 | Accepted | Increase Event Content Display Limit |
| 002 | 2026-02-02 | Accepted | Fix Semantic Mode Word Duplication |
| 003 | 2026-02-02 | Accepted | Implement Floor-to-Ceiling Black Background |
| 004 | 2026-02-02 | Accepted | Add Event Type Visual Differentiation |
| 005 | 2026-02-02 | Accepted | Implement Content Truncation Indicators |
| 006 | 2026-02-02 | Accepted | Standardize Timestamp Format to 24h |
| 007 | 2026-02-02 | Accepted | Add Visual Section Borders |
| 008 | 2026-02-02 | Accepted | Improve Empty State Messages |
| 009 | 2026-02-02 | Accepted | Center Status in Header Layout |
| 010 | 2026-02-02 | Accepted | Add Overflow Indicators for Hidden Content |
| 011 | 2026-02-02 | Accepted | Expand Footer with System Information |

---

## Template for Future ADRs

```markdown
## ADR-XXX: [Title]

**Status**: {Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-XXX}  
**Date**: YYYY-MM-DD  
**Decision-makers**: [Names]

### Context and Problem Statement

[Why was this decision needed?]

### Decision

[What did we choose?]

### Rationale

[Why this choice over alternatives?]

### Consequences

**Good:**
- [Benefit 1]
- [Benefit 2]

**Bad:**
- [Trade-off 1]
- [Trade-off 2]

### Confirmation

[How was this verified? Tests? Manual testing? Code review?]
```
