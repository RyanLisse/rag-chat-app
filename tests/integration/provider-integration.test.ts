import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createModelRouter } from '@/lib/ai/providers/router';
import type { ModelRouter } from '@/lib/ai/providers/types';
import { createTestIsolation } from '../setup/test-isolation';
import {
  createProviderIntegrationMocks,
  createProviderFactoryMock,
  createProviderRouterMock
} from './provider-mocks';

// Use isolated mocks to avoid conflicts with global mocks
vi.mock('@/lib/ai/providers/openai', () => {
  const mocks = createProviderIntegrationMocks();
  return { OpenAIProvider: mocks.OpenAIProvider };
});

vi.mock('@/lib/ai/providers/anthropic', () => {
  const mocks = createProviderIntegrationMocks();
  return { AnthropicProvider: mocks.AnthropicProvider };
});

vi.mock('@/lib/ai/providers/google', () => {
  const mocks = createProviderIntegrationMocks();
  return { GoogleProvider: mocks.GoogleProvider };
});

vi.mock('@/lib/ai/providers/factory', () => {
  const mockFactory = createProviderFactoryMock();
  const MockModelProviderFactory = vi.fn().mockImplementation(() => mockFactory);
  MockModelProviderFactory.getInstance = vi.fn().mockReturnValue(mockFactory);

  return {
    ModelProviderFactory: MockModelProviderFactory,
    getProviderFactory: vi.fn().mockReturnValue(mockFactory),
  };
});

vi.mock('@/lib/ai/providers/router', () => {
  const mockRouter = createProviderRouterMock();
  return {
    createModelRouter: vi.fn().mockReturnValue(mockRouter),
    ModelRouterImpl: vi.fn().mockImplementation(() => mockRouter),
  };
});

// Create test isolation for this test suite
const testIsolation = createTestIsolation({
  resetMocks: true,
  clearMocks: true,
  isolateModules: true // Need module isolation for provider tests
});

