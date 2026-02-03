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
      cwd: projectDir
    }).trim();
  } catch {
    return "";
  }
}

// Capture git diff showing actual code changes
function captureGitDiff() {
  try {
    process.stderr.write(`[GitDiff] Running diff check...\n`);
    
    const currentHead = getGitHead();
    process.stderr.write(`[GitDiff] Current HEAD: ${currentHead.slice(0, 7)}, Last: ${lastGitHead.slice(0, 7)}\n`);
    
    // Check for new commits by comparing HEAD
    if (currentHead && currentHead !== lastGitHead) {
      // Get all commits since last check
      const commits = execSync(`git log ${lastGitHead}..HEAD --oneline`, { 
        encoding: "utf8", 
        timeout: 5000,
        cwd: projectDir
      }).trim();
      
      if (commits) {
        process.stderr.write(`[GitDiff] New commits detected:\n${commits}\n`);
        
        // Get diff for each new commit
        const commitLines = commits.split('\n');
        for (const commit of commitLines) {
          const commitHash = commit.split(' ')[0];
          if (commitHash) {
            const diffOutput = execSync(`git show ${commitHash}`, { 
              encoding: "utf8", 
              timeout: 10000,
              cwd: projectDir
            }).trim();
            
            // Truncate diff to reasonable size (first 2000 chars)
            const diffSummary = diffOutput.slice(0, 2000);
            
            process.stderr.write(`[GitDiff] Commit ${commitHash.slice(0, 7)}: ${diffSummary.replace(/\n/g, " ").slice(0, 150)}...\n`);
            
            memory.addEvent({
              type: "git_diff",
              source: "git",
              content: `commit ${commitHash.slice(0, 7)}: ${diffSummary}`,
              timestamp: Date.now(),
            });
            
            bus.emit("event", {
              type: "git_diff",
              source: "git",
              command: `commit ${commitHash.slice(0, 7)}: ${diffSummary}`,
              timestamp: Date.now(),
            });
          }
        }
      }
      
      lastGitHead = currentHead;
    }
    
    // Also capture uncommitted changes
    const unstagedDiff = execSync("git diff --unified=1", { 
      encoding: "utf8", 
      timeout: 5000,
      cwd: projectDir
    }).trim();
    
    if (unstagedDiff) {
      const diffSummary = unstagedDiff.slice(0, 2000);
      
      process.stderr.write(`[GitDiff] Unstaged changes detected\n`);
      process.stderr.write(`[GitDiff] Diff: ${diffSummary.replace(/\n/g, " ").slice(0, 150)}...\n`);
      
      memory.addEvent({
        type: "git_diff",
        source: "git",
        content: `unstaged: ${diffSummary}`,
        timestamp: Date.now(),
      });
      
      bus.emit("event", {
        type: "git_diff",
        source: "git",
        command: `unstaged: ${diffSummary}`,
        timestamp: Date.now(),
      });
    }
    
    process.stderr.write(`[GitDiff] Diff check complete\n`);
    
  } catch (err) {
    // Git commands might fail, just log and continue
    if (!lastGitHead) {
      // Only log first error to avoid spam
      process.stderr.write(`[GitDiff] Error: ${err instanceof Error ? err.message : String(err)}\n`);
    } else {
      process.stderr.write(`[GitDiff] Error in polling: ${err instanceof Error ? err.message.slice(0, 100) : String(err).slice(0, 100)}\n`);
    }
  }
}

// Initial git HEAD
lastGitHead = getGitHead();

// Initial diff capture
process.stderr.write("[GitDiff] Starting git diff capture...\n");
captureGitDiff();

// Poll for git changes
setInterval(captureGitDiff, GIT_DIFF_INTERVAL);

bus.emit("status", "Using git diff capture for actual code changes...");

// --- Agent ---
// Import Teller2 functionality conditionally
import { isTeller2Enabled, createTeller2 } from "./teller2.js";

// Decide whether to use Teller2 or classic Teller
let agent: TellerAgent | any;
if (isTeller2Enabled()) {
  console.log("[Termeller] Teller2 features detected - using enhanced pattern recognition");
  const teller2 = createTeller2(bus);
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
