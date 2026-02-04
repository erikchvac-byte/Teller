import { TellerAgent } from "./agent/teller.js";
import { Memory } from "./agent/memory.js";
import { EnhancedTellerAgent } from "./agent/enhanced-teller.js";
import { VectorEnhancedMemory } from "./agent/vector-memory.js";
import { SkillLoader } from "./agent/skill-loader.js";
import { EventEmitter } from "node:events";
import { AnthropicProvider } from "./agent/providers/anthropic.js";

/**
 * Create a Teller2 agent with enhanced pattern recognition
 * This is a drop-in replacement for the standard Teller setup
 * 
 * @param bus - Event emitter for observations
 * @param existingMemory - Optional: use existing Memory instance to share events with other capture sources
 */
export function createTeller2(bus: EventEmitter, existingMemory?: Memory): {
  agent: EnhancedTellerAgent;
  memory: Memory;
} {
  // Use existing memory if provided, otherwise create new one
  const memory = existingMemory || new Memory();
  
  // Create vector-enhanced memory (optional)
  let vectorMemory: VectorEnhancedMemory | undefined;
  try {
    vectorMemory = new VectorEnhancedMemory(memory.getSessionId());
    console.log("[Teller2] Vector memory enabled");
  } catch (err) {
    console.warn("[Teller2] Vector memory initialization failed, continuing without it:", err);
  }
  
  // Create skill loader
  const skillLoader = new SkillLoader();
  
  // List available skills
  skillLoader.listAvailableSkills()
    .then(skills => {
      console.log(`[Teller2] Found ${skills.length} skills:`, 
        skills.map(s => s.name).join(", "));
    })
    .catch(err => {
      console.warn("[Teller2] Failed to list skills:", err);
    });
  
  // Async loader function for skills
  const loadSkill = async (name: string) => {
    try {
      const skill = await skillLoader.loadSkill(name);
      if (skill) {
        console.log(`[Teller2] Loaded skill: ${name}`);
        return skill;
      }
    } catch (err) {
      console.warn(`[Teller2] Failed to load skill ${name}:`, err);
    }
    return null;
  };
  
  // Create the enhanced agent
  const agent = new EnhancedTellerAgent({
    memory,
    vectorMemory,
    intervalMs: 2 * 60 * 1000, // 2 minutes
    analysisDepth: "standard",
    skillLoader: loadSkill,
    onObservation: (obs) => {
      bus.emit("observation", obs);
    },
    onError: (err) => {
      bus.emit("error", err);
    },
  });
  
  return { agent, memory };
}

/**
 * Check if we can use Teller2 features
 */
export function isTeller2Enabled(): boolean {
  try {
    // Check for skills directory
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    
    const skillPaths = [
      path.join(process.cwd(), ".opencode", "skills"),
      path.join(os.homedir(), ".opencode", "skills")
    ];
    
    for (const p of skillPaths) {
      if (fs.existsSync(p)) {
        return true;
      }
    }
    
    return false;
  } catch (err) {
    return false;
  }
}