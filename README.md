# Teller — Pattern-Aware Observational Coding Companion

Teller watches your terminal and opencode conversations, providing personalized behavioral insights about your coding patterns with progressive escalation awareness.

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
(Silent mode: `npm run silent` - runs without verbose output)

## How It Works

- **Terminal Capture**: Polls your terminal every 3 seconds for commands and outputs
- **Opencode Capture**: Watches opencode's conversation storage for AI interactions
- **Pattern Detection**: AI-powered recognition of 12 personalized behavioral patterns
- **Progressive Escalation**: Silent awareness → Frequency display → Definition → Active suggestions
- **Analysis**: Every 2 minutes, analyzes activity with pattern-aware insights
- **Session Tracking**: Pattern counters reset daily for fresh perspective

## Features

✅ **Real-time event capture** - Terminal commands and opencode conversations
✅ **Startup snapshot** - Processes recent activity from last 5 minutes
✅ **Pattern detection** - 12 personalized behavioral patterns via Claude
✅ **Progressive escalation** - 4-level awareness system with visual indicators
✅ **Session-scoped tracking** - Daily reset pattern counters
✅ **Pattern analytics** - 5-day retention with 10-day analytics storage
✅ **Cross-session memory** - Persistent database for pattern tracking
✅ **Live monitoring** - Continuous background operation
✅ **Clean UI layout** - Vertical stacking with fixed event feed (4 events) and observation feed (10 items)
✅ **Clean startup** - Clears terminal on launch for clean banner positioning
✅ **TELLER_CLCC branding** - Updated header with observational coding companion name
✅ **Black background UI** - Floor-to-ceiling black background for clean visual aesthetic

## Pattern Detection

### Behavioral Patterns
- **UI-TRIAL**: Adjusting visual elements through trial-and-error instead of calculating requirements
- **REPEAT-FAILURE**: Repeating failed actions without investigating underlying causes
- **TECH-DEBT-RISK**: Choosing manual workarounds over fixing automation issues
- **SOURCE-SKIP**: Avoiding primary documentation and relying on multiple AI consultations
- **UNVERIFIED-COMPLETE**: Marking work complete without proper deployment verification
- **REGRESSION**: Changes that break unrelated functionality

### Tactical Patterns
- **EXIT-CODE-IGNORED**: Proceeding without verifying command success
- **BLIND-RETRY**: Retrying commands without investigating root causes
- **AUTOMATION-BYPASS**: Using manual testing when automation exists
- **CACHE-RISK**: Deploying without properly invalidating caches
- **PORT-CONFLICT-RISK**: Restarting services without confirming process termination
- **CWD-MISMATCH**: Executing file operations in wrong working directories

## Progressive Escalation System

1. **📊 1st Occurrence**: Silent pattern label (non-intrusive observation)
2. **📊 2nd Occurrence**: Frequency display ("Appears 2 times in session")
3. **⚠️ 3rd Occurrence**: Label + pattern definition + evidence
4. **🔴 4th+ Occurrence**: Active label + actionable suggestion

*Outside Observer Philosophy: No blocking, no questions, behavior labeling only*

## Current Status

Teller is now **pattern-aware** and provides personalized insights from:
- Terminal commands (PowerShell/bash history polling every 3 seconds)
- Opencode conversations (file watching with 5-minute startup snapshot)
- Pattern-aware observations (AI analysis with 12 personalized patterns)
- Progressive escalation (4-level awareness system)
- Session tracking (daily reset counters)

## Recent Updates

### Pattern-Aware Intelligence (Latest)
- **12 Personalized Patterns**: Identified from 5-day development behavior analysis
- **Progressive Escalation**: 4-level awareness system with visual indicators
- **Session Tracking**: Daily reset pattern counters for fresh perspective
- **Pattern Analytics**: Database storage with 5-day retention and 10-day analytics
- **Outside Observer Integration**: Non-intrusive behavior labeling maintained
- **Lesson Integration**: Confidence boosting for confirmed patterns (3+ occurrences)

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

### UI Enhancements
- **Black background**: Implemented floor-to-ceiling black background across entire interface
- **Text visibility**: Ensured proper text color contrast against black background
- **Component optimization**: Simplified rendering structure for better performance
- **Visual consistency**: Maintained existing color schemes and highlighting modes
