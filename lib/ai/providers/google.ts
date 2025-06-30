/**
 * Google provider implementation
 * Supports Gemini 2.5 Pro, Flash, and other Google models
 */

import { google } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { BaseProvider } from './base';
import type { GenerationOptions, ProviderCapabilities } from './types';
import { AuthenticationError, NetworkError, RateLimitError, TimeoutError } from './errors';
import { withTimeout } from './utils';

/**
 * Google model configurations
 */
const GOOGLE_MODELS = {
  'gemini-2.5-pro': {
    id: 'gemini-2.0-flash-exp', // Map to current available model
    contextLength: 2097152,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsAudioInput: true,
    supportsAudioOutput: true,
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.0-flash-exp',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsAudioInput: true,
    supportsAudioOutput: false,
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro-latest',
    contextLength: 2097152,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsAudioInput: true,
    supportsAudioOutput: false,
  },
  'gemini-1.5-flash': {
    id: 'gemini-1.5-flash-latest',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsFunctionCalling: true,
    supportsAudioInput: false,
    supportsAudioOutput: false,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    contextLength: 32768,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsFunctionCalling: true,
    supportsAudioInput: false,
    supportsAudioOutput: false,
  },
  'gemini-pro-vision': {
    id: 'gemini-pro-vision',
    contextLength: 16384,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsFunctionCalling: false,
    supportsAudioInput: false,
    supportsAudioOutput: false,
  },
} as const;

/**
 * Google provider capabilities
 */
const GOOGLE_CAPABILITIES: ProviderCapabilities = {
  streaming: true,
  functionCalling: true,
  vision: true,
  audioInput: true,
  audioOutput: true,
  batchRequests: false,
  contextCaching: false,
};

/**
 * Google provider implementation
 */
export class GoogleProvider extends BaseProvider {
  private client?: typeof google;

  constructor() {
    super(
      'google',
      Object.keys(GOOGLE_MODELS),
      GOOGLE_CAPABILITIES
    );
  }

  /**
   * Validate connection to Google AI API
   */
  protected async validateConnection(): Promise<void> {
    if (!this.config?.apiKey) {
      throw new AuthenticationError(this.name);
    }

    try {
      this.client = google({
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
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Use the models endpoint as a health check
      const baseUrl = this.config?.baseUrl || 'https://generativelanguage.googleapis.com';
      const response = await fetch(`${baseUrl}/v1beta/models?key=${this.config?.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AuthenticationError(this.name);
        }
        if (response.status === 429) {
          const resetTime = response.headers.get('retry-after');
          throw new RateLimitError(
            this.name,
            resetTime ? new Date(Date.now() + parseInt(resetTime) * 1000) : undefined
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(this.name, this.getConfigValue('timeout', 10000));
      }
      throw error;
    }
  }

  /**
   * Create a language model instance
   */
  protected createModel(modelId: string, options?: GenerationOptions): LanguageModel {
    if (!this.client) {
      throw new Error('Provider not initialized');
    }

    const modelConfig = GOOGLE_MODELS[modelId as keyof typeof GOOGLE_MODELS];
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${modelId}`);
    }

    // Map our options to Google format
    const googleOptions: any = {};
    
    if (options?.temperature !== undefined) {
      googleOptions.temperature = Math.max(0, Math.min(2, options.temperature));
    }
    
    if (options?.maxTokens !== undefined) {
      googleOptions.maxOutputTokens = Math.min(options.maxTokens, modelConfig.maxOutputTokens);
    }
    
    if (options?.topP !== undefined) {
      googleOptions.topP = Math.max(0, Math.min(1, options.topP));
    }
    
    if (options?.topK !== undefined) {
      googleOptions.topK = Math.max(1, Math.min(40, options.topK));
    }

    // Handle function calling (tools in Google)
    if (options?.tools && modelConfig.supportsFunctionCalling) {
      googleOptions.tools = options.tools.map(this.mapTool);
      
      if (options.toolChoice) {
        googleOptions.toolConfig = this.mapToolChoice(options.toolChoice);
      }
    }

    // Handle safety settings (Google-specific)
    googleOptions.safetySettings = [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ];

    return this.client(modelConfig.id, googleOptions);
  }

  /**
   * Map tool format from generic to Google-specific
   */
  private mapTool(tool: any): any {
    if (tool.type === 'function') {
      return {
        functionDeclarations: [{
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        }],
      };
    }
    return tool;
  }

  /**
   * Map tool choice format from generic to Google-specific
   */
  private mapToolChoice(toolChoice: GenerationOptions['toolChoice']): any {
    if (typeof toolChoice === 'string') {
      return {
        functionCallingConfig: {
          mode: toolChoice === 'auto' ? 'AUTO' : 'NONE',
        },
      };
    }
    
    if (toolChoice && typeof toolChoice === 'object' && 'function' in toolChoice) {
      return {
        functionCallingConfig: {
          mode: 'ANY',
          allowedFunctionNames: [toolChoice.function.name],
        },
      };
    }
    
    return {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    };
  }

  /**
   * Handle connection errors and convert to appropriate error types
   */
  private handleConnectionError(error: unknown): never {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('unauthorized') || message.includes('invalid api key') || message.includes('permission denied')) {
        throw new AuthenticationError(this.name);
      }
      
      if (message.includes('quota exceeded') || message.includes('rate limit') || message.includes('too many requests')) {
        throw new RateLimitError(this.name);
      }
      
      if (message.includes('timeout') || message.includes('aborted')) {
        throw new TimeoutError(this.name, this.getConfigValue('timeout', 10000));
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
    return GOOGLE_MODELS[modelId as keyof typeof GOOGLE_MODELS];
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
   * Check if model supports audio input
   */
  supportsAudioInput(modelId: string): boolean {
    const model = this.getModelInfo(modelId);
    return model?.supportsAudioInput ?? false;
  }

  /**
   * Check if model supports audio output
   */
  supportsAudioOutput(modelId: string): boolean {
    const model = this.getModelInfo(modelId);
    return model?.supportsAudioOutput ?? false;
  }

  /**
   * Get model context length
   */
  getContextLength(modelId: string): number {
    const model = this.getModelInfo(modelId);
    return model?.contextLength ?? 32768;
  }

  /**
   * Get model max output tokens
   */
  getMaxOutputTokens(modelId: string): number {
    const model = this.getModelInfo(modelId);
    return model?.maxOutputTokens ?? 8192;
  }
}