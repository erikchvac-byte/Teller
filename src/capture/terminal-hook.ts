import { EventEmitter } from "node:events";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface TerminalEvent {
  type: "command";
  command: string;
  cwd: string;
  timestamp: number;
  source: "terminal";
}

/**
 * Captures terminal commands by reading PowerShell/bash history files
 * and tailing them for new entries. Emits "event" for each new command.
 */
export class TerminalHook extends EventEmitter {
  private historyPath: string;
  private lastLineCount = 0;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private pollMs: number;
  private debug: boolean = process.env.DEBUG === "true";

  constructor(pollMs = 3000) {
    super();
    this.pollMs = pollMs;
    this.historyPath = this.detectHistoryPath();
  }

  private detectHistoryPath(): string {
    const platform = os.platform();
    if (platform === "win32") {
      // PowerShell ConsoleHost history
      const psHistoryPath = path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "Microsoft",
        "Windows",
        "PowerShell",
        "PSReadLine",
        "ConsoleHost_history.txt",
      );
      if (fs.existsSync(psHistoryPath)) return psHistoryPath;

      // Fallback: try to get it from PowerShell directly
      try {
        const result = execSync(
          'powershell -NoProfile -Command "(Get-PSReadLineOption).HistorySavePath"',
          { encoding: "utf-8", timeout: 5000 },
        ).trim();
        if (result && fs.existsSync(result)) return result;
      } catch {
        // ignore
      }
    }

    // Unix: bash or zsh history
    const shell = process.env.SHELL || "/bin/bash";
    if (shell.includes("zsh")) {
      return path.join(os.homedir(), ".zsh_history");
    }
    return path.join(os.homedir(), ".bash_history");
  }

  start(): void {
    if (this.debug) console.log("[TERMINAL] Starting TerminalHook");
    
    if (!fs.existsSync(this.historyPath)) {
      const platform = os.platform();
      const suggestion = platform === "win32" 
        ? "Open PowerShell and run a command to create history, then restart Teller."
        : "Run a command in your shell to create history, then restart Teller.";
        
      this.emit(
        "error",
        new Error(`Terminal history file not found at: ${this.historyPath}. ${suggestion}`),
      );
      return;
    }

    try {
      // Get current line count so we only emit new commands
      const content = fs.readFileSync(this.historyPath, "utf-8");
      this.lastLineCount = content.split("\n").length;

      this.emit("status", `Watching history: ${this.historyPath}`);
      if (this.debug) console.log(`[TERMINAL] Watching history file with ${this.lastLineCount} existing lines`);

      this.pollInterval = setInterval(() => this.poll(), this.pollMs);
    } catch (err) {
      this.emit("error", new Error(`Failed to start terminal watcher: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  private poll(): void {
    try {
      const content = fs.readFileSync(this.historyPath, "utf-8");
      const lines = content.split("\n");
      const currentCount = lines.length;

      if (currentCount > this.lastLineCount) {
        const newLines = lines.slice(this.lastLineCount, currentCount);
        if (this.debug) console.log(`[TERMINAL] Found ${newLines.length} new command(s)`);
        
        for (const line of newLines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const event: TerminalEvent = {
            type: "command",
            command: trimmed,
            cwd: process.cwd(),
            timestamp: Date.now(),
            source: "terminal",
          };
          
          if (this.debug) console.log(`[TERMINAL] Emitting command: ${trimmed}`);
          this.emit("event", event);
        }
        this.lastLineCount = currentCount;
      }
    } catch (err) {
      if (this.debug) console.log(`[TERMINAL] Error polling history: ${err}`);
      this.emit("error", err);
    }
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  getHistoryPath(): string {
    return this.historyPath;
  }
}
