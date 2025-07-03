import { vi } from 'vitest';

/**
 * Isolated mocks for provider integration tests
 * These are separate from global mocks to avoid conflicts
 */

// Provider-specific mock implementations for integration tests
export const createProviderIntegrationMocks = () => {
  
  // OpenAI Provider Mock
  class MockOpenAIProvider {
    name = 'openai';
    supportedModels = ['gpt-4.1', 'o4-mini', 'gpt-4', 'gpt-4-turbo'];
    capabilities = {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: false,
      audioOutput: false,
      batchRequests: true,
      contextCaching: false,
    };
    
    initialize = vi.fn().mockImplementation(async (config) => {
      if (config.apiKey === 'invalid-key') {
        throw new Error('Invalid API key');
      }
      return undefined;
    });
    
    validateConnection = vi.fn().mockResolvedValue(undefined);
    
    getModel = vi.fn().mockImplementation((modelId) => {
      if (modelId === 'unsupported-model') {
        throw new Error('Unsupported model');
      }
      return { provider: 'openai', modelId: 'gpt-4.1' };
    });
    
    supportsModel = vi.fn().mockReturnValue(true);
    supportsVision = vi.fn().mockReturnValue(true);
    supportsContextCaching = vi.fn().mockReturnValue(false);
    
    getHealth = vi.fn().mockResolvedValue({ 
      status: 'healthy', 
      latency: 100, 
      errorRate: 0, 
      lastChecked: new Date() 
    });
    
    getMetrics = vi.fn().mockReturnValue({
      requestCount: 0,
      errorCount: 0,
      totalLatency: 0,
      averageLatency: 0,
      tokenUsage: { input: 0, output: 0, total: 0 },
      costEstimate: 0,
      lastReset: new Date(),
    });
    
    resetMetrics = vi.fn();
    cleanup = vi.fn().mockResolvedValue(undefined);
  }

  // Anthropic Provider Mock
  class MockAnthropicProvider {
    name = 'anthropic';
    supportedModels = ['claude-4', 'claude-3.5-sonnet', 'claude-3-opus'];
    capabilities = {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: false,
      audioOutput: false,
      batchRequests: false,
      contextCaching: true,
    };
    
    initialize = vi.fn().mockImplementation(async (config) => {
      if (config.apiKey === 'invalid-key') {
        throw new Error('Invalid API key');
      }
      return undefined;
    });
    
    validateConnection = vi.fn().mockResolvedValue(undefined);
    
    getModel = vi.fn().mockImplementation((modelId) => {
      if (modelId === 'unsupported-model') {
        throw new Error('Unsupported model');
      }
      return { provider: 'anthropic', modelId: 'claude-4' };
    });
    
    supportsModel = vi.fn().mockReturnValue(true);
    supportsVision = vi.fn().mockReturnValue(true);
    supportsContextCaching = vi.fn().mockReturnValue(true);
    
    getHealth = vi.fn().mockResolvedValue({ 
      status: 'healthy', 
      latency: 150, 
      errorRate: 0, 
      lastChecked: new Date() 
    });
    
    getMetrics = vi.fn().mockReturnValue({
      requestCount: 0,
      errorCount: 0,
      totalLatency: 0,
      averageLatency: 0,
      tokenUsage: { input: 0, output: 0, total: 0 },
      costEstimate: 0,
      lastReset: new Date(),
    });
    
    resetMetrics = vi.fn();
    cleanup = vi.fn().mockResolvedValue(undefined);
  }

  // Google Provider Mock
  class MockGoogleProvider {
    name = 'google';
    supportedModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-pro'];
    capabilities = {
      streaming: true,
      functionCalling: true,
      vision: true,
      audioInput: true,
      audioOutput: true,
      batchRequests: false,
      contextCaching: false,
    };
    
    initialize = vi.fn().mockImplementation(async (config) => {
      if (config.apiKey === 'invalid-key') {
        throw new Error('Invalid API key');
      }
      return undefined;
    });
    
    validateConnection = vi.fn().mockResolvedValue(undefined);
    
    getModel = vi.fn().mockImplementation((modelId) => {
      if (modelId === 'unsupported-model') {
        throw new Error('Unsupported model');
      }
      return { provider: 'google', modelId: 'gemini-2.5-pro' };
    });
    
    supportsModel = vi.fn().mockReturnValue(true);
    supportsVision = vi.fn().mockReturnValue(true);
    supportsAudioInput = vi.fn().mockReturnValue(true);
    supportsAudioOutput = vi.fn().mockReturnValue(true);
    
    getHealth = vi.fn().mockResolvedValue({ 
      status: 'healthy', 
      latency: 120, 
      errorRate: 0, 
      lastChecked: new Date() 
    });
    
    getMetrics = vi.fn().mockReturnValue({
      requestCount: 0,
      errorCount: 0,
      totalLatency: 0,
      averageLatency: 0,
      tokenUsage: { input: 0, output: 0, total: 0 },
      costEstimate: 0,
      lastReset: new Date(),
    });
    
    resetMetrics = vi.fn();
    cleanup = vi.fn().mockResolvedValue(undefined);
  }

  return {
    OpenAIProvider: MockOpenAIProvider,
    AnthropicProvider: MockAnthropicProvider,
    GoogleProvider: MockGoogleProvider,
  };
};

