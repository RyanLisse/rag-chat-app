import { logger } from './logger';
import {
  captureException,
  captureMessage,
  initializeSentry,
  setUser,
} from './sentry';
import {
  initializeTelemetry,
  trackRAGOperation,
  trackModelInference,
  trackVectorSearch,
  trackDocumentProcessing,
  trackCitationGeneration,
} from './telemetry';

// Re-export commonly used functions
export {
  logger,
  captureException,
  captureMessage,
  setUser,
  trackRAGOperation,
  trackModelInference,
  trackVectorSearch,
  trackDocumentProcessing,
  trackCitationGeneration,
};

// Initialize all monitoring systems
export async function initializeMonitoring() {
  try {
    // Initialize OpenTelemetry (simplified)
    initializeTelemetry();

    // Initialize Sentry (disabled for now)
    initializeSentry();

    logger.info('Monitoring systems initialized successfully');
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
  }
}

// Simplified request tracker for middleware
export function createRequestTracker() {
  return async (req: Request, next: () => Promise<Response>) => {
    const startTime = Date.now();
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      const response = await next();
      const duration = Date.now() - startTime;

      // Log the request
      logger.info(`${method} ${path}`, {
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log and capture the error
      logger.error(`Request failed: ${method} ${path}`, {
        method,
        path,
        duration,
        error: (error as Error).message,
      });

      captureException(error as Error, {
        method,
        path,
        duration,
      });

      throw error;
    }
  };
}

// Helper to track RAG operations (simplified)
export async function trackRAGOperationAsync<T>(
  operation: string,
  metadata: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    // Track the operation
    trackRAGOperation(operation, duration, metadata);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`RAG operation failed: ${operation}`, {
      ...metadata,
      duration,
      error: (error as Error).message,
    });

    captureException(error as Error, { operation, ...metadata });
    throw error;
  }
}

// Helper to create child logger with request context
export function createRequestLogger(
  requestId: string,
  userId?: string,
  sessionId?: string
) {
  return {
    info: (message: string, meta?: any) => logger.info(message, { requestId, userId, sessionId, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { requestId, userId, sessionId, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { requestId, userId, sessionId, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { requestId, userId, sessionId, ...meta }),
  };
}