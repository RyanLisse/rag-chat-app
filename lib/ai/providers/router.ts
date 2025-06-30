/**
 * Model router for intelligent routing and load balancing
 */

import type { LanguageModel } from 'ai';
import { chatModels } from '../models';
import { ModelNotFoundError, ProviderUnavailableError } from './errors';
import { ModelProviderFactory } from './factory';
import type {
  GenerationOptions,
  ModelProvider,
  ModelRouter,
  ProviderHealth,
  ResponseMetadata,
  RouterConfig,
} from './types';
import { CircuitBreaker } from './utils';

/**
 * Default router configuration
 */
const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  fallbackStrategy: 'fastest',
  healthCheckInterval: 60000, // 1 minute
  loadBalancing: true,
  circuitBreaker: {
    enabled: true,
    errorThreshold: 5,
    resetTimeout: 300000, // 5 minutes
  },
};

/**
 * Provider configuration from environment
 */
interface ProviderConfigs {
  openai?: {
    apiKey: string;
    baseUrl?: string;
  };
  anthropic?: {
    apiKey: string;
    baseUrl?: string;
  };
  google?: {
    apiKey: string;
    baseUrl?: string;
  };
}

/**
 * Model router implementation
 */
export class ModelRouterImpl implements ModelRouter {
  private config: RouterConfig;
  private factory: ModelProviderFactory;
  private providers = new Map<string, ModelProvider>();
  private healthCache = new Map<
    string,
    { health: ProviderHealth; timestamp: number }
  >();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private lastHealthCheck = 0;

