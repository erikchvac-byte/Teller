# Teller - Project Overview

## What is Teller?

Teller is an observational coding companion that watches your terminal commands and opencode conversations, providing behavioral insights about your coding patterns.

## Core Purpose

Teller doesn't just capture what you do—it observes **how** you code. By analyzing:
- Terminal commands you execute
- AI conversations in opencode
- Patterns in your workflow

Teller generates observations about your coding behavior, helping you understand and improve your development practices.

## Key Features

- **Real-time Capture**: Monitors terminal commands and opencode conversations as they happen
- **Behavioral Analysis**: Uses AI (Anthropic Claude) to analyze patterns and generate insights
- **Persistent Memory**: Stores observations in SQLite database for long-term tracking
- **Terminal UI**: Live display of captured events and generated observations
- **Smart Startup**: Captures recent activity on startup (last 5 minutes)

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **UI Framework**: Ink (React for CLI)
- **Database**: SQLite (better-sqlite3)
- **AI Engine**: Anthropic Claude API
- **File Watching**: Chokidar
- **Build Tool**: esbuild

## Project Structure

```
termeller/
├── src/
│   ├── capture/
│   │   ├── opencode-watcher.ts    # Monitors opencode conversations
│   │   └── terminal-hook.ts       # Captures terminal commands
│   ├── agent/
│   │   ├── teller.ts              # AI analysis engine
│   │   └── memory.ts              # SQLite persistence layer
│   ├── ui/
│   │   ├── window.tsx             # Main terminal UI
│   │   ├── event-list.tsx         # Events panel
│   │   └── observation-list.tsx   # Observations panel
│   ├── types.ts                   # Shared type definitions
│   └── index.ts                   # Application entry point
├── dist/                          # Compiled output
├── .termeller/
│   └── memory.db                  # SQLite database
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

```bash
# Install dependencies
npm install

# Set API key (Windows PowerShell)
Set-Content -Path .env -Value "ANTHROPIC_API_KEY=your_key_here" -Encoding utf8NoBOM

# Run development mode
npm run dev

# Build for production
npm run build
```

## Workflow

1. **Capture Phase**: Teller watches terminal history and opencode storage
2. **Analysis Phase**: Every 15 seconds, recent events are sent to Claude for analysis
3. **Observation Generation**: Claude returns observations about coding patterns
4. **Display Phase**: Events appear in left panel, observations in right panel
5. **Storage Phase**: Observations are persisted to SQLite for future reference

## Why Teller?

- **Self-Reflection**: Understand your own coding patterns and habits
- **Learning Opportunity**: Get AI insights into your problem-solving approach
- **Workflow Analysis**: Identify bottlenecks and areas for improvement
- **Knowledge Tracking**: Build a record of your coding journey

---

**See Also**: [[Architecture]], [[Development Setup]], [[Component Overview]]