import "dotenv/config";
import { EventEmitter } from "node:events";
import { execSync } from "node:child_process";
import { TerminalHook } from "./capture/terminal-hook.js";
import { OpencodeWatcher } from "./capture/opencode-watcher.js";
import { Memory } from "./agent/memory.js";
import { TellerAgent } from "./agent/teller.js";
import { renderApp } from "./ui/window.js";

// Clear terminal screen for clean startup
try {
  // Try multiple clear methods for Windows PowerShell
  execSync("cls", { stdio: "inherit" });
} catch {
  try {
    execSync("clear", { stdio: "inherit" });
  } catch {
    // Fallback: emit ANSI clear sequence
    process.stdout.write("\x1b[2J\x1b[H");
  }
}

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

// --- Agent ---
const agent = new TellerAgent({
  memory,
  intervalMs: 2 * 60 * 1000,
  onObservation: (obs) => {
    bus.emit("observation", obs);
  },
  onError: (err) => {
    bus.emit("error", err);
  },
});

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
