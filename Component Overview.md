# Component Overview

This document provides detailed documentation for each component in the Teller system.

## Table of Contents

1. [Capture Components](#capture-components)
2. [Agent Components](#agent-components)
3. [UI Components](#ui-components)
4. [Type Definitions](#type-definitions)
5. [Entry Point](#entry-point)

---

## Capture Components

### OpencodeWatcher
**File**: `src/capture/opencode-watcher.ts`

**Purpose**: Monitors opencode conversation storage and emits events for new/modified messages.

**Key Methods**:

- `constructor(storagePath: string)`
  - Initialize with path to opencode storage directory
  - Default: `~/.local/share/opencode/storage/`

- `start(): Promise<void>`
  - Initialize file watchers
  - Process recent files from last 5 minutes
  - Start watching for new files

- `stop(): void`
  - Clean up file watchers
  - Close all watchers

- `snapshotExisting(): Promise<void>`
  - Process existing files modified in last 5 minutes
  - Returns status message with counts of recent/skipped files

- `walkAndProcessRecent(dir: string): Promise<{recent: number, skipped: number}>`
  - Recursively walk directory
  - Process files modified in last 5 minutes
  - Skip files older than 5 minutes

**Events Emitted**:
```typescript
{
  type: 'message',
  source: 'opencode',
  timestamp: number,
  content: {
    role: 'user' | 'assistant',
    message: string,
    conversationId?: string
  }
}
```

**Critical Fix**: Startup now processes last 5 minutes of activity instead of ignoring all existing files.

**Dependencies**:
- `chokidar` - File watching
- `fs/promises` - File system operations

---

### TerminalHook
**File**: `src/capture/terminal-hook.ts`

**Purpose**: Captures terminal commands by monitoring shell history.

**Key Methods**:

- `start(): void`
  - Begin monitoring terminal history
  - Setup file watchers for history files

- `stop(): void`
  - Stop monitoring
  - Clean up watchers

**Events Emitted**:
```typescript
{
  type: 'command',
  source: 'terminal',
  timestamp: number,
  content: {
    command: string,
    exitCode?: number
  }
}
```

**Note**: This component is a placeholder for terminal history monitoring. Current implementation may need enhancement based on shell type (bash, zsh, PowerShell, etc.).

---

## Agent Components

### TellerAgent
**File**: `src/agent/teller.ts`

**Purpose**: Analyzes captured events and generates behavioral observations using Anthropic Claude API.

**Key Methods**:

- `constructor(apiKey: string)`
  - Initialize Anthropic client with API key
  - Validate API key is provided

- `start(): void`
  - Set up analysis interval (15 seconds)
  - Begin periodic analysis cycle

- `stop(): void`
  - Clear analysis interval
  - Stop event processing

- `analyze(events: Event[]): Promise<void>`
  - Filter events since `lastAnalysisTime`
  - Send events to Claude for analysis
  - Process and persist observations
  - Update `lastAnalysisTime`

- `queryObservations(limit?: number): Observation[]`
  - Retrieve observations from memory
  - Return most recent `limit` observations

**Configuration**:
- Analysis interval: 15 seconds
- Model: claude-3-5-sonnet-20241022
- Initial `lastAnalysisTime`: 0 (to capture first batch)

**Analysis Prompt**:
```
You are Teller, an observational coding assistant. Analyze these coding events 
and identify patterns, behaviors, and observations about how this person codes.
```

**Events Emitted**:
```typescript
{
  type: 'observation',
  timestamp: number,
  content: {
    observation: string,
    context: Event[]  // Related events that led to this observation
  }
}
```

**Critical Fix**: `lastAnalysisTime = 0` instead of `Date.now()` ensures all startup events are captured.

**Dependencies**:
- `@anthropic-ai/sdk` - AI analysis
- `@/agent/memory` - Persistence

---

### Memory
**File**: `src/agent/memory.ts`

**Purpose**: SQLite persistence layer for storing observations.

**Key Methods**:

- `constructor(dbPath?: string)`
  - Initialize SQLite database
  - Default path: `~/.termeller/memory.db`
  - Create tables if they don't exist

- `persist(observation: Observation): void`
  - Insert observation into database
  - Include context as JSON

- `query(limit?: number): Observation[]`
  - Retrieve observations from database
  - Order by timestamp descending
  - Limit to `limit` results (default: 50)

- `close(): void`
  - Close database connection

**Database Schema**:
```sql
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  observation TEXT NOT NULL,
  context TEXT,  -- JSON string of related events
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timestamp ON observations(timestamp);
```

**Dependencies**:
- `better-sqlite3` - SQLite database

---

## UI Components

### Window
**File**: `src/ui/window.tsx`

**Purpose**: Main React/Ink component that renders the terminal UI.

**Layout**:
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

**Props**:
- `events: Event[]` - Array of captured events
- `observations: Observation[]` - Array of generated observations

**Components Used**:
- `Box` - Layout containers
- `Text` - Text rendering
- `EventList` - Events panel
- `ObservationList` - Observations panel

**Dependencies**:
- `ink` - Terminal UI framework
- `react` - Component framework
- `@/ui/event-list` - Events panel
- `@/ui/observation-list` - Observations panel

---

### EventList
**File**: `src/ui/event-list.tsx`

**Purpose**: Renders list of captured events in chronological order.

**Props**:
- `events: Event[]` - Events to display

**Rendering**:
- Timestamp (formatted as HH:MM:SS)
- Source indicator (terminal/opencode)
- Content preview (truncated if long)

**Style**:
- Dim color for older events
- Bright color for recent events
- Icons for sources

---

### ObservationList
**File**: `src/ui/observation-list.tsx`

**Purpose**: Renders list of generated observations.

**Props**:
- `observations: Observation[]` - Observations to display

**Rendering**:
- Timestamp (formatted as HH:MM:SS)
- Full observation text
- Context indicator (number of related events)

**Style**:
- Bright color for emphasis
- Wrapped text for long observations

---

## Type Definitions

### Types
**File**: `src/types.ts`

**Purpose**: Shared TypeScript type definitions.

**Key Types**:

```typescript
// Base event type
interface Event {
  type: 'command' | 'message' | 'tool' | 'output';
  source: 'terminal' | 'opencode';
  timestamp: number;
  content: any;
}

// Terminal command event
interface TerminalEvent {
  type: 'command';
  source: 'terminal';
  timestamp: number;
  content: {
    command: string;
    exitCode?: number;
  };
}

// Opencode message event
interface OpencodeEvent {
  type: 'message';
  source: 'opencode';
  timestamp: number;
  content: {
    role: 'user' | 'assistant';
    message: string;
    conversationId?: string;
  };
}

// Observation
interface Observation {
  type: 'observation';
  timestamp: number;
  content: {
    observation: string;
    context: Event[];
  };
}
```

---

## Entry Point

### Index
**File**: `src/index.ts`

**Purpose**: Application orchestrator that initializes and coordinates all components.

**Key Responsibilities**:

1. Load environment variables (`import "dotenv/config"` as first line)
2. Validate API key
3. Initialize capture components (OpencodeWatcher, TerminalHook)
4. Initialize agent (TellerAgent)
5. Initialize UI (React/Ink window)
6. Setup event handlers
7. Start all components with 500ms delay (race condition fix)
8. Handle graceful shutdown

**Critical Fix**:
```typescript
// Wrapped in setTimeout to fix race condition
setTimeout(() => {
  terminal.start();
  opencode.start();
  agent.start();
}, 500);
```

**Event Flow**:
```typescript
// Capture components emit events
opencode.on('event', (event) => {
  buffer.push(event);
  updateUI();
});

terminal.on('event', (event) => {
  buffer.push(event);
  updateUI();
});

// Agent emits observations
agent.on('observation', (observation) => {
  updateUI();
});
```

**Dependencies**:
- All other components
- `react` - React rendering
- `ink` - Terminal rendering
- `render` - Ink's render function

---

## Component Interaction Diagram

```
index.ts (Orchestrator)
    ├── OpencodeWatcher
    │   └── emits → events
    ├── TerminalHook
    │   └── emits → events
    ├── TellerAgent
    │   ├── receives → events
    │   ├── queries → Memory
    │   └── emits → observations
    ├── Memory
    │   └── persists → observations
    └── Window (UI)
        ├── displays → events
        └── displays → observations
```

---

**See Also**: [[Architecture]], [[API Reference]], [[Development Setup]]