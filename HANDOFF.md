# Teller - Handoff Document

## Current Status (Feb 1, 2026)

Teller is **fully operational** with all core functionality working:

### ✅ Working Components
- **OpencodeWatcher**: Captures conversations with startup snapshot + real-time watching
- **TerminalHook**: Monitors PowerShell/bash history every 3 seconds  
- **TellerAgent**: Generates behavioral observations every 2 minutes
- **Memory**: SQLite persistence for events and observations
- **UI**: React/Ink terminal interface with live updates

### ✅ Recent Critical Fixes (Jan 31, 2026)

#### Fix #0: Critical Bug - snapshotExisting() Never Called
**Problem**: `snapshotExisting()` method was implemented but never invoked in `start()`
**Root Cause**: Missing `this.snapshotExisting()` call in OpencodeWatcher.start()
**Solution**: Added method call before setting up file watchers
**Result**: Startup snapshot now loads last 5 minutes of conversations

#### Fix #1: Real-time File Watching
**Problem**: File watchers not detecting new events on Windows
**Solution**: Added polling mode with `usePolling: true` and directory watching
**Result**: New opencode messages appear immediately in feed

## Setup & Configuration

### Required Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
DEBUG=false  # Optional: Enable detailed logging
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

## Error Handling

- Missing API key: Clear error message on startup
- Rate limits: Handled by Anthropic SDK (throws error)
- Invalid JSON: Graceful degradation
- File system errors: Logged, don't crash

## Performance Considerations

- **Event Buffer**: In-memory, cleared after analysis
- **Analysis Interval**: 2 minutes (balances responsiveness with API costs)
- **Startup Window**: 5 minutes (comprehensive without overwhelming)
- **Database**: SQLite for zero-config persistence

---

**Last Updated**: February 1, 2026  
**Status**: Production Ready