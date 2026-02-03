export interface AIProvider {
  name: string;
  analyze(prompt: string): Promise<string>;
  
  /** Method to analyze with different thinking depth */
  analyzeWithDepth(prompt: string, depth: "quick" | "standard" | "deep"): Promise<string>;
}
