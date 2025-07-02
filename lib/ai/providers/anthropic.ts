/**
 * Anthropic provider implementation
 * Supports Claude 4 and other Anthropic models
 */

import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import { BaseProvider } from './base';
import {
  AuthenticationError,
  NetworkError,
  RateLimitError,
  TimeoutError,
} from './errors';
import type { GenerationOptions, ProviderCapabilities } from './types';
import { withTimeout } from './utils';

/**
 * Anthropic model configurations
 */
const ANTHROPIC_MODELS = {
  'claude-4': {
    id: 'claude-3-5-sonnet-20241022', // Map to actual API model ID
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  'claude-3.5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  'claude-3.5-haiku': {
    id: 'claude-3-5-haiku-20241022',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  'claude-3-opus': {
    id: 'claude-3-opus-20240229',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet-20240229',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku-20240307',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
} as const;

/**
 * Anthropic provider capabilities
 */
const ANTHROPIC_CAPABILITIES: ProviderCapabilities = {
  streaming: true,
  functionCalling: true,
  vision: true,
  audioInput: false,
  audioOutput: false,
  batchRequests: false,
  contextCaching: true,
};

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends BaseProvider {
  private provider?: ReturnType<typeof createAnthropic>; // Fixed for AI SDK 5.0

  constructor() {
    super('anthropic', Object.keys(ANTHROPIC_MODELS), ANTHROPIC_CAPABILITIES);
  }

  /**
   * Validate connection to Anthropic API
   */
  protected async validateConnection(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new AuthenticationError(this.name);
    }

    try {
      // TODO: Fix for AI SDK 5.0 - use createAnthropic for provider instance
      this.provider = createAnthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });

      // Test connection with a health check
      await withTimeout(
        this.performHealthCheck(),
        this.getConfigValue('timeout', 10000)
      );
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Perform health check
   */
  protected async performHealthCheck(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Use a minimal request to test the connection
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.config?.apiKey || '',
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError(this.name);
        }
        if (response.status === 429) {
          const resetTime = response.headers.get('retry-after');
          throw new RateLimitError(
            this.name,
            resetTime
              ? new Date(Date.now() + Number.parseInt(resetTime) * 1000)
              : undefined
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(
          this.name,
          this.getConfigValue('timeout', 10000)
        );
      }
      throw error;
    }
  }

  /**
   * Create a language model instance
   */
  protected createModel(
    modelId: string,
    options?: GenerationOptions
  ): LanguageModel {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const modelConfig =
      ANTHROPIC_MODELS[modelId as keyof typeof ANTHROPIC_MODELS];
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${modelId}`);
    }

    // Map our options to Anthropic format
    const anthropicOptions: any = {};

    if (options?.temperature !== undefined) {
      anthropicOptions.temperature = Math.max(
        0,
        Math.min(1, options.temperature)
      );
    }

    if (options?.maxTokens !== undefined) {
      anthropicOptions.maxTokens = Math.min(
        options.maxTokens,
        modelConfig.maxOutputTokens
      );
    }

    if (options?.topP !== undefined) {
      anthropicOptions.topP = Math.max(0, Math.min(1, options.topP));
    }

    if (options?.topK !== undefined) {
      anthropicOptions.topK = Math.max(1, Math.min(40, options.topK));
    }

    // Handle function calling (tools in Anthropic)
    if (options?.tools && modelConfig.supportsFunctionCalling) {
      anthropicOptions.tools = options.tools;
      if (options.toolChoice) {
        anthropicOptions.toolChoice = this.mapToolChoice(options.toolChoice);
      }
    }

    // TODO: Fix for AI SDK 5.0 - options are passed when using the model, not when creating it
    return this.provider!(modelConfig.id);
  }

  /**
   * Map tool choice format from generic to Anthropic-specific
   */
  private mapToolChoice(toolChoice: GenerationOptions['toolChoice']): any {
    if (typeof toolChoice === 'string') {
      return toolChoice === 'auto' ? { type: 'auto' } : { type: 'none' };
    }

    if (
      toolChoice &&
      typeof toolChoice === 'object' &&
      'function' in toolChoice
    ) {
      return {
        type: 'tool',
        name: toolChoice.function.name,
      };
    }

    return { type: 'auto' };
  }

  /**
   * Handle connection errors and convert to appropriate error types
   */
  private handleConnectionError(error: unknown): never {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (
        message.includes('unauthorized') ||
        message.includes('invalid api key')
      ) {
        throw new AuthenticationError(this.name);
      }

      if (
        message.includes('rate limit') ||
        message.includes('too many requests')
      ) {
        throw new RateLimitError(this.name);
      }

      if (message.includes('timeout') || message.includes('aborted')) {
        throw new TimeoutError(
          this.name,
          this.getConfigValue('timeout', 10000)
        );
      }

      if (message.includes('network') || message.includes('connection')) {
        throw new NetworkError(this.name, error);
      }
    }

    throw new NetworkError(this.name, error as Error);
  }

  /**
   * Get model information
   */
  getModelInfo(modelId: string) {
    return ANTHROPIC_MODELS[modelId as keyof typeof ANTHROPIC_MODELS];
  }

  /**
   * Check if model supports vision
   */
  supportsVision(modelId: string): boolean {
    const model = this.getModelInfo(modelId);
    return model?.supportsVision ?? false;
  }

  /**
   * Check if model supports function calling
   */
  supportsFunctionCalling(modelId: string): boolean {
    const model = this.getModelInfo(modelId);
    return model?.supportsFunctionCalling ?? false;
  }

  /**
   * Get model context length
   */
  getContextLength(modelId: string): number {
    const model = this.getModelInfo(modelId);
    return model?.contextLength ?? 200000;
  }

  /**
   * Get model max output tokens
   */
  getMaxOutputTokens(modelId: string): number {
    const model = this.getModelInfo(modelId);
    return model?.maxOutputTokens ?? 4096;
  }

  /**
   * Check if model supports context caching
   */
  supportsContextCaching(modelId: string): boolean {
    // All current Claude models support context caching
    return this.supportsModel(modelId);
  }
}
