/**
 * Base provider implementation with common functionality
 */

import type { LanguageModel } from 'ai';
import type {
  ModelProvider,
  ProviderConfig,
  ProviderHealth,
  ProviderMetrics,
  ProviderCapabilities,
  GenerationOptions,
  RetryConfig,
} from './types';
import { ProviderError, ConfigurationError, ModelInitializationError } from './errors';
import { retryWithBackoff, validateApiKey, DEFAULT_RETRY_CONFIG, measureExecutionTime } from './utils';

/**
 * Abstract base class for all model providers
 */
export abstract class BaseProvider implements ModelProvider {
  protected config?: ProviderConfig;
  protected initialized = false;
  protected metrics: ProviderMetrics;
  protected retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;

  constructor(
    public readonly name: string,
    public readonly supportedModels: string[],
    public readonly capabilities: ProviderCapabilities
  ) {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Initialize the provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    if (!validateApiKey(config.apiKey, this.name)) {
      throw new ConfigurationError(this.name, 'Invalid API key format');
    }

    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    // Update retry configuration
    if (config.maxRetries !== undefined) {
      this.retryConfig.maxRetries = config.maxRetries;
    }
    if (config.retryDelay !== undefined) {
      this.retryConfig.initialDelay = config.retryDelay;
    }

    await this.validateConnection();
    this.initialized = true;
  }

  /**
   * Get a language model instance
   */
  getModel(modelId: string, options?: GenerationOptions): LanguageModel {
    this.ensureInitialized();
    
    if (!this.supportsModel(modelId)) {
      throw new ModelInitializationError(this.name, modelId, new Error('Model not supported'));
    }

    try {
      return this.createModel(modelId, options);
    } catch (error) {
      this.incrementErrorCount();
      throw new ModelInitializationError(this.name, modelId, error as Error);
    }
  }

  /**
   * Check if a model is supported
   */
  supportsModel(modelId: string): boolean {
    return this.supportedModels.includes(modelId);
  }

  /**
   * Get provider health status
   */
  async getHealth(): Promise<ProviderHealth> {
    try {
      const start = performance.now();
      await this.performHealthCheck();
      const latency = performance.now() - start;
      
      const errorRate = this.metrics.requestCount > 0 
        ? this.metrics.errorCount / this.metrics.requestCount 
        : 0;

      let status: ProviderHealth['status'] = 'healthy';
      if (errorRate > 0.1) status = 'degraded';
      if (errorRate > 0.5 || latency > 10000) status = 'unhealthy';

      return {
        status,
        latency,
        errorRate,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        errorRate: 1,
        lastChecked: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics {
    return {
      ...this.metrics,
      averageLatency: this.metrics.requestCount > 0 
        ? this.metrics.totalLatency / this.metrics.requestCount 
        : 0,
    };
  }

  /**
   * Reset provider metrics
   */
  resetMetrics(): void {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.initialized = false;
    this.config = undefined;
  }

  /**
   * Execute a function with retry logic and metrics tracking
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    operation: string = 'request'
  ): Promise<T> {
    this.ensureInitialized();
    
    const { result, duration } = await measureExecutionTime(async () => {
      return retryWithBackoff(fn, this.retryConfig);
    });

    this.updateMetrics(duration);
    return result;
  }

  /**
   * Abstract methods to be implemented by concrete providers
   */
  protected abstract createModel(modelId: string, options?: GenerationOptions): LanguageModel;
  protected abstract validateConnection(): Promise<void>;
  protected abstract performHealthCheck(): Promise<void>;

  /**
   * Ensure provider is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new ProviderError('Provider not initialized', this.name, 'NOT_INITIALIZED');
    }
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): ProviderMetrics {
    return {
      requestCount: 0,
      errorCount: 0,
      totalLatency: 0,
      averageLatency: 0,
      tokenUsage: {
        input: 0,
        output: 0,
        total: 0,
      },
      costEstimate: 0,
      lastReset: new Date(),
    };
  }

  /**
   * Update metrics after a request
   */
  private updateMetrics(duration: number): void {
    this.metrics.requestCount++;
    this.metrics.totalLatency += duration;
  }

  /**
   * Increment error count
   */
  protected incrementErrorCount(): void {
    this.metrics.errorCount++;
  }

  /**
   * Update token usage metrics
   */
  protected updateTokenUsage(input: number, output: number, cost: number): void {
    this.metrics.tokenUsage.input += input;
    this.metrics.tokenUsage.output += output;
    this.metrics.tokenUsage.total += input + output;
    this.metrics.costEstimate += cost;
  }

  /**
   * Get configuration value with default
   */
  protected getConfigValue<T>(key: keyof ProviderConfig, defaultValue: T): T {
    return (this.config?.[key] as T) ?? defaultValue;
  }
}