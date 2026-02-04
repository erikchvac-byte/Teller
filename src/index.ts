import "dotenv/config";
import { EventEmitter } from "node:events";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { TerminalHook } from "./capture/terminal-hook.js";
import { OpencodeWatcher } from "./capture/opencode-watcher.js";
import { Memory } from "./agent/memory.js";
import { TellerAgent } from "./agent/teller.js";
import { renderApp } from "./ui/window.js";

// Don't clear terminal - we want to see debug output
// console.clear();

/**
 * Central event bus that bridges capture sources, the agent, and the UI.
 */
const bus = new EventEmitter();

// --- Memory ---
const memory = new Memory();

// --- Capture: Terminal ---
const terminal = new TerminalHook(3000);

terminal.on("event", (e) => {
  memory.addEvent({
    type: e.type,
    source: e.source,
    content: e.command,
    timestamp: e.timestamp,
  });
  bus.emit("event", e);
});

terminal.on("status", (msg) => bus.emit("status", msg));
terminal.on("error", (err) => bus.emit("error", err));

// --- Capture: Opencode ---
const opencode = new OpencodeWatcher();

opencode.on("event", (e) => {
  // Include model/provider/agent context so Teller sees the full picture
  const label = [e.provider, e.model, e.agent].filter(Boolean).join("/");
  const prefix = label ? `[${label}] ` : "";
  memory.addEvent({
    type: e.type,
    source: e.source,
    content: `${prefix}(${e.role}) ${e.content}`,
    timestamp: e.timestamp,
  });
  bus.emit("event", e);
});

opencode.on("status", (msg) => bus.emit("status", msg));
opencode.on("error", (err) => bus.emit("error", err));

// --- Capture: Git-Based Diff Capture for Actual Work ---
const projectDir = process.cwd();
const GIT_DIFF_INTERVAL = 3000; // Check every 3 seconds (faster for better capture)
let lastGitHead = "";

// Get current git HEAD commit hash
function getGitHead(): string {
  try {
    return execSync("git rev-parse HEAD", { 
      encoding: "utf8", 
      timeout: 3000,
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'] // Capture stderr to prevent console pollution
    }).trim();
  } catch {
    return "";
  }
}

// Track last unstaged diff hash to avoid duplicates
let lastUnstagedHash = "";

// Simple hash for deduplication
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

// Validate git ref to prevent command injection
function isValidGitRef(ref: string): boolean {
  return /^[a-f0-9]{7,40}$/i.test(ref);
}

// Capture git diff showing actual code changes
let isCapturing = false; // Mutex to prevent race condition

function captureGitDiff() {
  // Prevent concurrent execution (race condition fix)
  if (isCapturing) return;
  isCapturing = true;
  
  try {
    const currentHead = getGitHead();
    
    // Update lastGitHead immediately to prevent race condition
    const previousHead = lastGitHead;
    if (currentHead) {
      lastGitHead = currentHead;
    }
    
    // Check for new commits by comparing HEAD
    if (currentHead && currentHead !== previousHead && previousHead !== "" && isValidGitRef(previousHead)) {
      // Get all commits since last check
      const commits = execSync(`git log ${previousHead}..HEAD --oneline`, { 
        encoding: "utf8", 
        timeout: 5000,
        cwd: projectDir,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      
      if (commits) {
        // Get diff for each new commit
        const commitLines = commits.split('\n').filter(Boolean);
        for (const commit of commitLines) {
          const commitHash = commit.split(' ')[0];
          if (commitHash && isValidGitRef(commitHash)) {
            const diffOutput = execSync(`git show ${commitHash}`, { 
              encoding: "utf8", 
              timeout: 10000,
              cwd: projectDir,
              stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            
            // Truncate diff to reasonable size (first 2000 chars)
            const diffSummary = diffOutput.slice(0, 2000);
            
            memory.addEvent({
              type: "git_commit",
              source: "git",
              content: `commit ${commitHash.slice(0, 7)}:\n${diffSummary}`,
              timestamp: Date.now(),
            });
            
            bus.emit("event", {
              type: "git_commit",
              source: "git",
              command: `commit ${commitHash.slice(0, 7)}:\n${diffSummary}`,
              timestamp: Date.now(),
            });
          }
        }
      }
    }
    
    // Also capture uncommitted changes (but deduplicate)
    const unstagedDiff = execSync("git diff --unified=1", { 
      encoding: "utf8", 
      timeout: 5000,
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    
    if (unstagedDiff) {
      const diffHash = simpleHash(unstagedDiff);
      
      // Only emit if diff changed since last time
      if (diffHash !== lastUnstagedHash) {
        lastUnstagedHash = diffHash;
        const diffSummary = unstagedDiff.slice(0, 2000);
        
        memory.addEvent({
          type: "git_unstaged",
          source: "git",
          content: `unstaged changes:\n${diffSummary}`,
          timestamp: Date.now(),
        });
        
        bus.emit("event", {
          type: "git_unstaged",
          source: "git",
          command: `unstaged:\n${diffSummary}`,
          timestamp: Date.now(),
        });
      }
    } else {
      // Reset hash when no unstaged changes
      lastUnstagedHash = "";
    }
    
  } catch (err) {
    // Git commands might fail silently - this is fine
  } finally {
    isCapturing = false;
  }
}

// Initial git HEAD
lastGitHead = getGitHead();

// Initial diff capture
captureGitDiff();

// Poll for git changes
setInterval(captureGitDiff, GIT_DIFF_INTERVAL);

// --- Agent ---
// Import Teller2 functionality conditionally
import { isTeller2Enabled, createTeller2 } from "./teller2.js";

// Decide whether to use Teller2 or classic Teller
let agent: TellerAgent | any;
if (isTeller2Enabled()) {
  console.log("[Termeller] Teller2 features detected - using enhanced pattern recognition");
  // Pass global memory so git events reach the agent
  const teller2 = createTeller2(bus, memory);
  agent = teller2.agent;
} else {
  console.log("[Termeller] Using classic Teller");
  agent = new TellerAgent({
    memory,
    intervalMs: 2 * 60 * 1000,
    analysisDepth: "standard", // Default depth, but will adapt dynamically
    onObservation: (obs) => {
      bus.emit("observation", obs);
    },
    onError: (err) => {
      bus.emit("error", err);
    },
  });
}

// --- UI ---
const app = renderApp(bus as any);

// --- Start everything ---
// Defer startup to allow React UI to mount and attach event listeners.
// Without this, events emitted synchronously during start() are lost.
setTimeout(() => {
  bus.emit("status", `Session: ${memory.getSessionId()}`);
  terminal.start();
  opencode.start();
  agent.start();
  bus.emit("status", "Teller is watching...");
}, 500);

// --- Cleanup on exit ---
function shutdown() {
  agent.stop();
  terminal.stop();
  opencode.stop();
  memory.close();
  app.unmount();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
