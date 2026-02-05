import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

const dbPath = path.join(os.homedir(), ".termeller", "memory.db");
const db = new Database(dbPath);

console.log("=== Full Termeller Observations Export ===\n");

// Get all observations with full content
const allObservations = db.prepare(`
  SELECT session_id,
         workspace_id,
         observation,
         datetime(timestamp/1000, 'unixepoch') as formatted_time,
         timestamp
  FROM observations 
  ORDER BY timestamp DESC
`).all();

console.log(`Total observations: ${allObservations.length}\n`);

allObservations.forEach((obs, index) => {
  console.log(`--- Observation ${index + 1} ---`);
  console.log(`Time: ${obs.formatted_time}`);
  console.log(`Session: ${obs.session_id}`);
  console.log(`Workspace: ${obs.workspace_id}`);
  console.log(`Content: ${obs.observation}`);
  console.log('');
});

// Also export to a file
const exportContent = allObservations.map((obs, index) => 
`--- Observation ${index + 1} ---
Time: ${obs.formatted_time}
Session: ${obs.session_id}
Workspace: ${obs.workspace_id}
Content: ${obs.observation}
`
).join('\n');

fs.writeFileSync('termeller_observations_export.txt', exportContent);
console.log(`Export saved to: termeller_observations_export.txt`);

db.close();