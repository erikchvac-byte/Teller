import Database from "better-sqlite3";
import path from "path";
import os from "os";

const dbPath = path.join(os.homedir(), ".termeller", "memory.db");
const db = new Database(dbPath);

console.log("=== TERLLER LOG ANALYSIS REPORT ===");
console.log("Date: February 4, 2026");
console.log("Generated: " + new Date().toLocaleString());
console.log("=" .repeat(50));

// Session Overview
const sessionStats = db.prepare(`
  SELECT 
    COUNT(DISTINCT session_id) as total_sessions,
    MIN(timestamp) as first_activity,
    MAX(timestamp) as last_activity
  FROM events
`).get();

const timeSpan = sessionStats.last_activity - sessionStats.first_activity;
const hoursActive = Math.floor(timeSpan / (1000 * 60 * 60));
const minutesActive = Math.floor((timeSpan % (1000 * 60 * 60)) / (1000 * 60));

console.log(`\n📊 SESSION OVERVIEW`);
console.log(`Total Sessions: ${sessionStats.total_sessions}`);
console.log(`Activity Span: ${hoursActive}h ${minutesActive}m`);
console.log(`First Activity: ${new Date(sessionStats.first_activity).toLocaleString()}`);
console.log(`Last Activity: ${new Date(sessionStats.last_activity).toLocaleString()}`);

// Event Type Breakdown
console.log(`\n📝 EVENT BREAKDOWN`);
const eventTypes = db.prepare(`
  SELECT type, COUNT(*) as count, 
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events), 1) as percentage
  FROM events 
  GROUP BY type 
  ORDER BY count DESC
`).all();

eventTypes.forEach(type => {
  console.log(`${type.type.padEnd(15)}: ${type.count.toString().padStart(4)} (${type.percentage}%)`);
});

// Source Analysis
console.log(`\n🔍 SOURCE ANALYSIS`);
const sources = db.prepare(`
  SELECT source, COUNT(*) as count,
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events), 1) as percentage
  FROM events 
  GROUP BY source 
  ORDER BY count DESC
`).all();

sources.forEach(source => {
  console.log(`${source.source.padEnd(15)}: ${source.count.toString().padStart(4)} (${source.percentage}%)`);
});

// Time Distribution
console.log(`\n⏰ HOURLY ACTIVITY`);
const hourlyActivity = db.prepare(`
  SELECT 
    strftime('%H', timestamp/1000, 'unixepoch') as hour,
    COUNT(*) as count
  FROM events 
  GROUP BY hour 
  ORDER BY hour
`).all();

const maxHourlyCount = Math.max(...hourlyActivity.map(h => h.count));
hourlyActivity.forEach(hour => {
  const bar = '█'.repeat(Math.floor(hour.count / maxHourlyCount * 20));
  console.log(`${hour.hour}:00`.padEnd(7) + ` ${bar.padEnd(22)} ${hour.count}`);
});

// Observation Themes
console.log(`\n💡 KEY OBSERVATION THEMES`);
const observations = db.prepare(`
  SELECT observation FROM observations ORDER BY timestamp ASC
`).all();

// Extract key themes from observations
const themes = {
  'Documentation': 0,
  'UI Development': 0, 
  'Bug/Troubleshooting': 0,
  'Process/Workflow': 0,
  'Environment/Setup': 0,
  'Git/Deployment': 0
};

observations.forEach(obs => {
  const content = obs.observation.toLowerCase();
  if (content.includes('documentation') || content.includes('adr') || content.includes('readme')) themes['Documentation']++;
  if (content.includes('ui') || content.includes('interface') || content.includes('display') || content.includes('dashboard')) themes['UI Development']++;
  if (content.includes('bug') || content.includes('error') || content.includes('issue') || content.includes('problem') || content.includes('fix')) themes['Bug/Troubleshooting']++;
  if (content.includes('process') || content.includes('workflow') || content.includes('pattern') || content.includes('session')) themes['Process/Workflow']++;
  if (content.includes('environment') || content.includes('setup') || content.includes('directory') || content.includes('path')) themes['Environment/Setup']++;
  if (content.includes('git') || content.includes('commit') || content.includes('deploy') || content.includes('push')) themes['Git/Deployment']++;
});