  constructor(
    private providerConfigs: ProviderConfigs,
    config: Partial<RouterConfig> = {}
  ) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    this.factory = ModelProviderFactory.getInstance();
  }

  /**
   * Initialize the router with providers
   */
  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    // Initialize OpenAI provider
    if (this.providerConfigs.openai?.apiKey) {
      initPromises.push(
        this.initializeProvider('openai', {
          apiKey: this.providerConfigs.openai.apiKey,
          baseUrl: this.providerConfigs.openai.baseUrl,
        })
      );
    }

    // Initialize Anthropic provider
    if (this.providerConfigs.anthropic?.apiKey) {
      initPromises.push(
        this.initializeProvider('anthropic', {
          apiKey: this.providerConfigs.anthropic.apiKey,
          baseUrl: this.providerConfigs.anthropic.baseUrl,
        })
      );
    }

    // Initialize Google provider
    if (this.providerConfigs.google?.apiKey) {
      initPromises.push(
        this.initializeProvider('google', {
          apiKey: this.providerConfigs.google.apiKey,
          baseUrl: this.providerConfigs.google.baseUrl,
        })
      );
    }

    await Promise.allSettled(initPromises);
  }

  /**
   * Route a request to the appropriate provider
   */
  async route(
    modelId: string,
    options?: GenerationOptions
  ): Promise<{
    provider: ModelProvider;
    model: LanguageModel;
    metadata: Partial<ResponseMetadata>;
  }> {
    // Find the model configuration
    const modelConfig = chatModels.find((m) => m.id === modelId);
    if (!modelConfig) {
      throw new ModelNotFoundError(modelId, 'router');
    }

    // Get the primary provider
    let provider = await this.getProviderForModel(modelConfig.provider);

    if (!provider) {
      // Try fallback strategies
      provider = await this.getFallbackProvider(modelId);
      if (!provider) {
        throw new ProviderUnavailableError(
          'all',
          'No healthy providers available'
        );
      }
    }

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(provider.name);

    try {
      const model = await circuitBreaker.execute(async () => {
        return provider?.getModel(modelId, options);
      });

      return {
        provider,
        model,
        metadata: {
          provider: provider.name,
          model: modelId,
        },
      };
    } catch (error) {
      // Try fallback if primary provider fails
      if (this.config.fallbackStrategy !== 'none') {
        const fallbackProvider = await this.getFallbackProvider(modelId, [
          provider.name,
        ]);
        if (fallbackProvider) {
          const model = fallbackProvider.getModel(modelId, options);
          return {
            provider: fallbackProvider,
            model,
            metadata: {
              provider: fallbackProvider.name,
              model: modelId,
            },
          };
        }
      }

      throw error;
    }
  }

  /**
   * Get the best provider for a model
   */
  async getBestProvider(modelId: string): Promise<ModelProvider | undefined> {
    const modelConfig = chatModels.find((m) => m.id === modelId);
    if (!modelConfig) {
      return undefined;
    }

    // Check if we need to refresh health data
    await this.refreshHealthIfNeeded();

    // Get all providers that support this model
    const candidates: Array<{
      provider: ModelProvider;
      health: ProviderHealth;
    }> = [];

    for (const provider of this.providers.values()) {
      if (provider.supportsModel(modelId)) {
        const health = await this.getCachedHealth(provider.name);
        if (health.status !== 'unhealthy') {
          candidates.push({ provider, health });
        }
      }
    }

    // Sort by health and performance
    candidates.sort((a, b) => {
      // Prioritize healthy over degraded
      if (a.health.status !== b.health.status) {
        return a.health.status === 'healthy' ? -1 : 1;
      }

      // Then by latency (lower is better)
      return a.health.latency - b.health.latency;
    });

    return candidates[0]?.provider;
  }

  /**
   * Update router configuration
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };

    // Update circuit breakers if needed
    if (config.circuitBreaker) {
      this.circuitBreakers.clear();
    }
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      providersCount: this.providers.size,
      healthCacheEntries: this.healthCache.size,
      circuitBreakersCount: this.circuitBreakers.size,
      lastHealthCheck: new Date(this.lastHealthCheck),
      config: this.config,
    };
  }

  /**
   * Initialize a provider
   */
  private async initializeProvider(
    name: string,
    config: { apiKey: string; baseUrl?: string }
  ): Promise<void> {
    try {
      const provider = await this.factory.getProvider(name, config);
      this.providers.set(name, provider);
    } catch (error) {
      console.warn(`Failed to initialize ${name} provider:`, error);
    }
  }

  /**
   * Get provider for a specific model
   */
  private async getProviderForModel(
    providerName: string
  ): Promise<ModelProvider | undefined> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return undefined;
    }

    // Check health
    const health = await this.getCachedHealth(providerName);
    if (health.status === 'unhealthy') {
      return undefined;
    }

    return provider;
  }

  /**
   * Get fallback provider using configured strategy
   */
  private async getFallbackProvider(
    modelId: string,
    excludeProviders: string[] = []
  ): Promise<ModelProvider | undefined> {
    const candidates = Array.from(this.providers.values()).filter(
      (provider) =>
        provider.supportsModel(modelId) &&
        !excludeProviders.includes(provider.name)
    );

    if (candidates.length === 0) {
      return undefined;
    }

    switch (this.config.fallbackStrategy) {
      case 'round_robin':
        return this.getRoundRobinProvider(candidates);

      case 'least_loaded':
        return this.getLeastLoadedProvider(candidates);

      case 'fastest':
        return this.getFastestProvider(candidates);

      default:
        return undefined;
    }
  }

  /**
   * Get provider using round-robin strategy
   */
  private getRoundRobinProvider(candidates: ModelProvider[]): ModelProvider {
    const timestamp = Date.now();
    const index = Math.floor(timestamp / 1000) % candidates.length;
    return candidates[index];
  }

  /**
   * Get least loaded provider
   */
  private getLeastLoadedProvider(candidates: ModelProvider[]): ModelProvider {
    return candidates.reduce((best, current) => {
      const bestMetrics = best.getMetrics();
      const currentMetrics = current.getMetrics();

      // Use request count as load indicator
      return currentMetrics.requestCount < bestMetrics.requestCount
        ? current
        : best;
    });
  }

  /**
   * Get fastest provider based on recent latency
   */
  private async getFastestProvider(
    candidates: ModelProvider[]
  ): Promise<ModelProvider> {
    const healthPromises = candidates.map(async (provider) => ({
      provider,
      health: await this.getCachedHealth(provider.name),
    }));

    const results = await Promise.all(healthPromises);

    return results.reduce((best, current) => {
      return current.health.latency < best.health.latency ? current : best;
    }).provider;
  }

  /**
   * Get cached health or fetch if needed
   */
  private async getCachedHealth(providerName: string): Promise<ProviderHealth> {
    const cached = this.healthCache.get(providerName);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.config.healthCheckInterval) {
      return cached.health;
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      return {
        status: 'unhealthy',
        latency: -1,
        errorRate: 1,
        lastChecked: new Date(),
        message: 'Provider not found',
      };
    }

    try {
      const health = await provider.getHealth();
      this.healthCache.set(providerName, { health, timestamp: now });
      return health;
    } catch (error) {
      const errorHealth: ProviderHealth = {
        status: 'unhealthy',
        latency: -1,
        errorRate: 1,
        lastChecked: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error',
      };

      this.healthCache.set(providerName, {
        health: errorHealth,
        timestamp: now,
      });
      return errorHealth;
    }
  }

  /**
   * Refresh health data if needed
   */
  private async refreshHealthIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastHealthCheck > this.config.healthCheckInterval) {
      const healthPromises = Array.from(this.providers.keys()).map((name) =>
        this.getCachedHealth(name)
      );

      await Promise.allSettled(healthPromises);
      this.lastHealthCheck = now;
    }
  }

  /**
   * Get or create circuit breaker for provider
   */
  private getCircuitBreaker(providerName: string): CircuitBreaker {
    let circuitBreaker = this.circuitBreakers.get(providerName);

    if (!circuitBreaker && this.config.circuitBreaker.enabled) {
      circuitBreaker = new CircuitBreaker(
        this.config.circuitBreaker.errorThreshold,
        this.config.circuitBreaker.resetTimeout
      );
      this.circuitBreakers.set(providerName, circuitBreaker);
    }

    return circuitBreaker || new CircuitBreaker(0, 0); // Disabled circuit breaker
  }
}

/**
 * Create a router instance with environment-based configuration
 */
export function createModelRouter(
  config?: Partial<RouterConfig>
): ModelRouterImpl {
  const providerConfigs: ProviderConfigs = {};

  // Load from environment variables
  if (process.env.OPENAI_API_KEY) {
    providerConfigs.openai = {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providerConfigs.anthropic = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseUrl: process.env.ANTHROPIC_BASE_URL,
    };
  }

  if (process.env.GOOGLE_API_KEY) {
    providerConfigs.google = {
      apiKey: process.env.GOOGLE_API_KEY,
      baseUrl: process.env.GOOGLE_BASE_URL,
    };
  }

  return new ModelRouterImpl(providerConfigs, config);
}
