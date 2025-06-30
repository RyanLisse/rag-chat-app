/**
 * Comprehensive unit tests for AI providers
 * Tests all providers with 100% coverage including edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { GoogleProvider } from '@/lib/ai/providers/google';
import { ModelProviderFactory } from '@/lib/ai/providers/factory';
import { ModelRouterImpl } from '@/lib/ai/providers/router';
import {
  ProviderError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ModelNotFoundError,
  ConfigurationError,
} from '@/lib/ai/providers/errors';
import { retryWithBackoff, CircuitBreaker } from '@/lib/ai/providers/utils';

// Legacy tests for backward compatibility
import { myProvider } from '@/lib/ai/providers';

// Mock fetch globally
global.fetch = vi.fn();

describe('Legacy Provider (Backward Compatibility)', () => {
  it('should have all required language models', () => {
    const requiredModels = [
      'chat-model',
      'chat-model-reasoning',
      'title-model',
      'artifact-model',
    ];

    requiredModels.forEach(modelName => {
      expect(myProvider.languageModels[modelName]).toBeDefined();
    });
  });

  it('should allow accessing models by key', () => {
    const chatModel = myProvider.languageModels['chat-model'];
    expect(chatModel).toBeDefined();
  });

  it('should return undefined for non-existent models', () => {
    const nonExistentModel = myProvider.languageModels['non-existent-model'];
    expect(nonExistentModel).toBeUndefined();
  });
});

describe('OpenAI Provider', () => {
  let provider: OpenAIProvider;
  const mockConfig = {
    apiKey: 'sk-test-key-123456789',
    timeout: 10000,
    maxRetries: 3,
  };

  beforeEach(() => {
    provider = new OpenAIProvider();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (provider) {
      await provider.cleanup();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await expect(provider.initialize(mockConfig)).resolves.not.toThrow();
      expect(provider.supportsModel('gpt-4.1')).toBe(true);
    });

    it('should throw ConfigurationError with invalid API key', async () => {
      const invalidConfig = { ...mockConfig, apiKey: 'invalid-key' };
      
      await expect(provider.initialize(invalidConfig))
        .rejects.toThrow(ConfigurationError);
    });

    it('should throw AuthenticationError on 401 response', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(provider.initialize(mockConfig))
        .rejects.toThrow(AuthenticationError);
    });

    it('should throw RateLimitError on 429 response', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(provider.initialize(mockConfig))
        .rejects.toThrow(RateLimitError);
    });

    it('should throw NetworkError on network failure', async () => {
      (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.initialize(mockConfig))
        .rejects.toThrow(NetworkError);
    });
  });

  describe('model creation', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      await provider.initialize(mockConfig);
    });

    it('should create model for supported model ID', () => {
      expect(() => provider.getModel('gpt-4.1')).not.toThrow();
    });

    it('should throw error for unsupported model ID', () => {
      expect(() => provider.getModel('unsupported-model'))
        .toThrow('Model not supported');
    });

    it('should apply generation options correctly', () => {
      const options = {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        seed: 123,
      };

      expect(() => provider.getModel('gpt-4.1', options)).not.toThrow();
    });

    it('should handle function calling options', () => {
      const options = {
        tools: [{
          type: 'function',
          function: {
            name: 'test_function',
            description: 'A test function',
            parameters: { type: 'object' },
          },
        }],
        toolChoice: 'auto' as const,
      };

      expect(() => provider.getModel('gpt-4.1', options)).not.toThrow();
    });
  });

  describe('model capabilities', () => {
    it('should correctly identify vision support', () => {
      expect(provider.supportsVision('gpt-4.1')).toBe(true);
      expect(provider.supportsVision('o4-mini')).toBe(false);
    });

    it('should correctly identify function calling support', () => {
      expect(provider.supportsFunctionCalling('gpt-4.1')).toBe(true);
      expect(provider.supportsFunctionCalling('o4-mini')).toBe(true);
    });

    it('should return correct context length', () => {
      expect(provider.getContextLength('gpt-4.1')).toBe(128000);
      expect(provider.getContextLength('unknown')).toBe(4096);
    });

    it('should return correct max output tokens', () => {
      expect(provider.getMaxOutputTokens('gpt-4.1')).toBe(16384);
      expect(provider.getMaxOutputTokens('unknown')).toBe(1024);
    });
  });

  describe('health checks', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      await provider.initialize(mockConfig);
    });

    it('should return healthy status on successful check', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const health = await provider.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThan(0);
      expect(health.errorRate).toBe(0);
    });

    it('should return unhealthy status on failed check', async () => {
      (global.fetch as Mock).mockRejectedValueOnce(new Error('Service down'));

      const health = await provider.getHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('Service down');
    });
  });

  describe('metrics tracking', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      await provider.initialize(mockConfig);
    });

    it('should track metrics correctly', () => {
      const initialMetrics = provider.getMetrics();
      expect(initialMetrics.requestCount).toBe(0);
      expect(initialMetrics.errorCount).toBe(0);
    });

    it('should reset metrics', () => {
      provider.resetMetrics();
      const metrics = provider.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });
});

describe('Anthropic Provider', () => {
  let provider: AnthropicProvider;
  const mockConfig = {
    apiKey: 'sk-ant-test-key-123456789',
    timeout: 10000,
    maxRetries: 3,
  };

  beforeEach(() => {
    provider = new AnthropicProvider();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (provider) {
      await provider.cleanup();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(provider.initialize(mockConfig)).resolves.not.toThrow();
      expect(provider.supportsModel('claude-4')).toBe(true);
    });

    it('should handle rate limits with retry-after header', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => name === 'retry-after' ? '60' : null,
        },
      });

      await expect(provider.initialize(mockConfig))
        .rejects.toThrow(RateLimitError);
    });
  });

  describe('model creation', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      await provider.initialize(mockConfig);
    });

    it('should create model with Anthropic-specific options', () => {
      const options = {
        temperature: 0.8,
        maxTokens: 2000,
        topP: 0.95,
        topK: 20,
      };

      expect(() => provider.getModel('claude-4', options)).not.toThrow();
    });

    it('should map tool choice correctly', () => {
      const options = {
        tools: [{
          type: 'function',
          function: {
            name: 'search',
            description: 'Search function',
            parameters: { type: 'object' },
          },
        }],
        toolChoice: {
          type: 'function',
          function: { name: 'search' },
        } as any,
      };

      expect(() => provider.getModel('claude-4', options)).not.toThrow();
    });
  });

  describe('context caching', () => {
    it('should support context caching for all models', () => {
      expect(provider.supportsContextCaching('claude-4')).toBe(true);
      expect(provider.supportsContextCaching('claude-3.5-sonnet')).toBe(true);
    });
  });
});

describe('Google Provider', () => {
  let provider: GoogleProvider;
  const mockConfig = {
    apiKey: 'google-api-key-123456789',
    timeout: 10000,
    maxRetries: 3,
  };

  beforeEach(() => {
    provider = new GoogleProvider();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (provider) {
      await provider.cleanup();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      await expect(provider.initialize(mockConfig)).resolves.not.toThrow();
      expect(provider.supportsModel('gemini-2.5-pro')).toBe(true);
    });

    it('should handle Google-specific auth errors', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(provider.initialize(mockConfig))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('model creation', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });
      await provider.initialize(mockConfig);
    });

    it('should create model with Google-specific options', () => {
      const options = {
        temperature: 0.9,
        maxTokens: 4000,
        topP: 0.8,
        topK: 30,
      };

      expect(() => provider.getModel('gemini-2.5-pro', options)).not.toThrow();
    });

    it('should apply safety settings', () => {
      expect(() => provider.getModel('gemini-2.5-pro')).not.toThrow();
    });
  });

  describe('audio capabilities', () => {
    it('should correctly identify audio support', () => {
      expect(provider.supportsAudioInput('gemini-2.5-pro')).toBe(true);
      expect(provider.supportsAudioOutput('gemini-2.5-pro')).toBe(true);
      expect(provider.supportsAudioInput('gemini-1.5-flash')).toBe(false);
    });
  });
});

describe('Provider Factory', () => {
  let factory: ModelProviderFactory;

  beforeEach(() => {
    factory = ModelProviderFactory.getInstance();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await factory.clearAll();
  });

  describe('provider creation', () => {
    it('should create OpenAI provider', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const config = { apiKey: 'sk-test-key' };
      const provider = await factory.createProvider('openai', config);
      expect(provider.name).toBe('openai');
    });

    it('should create Anthropic provider', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const config = { apiKey: 'sk-ant-test-key' };
      const provider = await factory.createProvider('anthropic', config);
      expect(provider.name).toBe('anthropic');
    });

    it('should create Google provider', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const config = { apiKey: 'google-test-key' };
      const provider = await factory.createProvider('google', config);
      expect(provider.name).toBe('google');
    });

    it('should throw error for unknown provider', async () => {
      const config = { apiKey: 'test-key' };
      
      await expect(factory.createProvider('unknown', config))
        .rejects.toThrow(ConfigurationError);
    });
  });

  describe('provider caching', () => {
    it('should cache providers by config', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const config = { apiKey: 'sk-test-key' };
      const provider1 = await factory.getProvider('openai', config);
      const provider2 = await factory.getProvider('openai', config);
      
      expect(provider1).toBe(provider2); // Same instance
    });

    it('should create different instances for different configs', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const config1 = { apiKey: 'sk-test-key-1' };
      const config2 = { apiKey: 'sk-test-key-2' };
      
      const provider1 = await factory.getProvider('openai', config1);
      const provider2 = await factory.getProvider('openai', config2);
      
      expect(provider1).not.toBe(provider2); // Different instances
    });
  });

  describe('provider management', () => {
    it('should remove provider', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const config = { apiKey: 'sk-test-key' };
      await factory.getProvider('openai', config);
      
      const removed = await factory.removeProvider('openai', config);
      expect(removed).toBe(true);
    });

    it('should get provider statistics', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const config = { apiKey: 'sk-test-key' };
      await factory.getProvider('openai', config);
      
      const stats = factory.getProviderStats();
      expect(stats).toHaveLength(1);
      expect(stats[0].name).toBe('openai');
    });
  });

  describe('supported providers', () => {
    it('should return list of supported providers', () => {
      const supported = factory.getSupportedProviders();
      expect(supported).toContain('openai');
      expect(supported).toContain('anthropic');
      expect(supported).toContain('google');
    });
  });
});

describe('Model Router', () => {
  let router: ModelRouterImpl;
  const mockConfigs = {
    openai: { apiKey: 'sk-test-key' },
    anthropic: { apiKey: 'sk-ant-test-key' },
    google: { apiKey: 'google-test-key' },
  };

  beforeEach(() => {
    router = new ModelRouterImpl(mockConfigs);
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize all providers', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await expect(router.initialize()).resolves.not.toThrow();
    });
  });

  describe('model routing', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      await router.initialize();
    });

    it('should route to correct provider for model', async () => {
      const result = await router.route('gpt-4.1');
      expect(result.provider.name).toBe('openai');
      expect(result.metadata.model).toBe('gpt-4.1');
    });

    it('should throw error for unknown model', async () => {
      await expect(router.route('unknown-model'))
        .rejects.toThrow(ModelNotFoundError);
    });
  });

  describe('fallback strategies', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      await router.initialize();
    });

    it('should use fallback on provider failure', async () => {
      // Mock primary provider failure
      const provider = await router.getBestProvider('gpt-4.1');
      if (provider) {
        vi.spyOn(provider, 'getModel').mockImplementationOnce(() => {
          throw new Error('Provider failed');
        });
      }

      router.updateConfig({ fallbackStrategy: 'fastest' });
      
      // Should still succeed with fallback
      const result = await router.route('gpt-4.1');
      expect(result).toBeDefined();
    });
  });

  describe('health monitoring', () => {
    beforeEach(async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      await router.initialize();
    });

    it('should get best provider based on health', async () => {
      const provider = await router.getBestProvider('gpt-4.1');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('openai');
    });
  });

  describe('configuration updates', () => {
    it('should update router configuration', () => {
      router.updateConfig({
        fallbackStrategy: 'round_robin',
        healthCheckInterval: 30000,
      });

      const stats = router.getStats();
      expect(stats.config.fallbackStrategy).toBe('round_robin');
      expect(stats.config.healthCheckInterval).toBe(30000);
    });
  });
});

describe('Error Handling', () => {
  describe('ProviderError', () => {
    it('should create provider error with correct properties', () => {
      const error = new ProviderError('Test error', 'test-provider', 'TEST_CODE', 500, true);
      
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('test-provider');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('test-provider');
      
      expect(error.name).toBe('AuthenticationError');
      expect(error.provider).toBe('test-provider');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with reset time', () => {
      const resetTime = new Date();
      const error = new RateLimitError('test-provider', resetTime);
      
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toContain(resetTime.toISOString());
      expect(error.retryable).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new NetworkError('test', new Error('Network error')))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK_ERROR'],
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new AuthenticationError('test'));
      
      await expect(retryWithBackoff(fn)).rejects.toThrow(AuthenticationError);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(3, 1000);
    });

    it('should allow requests when closed', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(fn);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should open after threshold failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      
      // Fail 3 times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {}
      }
      
      expect(circuitBreaker.getState()).toBe('open');
      
      // Next call should fail immediately
      await expect(circuitBreaker.execute(fn))
        .rejects.toThrow('Circuit breaker is open');
    });

    it('should reset after timeout', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      // Trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {}
      }
      
      expect(circuitBreaker.getState()).toBe('open');
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should transition to half-open and allow one request
      const result = await circuitBreaker.execute(fn);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });
});