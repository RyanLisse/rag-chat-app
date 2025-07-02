import type { LanguageModel } from 'ai';

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  inputCost: number;
  outputCost: number;
  supportsFunctions: boolean;
  supportsVision: boolean;
  supportsSystemPrompt: boolean;
}

export interface ChatParams {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
  }>;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  functions?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  functionCall?: 'none' | 'auto' | { name: string };
  userId?: string;
  signal?: AbortSignal;
}

export interface ModelProvider {
  id: string;
  name: string;
  models: ModelConfig[];
  chat(params: ChatParams): Promise<Response>;
  getModel(modelId: string): LanguageModel;
}

export interface ProviderError extends Error {
  provider: string;
  statusCode?: number;
  retryable: boolean;
  details?: unknown;
}

export class ProviderRateLimitError extends Error implements ProviderError {
  provider: string;
  statusCode = 429;
  retryable = true;
  details?: unknown;

  constructor(provider: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ProviderRateLimitError';
    this.provider = provider;
    this.details = details;
  }
}

export class ProviderAuthenticationError
  extends Error
  implements ProviderError
{
  provider: string;
  statusCode = 401;
  retryable = false;
  details?: unknown;

  constructor(provider: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ProviderAuthenticationError';
    this.provider = provider;
    this.details = details;
  }
}

export class ProviderQuotaExceededError extends Error implements ProviderError {
  provider: string;
  statusCode = 402;
  retryable = false;
  details?: unknown;

  constructor(provider: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ProviderQuotaExceededError';
    this.provider = provider;
    this.details = details;
  }
}

export class ProviderInvalidRequestError
  extends Error
  implements ProviderError
{
  provider: string;
  statusCode = 400;
  retryable = false;
  details?: unknown;

  constructor(provider: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ProviderInvalidRequestError';
    this.provider = provider;
    this.details = details;
  }
}

export class ProviderInternalError extends Error implements ProviderError {
  provider: string;
  statusCode = 500;
  retryable = true;
  details?: unknown;

  constructor(provider: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ProviderInternalError';
    this.provider = provider;
    this.details = details;
  }
}
