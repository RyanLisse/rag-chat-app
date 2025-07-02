import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, streamText, tool } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
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

const ANTHROPIC_MODELS: ModelConfig[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 4 Sonnet',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCost: 3,
    outputCost: 15,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 4 Haiku',
    contextWindow: 200000,
    maxOutput: 8192,
    inputCost: 1,
    outputCost: 5,
    supportsFunctions: true,
    supportsVision: false,
    supportsSystemPrompt: true,
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    maxOutput: 4096,
    inputCost: 15,
    outputCost: 75,
    supportsFunctions: true,
    supportsVision: true,
    supportsSystemPrompt: true,
  },
];

export class AnthropicProvider implements ModelProvider {
  id = 'anthropic';
  name = 'Anthropic';
  models = ANTHROPIC_MODELS;

  private anthropic: ReturnType<typeof createAnthropic>;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!key) {
      throw new ProviderAuthenticationError(
        this.id,
        'Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.'
      );
    }
    this.anthropic = createAnthropic({
      apiKey: key,
    });
  }

  getModel(modelId: string): LanguageModel {
    const modelConfig = this.models.find((m) => m.id === modelId);
    if (!modelConfig) {
      throw new ProviderInvalidRequestError(
        this.id,
        `Model ${modelId} not found in Anthropic provider`
      );
    }

    return this.anthropic(modelId);
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

      // Anthropic has specific requirements for message formatting
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
    // Anthropic requires alternating user/assistant messages
    // and system messages must be at the beginning
    
    // Filter out any function messages as they're not supported in AI SDK 5.0
    const filteredMessages = messages.filter(msg => 
      msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant'
    );
    
    const formattedMessages = [...filteredMessages];

    // Ensure we don't have consecutive messages of the same role
    for (let i = 1; i < formattedMessages.length; i++) {
      if (
        formattedMessages[i].role === formattedMessages[i - 1].role &&
        formattedMessages[i].role !== 'system'
      ) {
        // Merge consecutive messages of the same role
        formattedMessages[i - 1].content +=
          `\n\n${formattedMessages[i].content}`;
        formattedMessages.splice(i, 1);
        i--;
      }
    }

    return formattedMessages;
  }

  private handleError(error: unknown): never {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Rate limit error
      if (message.includes('rate limit') || message.includes('429')) {
        throw new ProviderRateLimitError(
          this.id,
          'Anthropic rate limit exceeded. Please try again later.',
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
          'Invalid Anthropic API key.',
          error
        );
      }

      // Quota exceeded
      if (message.includes('quota') || message.includes('402')) {
        throw new ProviderQuotaExceededError(
          this.id,
          'Anthropic quota exceeded. Please check your billing.',
          error
        );
      }

      // Invalid request
      if (message.includes('invalid') || message.includes('400')) {
        throw new ProviderInvalidRequestError(
          this.id,
          `Invalid request to Anthropic: ${error.message}`,
          error
        );
      }

      // Server error
      if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('overloaded')
      ) {
        throw new ProviderInternalError(
          this.id,
          'Anthropic service temporarily unavailable.',
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
