import Database from "better-sqlite3";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export interface StoredEvent {
  id?: number;
  session_id: string;
  type: string;
  source: string;
  content: string;
  timestamp: number;
}

export interface StoredObservation {
  id?: number;
  session_id: string;
  observation: string;
  timestamp: number;
  depth?: string; // Store the analysis depth used
}

/**
 * SQLite-backed persistence for events and agent observations.
 * Stores everything in a single file at ~/.termeller/memory.db
 */
export class Memory {
  private db: Database.Database;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId =
      sessionId || new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(os.homedir(), ".termeller");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const dbPath = path.join(dir, "memory.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        observation TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id);
    `);
  }

  addEvent(event: Omit<StoredEvent, "id" | "session_id">): void {
    const stmt = this.db.prepare(
      "INSERT INTO events (session_id, type, source, content, timestamp) VALUES (?, ?, ?, ?, ?)",
    );
    stmt.run(
      this.sessionId,
      event.type,
      event.source,
      event.content,
      event.timestamp,
     );
     this.db.pragma('wal_checkpoint(PASSIVE)');
   }

  addObservation(observation: string): void {
    const stmt = this.db.prepare(
      "INSERT INTO observations (session_id, observation, timestamp) VALUES (?, ?, ?)",
     );
     stmt.run(this.sessionId, observation, Date.now());
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

  /** Get past observations for cross-session context */
  getPastObservations(limit = 20): StoredObservation[] {
    const stmt = this.db.prepare(
      "SELECT * FROM observations WHERE session_id != ? ORDER BY timestamp DESC LIMIT ?",
    );
    return stmt.all(this.sessionId, limit) as StoredObservation[];
  }

  /** Get observations from the current session */
  getSessionObservations(): StoredObservation[] {
    const stmt = this.db.prepare(
      "SELECT * FROM observations WHERE session_id = ? ORDER BY timestamp ASC",
    );
    return stmt.all(this.sessionId) as StoredObservation[];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  close(): void {
    this.db.close();
  }
}
