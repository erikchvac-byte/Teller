export type PatternCode = 
  // Behavioral patterns
  | "UI-TRIAL"
  | "REPEAT-FAILURE" 
  | "TECH-DEBT-RISK"
  | "SOURCE-SKIP"
  | "UNVERIFIED-COMPLETE"
  | "REGRESSION"
  // Tactical patterns
  | "EXIT-CODE-IGNORED"
  | "BLIND-RETRY"
  | "AUTOMATION-BYPASS"
  | "CACHE-RISK"
  | "PORT-CONFLICT-RISK"
  | "CWD-MISMATCH";

export interface PatternDetection {
  code: PatternCode;
  confidence: number;
  evidence: string;
  category: "behavioral" | "tactical";
}

export interface PatternLabel {
  code: PatternCode;
  icon: string;
  frequency: number;
  escalationLevel: "silent" | "label" | "confirm" | "active";
  suggestion?: string;
}

export interface FormattedObservation {
  originalText: string;
  displayText: string;
  patterns: PatternLabel[];
  timestamp: number;
}