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

4. Run in development mode:
   ```bash
   npm run dev
   ```

Or build and run:
   ```bash
   npm run build
   npm start
   ```

## How It Works

- **Terminal Capture**: Polls your terminal every 3 seconds for commands and outputs
- **Opencode Capture**: Watches opencode's conversation storage for AI interactions
- **Analysis**: Every 2 minutes, the Teller agent analyzes recent activity and generates observations
- **Observations**: Insights about your coding patterns, frustration loops, and productive exploration

## Features

- Captures terminal commands and opencode conversations
- Analyzes patterns in your coding behavior
- Provides third-person observations about your development workflow
- Maintains cross-session memory for pattern recognition