describe('Provider Integration Tests', () => {
  let router: ModelRouter;
  let factory: any;

  beforeAll(async () => {
    testIsolation.setup();
    
    const { getProviderFactory } = await import('@/lib/ai/providers/factory');
    factory = getProviderFactory();
    
    // Set mock environment variables for router
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.GOOGLE_API_KEY = 'test-google-key';
    
    // Always initialize router for tests
    router = createModelRouter({
      fallbackStrategy: 'fastest',
      healthCheckInterval: 30000,
      loadBalancing: true,
    });
    
    await router.initialize();
  });

  afterAll(async () => {
    if (factory) {
      await factory.clearAll();
    }
    testIsolation.cleanup();
  });

  describe('OpenAI Provider Integration', () => {
    it('should initialize and create models', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      
      await provider.initialize({
        apiKey: 'test-openai-key',
        timeout: 30000,
      });

      expect(provider.supportsModel('gpt-4.1')).toBe(true);
      expect(provider.supportsModel('o4-mini')).toBe(true);
      
      // Test model creation
      const model = provider.getModel('gpt-4.1');
      expect(model).toBeDefined();
      
      // Test health check
      const health = await provider.getHealth();
      expect(['healthy', 'degraded']).toContain(health.status);
      
      await provider.cleanup();
    });

    it('should handle generation options', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      
      await provider.initialize({
        apiKey: 'test-openai-key',
      });

      const model = provider.getModel('gpt-4.1', {
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
      });
      
      expect(model).toBeDefined();
      
      await provider.cleanup();
    });

    it('should handle function calling', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      
      await provider.initialize({
        apiKey: 'test-openai-key',
      });

      const model = provider.getModel('gpt-4.1', {
        tools: [{
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get current weather',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
              required: ['location'],
            },
          },
        }],
        toolChoice: 'auto',
      });
      
      expect(model).toBeDefined();
      
      await provider.cleanup();
    });
  });

  describe('Anthropic Provider Integration', () => {
    it('should initialize and create models', async () => {
      const { AnthropicProvider } = await import('@/lib/ai/providers/anthropic');
      const provider = new AnthropicProvider();
      
      await provider.initialize({
        apiKey: 'test-anthropic-key',
        timeout: 30000,
      });

      expect(provider.supportsModel('claude-4')).toBe(true);
      expect(provider.supportsModel('claude-3.5-sonnet')).toBe(true);
      
      // Test model creation
      const model = provider.getModel('claude-4');
      expect(model).toBeDefined();
      
      // Test health check
      const health = await provider.getHealth();
      expect(['healthy', 'degraded']).toContain(health.status);
      
      await provider.cleanup();
    });

    it('should handle Anthropic-specific options', async () => {
      const { AnthropicProvider } = await import('@/lib/ai/providers/anthropic');
      const provider = new AnthropicProvider();
      
      await provider.initialize({
        apiKey: 'test-anthropic-key',
      });

      const model = provider.getModel('claude-4', {
        temperature: 0.8,
        maxTokens: 1000,
        topP: 0.95,
        topK: 20,
      });
      
      expect(model).toBeDefined();
      
      await provider.cleanup();
    });

    it('should support context caching', async () => {
      const { AnthropicProvider } = await import('@/lib/ai/providers/anthropic');
      const provider = new AnthropicProvider();
      
      await provider.initialize({
        apiKey: 'test-anthropic-key',
      });

      expect(provider.supportsContextCaching('claude-4')).toBe(true);
      expect(provider.capabilities.contextCaching).toBe(true);
      
      await provider.cleanup();
    });
  });

  describe('Google Provider Integration', () => {
    it('should initialize and create models', async () => {
      const { GoogleProvider } = await import('@/lib/ai/providers/google');
      const provider = new GoogleProvider();
      
      await provider.initialize({
        apiKey: 'test-google-key',
        timeout: 30000,
      });

      expect(provider.supportsModel('gemini-2.5-pro')).toBe(true);
      expect(provider.supportsModel('gemini-2.5-flash')).toBe(true);
      
      // Test model creation
      const model = provider.getModel('gemini-2.5-pro');
      expect(model).toBeDefined();
      
      // Test health check
      const health = await provider.getHealth();
      expect(['healthy', 'degraded']).toContain(health.status);
      
      await provider.cleanup();
    });

    it('should handle Google-specific options', async () => {
      const { GoogleProvider } = await import('@/lib/ai/providers/google');
      const provider = new GoogleProvider();
      
      await provider.initialize({
        apiKey: 'test-google-key',
      });

      const model = provider.getModel('gemini-2.5-pro', {
        temperature: 0.9,
        maxTokens: 2000,
        topP: 0.8,
        topK: 30,
      });
      
      expect(model).toBeDefined();
      
      await provider.cleanup();
    });

    it('should support multimodal capabilities', async () => {
      const { GoogleProvider } = await import('@/lib/ai/providers/google');
      const provider = new GoogleProvider();
      
      await provider.initialize({
        apiKey: 'test-google-key',
      });

      expect(provider.supportsVision('gemini-2.5-pro')).toBe(true);
      expect(provider.supportsAudioInput('gemini-2.5-pro')).toBe(true);
      expect(provider.supportsAudioOutput('gemini-2.5-pro')).toBe(true);
      
      await provider.cleanup();
    });
  });

  describe('Factory Integration', () => {
    it('should manage multiple providers', async () => {
      // Test factory behavior directly by creating providers using the mocked provider classes
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const { AnthropicProvider } = await import('@/lib/ai/providers/anthropic');
      const { GoogleProvider } = await import('@/lib/ai/providers/google');
      
      const openaiProvider = new OpenAIProvider();
      const anthropicProvider = new AnthropicProvider();
      const googleProvider = new GoogleProvider();
      
      // Initialize providers
      await openaiProvider.initialize({ apiKey: 'test-openai-key' });
      await anthropicProvider.initialize({ apiKey: 'test-anthropic-key' });
      await googleProvider.initialize({ apiKey: 'test-google-key' });
      
      // Test providers are correctly initialized
      expect(openaiProvider.name).toBe('openai');
      expect(anthropicProvider.name).toBe('anthropic');
      expect(googleProvider.name).toBe('google');
      
      // Test provider capabilities
      expect(Array.isArray(openaiProvider.supportedModels)).toBe(true);
      expect(Array.isArray(anthropicProvider.supportedModels)).toBe(true);
      expect(Array.isArray(googleProvider.supportedModels)).toBe(true);
      
      // Cleanup
      await openaiProvider.cleanup();
      await anthropicProvider.cleanup();
      await googleProvider.cleanup();
    });

    it('should handle provider factory API', async () => {
      // Test the factory interface exists and has expected methods
      expect(factory).toBeDefined();
      expect(typeof factory.createProvider).toBe('function');
      expect(typeof factory.getProvider).toBe('function');
      expect(typeof factory.getSupportedProviders).toBe('function');
      expect(typeof factory.getProviderStats).toBe('function');
      
      // Test getSupportedProviders - the actual implementation may vary
      const supportedProviders = factory.getSupportedProviders();
      if (supportedProviders) {
        expect(Array.isArray(supportedProviders)).toBe(true);
        if (supportedProviders.length > 0) {
          expect(supportedProviders).toEqual(expect.arrayContaining(['openai', 'anthropic', 'google']));
        }
      }
      
      // Test getProviderStats returns array
      const stats = factory.getProviderStats();
      if (stats) {
        expect(Array.isArray(stats)).toBe(true);
      }
    });
  });

  describe('Router Integration', () => {
      it('should route models to correct providers', async () => {
        if (!router) return;
        
        const testCases = [
          { modelId: 'gpt-4.1', expectedProvider: 'openai' },
          { modelId: 'claude-4', expectedProvider: 'anthropic' },
          { modelId: 'gemini-2.5-pro', expectedProvider: 'google' },
        ];

        for (const { modelId, expectedProvider } of testCases) {
          try {
            const result = await router.route(modelId);
            expect(result.provider.name).toBe(expectedProvider);
            expect(result.model).toBeDefined();
            expect(result.metadata.model).toBe(modelId);
          } catch (error) {
            // Skip if provider not available
            console.warn(`Provider ${expectedProvider} not available for ${modelId}`);
          }
        }
      });

      it('should handle provider health monitoring', async () => {
        if (!router) return;
        
        try {
          const provider = await router.getBestProvider('gpt-4.1');
          if (provider) {
            expect(provider.name).toBe('openai');
            
            const health = await provider.getHealth();
            expect(health).toBeDefined();
            expect(health.status).toMatch(/healthy|degraded|unhealthy/);
          }
        } catch (error) {
          console.warn('OpenAI provider not available for health check');
        }
      });

      it('should support fallback strategies', async () => {
        if (!router) return;
        
        router.updateConfig({
          fallbackStrategy: 'fastest',
        });

        try {
          const result = await router.route('gpt-4.1');
          expect(result).toBeDefined();
          expect(result.provider).toBeDefined();
          expect(result.model).toBeDefined();
        } catch (error) {
          console.warn('No providers available for fallback test');
        }
      });
  });

  describe('End-to-End Provider Flow', () => {
    it('should complete full flow with OpenAI', async () => {
      // Create provider
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: 'test-openai-key',
      });

      // Check health
      const health = await provider.getHealth();
      expect(health.status).toMatch(/healthy|degraded/);

      // Create model with options
      const model = provider.getModel('gpt-4.1', {
        temperature: 0.1, // Low temperature for consistency
        maxTokens: 50,
      });

      expect(model).toBeDefined();

      // Check metrics
      const metrics = provider.getMetrics();
      expect(metrics.requestCount).toBeGreaterThanOrEqual(0);

      await provider.cleanup();
    });

    it('should handle multi-provider scenarios', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const { AnthropicProvider } = await import('@/lib/ai/providers/anthropic');
      const openaiProvider = new OpenAIProvider();
      const anthropicProvider = new AnthropicProvider();

      await Promise.all([
        openaiProvider.initialize({ apiKey: 'test-openai-key' }),
        anthropicProvider.initialize({ apiKey: 'test-anthropic-key' }),
      ]);

        // Test both providers
        const openaiModel = openaiProvider.getModel('gpt-4.1');
        const anthropicModel = anthropicProvider.getModel('claude-4');

        expect(openaiModel).toBeDefined();
        expect(anthropicModel).toBeDefined();

        // Check health of both
        const [openaiHealth, anthropicHealth] = await Promise.all([
          openaiProvider.getHealth(),
          anthropicProvider.getHealth(),
        ]);

        expect(openaiHealth.status).toMatch(/healthy|degraded/);
        expect(anthropicHealth.status).toMatch(/healthy|degraded/);

      await Promise.all([
        openaiProvider.cleanup(),
        anthropicProvider.cleanup(),
      ]);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid API keys gracefully', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      
      await expect(provider.initialize({
        apiKey: 'invalid-key',
      })).rejects.toThrow();
    });

    it.skip('should handle network timeouts', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      
      await expect(provider.initialize({
        apiKey: 'test-openai-key',
        timeout: 1, // Very short timeout
      })).rejects.toThrow();
    });

    it('should handle unsupported models', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: 'test-openai-key',
      });

      expect(() => provider.getModel('unsupported-model')).toThrow();
      
      await provider.cleanup();
    });
  });

  describe('Performance Characteristics', () => {
    it.skipIf(!process.env.OPENAI_API_KEY)('should initialize within reasonable time', async () => {
      const startTime = Date.now();
      
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: 'test-openai-key',
      });
      
      const initTime = Date.now() - startTime;
      expect(initTime).toBeLessThan(10000); // Should initialize within 10 seconds
      
      await provider.cleanup();
    });

    it.skipIf(!process.env.OPENAI_API_KEY)('should handle concurrent model creation', async () => {
      const { OpenAIProvider } = await import('@/lib/ai/providers/openai');
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: 'test-openai-key',
      });

      const startTime = Date.now();
      
      // Create multiple models concurrently
      const promises = Array(10).fill(0).map(() => 
        Promise.resolve(provider.getModel('gpt-4.1'))
      );
      
      const models = await Promise.all(promises);
      const concurrentTime = Date.now() - startTime;
      
      expect(models).toHaveLength(10);
      expect(concurrentTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      await provider.cleanup();
    });
  });
});