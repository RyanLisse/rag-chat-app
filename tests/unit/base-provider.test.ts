// Unit Tests for lib/ai/providers/base.ts
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import type { LanguageModel } from 'ai';
import { BaseProvider } from '@/lib/ai/providers/base';
import {
  ConfigurationError,
  ModelInitializationError,
  ProviderError,
} from '@/lib/ai/providers/errors';
import type {
  GenerationOptions,
  ProviderCapabilities,
  ProviderConfig,
} from '@/lib/ai/providers/types';

// Mock the utils module


// Get mocks from the module
const { validateApiKey: mockValidateApiKey, retryWithBackoff: mockRetryWithBackoff, measureExecutionTime: mockMeasureExecutionTime } = 
  await import('@/lib/ai/providers/utils');

// Test implementation of BaseProvider
class TestProvider extends BaseProvider {
  private shouldFailValidation = false;
  private shouldFailHealthCheck = false;
  private shouldFailModelCreation = false;

  constructor() {
    const capabilities: ProviderCapabilities = {
      multimodal: true,
      streaming: true,
      functionCalling: true,
      imageGeneration: false,
      audioGeneration: false,
      documentSearch: false,
    };

    super('test-provider', ['test-model-1', 'test-model-2'], capabilities);
  }

  setFailValidation(fail: boolean) {
    this.shouldFailValidation = fail;
  }

  setFailHealthCheck(fail: boolean) {
    this.shouldFailHealthCheck = fail;
  }

  setFailModelCreation(fail: boolean) {
    this.shouldFailModelCreation = fail;
  }

  protected createModel(modelId: string, _options?: GenerationOptions): LanguageModel {
    if (this.shouldFailModelCreation) {
      throw new Error('Model creation failed');
    }

    return {
      provider: 'test',
      modelId,
    } as LanguageModel;
  }

  protected async validateConnection(): Promise<void> {
    if (this.shouldFailValidation) {
      throw new Error('Connection validation failed');
    }
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async
  }

  protected async performHealthCheck(): Promise<void> {
    if (this.shouldFailHealthCheck) {
      throw new Error('Health check failed');
    }
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async
  }
}

