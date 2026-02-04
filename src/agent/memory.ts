import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { execSync } from "node:child_process";

export interface StoredEvent {
  id?: number;
  session_id: string;
  workspace_id: string;
  type: string;
  source: string;
  content: string;
  timestamp: number;
}

export interface StoredObservation {
  id?: number;
  session_id: string;
  workspace_id: string;
  observation: string;
  timestamp: number;
  depth?: string;
}

export interface StoredLesson {
  id?: number;
  category: string;
  content: string;
  confidence: number;
  source_workspace: string;
  created_at: number;
  updated_at: number;
}

/**
 * SQLite-backed persistence with workspace-scoped memory and global lessons.
 * 
 * Workspace Memory: events and observations scoped to current git repo
 * Global Lessons: extracted patterns shared across all workspaces
 */
export class Memory {
  private db: Database.Database;
  private sessionId: string;
  private workspaceId: string;
  private insertCount = 0;
  private readonly CHECKPOINT_INTERVAL = 50; // Checkpoint every 50 inserts

  constructor(sessionId?: string, workspaceId?: string) {
    this.sessionId = sessionId || new Date().toISOString().replace(/[:.]/g, "-");
    this.workspaceId = workspaceId || this.resolveWorkspaceId();
    
    const dir = path.join(os.homedir(), ".termeller");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const dbPath = path.join(dir, "memory.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  /**
   * Resolve workspace ID from git repo root, falling back to cwd
   */
  private resolveWorkspaceId(): string {
    try {
      const gitRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf8",
        timeout: 3000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      return gitRoot;
    } catch {
      // Not a git repo, use current working directory
      return process.cwd();
    }
  }

  private init(): void {
    // Check and migrate events table
    this.migrateTable("events", `
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `, ["idx_events_session", "idx_events_workspace", "idx_events_timestamp"]);

    // Check and migrate observations table
    this.migrateTable("observations", `
      CREATE TABLE observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        observation TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `, ["idx_observations_session", "idx_observations_workspace"]);

    // Create lessons table (new, no migration needed)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        content TEXT NOT NULL UNIQUE,
        confidence REAL NOT NULL DEFAULT 0.5,
        source_workspace TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);
      CREATE INDEX IF NOT EXISTS idx_lessons_confidence ON lessons(confidence DESC);
    `);
  }

  /**
   * Migrate a table to add workspace_id column if needed.
   * Uses SQLite's table recreation approach since ALTER TABLE ADD COLUMN
   * doesn't always work as expected with existing data.
   */
  private migrateTable(tableName: string, createSql: string, indexNames: string[]): void {
    // Check if table exists
    const tableInfo = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);

    if (!tableInfo) {
      // Table doesn't exist, create it fresh
      this.db.exec(createSql);
      for (const idx of indexNames) {
        const colName = idx.includes("session") ? "session_id" : 
                       idx.includes("workspace") ? "workspace_id" : "timestamp";
        this.db.exec(`CREATE INDEX IF NOT EXISTS ${idx} ON ${tableName}(${colName})`);
      }
      return;
    }

    // Table exists - check if it has workspace_id column
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
    const hasWorkspaceId = columns.some(col => col.name === "workspace_id");

    if (hasWorkspaceId) {
      // Table is up to date, just ensure indexes exist
      for (const idx of indexNames) {
        const colName = idx.includes("session") ? "session_id" : 
                       idx.includes("workspace") ? "workspace_id" : "timestamp";
        this.db.exec(`CREATE INDEX IF NOT EXISTS ${idx} ON ${tableName}(${colName})`);
      }
      return;
    }

    // Migration needed: recreate table with new schema
    console.log(`[Memory] Migrating ${tableName} table to add workspace_id column...`);

    this.db.exec("BEGIN TRANSACTION");
    
    try {
      // Rename old table
      this.db.exec(`ALTER TABLE ${tableName} RENAME TO ${tableName}_old`);
      
      // Create new table with correct schema
      this.db.exec(createSql);
      
      // Copy data from old table, using empty string for new workspace_id column
      if (tableName === "events") {
        this.db.exec(`
          INSERT INTO ${tableName} (id, session_id, workspace_id, type, source, content, timestamp)
          SELECT id, session_id, '', type, source, content, timestamp FROM ${tableName}_old
        `);
      } else {
        this.db.exec(`
          INSERT INTO ${tableName} (id, session_id, workspace_id, observation, timestamp)
          SELECT id, session_id, '', observation, timestamp FROM ${tableName}_old
        `);
      }
      
      // Drop old indexes first to avoid conflicts
      for (const idx of indexNames) {
        this.db.exec(`DROP INDEX IF EXISTS ${idx}`);
      }
      
      // Create indexes
      for (const idx of indexNames) {
        const colName = idx.includes("session") ? "session_id" : 
                       idx.includes("workspace") ? "workspace_id" : "timestamp";
        this.db.exec(`CREATE INDEX IF NOT EXISTS ${idx} ON ${tableName}(${colName})`);
      }
      
      // Drop old table
      this.db.exec(`DROP TABLE ${tableName}_old`);
      
      this.db.exec("COMMIT");
      console.log(`[Memory] Migration of ${tableName} complete.`);
    } catch (err) {
      this.db.exec("ROLLBACK");
      console.error(`[Memory] Migration of ${tableName} failed:`, err);
      throw err;
    }
  }

  addEvent(event: Omit<StoredEvent, "id" | "session_id" | "workspace_id">): void {
    const stmt = this.db.prepare(
      "INSERT INTO events (session_id, workspace_id, type, source, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
    );
    stmt.run(
      this.sessionId,
      this.workspaceId,
      event.type,
      event.source,
      event.content,
      event.timestamp,
    );
    this.maybeCheckpoint();
  }

  addObservation(observation: string): void {
    const stmt = this.db.prepare(
      "INSERT INTO observations (session_id, workspace_id, observation, timestamp) VALUES (?, ?, ?, ?)",
    );
    stmt.run(this.sessionId, this.workspaceId, observation, Date.now());
  }

  /** Get events from the current session since a given timestamp */
  getRecentEvents(sinceMs: number): StoredEvent[] {
    const stmt = this.db.prepare(
      "SELECT * FROM events WHERE session_id = ? AND timestamp > ? ORDER BY timestamp ASC",
    );
    return stmt.all(this.sessionId, sinceMs) as StoredEvent[];
  }

  /** Get all events from the current session */
  getSessionEvents(): StoredEvent[] {
    const stmt = this.db.prepare(
      "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC",
    );
    return stmt.all(this.sessionId) as StoredEvent[];
  }

  /**
   * Get past observations from OTHER sessions in the SAME workspace.
   * This is workspace-scoped - no cross-workspace contamination.
   */
  getPastObservations(limit = 20): StoredObservation[] {
    const stmt = this.db.prepare(
      "SELECT * FROM observations WHERE workspace_id = ? AND session_id != ? ORDER BY timestamp DESC LIMIT ?",
    );
    return stmt.all(this.workspaceId, this.sessionId, limit) as StoredObservation[];
  }

  /** Get observations from the current session */
  getSessionObservations(): StoredObservation[] {
    const stmt = this.db.prepare(
      "SELECT * FROM observations WHERE session_id = ? ORDER BY timestamp ASC",
    );
    return stmt.all(this.sessionId) as StoredObservation[];
  }

  /**
   * Get global lessons - shared across all workspaces.
   * These are read-only behavioral patterns extracted from observations.
   */
  getLessons(limit = 8): StoredLesson[] {
    const stmt = this.db.prepare(
      "SELECT * FROM lessons ORDER BY confidence DESC, updated_at DESC LIMIT ?",
    );
    return stmt.all(limit) as StoredLesson[];
  }

  /**
   * Add or update a global lesson.
   * If a lesson with the same content exists, its confidence is increased.
   * This is the global intelligence layer.
   */
  addLesson(category: string, content: string, initialConfidence = 0.5): void {
    const stmt = this.db.prepare(`
      INSERT INTO lessons (category, content, confidence, source_workspace, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(content) DO UPDATE SET
        confidence = MIN(1.0, confidence + 0.1),
        updated_at = ?
    `);
    const now = Date.now();
    stmt.run(
      category,
      content,
      initialConfidence,
      this.workspaceId,
      now,
      now,
      now,
    );
    this.maybeCheckpoint();
  }

  /** Conditionally checkpoint WAL to reduce performance overhead */
  private maybeCheckpoint(): void {
    this.insertCount++;
    if (this.insertCount % this.CHECKPOINT_INTERVAL === 0) {
      this.db.pragma("wal_checkpoint(PASSIVE)");
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getWorkspaceId(): string {
    return this.workspaceId;
  }

  close(): void {
    // Final checkpoint before closing
    this.db.pragma("wal_checkpoint(PASSIVE)");
    this.db.close();
  }
}
