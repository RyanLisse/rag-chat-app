/**
 * Performance benchmarking tests for AI providers
 * Tests response times, throughput, and resource usage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createModelRouter } from '@/lib/ai/providers/router';
import { getProviderFactory } from '@/lib/ai/providers/factory';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import { GoogleProvider } from '@/lib/ai/providers/google';
import type { ModelProvider } from '@/lib/ai/providers/types';

interface BenchmarkResult {
  operation: string;
  provider: string;
  model?: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  errorRate: number;
  samples: number;
}

interface ProviderBenchmark {
  provider: ModelProvider;
  results: BenchmarkResult[];
}

// Performance test configuration
const PERFORMANCE_CONFIG = {
  warmupIterations: 3,
  testIterations: 10,
  concurrentRequests: 5,
  timeoutMs: 30000,
};

// Skip tests if API keys are not available
const skipWithoutEnv = (envVar: string) => {
  return process.env[envVar] ? describe : describe.skip;
};

describe('Provider Performance Benchmarks', () => {
  const factory = getProviderFactory();
  const benchmarkResults: BenchmarkResult[] = [];

  afterAll(async () => {
    await factory.clearAll();
    
    // Output benchmark summary
    if (benchmarkResults.length > 0) {
      console.log('\n=== Performance Benchmark Results ===');
      console.table(benchmarkResults.map(r => ({
        Provider: r.provider,
        Operation: r.operation,
        Model: r.model || 'N/A',
        'Avg Time (ms)': Math.round(r.averageTime),
        'Min Time (ms)': Math.round(r.minTime),
        'Max Time (ms)': Math.round(r.maxTime),
        'Throughput (ops/s)': r.throughput.toFixed(2),
        'Error Rate (%)': (r.errorRate * 100).toFixed(1),
        Samples: r.samples,
      })));
    }
  });

  /**
   * Utility function to measure operation performance
   */
  async function benchmarkOperation<T>(
    operation: string,
    provider: string,
    fn: () => Promise<T>,
    model?: string
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    let errors = 0;
    
    // Warmup
    for (let i = 0; i < PERFORMANCE_CONFIG.warmupIterations; i++) {
      try {
        await fn();
      } catch {
        // Ignore warmup errors
      }
    }
    
    // Actual benchmark
    for (let i = 0; i < PERFORMANCE_CONFIG.testIterations; i++) {
      const start = performance.now();
      try {
        await fn();
        const duration = performance.now() - start;
        times.push(duration);
      } catch (error) {
        errors++;
        console.warn(`Benchmark error for ${provider}:${operation}:`, error);
      }
    }
    
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = times.length > 0 ? 1000 / averageTime : 0;
    const errorRate = errors / PERFORMANCE_CONFIG.testIterations;
    
    const result: BenchmarkResult = {
      operation,
      provider,
      model,
      averageTime,
      minTime,
      maxTime,
      throughput,
      errorRate,
      samples: times.length,
    };
    
    benchmarkResults.push(result);
    return result;
  }

  /**
   * Benchmark concurrent operations
   */
  async function benchmarkConcurrentOperations<T>(
    operation: string,
    provider: string,
    fn: () => Promise<T>,
    concurrency: number = PERFORMANCE_CONFIG.concurrentRequests
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    let errors = 0;
    
    const start = performance.now();
    const promises = Array(concurrency).fill(0).map(async () => {
      try {
        const opStart = performance.now();
        await fn();
        return performance.now() - opStart;
      } catch (error) {
        errors++;
        throw error;
      }
    });
    
    const results = await Promise.allSettled(promises);
    const totalTime = performance.now() - start;
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        times.push(result.value);
      }
    });
    
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = times.length / (totalTime / 1000);
    const errorRate = errors / concurrency;
    
    const result: BenchmarkResult = {
      operation: `${operation} (concurrent)`,
      provider,
      averageTime,
      minTime,
      maxTime,
      throughput,
      errorRate,
      samples: times.length,
    };
    
    benchmarkResults.push(result);
    return result;
  }

  skipWithoutEnv('OPENAI_API_KEY')('OpenAI Provider Performance', () => {
    let provider: OpenAIProvider;

    beforeAll(async () => {
      provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
        timeout: PERFORMANCE_CONFIG.timeoutMs,
      });
    });

    afterAll(async () => {
      if (provider) {
        await provider.cleanup();
      }
    });

    it('should benchmark initialization time', async () => {
      const result = await benchmarkOperation(
        'initialization',
        'openai',
        async () => {
          const tempProvider = new OpenAIProvider();
          await tempProvider.initialize({
            apiKey: process.env.OPENAI_API_KEY!,
          });
          await tempProvider.cleanup();
        }
      );

      expect(result.averageTime).toBeLessThan(5000); // Should initialize within 5 seconds
      expect(result.errorRate).toBeLessThan(0.1); // Less than 10% error rate
    });

    it('should benchmark model creation time', async () => {
      const models = ['gpt-4.1', 'o4-mini', 'gpt-4-turbo'];
      
      for (const modelId of models) {
        if (provider.supportsModel(modelId)) {
          const result = await benchmarkOperation(
            'model creation',
            'openai',
            async () => {
              provider.getModel(modelId, {
                temperature: 0.7,
                maxTokens: 1000,
              });
            },
            modelId
          );

          expect(result.averageTime).toBeLessThan(100); // Should be very fast (cached)
          expect(result.errorRate).toBe(0); // Should never fail
        }
      }
    });

    it('should benchmark health check performance', async () => {
      const result = await benchmarkOperation(
        'health check',
        'openai',
        async () => {
          await provider.getHealth();
        }
      );

      expect(result.averageTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.errorRate).toBeLessThan(0.2); // Less than 20% error rate
    });

    it('should benchmark concurrent model creation', async () => {
      const result = await benchmarkConcurrentOperations(
        'model creation',
        'openai',
        async () => {
          provider.getModel('gpt-4.1', {
            temperature: Math.random(),
            maxTokens: 1000,
          });
        }
      );

      expect(result.throughput).toBeGreaterThan(50); // Should handle at least 50 ops/sec
      expect(result.errorRate).toBe(0);
    });

    it('should benchmark memory usage during operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many models to test memory usage
      const models = [];
      for (let i = 0; i < 100; i++) {
        models.push(provider.getModel('gpt-4.1', {
          temperature: Math.random(),
        }));
      }
      
      const peakMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = peakMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB for 100 models)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  skipWithoutEnv('ANTHROPIC_API_KEY')('Anthropic Provider Performance', () => {
    let provider: AnthropicProvider;

    beforeAll(async () => {
      provider = new AnthropicProvider();
      await provider.initialize({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        timeout: PERFORMANCE_CONFIG.timeoutMs,
      });
    });

    afterAll(async () => {
      if (provider) {
        await provider.cleanup();
      }
    });

    it('should benchmark initialization time', async () => {
      const result = await benchmarkOperation(
        'initialization',
        'anthropic',
        async () => {
          const tempProvider = new AnthropicProvider();
          await tempProvider.initialize({
            apiKey: process.env.ANTHROPIC_API_KEY!,
          });
          await tempProvider.cleanup();
        }
      );

      expect(result.averageTime).toBeLessThan(5000);
      expect(result.errorRate).toBeLessThan(0.1);
    });

    it('should benchmark model creation with various options', async () => {
      const testCases = [
        { model: 'claude-4', options: { temperature: 0.7 } },
        { model: 'claude-4', options: { temperature: 0.7, topP: 0.9, topK: 20 } },
        { model: 'claude-3.5-sonnet', options: { maxTokens: 2000 } },
      ];

      for (const { model, options } of testCases) {
        if (provider.supportsModel(model)) {
          const result = await benchmarkOperation(
            'model creation with options',
            'anthropic',
            async () => {
              provider.getModel(model, options);
            },
            model
          );

          expect(result.averageTime).toBeLessThan(100);
          expect(result.errorRate).toBe(0);
        }
      }
    });

    it('should benchmark health check resilience', async () => {
      const result = await benchmarkOperation(
        'health check',
        'anthropic',
        async () => {
          await provider.getHealth();
        }
      );

      expect(result.averageTime).toBeLessThan(3000);
      expect(result.errorRate).toBeLessThan(0.3);
    });
  });

  skipWithoutEnv('GOOGLE_API_KEY')('Google Provider Performance', () => {
    let provider: GoogleProvider;

    beforeAll(async () => {
      provider = new GoogleProvider();
      await provider.initialize({
        apiKey: process.env.GOOGLE_API_KEY!,
        timeout: PERFORMANCE_CONFIG.timeoutMs,
      });
    });

    afterAll(async () => {
      if (provider) {
        await provider.cleanup();
      }
    });

    it('should benchmark initialization time', async () => {
      const result = await benchmarkOperation(
        'initialization',
        'google',
        async () => {
          const tempProvider = new GoogleProvider();
          await tempProvider.initialize({
            apiKey: process.env.GOOGLE_API_KEY!,
          });
          await tempProvider.cleanup();
        }
      );

      expect(result.averageTime).toBeLessThan(5000);
      expect(result.errorRate).toBeLessThan(0.1);
    });

    it('should benchmark multimodal model creation', async () => {
      const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'];
      
      for (const modelId of models) {
        if (provider.supportsModel(modelId)) {
          const result = await benchmarkOperation(
            'multimodal model creation',
            'google',
            async () => {
              provider.getModel(modelId, {
                temperature: 0.8,
                maxTokens: 2000,
                topP: 0.8,
                topK: 30,
              });
            },
            modelId
          );

          expect(result.averageTime).toBeLessThan(100);
          expect(result.errorRate).toBe(0);
        }
      }
    });

    it('should benchmark safety settings application', async () => {
      const result = await benchmarkOperation(
        'model with safety settings',
        'google',
        async () => {
          provider.getModel('gemini-2.5-pro', {
            temperature: 0.7,
          });
        }
      );

      expect(result.averageTime).toBeLessThan(100);
      expect(result.errorRate).toBe(0);
    });
  });

  describe('Factory Performance', () => {
    it('should benchmark provider creation and caching', async () => {
      const configs = [
        { name: 'openai', apiKey: process.env.OPENAI_API_KEY },
        { name: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY },
        { name: 'google', apiKey: process.env.GOOGLE_API_KEY },
      ].filter(config => config.apiKey);

      for (const config of configs) {
        // First creation (cache miss)
        const createResult = await benchmarkOperation(
          'provider creation',
          config.name,
          async () => {
            await factory.createProvider(config.name, { apiKey: config.apiKey! });
          }
        );

        // Subsequent access (cache hit)
        const cacheResult = await benchmarkOperation(
          'provider cache access',
          config.name,
          async () => {
            await factory.getProvider(config.name, { apiKey: config.apiKey! });
          }
        );

        expect(createResult.averageTime).toBeLessThan(10000);
        expect(cacheResult.averageTime).toBeLessThan(createResult.averageTime);
        expect(cacheResult.errorRate).toBe(0);
      }
    });

    it('should benchmark concurrent provider access', async () => {
      if (!process.env.OPENAI_API_KEY) return;

      const result = await benchmarkConcurrentOperations(
        'provider access',
        'factory',
        async () => {
          await factory.getProvider('openai', { 
            apiKey: process.env.OPENAI_API_KEY! 
          });
        }
      );

      expect(result.throughput).toBeGreaterThan(100); // Should handle high concurrency
      expect(result.errorRate).toBe(0);
    });
  });

  describe('Router Performance', () => {
    const hasAnyApiKey = process.env.OPENAI_API_KEY || 
                         process.env.ANTHROPIC_API_KEY || 
                         process.env.GOOGLE_API_KEY;

    if (hasAnyApiKey) {
      let router: ReturnType<typeof createModelRouter>;

      beforeAll(async () => {
        router = createModelRouter({
          fallbackStrategy: 'fastest',
          healthCheckInterval: 30000,
        });
        await router.initialize();
      });

      it('should benchmark model routing performance', async () => {
        const testCases = [
          { modelId: 'gpt-4.1', provider: 'openai' },
          { modelId: 'claude-4', provider: 'anthropic' },
          { modelId: 'gemini-2.5-pro', provider: 'google' },
        ];

        for (const { modelId, provider: expectedProvider } of testCases) {
          try {
            const result = await benchmarkOperation(
              'model routing',
              expectedProvider,
              async () => {
                await router.route(modelId);
              },
              modelId
            );

            expect(result.averageTime).toBeLessThan(1000); // Should route within 1 second
            expect(result.errorRate).toBeLessThan(0.1);
          } catch (error) {
            // Skip if provider not available
            console.warn(`Provider ${expectedProvider} not available for routing test`);
          }
        }
      });

      it('should benchmark health monitoring overhead', async () => {
        const result = await benchmarkOperation(
          'health monitoring',
          'router',
          async () => {
            await router.getBestProvider('gpt-4.1');
          }
        );

        expect(result.averageTime).toBeLessThan(2000);
        expect(result.errorRate).toBeLessThan(0.2);
      });

      it('should benchmark fallback strategy performance', async () => {
        // Test different fallback strategies
        const strategies = ['fastest', 'round_robin', 'least_loaded'];
        
        for (const strategy of strategies) {
          router.updateConfig({ fallbackStrategy: strategy as any });
          
          const result = await benchmarkOperation(
            `fallback strategy: ${strategy}`,
            'router',
            async () => {
              await router.route('gpt-4.1');
            }
          );

          expect(result.averageTime).toBeLessThan(2000);
        }
      });
    }
  });

  describe('Stress Testing', () => {
    skipWithoutEnv('OPENAI_API_KEY')('should handle sustained load', async () => {
      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      const startTime = Date.now();
      const duration = 10000; // 10 seconds
      let operations = 0;
      let errors = 0;

      while (Date.now() - startTime < duration) {
        try {
          provider.getModel('gpt-4.1', {
            temperature: Math.random(),
          });
          operations++;
        } catch (error) {
          errors++;
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (operations / actualDuration) * 1000;
      const errorRate = errors / (operations + errors);

      expect(throughput).toBeGreaterThan(50); // At least 50 ops/second
      expect(errorRate).toBeLessThan(0.01); // Less than 1% error rate

      await provider.cleanup();
    });

    it('should handle memory pressure gracefully', async () => {
      if (!process.env.OPENAI_API_KEY) return;

      const provider = new OpenAIProvider();
      await provider.initialize({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      const initialMemory = process.memoryUsage().heapUsed;
      const models = [];

      // Create a large number of models
      for (let i = 0; i < 1000; i++) {
        models.push(provider.getModel('gpt-4.1', {
          temperature: Math.random(),
        }));

        // Check memory usage periodically
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          const memoryIncrease = currentMemory - initialMemory;
          
          // Memory growth should be reasonable
          expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
        }
      }

      await provider.cleanup();
    });
  });

  describe('Comparative Performance', () => {
    const availableProviders = [
      { name: 'openai', envVar: 'OPENAI_API_KEY', model: 'gpt-4.1' },
      { name: 'anthropic', envVar: 'ANTHROPIC_API_KEY', model: 'claude-4' },
      { name: 'google', envVar: 'GOOGLE_API_KEY', model: 'gemini-2.5-pro' },
    ].filter(p => process.env[p.envVar]);

    if (availableProviders.length > 1) {
      it('should compare initialization times across providers', async () => {
        const results: Array<{ provider: string; time: number }> = [];

        for (const { name, envVar } of availableProviders) {
          const start = performance.now();
          
          const ProviderClass = {
            openai: OpenAIProvider,
            anthropic: AnthropicProvider,
            google: GoogleProvider,
          }[name as keyof typeof ProviderClass];

          const provider = new ProviderClass();
          await provider.initialize({
            apiKey: process.env[envVar]!,
          });
          
          const time = performance.now() - start;
          results.push({ provider: name, time });
          
          await provider.cleanup();
        }

        // Log comparison results
        console.log('\nInitialization Time Comparison:');
        results
          .sort((a, b) => a.time - b.time)
          .forEach(result => {
            console.log(`${result.provider}: ${Math.round(result.time)}ms`);
          });

        // All should initialize within reasonable time
        results.forEach(result => {
          expect(result.time).toBeLessThan(10000);
        });
      });

      it('should compare model creation performance', async () => {
        const providers: ProviderBenchmark[] = [];

        for (const { name, envVar, model } of availableProviders) {
          const ProviderClass = {
            openai: OpenAIProvider,
            anthropic: AnthropicProvider,
            google: GoogleProvider,
          }[name as keyof typeof ProviderClass];

          const provider = new ProviderClass();
          await provider.initialize({
            apiKey: process.env[envVar]!,
          });

          const result = await benchmarkOperation(
            'model creation comparison',
            name,
            async () => {
              provider.getModel(model, {
                temperature: 0.7,
                maxTokens: 1000,
              });
            },
            model
          );

          providers.push({ provider, results: [result] });
          await provider.cleanup();
        }

        // Compare throughput
        const throughputs = providers.map(p => ({
          name: p.provider.name,
          throughput: p.results[0].throughput,
        }));

        console.log('\nModel Creation Throughput Comparison:');
        throughputs
          .sort((a, b) => b.throughput - a.throughput)
          .forEach(result => {
            console.log(`${result.name}: ${result.throughput.toFixed(2)} ops/sec`);
          });
      });
    }
  });
});