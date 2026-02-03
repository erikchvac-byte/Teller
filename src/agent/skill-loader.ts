import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "yaml";

/**
 * Interface for skill metadata from SKILL.md frontmatter
 */
export interface SkillMeta {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

/**
 * Interface for a loaded skill
 */
export interface Skill {
  meta: SkillMeta;
  content: string;
  
  // Dynamic skill methods - can be implemented by custom loaders
  [key: string]: any;
}

/**
 * Skill loader for Teller
 * Finds and loads skills from .opencode/skills and ~/.opencode/skills
 */
export class SkillLoader {
  private skillsCache: Map<string, Skill> = new Map();
  private skillsPaths: string[] = [];
  
  constructor() {
    this.discoverSkillPaths();
  }
  
  /**
   * Load all available skill paths
   */
  private discoverSkillPaths(): void {
    const paths: string[] = [];
    
    // Project paths
    const projectPaths = [
      path.join(process.cwd(), ".opencode", "skills"),
      path.join(process.cwd(), ".claude", "skills")
    ];
    
    // Global paths
    const globalPaths = [
      path.join(os.homedir(), ".opencode", "skills"),
      path.join(os.homedir(), ".config", "opencode", "skills"),
      path.join(os.homedir(), ".claude", "skills")
    ];
    
    // Check which paths exist
    [...projectPaths, ...globalPaths].forEach(p => {
      if (fs.existsSync(p)) {
        paths.push(p);
      }
    });
    
    this.skillsPaths = paths;
  }
  
