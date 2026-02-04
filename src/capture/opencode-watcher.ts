import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { watch } from "chokidar";

export interface OpencodeEvent {
  type: "conversation";
  role: string;
  content: string;
  timestamp: number;
  source: "opencode";
  sessionId: string;
  model: string;
  provider: string;
  agent: string;
}

/**
 * Watches opencode's global storage at ~/.local/share/opencode/storage/
 * for new messages and their text parts. Read-only — never writes to
 * opencode's directories.
 *
 * Opencode stores one JSON file per message (storage/message/{sessionId}/{msgId}.json)
 * and one JSON file per content part (storage/part/{msgId}/{partId}.json).
 * We watch both to capture the full picture: message metadata (role, model,
 * provider, agent) and part content (actual text).
 */
export class OpencodeWatcher extends EventEmitter {
  private storageDir: string;
  private messageDir: string;
  private partDir: string;
  private messageWatcher: ReturnType<typeof watch> | null = null;
  private partWatcher: ReturnType<typeof watch> | null = null;
  private seenMessages = new Set<string>();
  private seenParts = new Set<string>();
  private readonly MAX_SEEN_SIZE = 5000; // Limit to prevent memory leak

  // Buffer: messageId -> metadata (from message files)
  private messageBuffer = new Map<
    string,
    {
      role: string;
      model: string;
      provider: string;
      agent: string;
      sessionId: string;
      timestamp: number;
    }
  >();

  constructor() {
    super();
    this.storageDir = path.join(
      os.homedir(),
      ".local",
      "share",
      "opencode",
      "storage",
    );
    this.messageDir = path.join(this.storageDir, "message");
    this.partDir = path.join(this.storageDir, "part");
  }

