// Unit Tests for lib/ai/providers/errors.ts
import { describe, it, expect } from 'vitest';
import {
  ProviderError,
  ModelNotFoundError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ContentFilterError,
  TokenLimitError,
  ProviderUnavailableError,
  ConfigurationError,
  ModelInitializationError,
  isRetryableError,
  extractErrorDetails,
} from '@/lib/ai/providers/errors';

describe('Provider Error Classes', () => {
  describe('ProviderError', () => {
    it('should create base provider error with required properties', () => {
      const error = new ProviderError('Test error', 'test-provider');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ProviderError');
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('test-provider');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
      expect(error.retryable).toBe(false);
    });

    it('should create provider error with all optional properties', () => {
      const error = new ProviderError(
        'Test error',
        'test-provider',
        'TEST_CODE',
        500,
        true
      );

      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
    });

    it('should inherit from Error properly', () => {
      const error = new ProviderError('Test error', 'test-provider');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ProviderError).toBe(true);
      expect(error.stack).toBeDefined();
    });
  });

  describe('ModelNotFoundError', () => {
    it('should create model not found error', () => {
      const error = new ModelNotFoundError('gpt-4', 'openai');

      expect(error.name).toBe('ModelNotFoundError');
      expect(error.message).toBe("Model 'gpt-4' not found in provider 'openai'");
      expect(error.provider).toBe('openai');
      expect(error.code).toBe('MODEL_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.retryable).toBe(false);
    });

    it('should handle empty model and provider names', () => {
      const error = new ModelNotFoundError('', '');

      expect(error.message).toBe("Model '' not found in provider ''");
      expect(error.provider).toBe('');
    });

    it('should handle special characters in model names', () => {
      const error = new ModelNotFoundError('gpt-4.5-turbo', 'openai-beta');

      expect(error.message).toContain('gpt-4.5-turbo');
      expect(error.provider).toBe('openai-beta');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('anthropic');

      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe("Authentication failed for provider 'anthropic'");
      expect(error.provider).toBe('anthropic');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.statusCode).toBe(401);
      expect(error.retryable).toBe(false);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error without reset time', () => {
      const error = new RateLimitError('openai');

      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe("Rate limit exceeded for provider 'openai'");
      expect(error.provider).toBe('openai');
      expect(error.code).toBe('RATE_LIMIT');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
    });

    it('should create rate limit error with reset time', () => {
      const resetTime = new Date('2024-01-01T12:00:00Z');
      const error = new RateLimitError('openai', resetTime);

      expect(error.message).toBe(
        "Rate limit exceeded for provider 'openai'. Resets at 2024-01-01T12:00:00.000Z"
      );
    });

    it('should handle future reset times', () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const error = new RateLimitError('test-provider', futureTime);

      expect(error.message).toContain('Resets at');
      expect(error.message).toContain(futureTime.toISOString());
    });
  });

  describe('NetworkError', () => {
    it('should create network error without original error', () => {
      const error = new NetworkError('google');

      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe("Network error for provider 'google': Unknown network error");
      expect(error.provider).toBe('google');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBeUndefined();
      expect(error.retryable).toBe(true);
    });

    it('should create network error with original error', () => {
      const originalError = new Error('Connection refused');
      const error = new NetworkError('google', originalError);

      expect(error.message).toBe("Network error for provider 'google': Connection refused");
    });

    it('should handle complex original errors', () => {
      const originalError = new Error('ECONNREFUSED 127.0.0.1:443');
      const error = new NetworkError('test-provider', originalError);

      expect(error.message).toContain('ECONNREFUSED 127.0.0.1:443');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('anthropic', 30000);

      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe("Request timeout for provider 'anthropic' after 30000ms");
      expect(error.provider).toBe('anthropic');
      expect(error.code).toBe('TIMEOUT');
      expect(error.statusCode).toBe(408);
      expect(error.retryable).toBe(true);
    });

    it('should handle different timeout values', () => {
      const shortTimeout = new TimeoutError('fast-provider', 1000);
      const longTimeout = new TimeoutError('slow-provider', 120000);

      expect(shortTimeout.message).toContain('1000ms');
      expect(longTimeout.message).toContain('120000ms');
    });

    it('should handle zero and negative timeouts', () => {
      const zeroTimeout = new TimeoutError('instant-provider', 0);
      const negativeTimeout = new TimeoutError('negative-provider', -1000);

      expect(zeroTimeout.message).toContain('0ms');
      expect(negativeTimeout.message).toContain('-1000ms');
    });
  });

  describe('ContentFilterError', () => {
    it('should create content filter error without reason', () => {
      const error = new ContentFilterError('openai');

      expect(error.name).toBe('ContentFilterError');
      expect(error.message).toBe("Content filtered by provider 'openai'");
      expect(error.provider).toBe('openai');
      expect(error.code).toBe('CONTENT_FILTER');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
    });

    it('should create content filter error with reason', () => {
      const error = new ContentFilterError('openai', 'Inappropriate content detected');

      expect(error.message).toBe("Content filtered by provider 'openai': Inappropriate content detected");
    });

    it('should handle complex filter reasons', () => {
      const reason = 'Content contains: violence, hate speech, and personal information';
      const error = new ContentFilterError('content-moderator', reason);

      expect(error.message).toContain(reason);
    });
  });

  describe('TokenLimitError', () => {
    it('should create token limit error', () => {
      const error = new TokenLimitError('openai', 5000, 4096);

      expect(error.name).toBe('TokenLimitError');
      expect(error.message).toBe("Token limit exceeded for provider 'openai': 5000 > 4096");
      expect(error.provider).toBe('openai');
      expect(error.code).toBe('TOKEN_LIMIT');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
    });

    it('should handle edge case token counts', () => {
      const exactLimit = new TokenLimitError('test', 1000, 1000);
      const hugeOverage = new TokenLimitError('test', 100000, 8192);

      expect(exactLimit.message).toBe("Token limit exceeded for provider 'test': 1000 > 1000");
      expect(hugeOverage.message).toBe("Token limit exceeded for provider 'test': 100000 > 8192");
    });

    it('should handle zero and negative token counts', () => {
      const zeroTokens = new TokenLimitError('test', 0, 1000);
      const negativeTokens = new TokenLimitError('test', -100, 1000);

      expect(zeroTokens.message).toContain('0 > 1000');
      expect(negativeTokens.message).toContain('-100 > 1000');
    });
  });

  describe('ProviderUnavailableError', () => {
    it('should create provider unavailable error without reason', () => {
      const error = new ProviderUnavailableError('maintenance-provider');

      expect(error.name).toBe('ProviderUnavailableError');
      expect(error.message).toBe("Provider 'maintenance-provider' unavailable");
      expect(error.provider).toBe('maintenance-provider');
      expect(error.code).toBe('PROVIDER_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.retryable).toBe(true);
    });

    it('should create provider unavailable error with reason', () => {
      const error = new ProviderUnavailableError('scheduled-maintenance', 'Scheduled maintenance window');

      expect(error.message).toBe("Provider 'scheduled-maintenance' unavailable: Scheduled maintenance window");
    });

    it('should handle technical reasons', () => {
      const reason = 'Database connection pool exhausted';
      const error = new ProviderUnavailableError('db-dependent-provider', reason);

      expect(error.message).toContain(reason);
    });
  });

  describe('ConfigurationError', () => {
    it('should create configuration error', () => {
      const error = new ConfigurationError('config-provider', 'Missing API key');

      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe("Configuration error for provider 'config-provider': Missing API key");
      expect(error.provider).toBe('config-provider');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
    });

    it('should handle complex configuration messages', () => {
      const configMessage = 'Invalid base URL format: must start with https://';
      const error = new ConfigurationError('url-provider', configMessage);

      expect(error.message).toContain(configMessage);
    });

    it('should handle empty configuration messages', () => {
      const error = new ConfigurationError('empty-provider', '');

      expect(error.message).toBe("Configuration error for provider 'empty-provider': ");
    });
  });

  describe('ModelInitializationError', () => {
    it('should create model initialization error without original error', () => {
      const error = new ModelInitializationError('init-provider', 'test-model');

      expect(error.name).toBe('ModelInitializationError');
      expect(error.message).toBe("Failed to initialize model 'test-model' for provider 'init-provider': Unknown error");
      expect(error.provider).toBe('init-provider');
      expect(error.code).toBe('MODEL_INIT_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(false);
    });

    it('should create model initialization error with original error', () => {
      const originalError = new Error('Model file not found');
      const error = new ModelInitializationError('file-provider', 'missing-model', originalError);

      expect(error.message).toBe("Failed to initialize model 'missing-model' for provider 'file-provider': Model file not found");
    });

    it('should handle nested errors', () => {
      const nestedError = new Error('Connection timeout during model download');
      const error = new ModelInitializationError('download-provider', 'large-model', nestedError);

      expect(error.message).toContain('Connection timeout during model download');
    });
  });
});

