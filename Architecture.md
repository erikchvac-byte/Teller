# Architecture

## System Overview

Teller follows a **reactive event-driven architecture** with three main layers:

1. **Capture Layer** - Collects events from terminal and opencode
2. **Analysis Layer** - Processes events with AI to generate observations
3. **Persistence & UI Layer** - Stores observations and displays them

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Startup Phase                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────┐    500ms delay (fix race condition)    ┌──────────────┐
│    index.ts  ├───────────────────────────────────────→│   UI Mount   │
└──────────────┘                                        └──────────────┘
      ↓                                                       ↓
      ├──→ opencode.start()                                   ├──→ attach listeners
      ├──→ terminal.start()                                    ↓
      └──→ agent.start()                                ┌──────────────┐
                                                    Events start → │   Display     │
                                                    flowing now    │   Working     │
                                                                   └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Runtime Phase                            │
└─────────────────────────────────────────────────────────────────┘

Terminal Hook                  OpencodeWatcher
     ↓                                ↓
Watch terminal history      Watch ~/.local/share/opencode/storage/
     ↓                                ↓
     ├──→ "npm install"              ├──→ user message
     ├──→ "git commit"               ├──→ assistant message
     └──→ "npm run dev"              └──→ conversation metadata
     ↓                                ↓
└────────────────────┬────────────────────┘
                     ↓
              Event Interface
              { type, timestamp, source, content }
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Event Buffer (15s window)                   │
└─────────────────────────────────────────────────────────────────┘
                     ↓
              TellerAgent.analyze()
                     ↓
              Send to Anthropic Claude API
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Observation Generation                         │
│         "User frequently uses npm install"                      │
│         "Pattern of committing without tests"                   │
└─────────────────────────────────────────────────────────────────┘
                     ↓
              Memory.persist()
                     ↓
              SQLite (~/.termeller/memory.db)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                      UI Update                                   │
│  Left Panel: Events stream                                       │
│  Right Panel: Observations appear                                │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interactions

### 1. Index Orchestrator (`src/index.ts`)

The central coordinator that:
- Initializes all subsystems
- Manages 500ms startup delay to fix race condition
- Coordinates event flow between components
- Handles graceful shutdown

**Critical Fix**: Wraps all startup calls in `setTimeout(500ms)` to ensure React UI mounts before events start emitting.

### 2. Capture Components

#### OpencodeWatcher (`src/capture/opencode-watcher.ts`)

Monitors opencode conversation storage directory.

**Key Methods**:
- `start()` - Initialize file watching
- `stop()` - Clean up watchers
- `snapshotExisting()` - Process recent files from last 5 minutes

**Critical Fix**: Changed from ignoring all existing files to processing last 5 minutes of activity on startup.

**Event Schema**:
```typescript
interface OpencodeEvent {
  type: 'message' | 'tool' | 'output';
  source: 'opencode';
  timestamp: number;
  content: {
    role: 'user' | 'assistant';
    message: string;
    conversationId?: string;
  };
}
```

#### TerminalHook (`src/capture/terminal-hook.ts`)

Captures terminal commands by monitoring history.

**Event Schema**:
```typescript
interface TerminalEvent {
  type: 'command';
  source: 'terminal';
  timestamp: number;
  content: {
    command: string;
    exitCode?: number;
  };
}
```

### 3. Agent Components

#### TellerAgent (`src/agent/teller.ts`)

The AI analysis engine.

**Key Configuration**:
- Analysis interval: 15 seconds
- Last analysis time: starts at 0 (to capture first batch)
- Model: claude-3-5-sonnet-20241022

**Analysis Flow**:
1. Collect events since `lastAnalysisTime`
2. Send to Anthropic API with behavior observation prompt
3. Receive observations array
4. Persist each observation to SQLite
5. Emit events for UI update

**Critical Fix**: `lastAnalysisTime = 0` instead of `Date.now()` to capture startup events.

#### Memory (`src/agent/memory.ts`)

SQLite persistence layer.

**Database Schema**:
```sql
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  observation TEXT NOT NULL,
  context TEXT,  -- JSON array of related event IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Location**: `~/.termeller/memory.db`

### 4. UI Components

#### Window (`src/ui/window.tsx`)

Main React/Ink component layout.

```
┌──────────────────────────────────────────────────────────┐
│  Teller v1.0.0                           Status: Running  │
├───────────────────────────┬────────────────────────────────┤
│  Events (Recent)         │  Observations                  │
│  [Time] Command          │  [Time] Observation            │
│  [Time] Command          │  [Time] Observation            │
│  ...                     │  ...                           │
└───────────────────────────┴────────────────────────────────┘
```

#### EventList (`src/ui/event-list.tsx`)

Displays captured events in chronological order:
- Timestamp
- Source icon (terminal/opencode)
- Content preview

#### ObservationList (`src/ui/observation-list.tsx`)

Displays generated observations:
- Timestamp
- Full observation text
- Context indicator

## Event Bus Pattern

Components communicate through a shared event bus pattern:

```typescript
// In index.ts
opencode.on('event', (event) => {
  buffer.push(event);
  // Trigger UI update
});

terminal.on('event', (event) => {
  buffer.push(event);
});

agent.on('observation', (observation) => {
  // Update UI
});
```

## Critical Design Decisions

### 1. Startup Delay (500ms)
**Problem**: Events emitted synchronously during `start()` were lost because React UI hadn't mounted yet.

**Solution**: Wrapped all startup calls in `setTimeout(500ms)` in `index.ts`.

### 2. Startup Snapshot (5 minutes)
**Problem**: OpencodeWatcher marked all existing files as seen, missing current conversation.

**Solution**: Changed `snapshotExisting()` to process only files modified in last 5 minutes.

### 3. Initial Analysis Time (0 vs Date.now)
**Problem**: `lastAnalysisTime = Date.now()` caused skipping of startup events.

**Solution**: Initialize to `0` to capture all events on first analysis cycle.

### 4. dotenv Loading Order
**Problem**: dotenv imported in `teller.ts` but loaded after API key check failed.

**Solution**: Moved `import "dotenv/config"` to `index.ts` (first line).

## Error Handling

- Missing API key: Clear error message on startup
- Rate limits: Handled by Anthropic SDK (throws error)
- Invalid JSON: Graceful degradation
- File system errors: Logged, don't crash

## Performance Considerations

- **Event Buffer**: In-memory, cleared after analysis
- **Analysis Interval**: 15 seconds (balances responsiveness with API costs)
- **Startup Window**: 5 minutes (comprehensive without overwhelming)
- **Database**: SQLite for zero-config persistence

---

**See Also**: [[Component Overview]], [[Development Setup]], [[API Reference]]