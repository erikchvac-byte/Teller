# Recent Changes

This document tracks recent improvements and bug fixes to the Teller project.

**Last Updated**: January 31, 2026

---

## Summary of Changes

Between initial development and current state, **5 critical fixes** were applied to resolve startup issues, race conditions, and event capture problems:

1. ✅ OpencodeWatcher - Fixed startup capture (processes last 5 minutes)
2. ✅ Race Condition - Fixed UI mount timing (500ms delay)
3. ✅ API Key Loading - Fixed dotenv initialization order
4. ✅ TellerAgent - Fixed first analysis cycle (lastAnalysisTime = 0)
5. ✅ Enhanced Startup Reporting - Added message/part counts

---

## Fix #1: OpencodeWatcher - Startup Capture Issue

### Problem
When Teller started, `OpencodeWatcher.snapshotExisting()` marked all existing files in opencode storage as "seen", causing it to ignore them. This meant the current active conversation was never captured.

### Root Cause
The original `snapshotExisting()` method walked through all files and marked them as seen without processing their content. It was designed to avoid duplicate processing but inadvertently skipped current activity.

### Solution
Modified `src/capture/opencode-watcher.ts`:

**Changed `snapshotExisting()` method**:
```typescript
// OLD: Mark all files as seen
async snapshotExisting(): Promise<void> {
  // ... walk directory and mark as seen without processing
}

// NEW: Process files from last 5 minutes
async snapshotExisting(): Promise<void> {
  const stats = await this.walkAndProcessRecent(this.storagePath);
  this.emit('status', `Processed ${stats.recent} recent files (skipped ${stats.skipped} old files)`);
}
```

**Added `walkAndProcessRecent()` helper**:
```typescript
private async walkAndProcessRecent(dir: string): Promise<{recent: number, skipped: number}> {
  const recent = 5 * 60 * 1000; // 5 minutes in milliseconds
  const stats = { recent: 0, skipped: 0 };
  
  // Recursively walk directory
  // If file modified within last 5 minutes → process it
  // Otherwise → mark as seen and skip
  return stats;
}
```

### Impact
- ✅ Captures current conversation on startup
- ✅ Reduces initial processing load (only last 5 minutes)
- ✅ Provides status feedback (counts of recent/skipped files)

---

## Fix #2: Race Condition - Events Lost on Startup

### Problem
Events emitted during component startup were lost because the React UI hadn't mounted yet. The `useEffect` hook in the UI component hadn't attached event listeners when the first events were fired.

### Root Cause
The startup sequence was synchronous:
1. `opencode.start()` emitted events immediately
2. `terminal.start()` emitted events immediately
3. `agent.start()` began analysis immediately
4. React UI mounted and attached listeners **after** events were already fired

### Solution
Modified `src/index.ts`:

**Wrapped startup calls in `setTimeout`**:
```typescript
// OLD: Synchronous startup
opencode.start();
terminal.start();
agent.start();

// NEW: Delayed startup (500ms)
setTimeout(() => {
  opencode.start().catch(err => {
    console.error('Failed to start opencode watcher:', err);
  });
  
  terminal.start();
  
  agent.start();
}, 500);
```

### Impact
- ✅ React UI mounts before events are emitted
- ✅ All startup events are captured and displayed
- ✅ Consistent behavior across all startups

### Trade-offs
- 500ms delay adds to startup time (acceptable for CLI application)
- Fixed delay vs. dynamic detection (simpler implementation)

---

## Fix #3: API Key Loading - dotenv Import Order

### Problem
Application failed to find `ANTHROPIC_API_KEY` even though `.env` file existed and contained the key.

### Root Cause
`dotenv` was imported in `src/agent/teller.ts`, but environment variables weren't loaded until after the API key check failed. The import statement was executed, but the side effect of loading `.env` happened too late.

### Solution
Modified `src/index.ts` and `src/agent/teller.ts`:

**Moved dotenv import to index.ts (first line)**:
```typescript
// src/index.ts - NEW (first line)
import "dotenv/config";

import { create } from 'ink';
import React from 'react';
// ... rest of imports
```

**Removed duplicate import from teller.ts**:
```typescript
// src/agent/teller.ts - REMOVED
// import "dotenv/config";

// ... rest of file
```

**Added dotenv to package.json dependencies**:
```json
{
  "dependencies": {
    "dotenv": "^16.4.0",
    // ... other dependencies
  }
}
```

### Impact
- ✅ Environment variables loaded before any code execution
- ✅ API key validation works correctly on startup
- ✅ Clear error message when API key is missing

