import type { AIProvider } from "./index.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import { OpencodeFreeProvider } from "./opencode-free.js";

export type ProviderType = "anthropic" | "openai" | "opencode-free" | "auto";

interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  model?: string;
}

/**
 * Factory for creating AI providers based on available API keys
 * Supports auto-detection and manual selection
 */
export class ProviderFactory {
  /**
   * Create a provider based on environment variables
   * Priority: OPENCODE_FREE (no key) > ANTHROPIC_API_KEY > OPENAI_API_KEY
   */
  static createFromEnv(): AIProvider {
    // Check for OpenCode free first (no API key needed)
    const opencodeFreeEnabled = process.env.OPENCODE_FREE_ENABLED !== "false";
    if (opencodeFreeEnabled) {
      try {
        console.log("[Teller] Using OpenCode Free provider (no cost)");
        return new OpencodeFreeProvider(process.env.OPENCODE_FREE_MODEL);
      } catch {
        // Fallback to other providers if OpenCode free fails
      }
    }
    
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (anthropicKey) {
      console.log("[Teller] Using Anthropic provider");
      return new AnthropicProvider(anthropicKey, process.env.ANTHROPIC_MODEL);
    }
    
    if (openaiKey) {
      console.log("[Teller] Using OpenAI provider");
      return new OpenAIProvider(openaiKey, process.env.OPENAI_MODEL);
    }
    
    throw new Error(
      "No AI provider available. Set OPENCODE_FREE_ENABLED=true (default), or set ANTHROPIC_API_KEY or OPENAI_API_KEY."
    );
  }
  
  /**
   * Create a specific provider by type
   */
  static create(config: ProviderConfig): AIProvider {
    switch (config.type) {
      case "anthropic": {
        const anthropicKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
          throw new Error("ANTHROPIC_API_KEY not set");
        }
        return new AnthropicProvider(anthropicKey, config.model || process.env.ANTHROPIC_MODEL);
      }
      case "openai": {
        const openaiKey = config.apiKey || process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          throw new Error("OPENAI_API_KEY not set");
        }
        return new OpenAIProvider(openaiKey, config.model || process.env.OPENAI_MODEL);
      }
      case "opencode-free": {
        return new OpencodeFreeProvider(config.model || process.env.OPENCODE_FREE_MODEL);
      }
      case "auto":
      default:
        return this.createFromEnv();
    }
  }
  
  /**
   * Check which providers are available
   */
  static getAvailableProviders(): ProviderType[] {
    const available: ProviderType[] = [];
    
    // OpenCode Free is always available (unless explicitly disabled)
    if (process.env.OPENCODE_FREE_ENABLED !== "false") {
      available.push("opencode-free");
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      available.push("anthropic");
    }
    
    if (process.env.OPENAI_API_KEY) {
      available.push("openai");
    }
    
    return available;
  }
}

/**
 * Multi-provider that can use multiple AI services
 * Useful for fallback or load balancing
 */
export class MultiProvider implements AIProvider {
  name = "multi";
  private providers: AIProvider[];
  private currentIndex: number = 0;
  private fallbackOnError: boolean;

  constructor(providers: AIProvider[], fallbackOnError: boolean = true) {
    this.providers = providers;
    this.fallbackOnError = fallbackOnError;
  }
  
  async analyze(prompt: string): Promise<string> {
    return this.analyzeWithDepth(prompt, "standard");
  }
  
  async analyzeWithDepth(prompt: string, depth: "quick" | "standard" | "deep"): Promise<string> {
    const errors: string[] = [];
    
    for (let i = 0; i < this.providers.length; i++) {
      const providerIndex = (this.currentIndex + i) % this.providers.length;
      const provider = this.providers[providerIndex];
      
      try {
        const result = await provider.analyzeWithDepth(prompt, depth);
        this.currentIndex = (providerIndex + 1) % this.providers.length;
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.name}: ${errorMsg}`);
        
        if (!this.fallbackOnError) {
          throw err;
        }
      }
    }
    
    throw new Error(`All providers failed:\n${errors.join("\n")}`);
  }
  
  /**
   * Create a multi-provider from environment
   * Uses all available providers, with OpenCode Free as default
   */
  static createFromEnv(fallbackOnError: boolean = true): MultiProvider {
    const providers: AIProvider[] = [];
    
    // Add OpenCode Free first (no cost fallback)
    const opencodeFreeEnabled = process.env.OPENCODE_FREE_ENABLED !== "false";
    if (opencodeFreeEnabled) {
      try {
        providers.push(new OpencodeFreeProvider(process.env.OPENCODE_FREE_MODEL));
      } catch {
        // OpenCode Free not available
      }
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push(
        new AnthropicProvider(
          process.env.ANTHROPIC_API_KEY,
          process.env.ANTHROPIC_MODEL
        )
      );
    }
    
    if (process.env.OPENAI_API_KEY) {
      providers.push(
        new OpenAIProvider(
          process.env.OPENAI_API_KEY,
          process.env.OPENAI_MODEL
        )
      );
    }
    
    if (providers.length === 0) {
      throw new Error(
        "No AI providers available. Set OPENCODE_FREE_ENABLED=true (default), or set ANTHROPIC_API_KEY or OPENAI_API_KEY."
      );
    }
    
    return new MultiProvider(providers, fallbackOnError);
  }
}