  /**
   * Load a skill by name
   */
  async loadSkill(name: string): Promise<Skill | null> {
    // Check cache first
    if (this.skillsCache.has(name)) {
      return this.skillsCache.get(name) || null;
    }
    
    // Find skill in paths
    for (const basePath of this.skillsPaths) {
      const skillPath = path.join(basePath, name);
      const skillFile = path.join(skillPath, "SKILL.md");
      
      if (fs.existsSync(skillFile)) {
        try {
          const skill = await this.parseSkillFile(skillFile);
          
          // Add methods based on skill name
          if (name === "teller-loop-detector") {
            skill.detectLoops = this.createLoopDetector(skill);
          } else if (name === "teller-intent-tracker") {
            skill.trackIntent = this.createIntentTracker(skill);
          } else if (name === "teller-cross-session") {
            skill.analyzeCrossSessions = this.createCrossSessionAnalyzer(skill);
          }
          
          // Cache and return
          this.skillsCache.set(name, skill);
          return skill;
        } catch (err) {
          console.warn(`Failed to load skill ${name}:`, err);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Parse a SKILL.md file into a Skill object
   */
  private async parseSkillFile(filePath: string): Promise<Skill> {
    const content = fs.readFileSync(filePath, "utf-8");
    
    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (!frontmatterMatch) {
      throw new Error(`Invalid skill file ${filePath}: No frontmatter found`);
    }
    
    const frontmatter = frontmatterMatch[1];
    const meta = yaml.parse(frontmatter) as SkillMeta;
    
    // Validate required fields
    if (!meta.name || !meta.description) {
      throw new Error(`Invalid skill file ${filePath}: Missing required frontmatter fields`);
    }
    
    // Extract content (everything after frontmatter)
    const skillContent = content.replace(/^---\n[\s\S]+?\n---\n/, "");
    
    return {
      meta,
      content: skillContent
    };
  }
  
  /**
   * Create a loop detector function for the loop detector skill
   */
  private createLoopDetector(skill: Skill) {
    return async (events: any[]): Promise<string[]> => {
      // Simple loop detection (placeholder for real implementation)
      const commandEvents = events.filter(e => e.source === "terminal");
      const loops: string[] = [];
      
      // Look for repeated commands
      const commands = commandEvents.map(e => e.content);
      const commandCounts: Record<string, number> = {};
      
      commands.forEach(cmd => {
        commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
      });
      
      // Find commands repeated 3+ times
      Object.entries(commandCounts).forEach(([cmd, count]) => {
        if (count >= 3) {
          loops.push(`LOOP: Command "${cmd}" repeated ${count} times`);
        }
      });
      
      // Look for build-run-error patterns
      const buildCommands = ["npm run", "yarn", "make", "gcc", "mvn", "gradle"];
      let buildErrorCount = 0;
      
      for (let i = 0; i < commands.length - 2; i++) {
        const isBuild = buildCommands.some(bc => commands[i].includes(bc));
        const isRun = commands[i+1].includes("node") || commands[i+1].includes("./");
        // Error detection would be based on actual output, placeholder here
        const hasError = commandEvents[i+2]?.content?.includes("error");
        
        if (isBuild && isRun && hasError) {
          buildErrorCount++;
        }
      }
      
      if (buildErrorCount >= 2) {
        loops.push(`LOOP: Build-Run-Error cycle detected ${buildErrorCount} times`);
      }
      
      return loops;
    };
  }
  
  /**
   * Create an intent tracker function for the intent tracker skill
   */
  private createIntentTracker(skill: Skill) {
    return async (events: any[], observations: any[]): Promise<string> => {
      // Simple intent tracking (placeholder for real implementation)
      if (events.length < 5) return "";
      
      // Use first few events to determine initial intent
      const firstEvents = events.slice(0, 5);
      const lastEvents = events.slice(-5);
      
      // Very basic intent extraction from commands
      const firstKeywords = this.extractKeywords(firstEvents);
      const lastKeywords = this.extractKeywords(lastEvents);
      
      // Compare overlap between first and last keywords
      const overlap = this.calculateOverlap(firstKeywords, lastKeywords);
      const consistencyScore = Math.round(overlap * 100);
      
      if (consistencyScore < 30) {
        const initialIntent = firstKeywords.slice(0, 3).join(", ");
        const currentIntent = lastKeywords.slice(0, 3).join(", ");
        
        return `GAP: Intent drift detected - Started with [${initialIntent}], now working on [${currentIntent}]. Consistency score: ${consistencyScore}%`;
      }
      
      return "";
    };
  }
  
  /**
   * Create a cross-session analyzer function
   */
  private createCrossSessionAnalyzer(skill: Skill) {
    return async (events: any[], pastObservations: any[]): Promise<string[]> => {
      // Placeholder for cross-session analysis
      return [];
    };
  }
  
  /**
   * Helper: Extract keywords from events
   */
  private extractKeywords(events: any[]): string[] {
    const text = events.map(e => e.content).join(" ");
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !this.isStopWord(w));
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(w => {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    });
    
    // Sort by frequency
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }
  
  /**
   * Helper: Calculate overlap between two arrays
   */
  private calculateOverlap(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1.slice(0, 10)); // Top 10 keywords
    const set2 = new Set(arr2.slice(0, 10)); // Top 10 keywords
    
    let intersection = 0;
    for (const item of set2) {
      if (set1.has(item)) {
        intersection++;
      }
    }
    
    return intersection / Math.max(set1.size, set2.size);
  }
  
  /**
   * Helper: Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "the", "and", "with", "for", "from", "this", "that", "then", "than",
      "not", "but", "have", "has", "had", "was", "were", "are", "been"
    ]);
    return stopWords.has(word);
  }
  
  /**
   * List all available skills
   */
  async listAvailableSkills(): Promise<SkillMeta[]> {
    const skills: SkillMeta[] = [];
    
    for (const basePath of this.skillsPaths) {
      try {
        if (!fs.existsSync(basePath)) continue;
        
        const dirs = fs.readdirSync(basePath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
          
        for (const dir of dirs) {
          const skillFile = path.join(basePath, dir, "SKILL.md");
          if (fs.existsSync(skillFile)) {
            try {
              const skill = await this.parseSkillFile(skillFile);
              skills.push(skill.meta);
            } catch (err) {
              console.warn(`Failed to parse skill ${dir}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to list skills in ${basePath}:`, err);
      }
    }
    
    return skills;
  }
}