### Related Files
- Created `.env.example` template:
```env
# Anthropic API key for Claude
# Get your key at: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

---

## Fix #4: TellerAgent - Missing Events on First Run

### Problem
After the first 15-second analysis cycle, no observations were generated even though events were captured.

### Root Cause
`TellerAgent.lastAnalysisTime` was initialized to `Date.now()` (current time) in the constructor. When `analyze()` ran, it filtered events with `event.timestamp > this.lastAnalysisTime`, which excluded all events with older timestamps from the startup snapshot.

### Solution
Modified `src/agent/teller.ts`:

**Changed lastAnalysisTime initialization**:
```typescript
// src/agent/teller.ts line 45

// OLD: Initialize to current time
this.lastAnalysisTime = Date.now();

// NEW: Initialize to 0 (capture all events on first run)
this.lastAnalysisTime = 0;
```

### Impact
- ✅ All events captured during startup are analyzed on first cycle
- ✅ Observations appear in ~15 seconds after startup (not 30+)
- ✅ Consistent behavior on every run

### Why 0 instead of a timestamp?
- Setting to `0` ensures all events are included on first analysis
- After first analysis, `lastAnalysisTime` is updated to actual timestamp
- Subsequent analyses only include new events (correct behavior)

---

## Fix #5: Enhanced Startup Reporting

### Problem
No visibility into what was happening during startup. Users couldn't tell if Teller was processing files or sitting idle.

### Solution
Modified `src/capture/opencode-watcher.ts`:

**Enhanced `walkAndProcessRecent()` to return counts**:
```typescript
private async walkAndProcessRecent(dir: string): Promise<{recent: number, skipped: number}> {
  // ... implementation
  return { recent: recentCount, skipped: skippedCount };
}
```

**Added status reporting in `snapshotExisting()`**:
```typescript
async snapshotExisting(): Promise<void> {
  const stats = await this.walkAndProcessRecent(this.storagePath);
  this.emit('status', `Processed ${stats.recent} recent files (skipped ${stats.skipped} old files)`);
}
```

### Impact
- ✅ Clear feedback on startup processing
- ✅ Users see how many files were processed
- ✅ Helps diagnose issues (if 0 files processed, check storage path)

---

## Testing These Fixes

### Test 1: Verify OpencodeWatcher Startup Capture
```bash
npm run dev
# In opencode, have an active conversation
# Stop and restart Teller
# Expected: Conversation messages appear in events panel
```

### Test 2: Verify Race Condition Fix
```bash
npm run dev
# Watch console for startup sequence
# Expected: UI renders before "Processed X recent files" message
# Expected: Events immediately appear in left panel
```

### Test 3: Verify API Key Loading
```bash
# Remove .env file
npm run dev
# Expected: Clear error "ANTHROPIC_API_KEY is required"

# Create .env with valid key
npm run dev
# Expected: Successful startup, no API key errors
```

### Test 4: Verify First Analysis Cycle
```bash
npm run dev
# Wait 15 seconds
# Expected: Observations appear in right panel
# Check .termeller/memory.db for records
```

### Test 5: Verify Startup Reporting
```bash
npm run dev
# Watch console output
# Expected: "Processed X recent files (skipped Y old files)"
```

---

## Commit History

```
c2cd1c0 Add comprehensive handoff documentation
3d06457 Fix race conditions and improve event capture
5b6f069 Fix: Add API key configuration and documentation
4ab73dc Initial commit: Termeller - observational coding companion
```

---

## Known Issues Remaining

### UTF-16 Encoding Issue (Windows)
**Problem**: PowerShell's `echo` command creates UTF-16 files, which dotenv can't read.

**Workaround**:
```powershell
# Use Set-Content instead of echo
Set-Content -Path .env -Value "ANTHROPIC_API_KEY=your_key_here" -Encoding utf8NoBOM
```

**Status**: Documented in README and HANDOFF, not a blocker.

---

## Future Improvements

Consider these enhancements in future iterations:

1. **Configurable Startup Window**
   - Make the 5-minute window configurable via environment variable
   - Default: `STARTUP_WINDOW_MS=300000`

2. **Dynamic UI Mount Detection**
   - Replace fixed 500ms delay with event-driven approach
   - UI emits "mounted" event, then components start

3. **Observation Caching**
   - Cache observations to reduce API calls
   - Only analyze new/unique patterns

4. **Better Error Recovery**
   - Retry logic for API failures
   - Graceful degradation when services unavailable

5. **Startup Progress Indicator**
   - Show progress bar during initial file processing
   - Display file-by-file status

---

## References

- [[Architecture]] - System design and data flow
- [[Component Overview]] - Detailed component documentation
- [[Development Setup]] - Setup and troubleshooting guide
- [[Testing Guide]] - Testing procedures

---

**Last Updated**: January 31, 2026  
**Author**: Teller Development Team