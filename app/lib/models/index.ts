import { ModelRouter } from './model-router';

export { AnthropicProvider } from './anthropic-provider';
export { GoogleProvider } from './google-provider';
export type { ModelRouterConfig } from './model-router';
export { ModelRouter } from './model-router';
export { OpenAIProvider } from './openai-provider';
export type {
  ChatParams,
  ModelConfig,
  ModelProvider,
  ProviderAuthenticationError,
  ProviderError,
  ProviderInternalError,
  ProviderInvalidRequestError,
  ProviderQuotaExceededError,
  ProviderRateLimitError,
} from './provider';

// Create a default router instance
export const defaultModelRouter = new ModelRouter();
