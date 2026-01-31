# API Reference

This document details the APIs and interfaces used in the Teller system.

## Table of Contents

1. [Anthropic Claude API](#anthropic-claude-api)
2. [Component APIs](#component-apis)
3. [Type Definitions](#type-definitions)
4. [Event Schema](#event-schema)

---

## Anthropic Claude API

### Overview

Teller uses the Anthropic Claude API to analyze coding events and generate behavioral observations.

**SDK**: `@anthropic-ai/sdk` v0.27.0  
**Model**: `claude-3-5-sonnet-20241022`  
**Endpoint**: `https://api.anthropic.com/v1/messages`

### Configuration

**Required Environment Variable**:
```env
ANTHROPIC_API_KEY=sk-ant-...
```

**Get API Key**: https://console.anthropic.com/settings/keys

### Client Initialization

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

### API Usage

#### Messages API

**Endpoint**: `POST https://api.anthropic.com/v1/messages`

**Request Structure**:
```typescript
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: "Your analysis prompt here..."
    }
  ]
});
```

**Response Structure**:
```typescript
{
  id: "msg_...",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "Claude's response..."
    }
  ],
  model: "claude-3-5-sonnet-20241022",
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: {
    input_tokens: 100,
    output_tokens: 50
  }
}
```

### Teller's Analysis Prompt

**System Prompt** (inferred from usage):
```
You are Teller, an observational coding assistant. Analyze these coding events 
and identify patterns, behaviors, and observations about how this person codes.
```

**User Prompt Format**:
```
Here are recent coding events:

[Event 1]
Type: command
Source: terminal
Timestamp: 2026-01-31 10:15:30
Content: npm install

[Event 2]
Type: message
Source: opencode
Timestamp: 2026-01-31 10:15:45
Content: User asked for help with React components

...

Analyze these events and provide observations about coding patterns, 
behaviors, and workflow characteristics.
```

### Rate Limits

**Current Limits** (as of 2026):
- Free tier: Limited usage per day
- Paid tier: Higher limits

**Teller Strategy**:
- Analysis interval: 15 seconds (balances responsiveness with costs)
- Batch processing: Multiple events per request
- Error handling: Graceful degradation on rate limits

### Error Handling

```typescript
try {
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [/* ... */]
  });
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    console.error('Anthropic API Error:', error.message);
    console.error('Status:', error.status);
    // Handle rate limit, auth errors, etc.
  }
}
```

**Common Errors**:
- `401 Unauthorized` - Invalid API key
- `429 Rate Limit` - Too many requests
- `500 Internal Server Error` - Anthropic service issue

### Cost Estimation

**Input Tokens**: ~100-500 per analysis batch  
**Output Tokens**: ~50-200 per observation  
**Cost per analysis**: ~$0.001-0.005 (depending on pricing tier)

**Daily Cost Estimate**:
- Assuming 1 analysis per 15 seconds
- ~5,760 analyses per day
- ~$5.76-$28.80 per day (high estimate)

**Recommendation**: Consider caching observations or increasing analysis interval in production.

---

## Component APIs

### OpencodeWatcher

#### Constructor
```typescript
constructor(storagePath?: string)
```
- `storagePath` - Path to opencode storage directory (default: `~/.local/share/opencode/storage/`)

#### Methods
```typescript
start(): Promise<void>
stop(): void
snapshotExisting(): Promise<void>
walkAndProcessRecent(dir: string): Promise<{recent: number, skipped: number}>
```

#### Events
```typescript
opencode.on('event', (event: Event) => {
  // Handle event
});
```

---

### TerminalHook

#### Methods
```typescript
start(): void
stop(): void
```

#### Events
```typescript
terminal.on('event', (event: Event) => {
  // Handle event
});
```

---

### TellerAgent

#### Constructor
```typescript
constructor(apiKey: string)
```
- `apiKey` - Anthropic API key (required)
- Throws error if not provided

#### Methods
```typescript
start(): void
stop(): void
analyze(events: Event[]): Promise<void>
queryObservations(limit?: number): Observation[]
```

#### Events
```typescript
agent.on('observation', (observation: Observation) => {
  // Handle observation
});
```

---

### Memory

#### Constructor
```typescript
constructor(dbPath?: string)
```
- `dbPath` - Path to SQLite database (default: `~/.termeller/memory.db`)

#### Methods
```typescript
persist(observation: Observation): void
query(limit?: number): Observation[]
close(): void
```

---

## Type Definitions

### Event Types

```typescript
// Base event interface
interface Event {
  type: 'command' | 'message' | 'tool' | 'output';
  source: 'terminal' | 'opencode';
  timestamp: number;
  content: any;
}

// Terminal command event
interface TerminalEvent extends Event {
  type: 'command';
  source: 'terminal';
  content: {
    command: string;
    exitCode?: number;
  };
}

// Opencode message event
interface OpencodeEvent extends Event {
  type: 'message';
  source: 'opencode';
  content: {
    role: 'user' | 'assistant';
    message: string;
    conversationId?: string;
  };
}

// Observation event
interface Observation extends Event {
  type: 'observation';
  content: {
    observation: string;
    context: Event[];
  };
}
```

### Database Types

```typescript
interface DatabaseObservation {
  id: number;
  timestamp: number;
  observation: string;
  context: string;  // JSON string
  created_at: string;
}
```

---

## Event Schema

### Terminal Event Schema

```json
{
  "type": "command",
  "source": "terminal",
  "timestamp": 1738308930000,
  "content": {
    "command": "npm install",
    "exitCode": 0
  }
}
```

### Opencode Event Schema

```json
{
  "type": "message",
  "source": "opencode",
  "timestamp": 1738308935000,
  "content": {
    "role": "user",
    "message": "Help me create a React component",
    "conversationId": "abc-123-def"
  }
}
```

### Observation Event Schema

```json
{
  "type": "observation",
  "timestamp": 1738308940000,
  "content": {
    "observation": "User frequently asks for help with React components",
    "context": [
      { /* related event 1 */ },
      { /* related event 2 */ }
    ]
  }
}
```

---

## File System APIs

### Opencode Storage Location

**Path**: `~/.local/share/opencode/storage/`

**Structure**:
```
storage/
├── conversations/
│   ├── [timestamp]/conversation.json
│   └── [timestamp]/parts/
│       ├── part-0.json
│       ├── part-1.json
│       └── ...
└── ...
```

### Teller Database Location

**Path**: `~/.termeller/memory.db`

**Tables**:
- `observations` - Generated observations

---

## Error Codes

### Application Errors

| Code | Description | Action |
|------|-------------|--------|
| `MISSING_API_KEY` | ANTHROPIC_API_KEY not found | Set `.env` file with API key |
| `INVALID_API_KEY` | API key validation failed | Check API key format |
| `RATE_LIMIT` | Anthropic API rate limit | Wait and retry |
| `DATABASE_ERROR` | SQLite operation failed | Check database permissions |
| `FILE_NOT_FOUND` | Opencode storage not found | Verify opencode installation |

### API Errors

| Status | Description | Action |
|--------|-------------|--------|
| 401 | Unauthorized | Check API key |
| 429 | Rate Limit | Increase analysis interval |
| 500 | Server Error | Retry later |
| 503 | Service Unavailable | Retry later |

---

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic API key |
| `NODE_ENV` | No | - | Set to `production` for production builds |

### Runtime Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `analysisInterval` | 15000ms | Time between analyses |
| `startupDelay` | 500ms | Delay before starting components |
| `startupWindow` | 300000ms (5 min) | Time window for recent file processing |
| `observationLimit` | 50 | Max observations to display |

---

**See Also**: [[Architecture]], [[Component Overview]], [[Development Setup]]