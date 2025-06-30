/**
 * Custom error classes for the provider system
 */

/**
 * Base provider error class
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Model not found error
 */
export class ModelNotFoundError extends ProviderError {
  constructor(modelId: string, provider: string) {
    super(
      `Model '${modelId}' not found in provider '${provider}'`,
      provider,
      'MODEL_NOT_FOUND',
      404,
      false
    );
    this.name = 'ModelNotFoundError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ProviderError {
  constructor(provider: string) {
    super(
      `Authentication failed for provider '${provider}'`,
      provider,
      'AUTH_FAILED',
      401,
      false
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ProviderError {
  constructor(provider: string, resetTime?: Date) {
    const message = resetTime
      ? `Rate limit exceeded for provider '${provider}'. Resets at ${resetTime.toISOString()}`
      : `Rate limit exceeded for provider '${provider}'`;
    super(message, provider, 'RATE_LIMIT', 429, true);
    this.name = 'RateLimitError';
  }
}

/**
 * Network or connection error
 */
export class NetworkError extends ProviderError {
  constructor(provider: string, originalError?: Error) {
    super(
      `Network error for provider '${provider}': ${originalError?.message || 'Unknown network error'}`,
      provider,
      'NETWORK_ERROR',
      undefined,
      true
    );
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ProviderError {
  constructor(provider: string, timeout: number) {
    super(
      `Request timeout for provider '${provider}' after ${timeout}ms`,
      provider,
      'TIMEOUT',
      408,
      true
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Content filter error
 */
export class ContentFilterError extends ProviderError {
  constructor(provider: string, reason?: string) {
    const message = reason
      ? `Content filtered by provider '${provider}': ${reason}`
      : `Content filtered by provider '${provider}'`;
    super(message, provider, 'CONTENT_FILTER', 400, false);
    this.name = 'ContentFilterError';
  }
}

/**
 * Token limit exceeded error
 */
export class TokenLimitError extends ProviderError {
  constructor(provider: string, tokenCount: number, limit: number) {
    super(
      `Token limit exceeded for provider '${provider}': ${tokenCount} > ${limit}`,
      provider,
      'TOKEN_LIMIT',
      400,
      false
    );
    this.name = 'TokenLimitError';
  }
}

/**
 * Provider unavailable error
 */
export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, reason?: string) {
    const message = reason
      ? `Provider '${provider}' unavailable: ${reason}`
      : `Provider '${provider}' unavailable`;
    super(message, provider, 'PROVIDER_UNAVAILABLE', 503, true);
    this.name = 'ProviderUnavailableError';
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends ProviderError {
  constructor(provider: string, message: string) {
    super(
      `Configuration error for provider '${provider}': ${message}`,
      provider,
      'CONFIG_ERROR',
      400,
      false
    );
    this.name = 'ConfigurationError';
  }
}

/**
 * Model initialization error
 */
export class ModelInitializationError extends ProviderError {
  constructor(provider: string, modelId: string, originalError?: Error) {
    super(
      `Failed to initialize model '${modelId}' for provider '${provider}': ${originalError?.message || 'Unknown error'}`,
      provider,
      'MODEL_INIT_ERROR',
      500,
      false
    );
    this.name = 'ModelInitializationError';
  }
}

/**
 * Utility function to check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ProviderError) {
    return error.retryable;
  }

  // Check for common retryable error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
  }

  return false;
}

/**
 * Utility function to extract error details from various error types
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  code?: string;
  statusCode?: number;
  retryable: boolean;
} {
  if (error instanceof ProviderError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      retryable: isRetryableError(error),
    };
  }

  return {
    message: String(error),
    retryable: false,
  };
}
