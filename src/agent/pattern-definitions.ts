import type { PatternCode } from "./pattern-types.js";

export interface PatternDefinition {
  code: PatternCode;
  category: "behavioral" | "tactical";
  definition: string;
  suggestion: string;
  keywords: string[];
}

/**
 * Pattern definitions crafted from Erik's actual observed behaviors
 */
export const PATTERN_DEFINITIONS: Record<PatternCode, PatternDefinition> = {
  
  // BEHAVIORAL PATTERNS
  "UI-TRIAL": {
    code: "UI-TRIAL",
    category: "behavioral",
    definition: "Iterative visual adjustment without measuring constraints first",
    suggestion: "Calculate positioning requirements before implementing UI changes",
    keywords: ["adjust", "position", "trial", "visual", "layout", "css", "margin", "padding"]
  },

  "REPEAT-FAILURE": {
    code: "REPEAT-FAILURE",
    category: "behavioral",
    definition: "Re-running same failed action without changing approach or diagnosis",
    suggestion: "Investigate underlying cause before retrying the same command",
    keywords: ["retry", "failed", "again", "same", "command", "error"]
  },

  "TECH-DEBT-RISK": {
    code: "TECH-DEBT-RISK",
    category: "behavioral",
    definition: "Using manual workarounds after automation breaks instead of fixing root cause",
    suggestion: "Fix the underlying automation rather than building manual workarounds",
    keywords: ["manual", "workaround", "bypass", "automation", "broken", "fallback"]
  },

  "SOURCE-SKIP": {
    code: "SOURCE-SKIP",
    category: "behavioral",
    definition: "Acting without consulting primary documentation or source code directly",
    suggestion: "Review source documentation before implementing solutions",
    keywords: ["consult", "ai", "model", "documentation", "source", "docs"]
  },

  "UNVERIFIED-COMPLETE": {
    code: "UNVERIFIED-COMPLETE",
    category: "behavioral",
    definition: "Marking work as complete without deployment or execution verification",
    suggestion: "Always verify deployment and functionality before declaring completion",
    keywords: ["complete", "done", "finished", "without", "verify", "deploy", "test"]
  },

  "REGRESSION": {
    code: "REGRESSION",
    category: "behavioral",
    definition: "Unrelated functionality breaking after implementing changes",
    suggestion: "Test core functionality after any UI or system changes",
    keywords: ["broke", "broken", "unrelated", "regression", "functionality", "stopped"]
  },

  // TACTICAL PATTERNS
  "EXIT-CODE-IGNORED": {
    code: "EXIT-CODE-IGNORED",
    category: "tactical",
    definition: "Continuing workflow without checking if previous command succeeded",
    suggestion: "Always verify command success before proceeding to dependent steps",
    keywords: ["without", "checking", "exit", "code", "success", "continue", "proceed"]
  },

  "BLIND-RETRY": {
    code: "BLIND-RETRY",
    category: "tactical",
    definition: "Retrying commands without investigating the underlying failure reason",
    suggestion: "Investigate root cause of failure before repeating commands",
    keywords: ["retry", "without", "investigating", "root", "cause", "same", "command"]
  },

  "AUTOMATION-BYPASS": {
    code: "AUTOMATION-BYPASS",
    category: "tactical",
    definition: "Manual testing where automation exists but isn't being used",
    suggestion: "Use existing automation tools instead of manual testing",
    keywords: ["manual", "testing", "automation", "exists", "trigger", "bypass"]
  },

  "CACHE-RISK": {
    code: "CACHE-RISK",
    category: "tactical",
    definition: "Deployment without invalidating cache when serving may use cached content",
    suggestion: "Include cache-clearing steps in deployment verification",
    keywords: ["cache", "deployment", "clear", "invalidate", "stale", "content"]
  },

  "PORT-CONFLICT-RISK": {
    code: "PORT-CONFLICT-RISK",
    category: "tactical",
    definition: "Restarting service without confirming previous process terminated successfully",
    suggestion: "Verify process termination before starting new instances",
    keywords: ["restart", "without", "terminating", "process", "port", "conflict"]
  },

  "CWD-MISMATCH": {
    code: "CWD-MISMATCH",
    category: "tactical",
    definition: "File operations executed in wrong working directory",
    suggestion: "Always verify current working directory before file operations",
    keywords: ["wrong", "directory", "path", "working", "file", "operations"]
  }
};

/**
 * Get pattern definition by code
 */
export function getPatternDefinition(code: PatternCode): PatternDefinition | undefined {
  return PATTERN_DEFINITIONS[code];
}

/**
 * Get all pattern codes
 */
export function getAllPatternCodes(): PatternCode[] {
  return Object.keys(PATTERN_DEFINITIONS) as PatternCode[];
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: "behavioral" | "tactical"): PatternDefinition[] {
  return Object.values(PATTERN_DEFINITIONS).filter(p => p.category === category);
}