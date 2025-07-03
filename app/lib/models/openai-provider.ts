import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { generateText, streamText } from 'ai';
import {
  type ChatParams,
  type ModelConfig,
  type ModelProvider,
  ProviderAuthenticationError,
  ProviderInternalError,
  ProviderInvalidRequestError,
  ProviderQuotaExceededError,
  ProviderRateLimitError,
} from './provider';

const OPENAI_MODELS: ModelConfig[] = [
  {
    id: 'gpt-4-turbo-2024-04-09',
    name: 'GPT-4.1 Turbo',
    contextWindow: 128000,
    maxOutput: 4096,
    inputCost: 10,
    outputCost: 30,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
  {
    id: 'o1-mini',
    name: 'o4-mini',
    contextWindow: 128000,
    maxOutput: 65536,
    inputCost: 3,
    outputCost: 12,
    supportsFunctions: false,
    supportsVision: false,
    supportsSystemPrompt: false,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4 Omni',
    contextWindow: 128000,
    maxOutput: 16384,
    inputCost: 5,
    outputCost: 15,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4 Omni Mini',
    contextWindow: 128000,
    maxOutput: 16384,
    inputCost: 0.15,
    outputCost: 0.6,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
];

export class OpenAIProvider implements ModelProvider {
  id = 'openai';
  name = 'OpenAI';
  models = OPENAI_MODELS;

  private openai: ReturnType<typeof createOpenAI>;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY || '';
    if (!key) {
      throw new ProviderAuthenticationError(
        this.id,
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable.'
      );
    }
    this.openai = createOpenAI({
      apiKey: key,
    });
  }

  getModel(modelId: string): LanguageModel {
    const modelConfig = this.models.find((m) => m.id === modelId);
    if (!modelConfig) {
      throw new ProviderInvalidRequestError(
        this.id,
        `Model ${modelId} not found in OpenAI provider`
      );
    }

    return this.openai(modelId);
  }

  async chat(params: ChatParams): Promise<Response> {
    try {
      const model = this.getModel(params.model);
      const modelConfig = this.models.find((m) => m.id === params.model);

      if (!modelConfig) {
        throw new ProviderInvalidRequestError(
          this.id,
          `Model ${params.model} not found`
        );
      }

      // Handle models that don't support system prompts (like o1-mini)
      const messages = modelConfig.supportsSystemPrompt
        ? params.messages
        : params.messages.filter((m) => m.role !== 'system');

      // TODO: Implement function calling with AI SDK 5.0 tools format
      // For now, disabled to focus on core streaming functionality
      const tools = undefined;

      if (params.stream !== false) {
        const result = await streamText({
          model,
          messages,
          temperature: params.temperature,
          maxOutputTokens: params.maxTokens,
          topP: params.topP,
          frequencyPenalty: params.frequencyPenalty,
          presencePenalty: params.presencePenalty,
          tools,
          toolChoice: undefined, // TODO: Update for AI SDK 5.0 tool choice format
          abortSignal: params.signal,
        });

        return result.toTextStreamResponse();
      }
      const result = await generateText({
        model,
        messages,
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
        topP: params.topP,
        frequencyPenalty: params.frequencyPenalty,
        presencePenalty: params.presencePenalty,
        tools,
        toolChoice: undefined, // TODO: Update for AI SDK 5.0 tool choice format
        abortSignal: params.signal,
      });

      // Create a fake stream for consistency
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(result.text));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Rate limit error
      if (message.includes('rate limit') || message.includes('429')) {
        throw new ProviderRateLimitError(
          this.id,
          'OpenAI rate limit exceeded. Please try again later.',
          error
        );
      }

      // Authentication error
      if (
        message.includes('unauthorized') ||
        message.includes('401') ||
        message.includes('api key')
      ) {
        throw new ProviderAuthenticationError(
          this.id,
          'Invalid OpenAI API key.',
          error
        );
      }

      // Quota exceeded
      if (message.includes('quota') || message.includes('402')) {
        throw new ProviderQuotaExceededError(
          this.id,
          'OpenAI quota exceeded. Please check your billing.',
          error
        );
      }

      // Invalid request
      if (message.includes('invalid') || message.includes('400')) {
        throw new ProviderInvalidRequestError(
          this.id,
          `Invalid request to OpenAI: ${error.message}`,
          error
        );
      }

      // Server error
      if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503')
      ) {
        throw new ProviderInternalError(
          this.id,
          'OpenAI service temporarily unavailable.',
          error
        );
      }
    }

    // Default error
    throw new ProviderInternalError(
      this.id,
      error instanceof Error ? error.message : 'Unknown error occurred',
      error
    );
  }
}
