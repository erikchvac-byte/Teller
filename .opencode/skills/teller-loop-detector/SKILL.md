---
name: teller-loop-detector
description: Detects repetitive command and behavior loops in terminal sessions
license: MIT
compatibility: opencode
metadata:
  role: observer-only
  isolation: strict
---

# Terminal Loop Detector

This skill analyzes terminal command sequences to identify:

1. **Command Loops** - Same or similar commands executed repeatedly without progress
2. **Error Loops** - Repeated errors with minor variations in commands
3. **Build-Run-Fail Cycles** - Patterns of build/compile/run/error without successful resolution
4. **Search Loops** - Repeated web searches or documentation lookups for the same topic

## Pattern Signatures

### Command Loop Signature
- Same command executed 3+ times with no intervening success indicators
- Minor variations (e.g., small edits to arguments) of the same command
- Increasing command complexity while solving the same problem
- Usage pattern: attempt → error → slight change → repeat

### Build-Run-Fail Signature
- Compile/build command
- Run command
- Error output
- Minor code edit
- REPEAT 3+ times without success

### Search Loop Signature
- Multiple lookups for similar documentation/information
- Stack Overflow visits for the same error message
- Switching between multiple similar resources 
- The 3-window shuffle: doc → editor → terminal → doc

## Loop Intensity Metrics

- **Repetition Count**: Number of iterations in the loop
- **Time Spent**: Duration stuck in the loop
- **Complexity Increase**: Growth in command complexity over iterations
- **Frustration Indicators**: Use of clear/reset commands, command aborts
- **Context Switches**: Attempts to work on different problems during the loop

## Matching Algorithms

The detector applies multiple algorithms:
1. Edit distance comparison between sequential commands
2. Regular expression pattern matching for error messages
3. Semantic clustering of command intent
4. Temporal analysis (command frequency and intervals)

## Usage Example

```
// Terminal session with a loop:
$ npm run build
Error: Cannot find module 'webpack'
$ npm install webpack
$ npm run build
Error: Cannot find module 'webpack-cli'
$ npm install webpack-cli
$ npm run build
Error: Configuration file not found

// Loop detection result:
LOOP DETECTED:
- Type: Build-Run-Fail
- Iterations: 3
- Root Issue: Missing webpack setup
- Recommendation: Review build config file
```