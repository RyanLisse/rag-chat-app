/**
 * Utility functions for the provider system
 */

import type { RetryConfig, ResponseMetadata } from './types';
import { isRetryableError } from './errors';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'TIMEOUT',
    'NETWORK_ERROR',
    'RATE_LIMIT',
    'PROVIDER_UNAVAILABLE',
  ],
};

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt or if error is not retryable
      if (attempt === config.maxRetries || !isRetryableError(error)) {
        break;
      }

      // Wait before retrying
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  } catch (error) {
    const duration = performance.now() - start;
    throw Object.assign(error as Error, { duration });
  }
}

/**
 * Create a timeout promise
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)]);
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string, provider: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 10;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 10;
    case 'google':
      return apiKey.length > 10; // Google API keys don't have a standard prefix
    default:
      return apiKey.length > 5;
  }
}

/**
 * Calculate token usage cost
 */
export function calculateCost(
  usage: ResponseMetadata['usage'],
  inputPrice: number,
  outputPrice: number
): number {
  const inputCost = (usage.promptTokens / 1000) * inputPrice;
  const outputCost = (usage.completionTokens / 1000) * outputPrice;
  return inputCost + outputCost;
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}

/**
 * Sanitize error message for logging
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove potential API keys or sensitive information
  return message
    .replace(/sk-[a-zA-Z0-9]+/g, 'sk-***')
    .replace(/Bearer\s+[a-zA-Z0-9]+/g, 'Bearer ***')
    .replace(/api[_-]?key[=:]\s*[a-zA-Z0-9]+/gi, 'api_key=***');
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get environment variable with default
 */
export function getEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

/**
 * Validate model ID format
 */
export function validateModelId(modelId: string): boolean {
  return typeof modelId === 'string' && modelId.length > 0 && /^[a-zA-Z0-9._-]+$/.test(modelId);
}

/**
 * Parse model ID to extract provider and model name
 */
export function parseModelId(modelId: string): { provider?: string; model: string } {
  const parts = modelId.split('/');
  if (parts.length === 2) {
    return { provider: parts[0], model: parts[1] };
  }
  return { model: modelId };
}

/**
 * Create a circuit breaker for provider calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}