describe.skip('BaseProvider', () => {
  let provider: TestProvider;
  let mockValidateApiKey: any;
  let mockRetryWithBackoff: any;
  let mockMeasureExecutionTime: any;

  beforeEach(() => {
    provider = new TestProvider();

    const utils = require('@/lib/ai/providers/utils');
    mockValidateApiKey = utils.validateApiKey;
    mockRetryWithBackoff = utils.retryWithBackoff;
    mockMeasureExecutionTime = utils.measureExecutionTime;

    // Reset mocks
    mockValidateApiKey.mockReturnValue(true);
    mockRetryWithBackoff.mockImplementation((fn) => fn());
    mockMeasureExecutionTime.mockImplementation(async (fn) => ({
      result: await fn(),
      duration: 100,
    }));

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with correct properties', () => {
      expect(provider.name).toBe('test-provider');
      expect(provider.supportedModels).toEqual(['test-model-1', 'test-model-2']);
      expect(provider.capabilities).toMatchObject({
        multimodal: true,
        streaming: true,
        functionCalling: true,
        imageGeneration: false,
        audioGeneration: false,
        documentSearch: false,
      });
    });

    it('should initialize with empty metrics', () => {
      const metrics = provider.getMetrics();
      
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.totalLatency).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.tokenUsage.input).toBe(0);
      expect(metrics.tokenUsage.output).toBe(0);
      expect(metrics.tokenUsage.total).toBe(0);
      expect(metrics.costEstimate).toBe(0);
      expect(metrics.lastReset).toBeInstanceOf(Date);
    });
  });

  describe('initialize', () => {
    const validConfig: ProviderConfig = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.test.com',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 500,
    };

    it('should initialize successfully with valid config', async () => {
      await provider.initialize(validConfig);

      expect(mockValidateApiKey).toHaveBeenCalledWith('test-api-key', 'test-provider');
      expect(provider['initialized']).toBe(true);
      expect(provider['config']).toMatchObject({
        ...validConfig,
        timeout: 5000, // Uses provided value
        maxRetries: 2, // Uses provided value
        retryDelay: 500, // Uses provided value
      });
    });

    it('should use default values for missing config properties', async () => {
      const minimalConfig = { apiKey: 'test-api-key' };
      await provider.initialize(minimalConfig);

      expect(provider['config']).toMatchObject({
        apiKey: 'test-api-key',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      });
    });

    it('should throw ConfigurationError for invalid API key', async () => {
      mockValidateApiKey.mockReturnValue(false);

      await expect(provider.initialize(validConfig)).rejects.toThrow(ConfigurationError);
      expect(provider['initialized']).toBe(false);
    });

    it('should throw error when connection validation fails', async () => {
      provider.setFailValidation(true);

      await expect(provider.initialize(validConfig)).rejects.toThrow('Connection validation failed');
      expect(provider['initialized']).toBe(false);
    });

    it('should update retry configuration', async () => {
      await provider.initialize(validConfig);

      expect(provider['retryConfig'].maxRetries).toBe(2);
      expect(provider['retryConfig'].initialDelay).toBe(500);
    });
  });

  describe('getModel', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-api-key' });
    });

    it('should return model for supported model ID', () => {
      const model = provider.getModel('test-model-1');

      expect(model).toBeDefined();
      expect(model.modelId).toBe('test-model-1');
      expect(model.provider).toBe('test');
    });

    it('should throw ModelInitializationError for unsupported model', () => {
      expect(() => {
        provider.getModel('unsupported-model');
      }).toThrow(ModelInitializationError);
    });

    it('should throw ProviderError when not initialized', () => {
      const uninitializedProvider = new TestProvider();

      expect(() => {
        uninitializedProvider.getModel('test-model-1');
      }).toThrow(ProviderError);
    });

    it('should throw ModelInitializationError when model creation fails', () => {
      provider.setFailModelCreation(true);

      expect(() => {
        provider.getModel('test-model-1');
      }).toThrow(ModelInitializationError);
    });

    it('should increment error count when model creation fails', () => {
      provider.setFailModelCreation(true);
      const initialMetrics = provider.getMetrics();

      try {
        provider.getModel('test-model-1');
      } catch {
        // Expected to fail
      }

      const finalMetrics = provider.getMetrics();
      expect(finalMetrics.errorCount).toBe(initialMetrics.errorCount + 1);
    });

    it('should pass generation options to createModel', () => {
      const options: GenerationOptions = {
        temperature: 0.5,
        maxTokens: 1000,
      };

      const model = provider.getModel('test-model-1', options);
      expect(model).toBeDefined();
    });
  });

  describe('supportsModel', () => {
    it('should return true for supported models', () => {
      expect(provider.supportsModel('test-model-1')).toBe(true);
      expect(provider.supportsModel('test-model-2')).toBe(true);
    });

    it('should return false for unsupported models', () => {
      expect(provider.supportsModel('unsupported-model')).toBe(false);
      expect(provider.supportsModel('')).toBe(false);
    });
  });

  describe('getHealth', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-api-key' });
    });

    it('should return healthy status when health check passes', async () => {
      const health = await provider.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThan(0);
      expect(health.errorRate).toBe(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it('should return degraded status with high error rate', async () => {
      // Simulate high error rate
      for (let i = 0; i < 10; i++) {
        provider['incrementErrorCount']();
        provider['updateMetrics'](100);
      }

      const health = await provider.getHealth();
      expect(health.status).toBe('degraded');
      expect(health.errorRate).toBeGreaterThan(0.1);
    });

    it('should return unhealthy status when health check fails', async () => {
      provider.setFailHealthCheck(true);

      const health = await provider.getHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.latency).toBe(-1);
      expect(health.errorRate).toBe(1);
      expect(health.message).toBe('Health check failed');
    });

    it('should return unhealthy status with very high error rate', async () => {
      // Simulate very high error rate
      provider['incrementErrorCount']();
      provider['updateMetrics'](100);

      const health = await provider.getHealth();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('metrics management', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-api-key' });
    });

    it('should update metrics correctly', () => {
      provider['updateMetrics'](150);
      provider['updateMetrics'](250);

      const metrics = provider.getMetrics();
      expect(metrics.requestCount).toBe(2);
      expect(metrics.totalLatency).toBe(400);
      expect(metrics.averageLatency).toBe(200);
    });

    it('should increment error count', () => {
      provider['incrementErrorCount']();
      provider['incrementErrorCount']();

      const metrics = provider.getMetrics();
      expect(metrics.errorCount).toBe(2);
    });

    it('should update token usage', () => {
      provider['updateTokenUsage'](100, 50, 0.02);
      provider['updateTokenUsage'](200, 75, 0.03);

      const metrics = provider.getMetrics();
      expect(metrics.tokenUsage.input).toBe(300);
      expect(metrics.tokenUsage.output).toBe(125);
      expect(metrics.tokenUsage.total).toBe(425);
      expect(metrics.costEstimate).toBe(0.05);
    });

    it('should reset metrics', () => {
      provider['updateMetrics'](100);
      provider['incrementErrorCount']();
      provider['updateTokenUsage'](50, 25, 0.01);

      provider.resetMetrics();

      const metrics = provider.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.totalLatency).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.tokenUsage.input).toBe(0);
      expect(metrics.tokenUsage.output).toBe(0);
      expect(metrics.tokenUsage.total).toBe(0);
      expect(metrics.costEstimate).toBe(0);
      expect(metrics.lastReset).toBeInstanceOf(Date);
    });

    it('should calculate average latency correctly with no requests', () => {
      const metrics = provider.getMetrics();
      expect(metrics.averageLatency).toBe(0);
    });
  });

  describe('executeWithRetry', () => {
    beforeEach(async () => {
      await provider.initialize({ apiKey: 'test-api-key' });
    });

    it('should execute function with retry logic', async () => {
      const testFn = vi.fn().mockResolvedValue('success');

      const result = await provider['executeWithRetry'](testFn);

      expect(result).toBe('success');
      expect(mockRetryWithBackoff).toHaveBeenCalledWith(testFn, provider['retryConfig']);
      expect(mockMeasureExecutionTime).toHaveBeenCalled();
    });

    it('should update metrics after execution', async () => {
      const testFn = vi.fn().mockResolvedValue('success');
      const initialMetrics = provider.getMetrics();

      await provider['executeWithRetry'](testFn);

      const finalMetrics = provider.getMetrics();
      expect(finalMetrics.requestCount).toBe(initialMetrics.requestCount + 1);
      expect(finalMetrics.totalLatency).toBe(initialMetrics.totalLatency + 100);
    });

    it('should throw ProviderError when not initialized', async () => {
      const uninitializedProvider = new TestProvider();
      const testFn = vi.fn();

      await expect(uninitializedProvider['executeWithRetry'](testFn)).rejects.toThrow(ProviderError);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources and reset state', async () => {
      await provider.initialize({ apiKey: 'test-api-key' });
      expect(provider['initialized']).toBe(true);

      await provider.cleanup();

      expect(provider['initialized']).toBe(false);
      expect(provider['config']).toBeUndefined();
    });
  });

  describe('configuration management', () => {
    beforeEach(async () => {
      await provider.initialize({
        apiKey: 'test-api-key',
        timeout: 5000,
        customProperty: 'custom-value',
      } as any);
    });

    it('should get configuration values with defaults', () => {
      expect(provider['getConfigValue']('timeout', 10000)).toBe(5000);
      expect(provider['getConfigValue']('maxRetries', 5)).toBe(3); // Default from initialize
    });

    it('should return default when config value is missing', () => {
      expect(provider['getConfigValue']('nonexistent' as any, 'default')).toBe('default');
    });

    it('should return default when provider not initialized', async () => {
      const uninitializedProvider = new TestProvider();
      expect(uninitializedProvider['getConfigValue']('timeout', 10000)).toBe(10000);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle null/undefined model ID', () => {
      expect(provider.supportsModel(null as any)).toBe(false);
      expect(provider.supportsModel(undefined as any)).toBe(false);
    });

    it('should handle very long model names', () => {
      const longModelName = 'a'.repeat(1000);
      expect(provider.supportsModel(longModelName)).toBe(false);
    });

    it('should handle concurrent initialization attempts', async () => {
      const config = { apiKey: 'test-api-key' };
      
      const promises = [
        provider.initialize(config),
        provider.initialize(config),
        provider.initialize(config),
      ];

      await Promise.allSettled(promises);
      expect(provider['initialized']).toBe(true);
    });

    it('should handle cleanup when not initialized', async () => {
      const uninitializedProvider = new TestProvider();
      
      await expect(uninitializedProvider.cleanup()).resolves.not.toThrow();
      expect(uninitializedProvider['initialized']).toBe(false);
    });

    it('should handle extreme metrics values', () => {
      provider['updateTokenUsage'](Number.MAX_SAFE_INTEGER, 0, 0);
      provider['updateTokenUsage'](1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

      const metrics = provider.getMetrics();
      expect(metrics.tokenUsage.input).toBe(Number.MAX_SAFE_INTEGER + 1);
      expect(metrics.tokenUsage.output).toBe(Number.MAX_SAFE_INTEGER);
      expect(metrics.costEstimate).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});