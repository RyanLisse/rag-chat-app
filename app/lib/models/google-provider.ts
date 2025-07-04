import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { LanguageModel } from 'ai';
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

const GOOGLE_MODELS: ModelConfig[] = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.5 Flash',
    contextWindow: 1048576,
    maxOutput: 8192,
    inputCost: 0.075,
    outputCost: 0.3,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 2.5 Pro',
    contextWindow: 2097152,
    maxOutput: 8192,
    inputCost: 1.25,
    outputCost: 5,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    contextWindow: 1048576,
    maxOutput: 8192,
    inputCost: 0.075,
    outputCost: 0.3,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    contextWindow: 1048576,
    maxOutput: 8192,
    inputCost: 0.0375,
    outputCost: 0.15,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
];

export class GoogleProvider implements ModelProvider {
  id = 'google';
  name = 'Google';
  models = GOOGLE_MODELS;

  private google: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_API_KEY || '';
    if (!key) {
      throw new ProviderAuthenticationError(
        this.id,
        'Google API key is required. Set GOOGLE_API_KEY environment variable.'
      );
    }
    this.google = createGoogleGenerativeAI({
      apiKey: key,
    });
  }

  getModel(modelId: string): LanguageModel {
    const modelConfig = this.models.find((m) => m.id === modelId);
    if (!modelConfig) {
      throw new ProviderInvalidRequestError(
        this.id,
        `Model ${modelId} not found in Google provider`
      );
    }

    return this.google(modelId);
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

      // Google Gemini has specific requirements for message formatting
      const messages = this.formatMessages(params.messages);

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

  private formatMessages(messages: ChatParams['messages']) {
    // Gemini requires specific message formatting
    // System messages are supported but handled differently
    const formattedMessages = [...messages];

    // Ensure messages are properly formatted for Gemini
    return formattedMessages.map((msg) => ({
      ...msg,
      content: msg.content.trim(),
    }));
  }

  private handleError(error: unknown): never {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Rate limit error
      if (
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('quota')
      ) {
        throw new ProviderRateLimitError(
          this.id,
          'Google Gemini rate limit exceeded. Please try again later.',
          error
        );
      }

      // Authentication error
      if (
        message.includes('unauthorized') ||
        message.includes('401') ||
        message.includes('api key') ||
        message.includes('invalid credentials')
      ) {
        throw new ProviderAuthenticationError(
          this.id,
          'Invalid Google API key.',
          error
        );
      }

      // Quota exceeded
      if (message.includes('billing') || message.includes('402')) {
        throw new ProviderQuotaExceededError(
          this.id,
          'Google Gemini quota exceeded. Please check your billing.',
          error
        );
      }

      // Invalid request
      if (
        message.includes('invalid') ||
        message.includes('400') ||
        message.includes('bad request')
      ) {
        throw new ProviderInvalidRequestError(
          this.id,
          `Invalid request to Google Gemini: ${error.message}`,
          error
        );
      }

      // Server error
      if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('service unavailable')
      ) {
        throw new ProviderInternalError(
          this.id,
          'Google Gemini service temporarily unavailable.',
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
