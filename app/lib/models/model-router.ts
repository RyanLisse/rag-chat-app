import type { LanguageModel } from 'ai';
import { AnthropicProvider } from './anthropic-provider';
import { GoogleProvider } from './google-provider';
import { OpenAIProvider } from './openai-provider';
import type {
  ChatParams,
  ModelConfig,
  ModelProvider,
  ProviderError,
} from './provider';

export interface ModelRouterConfig {
  providers?: {
    openai?: { apiKey?: string };
    anthropic?: { apiKey?: string };
    google?: { apiKey?: string };
  };
  retryOptions?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  };
}

export class ModelRouter {
  private providers: Map<string, ModelProvider> = new Map();
  private modelToProvider: Map<string, string> = new Map();
  private retryOptions: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };

  constructor(config?: ModelRouterConfig) {
    this.retryOptions = {
      maxRetries: config?.retryOptions?.maxRetries ?? 3,
      initialDelay: config?.retryOptions?.initialDelay ?? 1000,
      maxDelay: config?.retryOptions?.maxDelay ?? 30000,
      backoffFactor: config?.retryOptions?.backoffFactor ?? 2,
    };

    // Initialize providers
    this.initializeProviders(config?.providers);
  }

  private initializeProviders(
    providersConfig?: ModelRouterConfig['providers']
  ) {
    // Initialize OpenAI provider
    try {
      const openaiProvider = new OpenAIProvider(
        providersConfig?.openai?.apiKey
      );
      this.providers.set('openai', openaiProvider);
      openaiProvider.models.forEach((model) => {
        this.modelToProvider.set(model.id, 'openai');
      });
    } catch (error) {
      console.warn('Failed to initialize OpenAI provider:', error);
    }

    // Initialize Anthropic provider
    try {
      const anthropicProvider = new AnthropicProvider(
        providersConfig?.anthropic?.apiKey
      );
      this.providers.set('anthropic', anthropicProvider);
      anthropicProvider.models.forEach((model) => {
        this.modelToProvider.set(model.id, 'anthropic');
      });
    } catch (error) {
      console.warn('Failed to initialize Anthropic provider:', error);
    }

    // Initialize Google provider
    try {
      const googleProvider = new GoogleProvider(
        providersConfig?.google?.apiKey
      );
      this.providers.set('google', googleProvider);
      googleProvider.models.forEach((model) => {
        this.modelToProvider.set(model.id, 'google');
      });
    } catch (error) {
      console.warn('Failed to initialize Google provider:', error);
    }
  }

  getAllModels(): ModelConfig[] {
    const allModels: ModelConfig[] = [];
    this.providers.forEach((provider) => {
      allModels.push(...provider.models);
    });
    return allModels;
  }

  getModel(modelId: string): LanguageModel {
    const providerId = this.modelToProvider.get(modelId);
    if (!providerId) {
      throw new Error(`Model ${modelId} not found in any provider`);
    }

    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not initialized`);
    }

    return provider.getModel(modelId);
  }

  getModelConfig(modelId: string): ModelConfig | undefined {
    const providerId = this.modelToProvider.get(modelId);
    if (!providerId) {
      return undefined;
    }

    const provider = this.providers.get(providerId);
    if (!provider) {
      return undefined;
    }

    return provider.models.find((m) => m.id === modelId);
  }

  getProvider(modelId: string): ModelProvider | undefined {
    const providerId = this.modelToProvider.get(modelId);
    if (!providerId) {
      return undefined;
    }

    return this.providers.get(providerId);
  }

  async chat(params: ChatParams): Promise<Response> {
    const providerId = this.modelToProvider.get(params.model);
    if (!providerId) {
      throw new Error(`Model ${params.model} not found in any provider`);
    }

    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not initialized`);
    }

    return this.chatWithRetry(provider, params);
  }

  private async chatWithRetry(
    provider: ModelProvider,
    params: ChatParams
  ): Promise<Response> {
    let lastError: unknown;
    let delay = this.retryOptions.initialDelay;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        return await provider.chat(params);
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (
          this.isRetryableError(error) &&
          attempt < this.retryOptions.maxRetries
        ) {
          console.warn(
            `Attempt ${attempt + 1} failed for provider ${provider.id}:`,
            error instanceof Error ? error.message : error
          );

          // Wait before retrying
          await this.sleep(delay);

          // Exponential backoff
          delay = Math.min(
            delay * this.retryOptions.backoffFactor,
            this.retryOptions.maxDelay
          );
        } else {
          // Non-retryable error or max retries reached
          throw error;
        }
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'retryable' in error) {
      return (error as ProviderError).retryable;
    }

    // Default to retrying on unknown errors
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Utility method to get models by provider
  getModelsByProvider(providerId: string): ModelConfig[] {
    const provider = this.providers.get(providerId);
    return provider ? provider.models : [];
  }

  // Utility method to check if a model supports a specific feature
  modelSupports(
    modelId: string,
    feature: keyof Pick<
      ModelConfig,
      'supportsFunctions' | 'supportsVision' | 'supportsSystemPrompt'
    >
  ): boolean {
    const config = this.getModelConfig(modelId);
    return config ? config[feature] : false;
  }
}
