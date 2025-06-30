/**
 * Core types and interfaces for the multi-model provider system
 */

import type { LanguageModel } from 'ai';
import type { ChatModel } from '../models';

/**
 * Base provider configuration interface
 */
export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Request options for model generation
 */
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  seed?: number;
  stream?: boolean;
  tools?: any[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * Response metadata from providers
 */
export interface ResponseMetadata {
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
  responseTime: number;
  cached?: boolean;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastChecked: Date;
  message?: string;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  audioInput: boolean;
  audioOutput: boolean;
  batchRequests: boolean;
  contextCaching: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentRequests: number;
}

/**
 * Provider metrics for monitoring
 */
export interface ProviderMetrics {
  requestCount: number;
  errorCount: number;
  totalLatency: number;
  averageLatency: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  costEstimate: number;
  lastReset: Date;
}

/**
 * Base provider interface that all providers must implement
 */
export interface ModelProvider {
  readonly name: string;
  readonly supportedModels: string[];
  readonly capabilities: ProviderCapabilities;
  
  /**
   * Initialize the provider with configuration
   */
  initialize(config: ProviderConfig): Promise<void>;
  
  /**
   * Get a language model instance
   */
  getModel(modelId: string, options?: GenerationOptions): LanguageModel;
  
  /**
   * Check if a model is supported
   */
  supportsModel(modelId: string): boolean;
  
  /**
   * Get provider health status
   */
  getHealth(): Promise<ProviderHealth>;
  
  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics;
  
  /**
   * Reset provider metrics
   */
  resetMetrics(): void;
  
  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

/**
 * Provider registry interface
 */
export interface ProviderRegistry {
  registerProvider(provider: ModelProvider): void;
  getProvider(name: string): ModelProvider | undefined;
  getAllProviders(): ModelProvider[];
  removeProvider(name: string): boolean;
}

/**
 * Model router configuration
 */
export interface RouterConfig {
  fallbackStrategy: 'none' | 'round_robin' | 'least_loaded' | 'fastest';
  healthCheckInterval: number;
  loadBalancing: boolean;
  circuitBreaker: {
    enabled: boolean;
    errorThreshold: number;
    resetTimeout: number;
  };
}

/**
 * Router interface for managing model requests
 */
export interface ModelRouter {
  /**
   * Route a request to the appropriate provider
   */
  route(modelId: string, options?: GenerationOptions): Promise<{
    provider: ModelProvider;
    model: LanguageModel;
    metadata: Partial<ResponseMetadata>;
  }>;
  
  /**
   * Get the best provider for a model
   */
  getBestProvider(modelId: string): Promise<ModelProvider | undefined>;
  
  /**
   * Update router configuration
   */
  updateConfig(config: Partial<RouterConfig>): void;
}

/**
 * Provider factory interface
 */
export interface ProviderFactory {
  createProvider(name: string, config: ProviderConfig): Promise<ModelProvider>;
  getSupportedProviders(): string[];
}