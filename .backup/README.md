# Teller Backup - Current Working State

**Date:** 2026-02-02
**Purpose:** Preserve working Teller implementation before multi-provider enhancements

## What This Backup Contains

The original Teller with:
- Single "Outside Observer" personality
- Anthropic provider (Claude)
- Deep/standard/quick analysis depths
- SQLite memory system
- Terminal + Opencode capture
- React/Ink UI with colored observations

## Key Files Preserved

### Core Agent
- `src/agent/teller.ts` - Main agent logic with depth-aware analysis
- `src/agent/memory.ts` - SQLite persistence
- `src/agent/providers/anthropic.ts` - The "Outside Observer" personality
- `src/agent/providers/index.ts` - AIProvider interface with depth support
- `src/agent/providers/openai.ts` - OpenAI provider (untested)
- `src/agent/providers/factory.ts` - Multi-provider factory (untested)
- `src/agent/personas.ts` - Personality definitions (unused)

### Capture System
- `src/capture/opencode-watcher.ts` - Watches opencode storage
- `src/capture/terminal-hook.ts` - Watches shell history

### UI
- `src/ui/window.tsx` - React/Ink interface
- `src/utils/colorize.tsx` - Semantic coloring for dyslexia-friendly text

### Entry Point
- `src/index.ts` - Event bus wiring

### Dependencies
- `package.json` - Includes @anthropic-ai/sdk and openai

## To Restore This Version

```bash
cd C:\Users\erikc\Dev\Termeller
# Remove current src
cp -r .backup/src src
# Restore package.json
cp .backup/package.json package.json
# Reinstall dependencies if needed
npm install
```

## The "Outside Observer" Personality

Teller exists **outside the project**. It:
- Sees loops Erik is blind to
- Calls out "identify-but-don't-fix" patterns
- Catches "big-change-avoidance" behavior
- Recognizes recurring mistakes across sessions
- **Never suggests code changes**
- Uses prefixes: `LOOP:`, `GAP:`, `AVOIDANCE:`
- Brutal, 1-2 sentences, no fluff

## Analysis Depths

- **Quick** (150 tokens) - Obvious patterns, 1 sentence
- **Standard** (300 tokens) - Moderate depth, 2 sentences
- **Deep** (500 tokens) - Connects patterns, tracks emotional arc, 3-4 sentences

Dynamic selection:
- Every 5th analysis goes deep
- 15+ events = deep
- <3 events = quick

## What We're Adding Next

1. OpenCode Free models provider (zero cost default)
2. Multi-provider fallback chain
3. Provider selection via environment variables
4. Same personality across all providers

## Why This Backup Matters

The current Teller has a specific "voice" and behavioral analysis framework that works. The multi-provider additions shouldn't change:
- The personality/prompt
- The depth logic
- The observation style
- The "outside observer" detachment

Only the underlying LLM provider should change.
