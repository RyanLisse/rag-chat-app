/**
 * OpenAI provider implementation
 * Supports GPT-4.1, o4-mini, and other OpenAI models
 */

import { openai, createOpenAI } from '@ai-sdk/openai';
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
 * OpenAI model configurations
 */
const OPENAI_MODELS = {
  'gpt-4.1': {
    id: 'gpt-4.1',
    contextLength: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  'o4-mini': {
    id: 'o4-mini',
    contextLength: 128000,
    maxOutputTokens: 16384,
    supportsVision: false,
    supportsFunctionCalling: true,
  },
  'gpt-4': {
    id: 'gpt-4',
    contextLength: 8192,
    maxOutputTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: true,
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    contextLength: 128000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    contextLength: 16385,
    maxOutputTokens: 4096,
    supportsVision: false,
    supportsFunctionCalling: true,
  },
} as const;

/**
 * OpenAI provider capabilities
 */
const OPENAI_CAPABILITIES: ProviderCapabilities = {
  streaming: true,
  functionCalling: true,
  vision: true,
  audioInput: false,
  audioOutput: false,
  batchRequests: true,
  contextCaching: false,
};

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  private client?: ReturnType<typeof createOpenAI>;

  constructor() {
    super('openai', Object.keys(OPENAI_MODELS), OPENAI_CAPABILITIES);
  }

  /**
   * Validate connection to OpenAI API
   */
  protected async validateConnection(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new AuthenticationError(this.name);
    }

    try {
      this.client = createOpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
      });

      // Test connection with a minimal request
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
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Use the models endpoint as a health check
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.config?.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthenticationError(this.name);
        }
        if (response.status === 429) {
          throw new RateLimitError(this.name);
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
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    const modelConfig = OPENAI_MODELS[modelId as keyof typeof OPENAI_MODELS];
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${modelId}`);
    }

    // Map our options to OpenAI format
    const openAIOptions: any = {};

    if (options?.temperature !== undefined) {
      openAIOptions.temperature = Math.max(0, Math.min(2, options.temperature));
    }

    if (options?.maxTokens !== undefined) {
      openAIOptions.maxTokens = Math.min(
        options.maxTokens,
        modelConfig.maxOutputTokens
      );
    }

    if (options?.topP !== undefined) {
      openAIOptions.topP = Math.max(0, Math.min(1, options.topP));
    }

    if (options?.seed !== undefined) {
      openAIOptions.seed = options.seed;
    }

    // Handle function calling
    if (options?.tools && modelConfig.supportsFunctionCalling) {
      openAIOptions.tools = options.tools;
      if (options.toolChoice) {
        openAIOptions.toolChoice = options.toolChoice;
      }
    }

    return this.client(modelConfig.id);
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
    return OPENAI_MODELS[modelId as keyof typeof OPENAI_MODELS];
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
    return model?.contextLength ?? 4096;
  }

  /**
   * Get model max output tokens
   */
  getMaxOutputTokens(modelId: string): number {
    const model = this.getModelInfo(modelId);
    return model?.maxOutputTokens ?? 1024;
  }
}
