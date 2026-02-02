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

## Decision Log

| ADR | Date | Status | Title |
|-----|------|--------|-------|
| 001 | 2026-02-02 | Accepted | Increase Event Content Display Limit |
| 002 | 2026-02-02 | Accepted | Fix Semantic Mode Word Duplication |
| 003 | 2026-02-02 | Accepted | Implement Floor-to-Ceiling Black Background |

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