  start(): void {
    if (!fs.existsSync(this.storageDir)) {
      this.emit("status", `Opencode storage not found at ${this.storageDir}`);
      this.emit("error", new Error(`Opencode storage directory not found. Please ensure opencode is running and has generated conversation history.`));
      return;
    }

    try {
      // Capture existing recent files before starting to watch for new ones
      this.snapshotExisting();
      this.watchMessages();
      this.watchParts();
      this.emit("status", "Watching opencode conversations (global, read-only)");
    } catch (err) {
      this.emit("error", new Error(`Failed to start opencode watcher: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  /** Process recent files (last 5 min) and mark older ones as seen */
  private snapshotExisting(): void {
    const recentCutoff = Date.now() - 5 * 60 * 1000;
    let recentMessages = 0;
    let recentParts = 0;
    let skippedMessages = 0;
    let skippedParts = 0;

    if (fs.existsSync(this.messageDir)) {
      const counts = this.walkAndProcessRecent(this.messageDir, recentCutoff, "message");
      recentMessages = counts.recent;
      skippedMessages = counts.skipped;
    }

    if (fs.existsSync(this.partDir)) {
      const counts = this.walkAndProcessRecent(this.partDir, recentCutoff, "part");
      recentParts = counts.recent;
      skippedParts = counts.skipped;
    }

    this.emit(
      "status",
      `Snapshot: ${recentMessages} recent msgs, ${recentParts} recent parts (skipped ${skippedMessages}/${skippedParts} old)`,
    );
  }

  /** Walk directory, process recent files, mark old ones as seen */
  private walkAndProcessRecent(
    dir: string,
    cutoff: number,
    type: "message" | "part"
  ): { recent: number; skipped: number } {
    let recent = 0;
    let skipped = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          const sub = this.walkAndProcessRecent(full, cutoff, type);
          recent += sub.recent;
          skipped += sub.skipped;
        } else if (e.name.endsWith(".json")) {
          const stat = fs.statSync(full);
          if (stat.mtimeMs > cutoff) {
            recent++;
            if (type === "message") {
              this.handleMessage(full);
            } else {
              this.handlePart(full);
            }
          } else {
            skipped++;
            if (type === "message") {
              this.seenMessages.add(full);
            } else {
              this.seenParts.add(full);
            }
          }
        }
      }
    } catch {
    }
    return { recent, skipped };
  }

  private walkJsonFiles(dir: string, cb: (filePath: string) => void): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          this.walkJsonFiles(full, cb);
        } else if (e.name.endsWith(".json")) {
          cb(full);
        }
      }
    } catch {
      // ignore permission errors etc.
    }
  }

  /** Watch for new message metadata files */
  private watchMessages(): void {
    if (!fs.existsSync(this.messageDir)) return;

    this.messageWatcher = watch(this.messageDir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      persistent: true,
      usePolling: true, // Force polling for better Windows compatibility
      interval: 1000,
    });

    this.messageWatcher.on("add", (fp: string) => {
      if (fp.endsWith(".json")) {
        this.handleMessage(fp);
      }
    });
    this.messageWatcher.on("error", (err: unknown) => {
      this.emit("error", err);
    });
  }

  /** Watch for new part content files (the actual text) */
  private watchParts(): void {
    if (!fs.existsSync(this.partDir)) return;

    this.partWatcher = watch(this.partDir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      persistent: true,
      usePolling: true, // Force polling for better Windows compatibility
      interval: 1000,
    });

    this.partWatcher.on("add", (fp: string) => {
      if (fp.endsWith(".json")) {
        this.handlePart(fp);
      }
    });
    this.partWatcher.on("error", (err: unknown) => {
      this.emit("error", err);
    });
  }

  /** Prevent memory leak by evicting old entries when sets grow too large */
  private cleanupSeenSets(): void {
    if (this.seenMessages.size > this.MAX_SEEN_SIZE) {
      const entries = Array.from(this.seenMessages);
      this.seenMessages = new Set(entries.slice(-Math.floor(this.MAX_SEEN_SIZE / 2)));
    }
    if (this.seenParts.size > this.MAX_SEEN_SIZE) {
      const entries = Array.from(this.seenParts);
      this.seenParts = new Set(entries.slice(-Math.floor(this.MAX_SEEN_SIZE / 2)));
    }
    if (this.messageBuffer.size > this.MAX_SEEN_SIZE) {
      const entries = Array.from(this.messageBuffer.entries());
      this.messageBuffer = new Map(entries.slice(-Math.floor(this.MAX_SEEN_SIZE / 2)));
    }
  }

  /** Parse a message metadata file and buffer it */
  private handleMessage(filePath: string): void {
    if (this.seenMessages.has(filePath)) return;
    this.seenMessages.add(filePath);
    this.cleanupSeenSets();

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const msg = JSON.parse(raw);

      const msgId: string = msg.id || path.basename(filePath, ".json");
      const role: string = msg.role || "unknown";
      const sessionId: string = msg.sessionID || "unknown";
      const timestamp: number = msg.time?.created || Date.now();

      // Model/provider live in different places for user vs assistant messages
      let model = "";
      let provider = "";
      let agent = "";

      if (role === "user") {
        model = msg.model?.modelID || "";
        provider = msg.model?.providerID || "";
        agent = msg.agent || "";
      } else if (role === "assistant") {
        model = msg.modelID || "";
        provider = msg.providerID || "";
        agent = msg.agent || "";
      }

      this.messageBuffer.set(msgId, {
        role,
        model,
        provider,
        agent,
        sessionId,
        timestamp,
      });
    } catch {
      // malformed file, skip
    }
  }

  /** Parse a part content file — only emit text parts as events */
  private handlePart(filePath: string): void {
    if (this.seenParts.has(filePath)) return;
    this.seenParts.add(filePath);
    this.cleanupSeenSets();

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const part = JSON.parse(raw);

      // We only care about actual text content, not tool calls, step markers, etc.
      if (part.type !== "text") return;

      const text: string = part.text || "";
      if (!text.trim()) return;

      const messageId: string = part.messageID || "";
      const sessionId: string = part.sessionID || "unknown";
      const timestamp: number = part.time?.start || Date.now();

      // Look up message metadata from buffer
      const meta = this.messageBuffer.get(messageId);

      const event: OpencodeEvent = {
        type: "conversation",
        role: meta?.role || "unknown",
        content: text.slice(0, 2000),
        timestamp: meta?.timestamp || timestamp,
        source: "opencode",
        sessionId: meta?.sessionId || sessionId,
        model: meta?.model || "",
        provider: meta?.provider || "",
        agent: meta?.agent || "",
      };

      this.emit("event", event);
    } catch {
    }
  }

  stop(): void {
    if (this.messageWatcher) {
      this.messageWatcher.close();
      this.messageWatcher = null;
    }
    if (this.partWatcher) {
      this.partWatcher.close();
      this.partWatcher = null;
    }
  }
}
