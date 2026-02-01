export interface AIProvider {
  name: string;
  analyze(prompt: string): Promise<string>;
}
