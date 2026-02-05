import Database from "better-sqlite3";
import path from "path";
import os from "os";

const dbPath = path.join(os.homedir(), ".termeller", "memory.db");
const db = new Database(dbPath);

console.log("=== Termeller Database Stats ===");

// Count events
const eventCount = db.prepare("SELECT COUNT(*) as count FROM events").get();
console.log(`Total events: ${eventCount.count}`);

// Count observations  
const obsCount = db.prepare("SELECT COUNT(*) as count FROM observations").get();
console.log(`Total observations: ${obsCount.count}`);

// Count lessons
const lessonCount = db.prepare("SELECT COUNT(*) as count FROM lessons").get();
console.log(`Total lessons: ${lessonCount.count}`);

// Show recent events
console.log("\n=== Recent Events (last 10) ===");
const recentEvents = db.prepare(`
  SELECT session_id, type, source, 
         substr(content, 1, 100) as content_preview,
         datetime(timestamp/1000, 'unixepoch') as time
  FROM events 
  ORDER BY timestamp DESC 
  LIMIT 10
`).all();

recentEvents.forEach(event => {
  console.log(`${event.time} [${event.type}] ${event.source}: ${event.content_preview}${event.content && event.content.length >= 100 ? '...' : ''}`);
});

// Show recent observations
console.log("\n=== Recent Observations (last 5) ===");
const recentObs = db.prepare(`
  SELECT session_id,
         substr(observation, 1, 120) as obs_preview,
         datetime(timestamp/1000, 'unixepoch') as time
  FROM observations 
  ORDER BY timestamp DESC 
  LIMIT 5
`).all();

recentObs.forEach(obs => {
  console.log(`${obs.time} ${obs.obs_preview}${obs.obs_preview.length >= 120 ? '...' : ''}`);
});

// Show workspace breakdown
console.log("\n=== Events by Workspace ===");
const workspaceStats = db.prepare(`
  SELECT workspace_id, COUNT(*) as count
  FROM events 
  GROUP BY workspace_id
  ORDER BY count DESC
`).all();

workspaceStats.forEach(stat => {
  console.log(`${stat.workspace_id}: ${stat.count} events`);
});

db.close();