Object.entries(themes)
  .sort(([,a], [,b]) => b - a)
  .forEach(([theme, count]) => {
    console.log(`${theme.padEnd(20)}: ${count} observations`);
  });

// Risk Analysis
console.log(`\n⚠️  RISK INDICATORS`);
const riskObservations = db.prepare(`
  SELECT observation FROM observations 
  WHERE observation LIKE '%Risk:%' OR observation LIKE '%Critical%' OR observation LIKE '%Warning%'
`).all();

console.log(`High-risk observations identified: ${riskObservations.length}`);
if (riskObservations.length > 0) {
  riskObservations.slice(0, 3).forEach((obs, i) => {
    const riskMatch = obs.observation.match(/Risk:\s*([^|]+)/);
    if (riskMatch) {
      console.log(`  ${i + 1}. ${riskMatch[1].trim()}`);
    }
  });
  if (riskObservations.length > 3) {
    console.log(`  ... and ${riskObservations.length - 3} more`);
  }
}

// Sample Key Observations
console.log(`\n🎯 KEY OBSERVATIONS (Sample)`);
const sampleObs = db.prepare(`
  SELECT 
    datetime(timestamp/1000, 'unixepoch') as time,
    observation
  FROM observations 
  ORDER BY timestamp ASC
`).all();

// Show first, middle, and last observations
const indices = [0, Math.floor(sampleObs.length / 2), sampleObs.length - 1];
indices.forEach((i, idx) => {
  if (sampleObs[i]) {
    const prefix = idx === 0 ? 'START' : idx === 1 ? 'MID' : 'END';
    const content = sampleObs[i].observation.substring(0, 120) + (sampleObs[i].observation.length > 120 ? '...' : '');
    console.log(`${prefix.padEnd(5)} ${sampleObs[i].time}: ${content}`);
  }
});

// Lessons Learned
const lessons = db.prepare(`
  SELECT category, COUNT(*) as count
  FROM lessons 
  GROUP BY category 
  ORDER BY count DESC
`).all();

if (lessons.length > 0) {
  console.log(`\n📚 LESSONS LEARNED`);
  lessons.forEach(lesson => {
    console.log(`${lesson.category.padEnd(20)}: ${lesson.count} patterns`);
  });
}

// Workspace Context
const workspaces = db.prepare(`
  SELECT DISTINCT workspace_id, COUNT(*) as event_count
  FROM events 
  GROUP BY workspace_id
  ORDER BY event_count DESC
`).all();

console.log(`\n🏢 WORKSPACE BREAKDOWN`);
workspaces.forEach(ws => {
  const wsName = ws.workspace_id.includes('/') ? ws.workspace_id.split('/').pop() : ws.workspace_id;
  console.log(`${wsName.padEnd(20)}: ${ws.event_count} events`);
});

// Summary
console.log(`\n📋 SUMMARY`);
console.log(`• 732 events captured across ${sessionStats.total_sessions} sessions`);
console.log(`• 126 observations generated (${(126/732*100).toFixed(1)}% observation rate)`);
console.log(`• Primary focus: ${eventTypes[0]?.type || 'N/A'} (${eventTypes[0]?.percentage || 0}%)`);
console.log(`• Main sources: ${sources[0]?.source || 'N/A'}, ${sources[1]?.source || 'N/A'}`);
console.log(`• Peak activity hour: ${hourlyActivity.reduce((max, curr) => curr.count > max.count ? curr : max, hourlyActivity[0])?.hour || 'N/A'}:00`);
console.log(`• Risk indicators: ${riskObservations.length} identified`);

db.close();
console.log(`\n` + "=".repeat(50));
console.log(`END OF REPORT`);