describe('Error Utility Functions', () => {
  describe('isRetryableError', () => {
    it('should return true for retryable provider errors', () => {
      const retryableErrors = [
        new RateLimitError('test'),
        new NetworkError('test'),
        new TimeoutError('test', 1000),
        new ProviderUnavailableError('test'),
      ];

      retryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should return false for non-retryable provider errors', () => {
      const nonRetryableErrors = [
        new AuthenticationError('test'),
        new ModelNotFoundError('model', 'test'),
        new ContentFilterError('test'),
        new TokenLimitError('test', 100, 50),
        new ConfigurationError('test', 'invalid'),
        new ModelInitializationError('test', 'model'),
      ];

      nonRetryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(false);
      });
    });

    it('should detect retryable patterns in generic errors', () => {
      const retryablePatterns = [
        new Error('Request timeout occurred'),
        new Error('Network connection failed'),
        new Error('Rate limit exceeded'),
        new Error('Service unavailable'),
        new Error('Internal server error'),
        new Error('Bad gateway'),
        new Error('Gateway timeout'),
      ];

      retryablePatterns.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should return false for non-retryable generic errors', () => {
      const nonRetryableErrors = [
        new Error('Invalid input format'),
        new Error('Authentication failed'),
        new Error('Permission denied'),
        new Error('Bad request'),
      ];

      nonRetryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(false);
      });
    });

    it('should handle non-error inputs', () => {
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
      expect(isRetryableError('string error')).toBe(false);
      expect(isRetryableError(42)).toBe(false);
      expect(isRetryableError({})).toBe(false);
    });

    it('should handle case insensitive pattern matching', () => {
      const mixedCaseErrors = [
        new Error('REQUEST TIMEOUT'),
        new Error('Network Error'),
        new Error('RATE LIMIT exceeded'),
        new Error('Service UNAVAILABLE'),
      ];

      mixedCaseErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract details from provider errors', () => {
      const error = new RateLimitError('test-provider');
      const details = extractErrorDetails(error);

      expect(details).toEqual({
        message: "Rate limit exceeded for provider 'test-provider'",
        code: 'RATE_LIMIT',
        statusCode: 429,
        retryable: true,
      });
    });

    it('should extract details from generic errors', () => {
      const error = new Error('Generic error message');
      const details = extractErrorDetails(error);

      expect(details).toEqual({
        message: 'Generic error message',
        retryable: false,
      });
    });

    it('should handle retryable generic errors', () => {
      const error = new Error('Network timeout occurred');
      const details = extractErrorDetails(error);

      expect(details).toEqual({
        message: 'Network timeout occurred',
        retryable: true,
      });
    });

    it('should handle non-error inputs', () => {
      const stringDetails = extractErrorDetails('String error');
      expect(stringDetails).toEqual({
        message: 'String error',
        retryable: false,
      });

      const numberDetails = extractErrorDetails(404);
      expect(numberDetails).toEqual({
        message: '404',
        retryable: false,
      });

      const objectDetails = extractErrorDetails({ code: 'TEST' });
      expect(objectDetails).toEqual({
        message: '[object Object]',
        retryable: false,
      });
    });

    it('should handle null and undefined inputs', () => {
      const nullDetails = extractErrorDetails(null);
      expect(nullDetails).toEqual({
        message: 'null',
        retryable: false,
      });

      const undefinedDetails = extractErrorDetails(undefined);
      expect(undefinedDetails).toEqual({
        message: 'undefined',
        retryable: false,
      });
    });

    it('should preserve all properties from provider errors', () => {
      const errorWithAllProps = new ProviderError(
        'Complete error',
        'full-provider',
        'FULL_CODE',
        418,
        true
      );

      const details = extractErrorDetails(errorWithAllProps);

      expect(details).toEqual({
        message: 'Complete error',
        code: 'FULL_CODE',
        statusCode: 418,
        retryable: true,
      });
    });

    it('should handle provider errors with missing optional properties', () => {
      const minimalError = new ProviderError('Minimal error', 'minimal-provider');
      const details = extractErrorDetails(minimalError);

      expect(details).toEqual({
        message: 'Minimal error',
        code: undefined,
        statusCode: undefined,
        retryable: false,
      });
    });
  });

  describe('Error inheritance and instanceof checks', () => {
    it('should maintain proper inheritance chain', () => {
      const errors = [
        new ModelNotFoundError('model', 'provider'),
        new AuthenticationError('provider'),
        new RateLimitError('provider'),
        new NetworkError('provider'),
        new TimeoutError('provider', 1000),
        new ContentFilterError('provider'),
        new TokenLimitError('provider', 100, 50),
        new ProviderUnavailableError('provider'),
        new ConfigurationError('provider', 'message'),
        new ModelInitializationError('provider', 'model'),
      ];

      errors.forEach(error => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof ProviderError).toBe(true);
        expect(error.name).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.provider).toBeDefined();
      });
    });

    it('should allow specific error type detection', () => {
      const authError = new AuthenticationError('test');
      const timeoutError = new TimeoutError('test', 1000);

      expect(authError instanceof AuthenticationError).toBe(true);
      expect(authError instanceof TimeoutError).toBe(false);
      expect(timeoutError instanceof TimeoutError).toBe(true);
      expect(timeoutError instanceof AuthenticationError).toBe(false);
    });

    it('should preserve stack traces', () => {
      const error = new ModelNotFoundError('model', 'provider');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ModelNotFoundError');
    });
  });
});