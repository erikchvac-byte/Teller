import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { watch } from "chokidar";
import { execSync } from "node:child_process";

export interface WorkEvent {
  type: "file_change" | "git_activity" | "terminal_command" | "build_output";
  content: string;
  path?: string;
  timestamp: number;
  source: "work_monitor";
}

/**
 * Monitors actual coding work across multiple sources:
 * - File system changes (code edits, file creations/deletions)
 * - Git repository activity (commits, branches, status)
 * - Build system output
 * - Terminal commands (in separate terminal from conversation)
 */
export class WorkMonitor extends EventEmitter {
  private projectDir: string;
  private fileWatcher: ReturnType<typeof watch> | null = null;
  private gitWatcher: ReturnType<typeof watch> | null = null;
  private terminalHook: any;
  private buildWatchers: Array<ReturnType<typeof watch>> = [];
  private seenFiles = new Set<string>();
  private lastGitStatus = "";

  constructor(projectDir: string = process.cwd()) {
    super();
    this.projectDir = projectDir;
    
    // Initialize terminal hook for separate terminal monitoring
    try {
      const TerminalHook = require("./capture/terminal-hook").TerminalHook;
      this.terminalHook = new TerminalHook(1000); // Poll every second
    } catch (err) {
      this.terminalHook = null;
      console.log("Terminal hook not available for work monitoring");
    }
  }

  start(): void {
    try {
      // Start file system watching
      this.startFileWatching();
      
      // Start git monitoring
      this.startGitMonitoring();
      
      // Start terminal monitoring (if available)
      if (this.terminalHook) {
        this.terminalHook.on("event", (event: any) ={
          const workEvent: WorkEvent = {
            type: "terminal_command",
            content: event.command,
            timestamp: Date.now(),
            source: "work_monitor"
          };
          this.emit("event", workEvent);
        });
        
        this.terminalHook.on("error", (err: Error) ={
          this.emit("error", err);
        });
        
        this.terminalHook.start();
      }
      
      // Start build monitoring (watch for package.json, Makefile, etc.)
      this.startBuildMonitoring();
      
      this.emit("status", "Work monitor active - watching file changes, git activity, and terminal commands");
    } catch (err) {
      this.emit("error", new Error(`Failed to start work monitor: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  private startFileWatching(): void {
    if (!fs.existsSync(this.projectDir)) {
      this.emit("error", new Error(`Project directory not found: ${this.projectDir}`));
      return;
    }

    this.fileWatcher = watch(this.projectDir, {
      persistent: true,
      ignoreInitial: true,
      depth: 3,
      ignorePermissionErrors: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.fileWatcher.on("all", (event: string, filePath: string) ={
      const relPath = path.relative(this.projectDir, filePath);
      
      // Ignore certain file types and directories
      if (this.shouldIgnoreFile(relPath)) return;
      
      const workEvent: WorkEvent = {
        type: "file_change",
        content: `${event}: ${relPath}`,
        path: relPath,
        timestamp: Date.now(),
        source: "work_monitor"
      };
      
      this.emit("event", workEvent);
      this.seenFiles.add(filePath);
    });

    this.fileWatcher.on("error", (err: Error) ={
      this.emit("error", err);
    });
  }

  private startGitMonitoring(): void {
    // Check if this is a git repository
    try {
      const gitDir = path.join(this.projectDir, ".git");
      if (fs.existsSync(gitDir)) {
        // Watch git status changes
        this.gitWatcher = watch([path.join(this.projectDir, ".git")], {
          persistent: true,
          ignoreInitial: true,
          depth: 2,
          ignorePermissionErrors: true
        });

        this.gitWatcher.on("all", (event, gitPath) ={
          // Only process relevant git events
          if (!gitPath.includes("index") && !gitPath.includes("HEAD")) return;
          
          this.checkGitStatus();
        });

        // Initial git status check
        this.checkGitStatus();
      }
    } catch (err) {
      console.log("Git monitoring not available:", err.message);
    }
  }

  private async checkGitStatus(): Promise<void> {
    try {
      const { execSync } = require("node:child_process");
      const gitStatus = execSync("git status --porcelain", { 
        encoding: "utf8",
        timeout: 3000,
        cwd: this.projectDir
      }).trim();

      if (gitStatus !== this.lastGitStatus) {
        const workEvent: WorkEvent = {
          type: "git_activity",
          content: gitStatus || "Working tree clean",
          timestamp: Date.now(),
          source: "work_monitor"
        };
        
        this.emit("event", workEvent);
        this.lastGitStatus = gitStatus;
      }
    } catch (err) {
      // Git not available or error - ignore
    }
  }

  private startBuildMonitoring(): void {
    // Watch for common build files
    const buildFiles = [
      "package.json",
      "package-lock.json",
      "yarn.lock",
      "Makefile",
      "CMakeLists.txt",
      "build.gradle",
      "pom.xml",
      "Cargo.toml",
      "go.mod"
    ];

    buildFiles.forEach(file ={
      const filePath = path.join(this.projectDir, file);
      if (fs.existsSync(filePath)) {
        const watcher = watch(filePath, {
          persistent: true,
          ignoreInitial: true,
          depth: 0
        });

        watcher.on("all", (event, changedFile) ={
          const workEvent: WorkEvent = {
            type: "build_output",
            content: `Build file ${event}: ${file}`,
            timestamp: Date.now(),
            source: "work_monitor"
          };
          
          this.emit("event", workEvent);
        });

        this.buildWatchers.push(watcher);
      }
    });
  }

  private shouldIgnoreFile(filePath: string): boolean {
    const ignorePatterns = [
      "node_modules",
      ".git",
      ".DS_Store",
      ".vscode",
      ".idea",
      "dist",
      "build",
      "target",
      ".next",
      ".nuxt",
      "coverage",
      "*.log",
      "*.tmp",
      "*.cache"
    ];

    return ignorePatterns.some(pattern => {
      if (pattern.startsWith("*")) {
        return filePath.endsWith(pattern.slice(1));
      }
      return filePath.includes(pattern);
    });
  }

  stop(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    
    if (this.gitWatcher) {
      this.gitWatcher.close();
      this.gitWatcher = null;
    }
    
    if (this.terminalHook) {
      this.terminalHook.stop();
    }
    
    this.buildWatchers.forEach(watcher ={
      if (watcher) watcher.close();
    });
    
    this.buildWatchers = [];
  }

  getProjectDir(): string {
    return this.projectDir;
  }
}

// Export for use in enhanced-teller
export { WorkEvent, WorkMonitor };