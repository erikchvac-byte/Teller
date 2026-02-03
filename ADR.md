### ADR-003: Skills-Based Pattern Detection Enhancement
**Status**: Accepted
**Date**: 2026-02-02
**Context**: The original Teller was only detecting basic patterns from terminal commands. To provide more sophisticated behavioral insights, we needed a system that could detect complex patterns like repetitive loops, intent drift, and cross-session similarities.

**Decision**: Implemented a skills-based pattern detection system with:
- Three specialized skills: loop detection, intent tracking, and cross-session analysis
- Vector memory for semantic similarity search across sessions
- Dynamic skill loading from .opencode/skills directories
- Enhanced agent that combines pattern detection with traditional observations

**Rationale**: Skills provide modular, extensible pattern detection that can be added without modifying core code. Vector memory enables "semantic rhyming" to find conceptually similar past patterns, not just exact text matches.

**Consequences**:
- **Benefits**: Much more sophisticated pattern recognition, extensible architecture, cross-session insights
- **Drawbacks**: Increased complexity, dependency on vector database (placeholder implementation), requires separate terminal for proper monitoring
- **Trade-offs**: More complex to maintain but provides significantly better insights

**Testing**: Successfully tested with all three skills loading and pattern detection working. Teller now detects meta-patterns like debugging the detector instead of working.

**Known Issues**:
- Vector memory is placeholder implementation (uses random vectors)
- Teller must run in separate terminal from work to capture actual coding activity

**Open Questions**:
- Which vector database to use for production (Chroma, Pinecone, FAISS)?
- Should we add more specialized skills?
- How to handle multi-session analysis effectively?

**Future Considerations**:
- Implement real vector database integration
- Add more pattern detection skills
- Consider web-based UI for pattern visualization
- Add session export/import capabilities

**References**:
- /src/agent/enhanced-teller.ts
- /src/agent/skill-loader.ts
- /src/agent/vector-memory.ts
- /src/teller2.ts
- .opencode/skills/ directory structure

### ADR-005: Teller Observation System Overhaul
**Status**: Accepted
**Date**: 2026-02-03
**Context**: Teller was generating repetitive and inaccurate observations, claiming the user was repeatedly working on banner UI design when that work was already complete. The system was misinterpreting git diffs as active design iteration and treating workspace switches as evidence of restarting completed tasks.

**Problems Identified**:
1. System prompt encouraged repetitive narrative loops ("AGAIN", "LOOP:" prefixes)
2. Over-interpretation of UI iteration work as looping behavior
3. No temporal verification of work completion status
4. Missing confidence levels and evidence references in output
5. Ignoring development progression signals from git commits

**Decision**: Rewrote Teller's observation generation system with:

1. **New System Prompt**:
   - Removed "AGAIN" and "LOOP:" narrative encouragement
   - Added explicit prohibition on repetitive commentary
   - Mandated confidence levels [HIGH/MEDIUM/LOW]
   - Required evidence references (file paths, timestamps, git commits)
   - Added potential risk identification
   - Added next investigative angles for uncertain patterns

2. **Enhanced Prompt Context**:
   - Added "Development Progression (Git Commit Analysis)" section
   - Shows completed work by tracking git_commit events
   - Extracts file changes from git diffs for clarity
   - Helps distinguish between historical and active changes

3. **New Output Format**:
   - `{Pattern Summary} | Confidence: [HIGH/MEDIUM/LOW] | Evidence: {references} | Risk: {optional} | Next: {optional if applicable}`

**Rationale**: The new system ensures observations are evidence-backed, properly contextualized, and avoid false claims about work status. By explicitly showing completed work in the prompt context, the AI can distinguish between ongoing iteration and historical changes.

**Consequences**:
- **Benefits**: Accurate observations, reduced false loop claims, proper confidence attribution
- **Drawbacks**: More verbose output format, increased token usage
- **Trade-offs**: More informative observations vs slightly higher cost

**Testing**: Successfully compiled with TypeScript. New prompt structure verified to include all required elements.

**Prohibited Behaviors Enforced**:
- Repetitive narrative loop commentary ("You're AGAIN...")
- Over-interpretation of UI iteration work as looping
- Treating agent consultation as inherently wasteful without temporal verification
- Ignoring development progression signals
- Claiming loops when git evidence shows completed work
- Interpreting git diffs as active iteration when they're historical

