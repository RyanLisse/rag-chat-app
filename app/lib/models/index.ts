export { ModelRouter } from './model-router';
export { OpenAIProvider } from './openai-provider';
export { AnthropicProvider } from './anthropic-provider';
export { GoogleProvider } from './google-provider';
export type { 
  ModelProvider, 
  ModelConfig, 
  ChatParams,
  ProviderError,
  ProviderRateLimitError,
  ProviderAuthenticationError,
  ProviderQuotaExceededError,
  ProviderInvalidRequestError,
  ProviderInternalError
} from './provider';
export type { ModelRouterConfig } from './model-router';

// Create a default router instance
export const defaultModelRouter = new ModelRouter();