// Factory mock for provider integration tests
export const createProviderFactoryMock = () => {
  const providerCache = new Map();
  const mocks = createProviderIntegrationMocks();
  
  const mockFactory = {
    createProvider: vi.fn().mockImplementation(async (name: string, config: any) => {
      const providers = {
        openai: mocks.OpenAIProvider,
        anthropic: mocks.AnthropicProvider,
        google: mocks.GoogleProvider,
      };
      
      const ProviderClass = providers[name as keyof typeof providers];
      if (!ProviderClass) {
        throw new Error(`Unknown provider: ${name}`);
      }
      
      const provider = new ProviderClass();
      await provider.initialize(config);
      return provider;
    }),
    
    getProvider: vi.fn().mockImplementation(async (name: string, config: any) => {
      const cacheKey = `${name}_${JSON.stringify(config)}`;
      if (providerCache.has(cacheKey)) {
        return providerCache.get(cacheKey);
      }
      const provider = await mockFactory.createProvider(name, config);
      providerCache.set(cacheKey, provider);
      return provider;
    }),
    
    getSupportedProviders: vi.fn().mockReturnValue(['openai', 'anthropic', 'google']),
    
    removeProvider: vi.fn().mockImplementation(async (name: string, config?: any) => {
      if (config) {
        const cacheKey = `${name}_${JSON.stringify(config)}`;
        const provider = providerCache.get(cacheKey);
        if (provider) {
          await provider.cleanup();
          return providerCache.delete(cacheKey);
        }
        return false;
      }
      
      let removed = false;
      for (const [key, provider] of providerCache.entries()) {
        if (key.startsWith(`${name}_`)) {
          await provider.cleanup();
          providerCache.delete(key);
          removed = true;
        }
      }
      
      return removed;
    }),
    
    clearAll: vi.fn().mockImplementation(async () => {
      for (const provider of providerCache.values()) {
        await provider.cleanup();
      }
      providerCache.clear();
    }),
    
    getProviderStats: vi.fn().mockImplementation(() => {
      const stats = new Map();
      
      for (const [key, provider] of providerCache.entries()) {
        const providerName = key.split('_')[0];
        const metrics = provider.getMetrics();
        
        const current = stats.get(providerName) || {
          instanceCount: 0,
          totalRequests: 0,
          totalErrors: 0,
          totalLatency: 0,
        };
        
        current.instanceCount++;
        current.totalRequests += metrics.requestCount;
        current.totalErrors += metrics.errorCount;
        current.totalLatency += metrics.totalLatency;
        
        stats.set(providerName, current);
      }
      
      return Array.from(stats.entries()).map(([name, data]) => ({
        name,
        instanceCount: data.instanceCount,
        totalRequests: data.totalRequests,
        totalErrors: data.totalErrors,
        averageLatency: data.totalRequests > 0 ? data.totalLatency / data.totalRequests : 0,
      }));
    }),
  };
  
  return mockFactory;
};

// Router mock for provider integration tests
export const createProviderRouterMock = () => {
  const mocks = createProviderIntegrationMocks();
  
  const mockRouter = {
    initialize: vi.fn().mockResolvedValue(undefined),
    
    route: vi.fn().mockImplementation(async (modelId: string) => {
      let provider: any;
      let providerName: string;
      
      if (modelId.includes('gpt') || modelId.includes('o4')) {
        providerName = 'openai';
        provider = new mocks.OpenAIProvider();
      } else if (modelId.includes('claude')) {
        providerName = 'anthropic';
        provider = new mocks.AnthropicProvider();
      } else if (modelId.includes('gemini')) {
        providerName = 'google';
        provider = new mocks.GoogleProvider();
      } else {
        throw new Error(`No provider available for model: ${modelId}`);
      }
      
      return {
        provider,
        model: provider.getModel(modelId),
        metadata: { model: modelId },
      };
    }),
    
    getBestProvider: vi.fn().mockImplementation(async (modelId: string) => {
      if (modelId.includes('gpt') || modelId.includes('o4')) {
        return new mocks.OpenAIProvider();
      } else if (modelId.includes('claude')) {
        return new mocks.AnthropicProvider();
      } else if (modelId.includes('gemini')) {
        return new mocks.GoogleProvider();
      }
      return null;
    }),
    
    updateConfig: vi.fn(),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
  
  return mockRouter;
};