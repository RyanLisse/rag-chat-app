/**
 * Integration tests for the provider system
 * Tests real provider functionality and integration points
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createModelRouter } from '@/lib/ai/providers/router';
import { getProviderFactory } from '@/lib/ai/providers/factory';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { GoogleProvider } from '@/lib/ai/providers/google';
import type { ModelRouter } from '@/lib/ai/providers/types';

// Skip tests if API keys are not available
const skipWithoutEnv = (envVar: string) => {
  return process.env[envVar] ? it : it.skip;
};

describe('Provider Integration Tests', () => {
  let router: ModelRouter;
  const factory = getProviderFactory();

  beforeAll(async () => {
    // Only initialize if we have at least one API key
    const hasApiKeys = process.env.OPENAI_API_KEY || 
                      process.env.ANTHROPIC_API_KEY || 
                      process.env.GOOGLE_API_KEY;
    
    if (hasApiKeys) {
      router = createModelRouter({
        fallbackStrategy: 'fastest',
        healthCheckInterval: 30000,
        loadBalancing: true,
      });
      
      await router.initialize();
    }
  });

  afterAll(async () => {
    if (factory) {
      await factory.clearAll();
    }
  });

  describe('OpenAI Provider Integration', () => {
    skipWithoutEnv('OPENAI_API_KEY')('should initialize and create models', async () => {
      const provider = new OpenAIProvider();
      
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
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

    skipWithoutEnv('OPENAI_API_KEY')('should handle generation options', async () => {
      const provider = new OpenAIProvider();
      
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      const model = provider.getModel('gpt-4.1', {
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
      });
      
      expect(model).toBeDefined();
      
      await provider.cleanup();
    });

    skipWithoutEnv('OPENAI_API_KEY')('should handle function calling', async () => {
      const provider = new OpenAIProvider();
      
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
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
    skipWithoutEnv('ANTHROPIC_API_KEY')('should initialize and create models', async () => {
      const provider = new AnthropicProvider();
      
      await provider.initialize({
        apiKey: process.env.ANTHROPIC_API_KEY!,
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

    skipWithoutEnv('ANTHROPIC_API_KEY')('should handle Anthropic-specific options', async () => {
      const provider = new AnthropicProvider();
      
      await provider.initialize({
        apiKey: process.env.ANTHROPIC_API_KEY!,
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

    skipWithoutEnv('ANTHROPIC_API_KEY')('should support context caching', async () => {
      const provider = new AnthropicProvider();
      
      await provider.initialize({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });

      expect(provider.supportsContextCaching('claude-4')).toBe(true);
      expect(provider.capabilities.contextCaching).toBe(true);
      
      await provider.cleanup();
    });
  });

  describe('Google Provider Integration', () => {
    skipWithoutEnv('GOOGLE_API_KEY')('should initialize and create models', async () => {
      const provider = new GoogleProvider();
      
      await provider.initialize({
        apiKey: process.env.GOOGLE_API_KEY!,
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

    skipWithoutEnv('GOOGLE_API_KEY')('should handle Google-specific options', async () => {
      const provider = new GoogleProvider();
      
      await provider.initialize({
        apiKey: process.env.GOOGLE_API_KEY!,
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

    skipWithoutEnv('GOOGLE_API_KEY')('should support multimodal capabilities', async () => {
      const provider = new GoogleProvider();
      
      await provider.initialize({
        apiKey: process.env.GOOGLE_API_KEY!,
      });

      expect(provider.supportsVision('gemini-2.5-pro')).toBe(true);
      expect(provider.supportsAudioInput('gemini-2.5-pro')).toBe(true);
      expect(provider.supportsAudioOutput('gemini-2.5-pro')).toBe(true);
      
      await provider.cleanup();
    });
  });

  describe('Factory Integration', () => {
    it('should manage multiple providers', async () => {
      const configs = {
        openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : null,
        anthropic: process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : null,
        google: process.env.GOOGLE_API_KEY ? { apiKey: process.env.GOOGLE_API_KEY } : null,
      };

      const providers = [];
      
      // Create providers for available API keys
      for (const [name, config] of Object.entries(configs)) {
        if (config) {
          try {
            const provider = await factory.createProvider(name, config);
            providers.push(provider);
            expect(provider.name).toBe(name);
          } catch (error) {
            console.warn(`Failed to create ${name} provider:`, error);
          }
        }
      }

      expect(providers.length).toBeGreaterThan(0);
      
      // Test factory statistics
      const stats = factory.getProviderStats();
      expect(stats.length).toBeGreaterThan(0);
      
      // Cleanup
      for (const provider of providers) {
        await provider.cleanup();
      }
    });

    it('should cache providers correctly', async () => {
      if (!process.env.OPENAI_API_KEY) return;
      
      const config = { apiKey: process.env.OPENAI_API_KEY };
      
      const provider1 = await factory.getProvider('openai', config);
      const provider2 = await factory.getProvider('openai', config);
      
      expect(provider1).toBe(provider2); // Should be same instance
      
      await provider1.cleanup();
    });
  });

  describe('Router Integration', () => {
    const hasAnyApiKey = process.env.OPENAI_API_KEY || 
                         process.env.ANTHROPIC_API_KEY || 
                         process.env.GOOGLE_API_KEY;

    if (hasAnyApiKey) {
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
    }
  });

  describe('End-to-End Provider Flow', () => {
    skipWithoutEnv('OPENAI_API_KEY')('should complete full flow with OpenAI', async () => {
      // Create provider
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
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

    if (process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY) {
      it('should handle multi-provider scenarios', async () => {
        const openaiProvider = new OpenAIProvider();
        const anthropicProvider = new AnthropicProvider();

        await Promise.all([
          openaiProvider.initialize({ apiKey: process.env.OPENAI_API_KEY! }),
          anthropicProvider.initialize({ apiKey: process.env.ANTHROPIC_API_KEY! }),
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
    }
  });

  describe('Error Scenarios', () => {
    it('should handle invalid API keys gracefully', async () => {
      const provider = new OpenAIProvider();
      
      await expect(provider.initialize({
        apiKey: 'invalid-key',
      })).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      if (!process.env.OPENAI_API_KEY) return;
      
      const provider = new OpenAIProvider();
      
      await expect(provider.initialize({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 1, // Very short timeout
      })).rejects.toThrow();
    });

    it('should handle unsupported models', async () => {
      if (!process.env.OPENAI_API_KEY) return;
      
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY,
      });

      expect(() => provider.getModel('unsupported-model')).toThrow();
      
      await provider.cleanup();
    });
  });

  describe('Performance Characteristics', () => {
    skipWithoutEnv('OPENAI_API_KEY')('should initialize within reasonable time', async () => {
      const startTime = Date.now();
      
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
      });
      
      const initTime = Date.now() - startTime;
      expect(initTime).toBeLessThan(10000); // Should initialize within 10 seconds
      
      await provider.cleanup();
    });

    skipWithoutEnv('OPENAI_API_KEY')('should handle concurrent model creation', async () => {
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
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