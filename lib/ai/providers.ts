import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { createModelRouter } from './providers/router';
import { getProviderFactory } from './providers/factory';

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
        'chat-model': xai('grok-2-vision-1212'),
        'chat-model-reasoning': wrapLanguageModel({
          model: xai('grok-3-mini-beta'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': xai('grok-2-1212'),
        'artifact-model': xai('grok-2-1212'),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
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
