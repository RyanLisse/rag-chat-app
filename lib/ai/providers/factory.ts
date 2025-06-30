/**
 * Provider factory for creating and managing model providers
 */

import type { ModelProvider, ProviderFactory, ProviderConfig } from './types';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { ConfigurationError } from './errors';

/**
 * Registry of available provider constructors
 */
const PROVIDER_CONSTRUCTORS = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  google: GoogleProvider,
} as const;

/**
 * Provider factory implementation
 */
export class ModelProviderFactory implements ProviderFactory {
  private static instance?: ModelProviderFactory;
  private providers = new Map<string, ModelProvider>();

  /**
   * Get singleton instance
   */
  static getInstance(): ModelProviderFactory {
    if (!ModelProviderFactory.instance) {
      ModelProviderFactory.instance = new ModelProviderFactory();
    }
    return ModelProviderFactory.instance;
  }

  /**
   * Create a new provider instance
   */
  async createProvider(name: string, config: ProviderConfig): Promise<ModelProvider> {
    const ProviderClass = PROVIDER_CONSTRUCTORS[name as keyof typeof PROVIDER_CONSTRUCTORS];
    
    if (!ProviderClass) {
      throw new ConfigurationError('factory', `Unknown provider: ${name}`);
    }

    const provider = new ProviderClass();
    await provider.initialize(config);
    
    return provider;
  }

  /**
   * Get or create a provider with caching
   */
  async getProvider(name: string, config: ProviderConfig): Promise<ModelProvider> {
    const cacheKey = `${name}_${this.hashConfig(config)}`;
    
    let provider = this.providers.get(cacheKey);
    if (!provider) {
      provider = await this.createProvider(name, config);
      this.providers.set(cacheKey, provider);
    }
    
    return provider;
  }

  /**
   * Get list of supported provider names
   */
  getSupportedProviders(): string[] {
    return Object.keys(PROVIDER_CONSTRUCTORS);
  }

  /**
   * Remove a provider from cache
   */
  async removeProvider(name: string, config?: ProviderConfig): Promise<boolean> {
    if (config) {
      const cacheKey = `${name}_${this.hashConfig(config)}`;
      const provider = this.providers.get(cacheKey);
      if (provider) {
        await provider.cleanup();
        return this.providers.delete(cacheKey);
      }
      return false;
    }

    // Remove all providers with this name
    let removed = false;
    for (const [key, provider] of this.providers.entries()) {
      if (key.startsWith(`${name}_`)) {
        await provider.cleanup();
        this.providers.delete(key);
        removed = true;
      }
    }
    
    return removed;
  }

  /**
   * Clear all cached providers
   */
  async clearAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.cleanup();
    }
    this.providers.clear();
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): Array<{
    name: string;
    instanceCount: number;
    totalRequests: number;
    totalErrors: number;
    averageLatency: number;
  }> {
    const stats = new Map<string, {
      instanceCount: number;
      totalRequests: number;
      totalErrors: number;
      totalLatency: number;
    }>();

    for (const [key, provider] of this.providers.entries()) {
      const providerName = key.split('_')[0];
      const metrics = provider.getMetrics();
      
      const current = stats.get(providerName) || {
        instanceCount: 0,
        totalRequests: 0,
        totalErrors: 0,
        totalLatency: 0,
      };
      
      current.instanceCount++;
      current.totalRequests += metrics.requestCount;
      current.totalErrors += metrics.errorCount;
      current.totalLatency += metrics.totalLatency;
      
      stats.set(providerName, current);
    }

    return Array.from(stats.entries()).map(([name, data]) => ({
      name,
      instanceCount: data.instanceCount,
      totalRequests: data.totalRequests,
      totalErrors: data.totalErrors,
      averageLatency: data.totalRequests > 0 ? data.totalLatency / data.totalRequests : 0,
    }));
  }

  /**
   * Create a simple hash of the config for caching
   */
  private hashConfig(config: ProviderConfig): string {
    const configStr = JSON.stringify({
      apiKey: config.apiKey.slice(0, 8) + '***', // Only use first 8 chars for security
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < configStr.length; i++) {
      const char = configStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
}

/**
 * Convenience function to get the factory instance
 */
export function getProviderFactory(): ModelProviderFactory {
  return ModelProviderFactory.getInstance();
}