import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { getProviderFactory } from './providers/factory';
import { createModelRouter } from './providers/router';

/**
 * Legacy provider for backward compatibility
 * @deprecated Use the new provider system via createModelRouter()
 */
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // OpenAI models
        'gpt-4.1': openai('gpt-4.1'),
        'o4-mini': openai('o4-mini'),
        
        // Anthropic models
        'claude-4': anthropic('claude-4'),
        
        // Google models
        'gemini-2.5-pro': google('gemini-2.5-pro'),
        'gemini-2.5-flash': google('gemini-2.5-flash'),
        
        // Legacy model aliases for backward compatibility
        'chat-model': openai('gpt-4.1'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('o4-mini'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-4.1'),
        'artifact-model': openai('gpt-4.1'),
      },
    });

/**
 * Global model router instance
 */
let modelRouter: ReturnType<typeof createModelRouter> | null = null;

/**
 * Get or create the global model router
 */
export function getModelRouter() {
  if (!modelRouter) {
    modelRouter = createModelRouter({
      fallbackStrategy: 'fastest',
      healthCheckInterval: 60000,
      loadBalancing: true,
      circuitBreaker: {
        enabled: true,
        errorThreshold: 5,
        resetTimeout: 300000,
      },
    });
  }
  return modelRouter;
}

/**
 * Initialize the model router
 */
export async function initializeModelRouter() {
  const router = getModelRouter();
  await router.initialize();
  return router;
}

/**
 * Get a model using the new provider system
 */
export async function getModel(modelId: string, options?: any) {
  const router = getModelRouter();
  const result = await router.route(modelId, options);
  return result.model;
}

/**
 * Get provider factory instance
 */
export function getFactory() {
  return getProviderFactory();
}

/**
 * Re-export provider system components
 */
export * from './providers';