**References**:
- /src/agent/providers/anthropic.ts (system prompt and analyzeWithDepth method)
- /src/agent/teller.ts (buildPrompt method with development progression)
- /src/agent/enhanced-teller.ts (buildPrompt with pattern analysis integration)

### ADR-004: Work Monitor Investigation and Implementation
**Status**: In Progress
**Date**: 2026-02-02
**Context**: Teller was only seeing conversations (Human/Teller dialogue) and not actual coding work. User reported: "Teller is running but not seeing some of the work. Maybe just seeing the conversations without seeing anything representing what is accomplished."

**Investigation Findings**:
1. **Capture Sources Working**:
   - terminal-hook.ts ✅ CAN read PowerShell history correctly (tested: `C:\Users\erikc\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt` exists and is readable)
   - opencode-watcher.ts ✅ Correctly captures OpenCode conversations from `~/.local/share/opencode/storage/`

2. **Root Cause Identified**:
   - Teller runs in the same terminal as the conversation
   - Therefore it only captures dialogue between Human and Teller
   - It does NOT capture:
     - ❌ File edits/creations/deletions
     - ❌ Git commits, branches, status changes
     - ❌ Build output (npm, webpack, etc.)
     - ❌ Terminal commands from work sessions (only sees conversation commands)

3. **Missing Capture Mechanisms**:
   - No file system watching for code changes
   - No git activity monitoring
   - No build output monitoring
   - No separation between "conversation terminal" and "work terminal"

**Decision**: Created work-monitor.ts to capture actual coding work from multiple sources:
- File system changes (via chokidar)
- Git repository activity (status changes, commits)
- Terminal commands (integrated with terminal-hook.ts)
- Build system output (watching package.json, Makefile, etc.)

**Implementation Status**: ⚠️ INCOMPLETE - TypeScript compilation errors in work-monitor.ts

**Key Technical Details**:
- WorkMonitor uses chokidar for file watching
- Monitors project directory with depth: 3
- Ignores: node_modules, .git, dist, build, *.log, etc.
- Checks git status via `git status --porcelain`
- Watches build files: package.json, Makefile, Cargo.toml, etc.
- Integrates with existing terminal-hook.ts for command capture

**Critical Issues**:
1. **Syntax Errors**: work-monitor.ts has TypeScript compilation errors
2. **Architecture Gap**: Teller needs to run in separate terminal from conversation
3. **User Behavior**: User is using OpenCode CLI which generates conversation logs - Teller should monitor SEPARATE work terminal

**Rationale**: Work monitor provides comprehensive capture of actual coding activity, not just meta-activity (talking about work). This enables Teller to provide meaningful insights about coding patterns, productivity, and work habits.

**Consequences**:
- **Benefits**: Would capture actual coding work patterns
- **Drawbacks**: Increased complexity, requires user to maintain separate work terminal
- **Trade-offs**: Better insights vs more complex setup

**Testing Results**:
- ✅ terminal-hook.ts successfully reads PowerShell history
- ✅ opencode-watcher.ts successfully captures OpenCode conversations
- ❌ work-monitor.ts has TypeScript compilation errors
- ❌ File system watching not tested yet (blocked by compilation errors)

**Known Issues**:
- work-monitor.ts has TypeScript syntax errors
- Teller still runs in same terminal as conversation (architectural issue)
- No git activity monitoring implemented yet
- No build output monitoring implemented yet

**Open Questions**:
- How to convince user to run Teller in separate terminal from work?
- Should we add file system watching directly to enhanced-teller.ts?
- Which file changes should be captured vs ignored?
- How to handle multiple projects/repos?

**Future Considerations**:
- Fix TypeScript compilation errors in work-monitor.ts
- Integrate work-monitor with enhanced-teller.ts
- Test file system watching for actual work capture
- Consider adding git hook integration for real-time commit tracking
- Potentially add separate CLI mode for work monitoring vs conversation monitoring

**References**:
- /src/capture/work-monitor.ts (INCOMPLETE - has errors)
- /src/capture/terminal-hook.ts (WORKING)
- /src/capture/opencode-watcher.ts (WORKING)
- /src/agent/enhanced-teller.ts (needs work-monitor integration)