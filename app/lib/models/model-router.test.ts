import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ModelRouter } from './model-router';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { GoogleProvider } from './google-provider';
import { ProviderRateLimitError, ProviderAuthenticationError } from './provider';

vi.mock('./openai-provider');
vi.mock('./anthropic-provider');
vi.mock('./google-provider');

describe('ModelRouter', () => {
  let router: ModelRouter;
  let mockOpenAIProvider: any;
  let mockAnthropicProvider: any;
  let mockGoogleProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock providers
    mockOpenAIProvider = {
      id: 'openai',
      name: 'OpenAI',
      models: [
        { id: 'gpt-4-turbo-2024-04-09', name: 'GPT-4.1 Turbo', supportsFunctions: true },
        { id: 'o1-mini', name: 'o4-mini', supportsFunctions: false },
      ],
      chat: vi.fn(),
      getModel: vi.fn().mockReturnValue('openai-model'),
    };

    mockAnthropicProvider = {
      id: 'anthropic',
      name: 'Anthropic',
      models: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 4 Sonnet', supportsFunctions: true },
      ],
      chat: vi.fn(),
      getModel: vi.fn().mockReturnValue('anthropic-model'),
    };

    mockGoogleProvider = {
      id: 'google',
      name: 'Google',
      models: [
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.5 Flash', supportsFunctions: true },
      ],
      chat: vi.fn(),
      getModel: vi.fn().mockReturnValue('google-model'),
    };

    (OpenAIProvider as Mock).mockImplementation(() => mockOpenAIProvider);
    (AnthropicProvider as Mock).mockImplementation(() => mockAnthropicProvider);
    (GoogleProvider as Mock).mockImplementation(() => mockGoogleProvider);

    router = new ModelRouter();
  });

  describe('initialization', () => {
    it('should initialize all providers successfully', () => {
      expect(OpenAIProvider).toHaveBeenCalled();
      expect(AnthropicProvider).toHaveBeenCalled();
      expect(GoogleProvider).toHaveBeenCalled();
    });

    it('should handle provider initialization failures gracefully', () => {
      vi.clearAllMocks();
      (OpenAIProvider as Mock).mockImplementation(() => {
        throw new Error('No API key');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => new ModelRouter()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize OpenAI provider:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('getAllModels', () => {
    it('should return all models from all providers', () => {
      const models = router.getAllModels();
      expect(models).toHaveLength(4);
      expect(models.map(m => m.id)).toEqual([
        'gpt-4-turbo-2024-04-09',
        'o1-mini',
        'claude-3-5-sonnet-20241022',
        'gemini-2.0-flash-exp',
      ]);
    });
  });

  describe('getModel', () => {
    it('should return correct model for OpenAI model ID', () => {
      const model = router.getModel('gpt-4-turbo-2024-04-09');
      expect(model).toBe('openai-model');
      expect(mockOpenAIProvider.getModel).toHaveBeenCalledWith('gpt-4-turbo-2024-04-09');
    });

    it('should return correct model for Anthropic model ID', () => {
      const model = router.getModel('claude-3-5-sonnet-20241022');
      expect(model).toBe('anthropic-model');
      expect(mockAnthropicProvider.getModel).toHaveBeenCalledWith('claude-3-5-sonnet-20241022');
    });

    it('should throw error for unknown model ID', () => {
      expect(() => router.getModel('unknown-model')).toThrow(
        'Model unknown-model not found in any provider'
      );
    });
  });

  describe('getModelConfig', () => {
    it('should return correct model configuration', () => {
      const config = router.getModelConfig('gpt-4-turbo-2024-04-09');
      expect(config).toEqual(mockOpenAIProvider.models[0]);
    });

    it('should return undefined for unknown model', () => {
      const config = router.getModelConfig('unknown-model');
      expect(config).toBeUndefined();
    });
  });

  describe('getProvider', () => {
    it('should return correct provider for model', () => {
      const provider = router.getProvider('gpt-4-turbo-2024-04-09');
      expect(provider).toBe(mockOpenAIProvider);
    });

    it('should return undefined for unknown model', () => {
      const provider = router.getProvider('unknown-model');
      expect(provider).toBeUndefined();
    });
  });

  describe('chat', () => {
    const mockChatParams = {
      messages: [{ role: 'user' as const, content: 'Hello' }],
      model: 'gpt-4-turbo-2024-04-09',
    };

    it('should route chat to correct provider', async () => {
      const mockResponse = { stream: 'test-stream' };
      mockOpenAIProvider.chat.mockResolvedValue(mockResponse);

      const result = await router.chat(mockChatParams);

      expect(mockOpenAIProvider.chat).toHaveBeenCalledWith(mockChatParams);
      expect(result).toBe(mockResponse);
    });

    it('should throw error for unknown model', async () => {
      await expect(router.chat({
        ...mockChatParams,
        model: 'unknown-model',
      })).rejects.toThrow('Model unknown-model not found in any provider');
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new ProviderRateLimitError('openai', 'Rate limited');
      const successResponse = { stream: 'success-stream' };
      
      mockOpenAIProvider.chat
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue(successResponse);

      const result = await router.chat(mockChatParams);

      expect(mockOpenAIProvider.chat).toHaveBeenCalledTimes(2);
      expect(result).toBe(successResponse);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new ProviderAuthenticationError('openai', 'Invalid API key');
      
      mockOpenAIProvider.chat.mockRejectedValue(nonRetryableError);

      await expect(router.chat(mockChatParams)).rejects.toThrow(nonRetryableError);
      expect(mockOpenAIProvider.chat).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
      const retryableError = new ProviderRateLimitError('openai', 'Rate limited');
      mockOpenAIProvider.chat.mockRejectedValue(retryableError);

      const routerWithLowRetries = new ModelRouter({
        retryOptions: { maxRetries: 2 },
      });

      await expect(routerWithLowRetries.chat(mockChatParams)).rejects.toThrow(retryableError);
      expect(mockOpenAIProvider.chat).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('utility methods', () => {
    it('should return models by provider', () => {
      const openaiModels = router.getModelsByProvider('openai');
      expect(openaiModels).toEqual(mockOpenAIProvider.models);

      const unknownModels = router.getModelsByProvider('unknown');
      expect(unknownModels).toEqual([]);
    });

    it('should check model feature support', () => {
      expect(router.modelSupports('gpt-4-turbo-2024-04-09', 'supportsFunctions')).toBe(true);
      expect(router.modelSupports('o1-mini', 'supportsFunctions')).toBe(false);
      expect(router.modelSupports('unknown-model', 'supportsFunctions')).toBe(false);
    });
  });

  describe('retry configuration', () => {
    it('should use custom retry options', () => {
      const customRouter = new ModelRouter({
        retryOptions: {
          maxRetries: 5,
          initialDelay: 500,
          maxDelay: 10000,
          backoffFactor: 3,
        },
      });

      expect(customRouter).toBeDefined();
    });
  });
});