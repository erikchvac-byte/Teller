# Teller — Observational Coding Companion

Teller watches your terminal and opencode conversations, providing behavioral insights about your coding patterns.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Get an Anthropic API key from https://console.anthropic.com/

3. Create a `.env` file in the project root:
   ```bash
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

4. Build and run the application:
   ```bash
   npm run build
   npm run start
   ```

(Development mode: `npm run dev` - for debugging only)

## How It Works

- **Terminal Capture**: Polls your terminal every 3 seconds for commands and outputs
- **Opencode Capture**: Watches opencode's conversation storage for AI interactions
- **Analysis**: Every 2 minutes, the Teller agent analyzes recent activity and generates observations
- **Observations**: Insights about your coding patterns, frustration loops, and productive exploration

## Features

✅ **Real-time event capture** - Terminal commands and opencode conversations
✅ **Startup snapshot** - Processes recent activity from last 5 minutes
✅ **Behavioral analysis** - AI-powered pattern recognition via Claude
✅ **Observational insights** - Third-person perspective on development workflow
✅ **Cross-session memory** - Persistent database for pattern tracking
✅ **Live monitoring** - Continuous background operation
✅ **Clean UI layout** - Vertical stacking with fixed event feed (4 events) and observation feed (10 items)
✅ **Clean startup** - Clears terminal on launch for clean banner positioning
✅ **TELLER_CLCC branding** - Updated header with observational coding companion name

## Current Status

Teller is now **fully functional** and captures real-time events from:
- Terminal commands (PowerShell/bash history polling every 3 seconds)
- Opencode conversations (file watching with 5-minute startup snapshot)
- Behavioral observations (AI analysis every 2 minutes via Anthropic Claude)

## Recent Updates

### UI/Layout Improvements
- **Vertical layout**: Changed from side-by-side to stacked layout (events top, observations below)
- **Fixed heights**: Event feed shows last 4 events, observations show last 10 items
- **Clean startup**: Added terminal screen clearing for clean banner positioning
- **Branding**: Updated to "TELLER_CLCC" header with banner styling

### Fixes Applied
- **CRITICAL FIX**: Resolved core bug where `snapshotExisting()` was never called
- **Real-time monitoring**: Fixed file watcher configuration for Windows compatibility
- **Debug mode**: Added comprehensive debugging (set `DEBUG=true` in `.env`)
- **Time window**: Updated from 1 to 5 minutes for startup snapshot
- **Error handling**: Enhanced user-friendly error messages
- **Documentation**: Updated all docs to reflect actual functionality
