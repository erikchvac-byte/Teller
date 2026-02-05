import Database from "better-sqlite3";
import path from "path";
import os from "os";

const dbPath = path.join(os.homedir(), ".termeller", "memory.db");
const db = new Database(dbPath);

console.log("=== Termeller Log Time Frame Analysis ===\n");

// Get earliest and latest events
const eventTimeRange = db.prepare(`
  SELECT 
    datetime(MIN(timestamp)/1000, 'unixepoch') as earliest_event,
    datetime(MAX(timestamp)/1000, 'unixepoch') as latest_event
  FROM events
`).get();

// Get earliest and latest observations
const obsTimeRange = db.prepare(`
  SELECT 
    datetime(MIN(timestamp)/1000, 'unixepoch') as earliest_obs,
    datetime(MAX(timestamp)/1000, 'unixepoch') as latest_obs
  FROM observations
`).get();

console.log("Events:");
console.log(`  Earliest: ${eventTimeRange.earliest_event}`);
console.log(`  Latest:   ${eventTimeRange.latest_event}`);

console.log("\nObservations:");
console.log(`  Earliest: ${obsTimeRange.earliest_obs}`);
console.log(`  Latest:   ${obsTimeRange.latest_obs}`);

// Calculate duration
function getDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end - start;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${days}d ${hours}h ${minutes}m`;
}

if (eventTimeRange.earliest_event && eventTimeRange.latest_event) {
  const eventDuration = getDuration(eventTimeRange.earliest_event, eventTimeRange.latest_event);
  console.log(`\nEvent capture duration: ${eventDuration}`);
}

if (obsTimeRange.earliest_obs && obsTimeRange.latest_obs) {
  const obsDuration = getDuration(obsTimeRange.earliest_obs, obsTimeRange.latest_obs);
  console.log(`Observation duration: ${obsDuration}`);
}

// Events per day breakdown
console.log("\n=== Daily Activity Breakdown ===");
const dailyStats = db.prepare(`
  SELECT 
    date(timestamp/1000, 'unixepoch') as date,
    COUNT(*) as event_count,
    COUNT(DISTINCT session_id) as sessions
  FROM events 
  GROUP BY date(timestamp/1000, 'unixepoch')
  ORDER BY date DESC
  LIMIT 10
`).all();

dailyStats.forEach(stat => {
  console.log(`${stat.date}: ${stat.event_count} events, ${stat.sessions} sessions`);
});

// Observations per day breakdown
console.log("\n=== Daily Observations Breakdown ===");
const dailyObs = db.prepare(`
  SELECT 
    date(timestamp/1000, 'unixepoch') as date,
    COUNT(*) as obs_count
  FROM observations 
  GROUP BY date(timestamp/1000, 'unixepoch')
  ORDER BY date DESC
  LIMIT 10
`).all();

dailyObs.forEach(stat => {
  console.log(`${stat.date}: ${stat.obs_count} observations`);
});

db.close();