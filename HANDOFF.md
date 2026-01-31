# Teller - Handoff Document

## Project Overview

Teller is an observational coding companion that monitors your terminal commands and opencode conversations, providing behavioral insights about your coding patterns.

## Key Components

### Core Files

- `src/index.ts` - Main entry point, orchestrates all components
- `src/capture/opencode-watcher.ts` - Watches opencode's storage for conversation activity
- `src/capture/terminal-hook.ts` - Captures terminal commands from PowerShell/bash history
- `src/agent/teller.ts` - Analyzes events and generates observations via Anthropic API
- `src/agent/memory.ts` - SQLite persistence for events and observations
- `src/ui/window.tsx` - React/Ink terminal UI for displaying events and observations

## Recent Fixes & Improvements (Jan 31, 2026)

### 1. OpencodeWatcher - Startup Capture Issue
**Problem**: Watcher marked all existing files as "seen" on startup, missing current conversation.

**Solution**: Modified `snapshotExisting()` to process files from last 5 minutes instead of marking everything as seen.

**Files Modified**: `src/capture/opencode-watcher.ts`

### 2. Race Condition - Events Lost on Startup
**Problem**: Events emitted during `start()` were lost because React UI hadn't mounted yet.

**Solution**: Wrapped startup calls in `setTimeout` with 500ms delay in `src/index.ts`.

**Files Modified**: `src/index.ts`

### 3. API Key Loading
**Problem**: dotenv loaded too late in teller.ts, causing missing API key errors.

**Solution**: Moved `import "dotenv/config"` to `src/index.ts` (first line) for early loading.

**Files Modified**: `src/index.ts`, `src/agent/teller.ts`

### 4. TellerAgent - Missing Events on First Run
**Problem**: `lastAnalysisTime` initialized to `Date.now()` caused skipping of startup snapshot events.

**Solution**: Changed to `lastAnalysisTime = 0` to capture all events on first analysis cycle.

**Files Modified**: `src/agent/teller.ts`

### 5. Enhanced Startup Reporting
**Improvement**: Added status messages showing how many messages/parts were captured during snapshot.

**Files Modified**: `src/capture/opencode-watcher.ts`

## Setup & Configuration

### Required Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Create `.env` file in project root with your Anthropic API key.

### Dependencies
- `@anthropic-ai/sdk` - Anthropic API client
- `better-sqlite3` - SQLite database for persistence
- `chokidar` - File system watcher
- `ink` - React for terminal UI
- `react` - UI library
- `dotenv` - Environment variable loading

### Build & Run
```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start
```

## Architecture & Data Flow

1. **Event Capture**
   - TerminalHook polls PowerShell/bash history every 3 seconds
   - OpencodeWatcher watches `~/.local/share/opencode/storage/` directory
   - Events emitted to central event bus (EventEmitter)

2. **Event Processing**
   - Events stored in SQLite via Memory class
   - Events forwarded to React UI for display
   - Events accumulate for TellerAgent analysis

3. **Analysis Cycle**
   - Every 2 minutes (configurable), TellerAgent analyzes recent events
   - Calls Anthropic Claude API with event batch and context
   - Generates 1-3 sentence observations about patterns

4. **Display**
   - Left panel: Real-time event feed (last 20 events)
   - Right panel: Observations (last 10 observations)

## Known Issues & Considerations

### File Encoding
- PowerShell `.env` files created with `echo` may be UTF-16 (invalid)
- Use UTF-8 encoding: `Set-Content -Path .env -Value "KEY=value" -Encoding utf8NoBOM`

### Event Timing
- Startup snapshot processes last 5 minutes of activity
- 500ms delay in startup prevents race condition with React UI mounting
- First analysis runs 15 seconds after startup

### Database
- Stored at `~/.termeller/memory.db`
- Contains events and observations tables
- Session IDs timestamped for filtering

## Testing Checklist

- [ ] API key loads correctly from `.env`
- [ ] OpencodeWatcher captures recent messages on startup
- [ ] TerminalHook captures new commands after startup
- [ ] React UI displays events in left panel
- [ ] TellerAgent generates observations after ~15s
- [ ] Observations appear in right panel
- [ ] No events lost during startup phase

## Git Status

- Repository initialized with initial commits
- Commits tracked with fixes for:
  - API key configuration
  - Race condition resolution
  - Startup event capture
  - Enhanced documentation
- Remote: Not configured (local only)

## Next Steps for Future Work

1. Consider making startup time window (5 min) configurable
2. Add error handling for Anthropic API rate limits
3. Add unit tests for core components
4. Consider persisting the 500ms startup delay configuration
5. Add more granular event filtering options
