import Database from "better-sqlite3";
import path from "path";
import os from "os";

const dbPath = path.join(os.homedir(), ".termeller", "memory.db");
const db = new Database(dbPath);

console.log("=== Removing All Logs Except February 4th ===\n");

// First, let's see what we have
const totalEvents = db.prepare("SELECT COUNT(*) as count FROM events").get();
const totalObs = db.prepare("SELECT COUNT(*) as count FROM observations").get();
const totalLessons = db.prepare("SELECT COUNT(*) as count FROM lessons").get();

console.log(`Before cleanup:`);
console.log(`  Events: ${totalEvents.count}`);
console.log(`  Observations: ${totalObs.count}`);
console.log(`  Lessons: ${totalLessons.count}`);

// Target date: February 4, 2026
const targetDate = "2026-02-04";

console.log(`\nKeeping only data from: ${targetDate}`);

// Delete events NOT from Feb 4
const deleteEventsResult = db.prepare(`
  DELETE FROM events 
  WHERE date(timestamp/1000, 'unixepoch') != ?
`).run(targetDate);

console.log(`\nDeleted ${deleteEventsResult.changes} events`);

// Delete observations NOT from Feb 4  
const deleteObsResult = db.prepare(`
  DELETE FROM observations 
  WHERE date(timestamp/1000, 'unixepoch') != ?
`).run(targetDate);

console.log(`Deleted ${deleteObsResult.changes} observations`);

// Keep lessons (these are global patterns learned)
console.log(`Keeping all ${totalLessons.count} lessons (global patterns)`);

// Show final counts
const finalEvents = db.prepare("SELECT COUNT(*) as count FROM events").get();
const finalObs = db.prepare("SELECT COUNT(*) as count FROM observations").get();

console.log(`\nAfter cleanup:`);
console.log(`  Events: ${finalEvents.count}`);
console.log(`  Observations: ${finalObs.count}`);
console.log(`  Lessons: ${totalLessons.count} (unchanged)`);

// Verify date range
const eventRange = db.prepare(`
  SELECT 
    date(MIN(timestamp)/1000, 'unixepoch') as min_date,
    date(MAX(timestamp)/1000, 'unixepoch') as max_date
  FROM events
`).get();

const obsRange = db.prepare(`
  SELECT 
    date(MIN(timestamp)/1000, 'unixepoch') as min_date,
    date(MAX(timestamp)/1000, 'unixepoch') as max_date
  FROM observations
`).get();

console.log(`\nFinal date ranges:`);
console.log(`  Events: ${eventRange.min_date} to ${eventRange.max_date}`);
console.log(`  Observations: ${obsRange.min_date} to ${obsRange.max_date}`);

// Check if we have the right counts
if (finalEvents.count === 732 && finalObs.count === 126) {
  console.log(`\n✅ Success! Kept exactly 732 events and 126 observations from Feb 4th`);
} else {
  console.log(`\n⚠️  Warning: Expected 732 events and 126 obs, got ${finalEvents.count} events and ${finalObs.count} obs`);
}

// Vacuum to reclaim space
console.log(`\nOptimizing database...`);
db.exec("VACUUM");
console.log(`Database optimization complete.`);

db.close();