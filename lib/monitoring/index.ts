import { SpanStatusCode, context, trace } from '@opentelemetry/api';
import { logger } from './logger';
import {
  captureException,
  captureMessage,
  initializeSentry,
  setUser,
} from './sentry';
import {
  initializeTelemetry,
  measureAsync,
  ragMetrics,
  shutdownTelemetry,
  tracer,
} from './telemetry';

// Re-export commonly used functions
export {
  logger,
  captureException,
  captureMessage,
  setUser,
  ragMetrics,
  measureAsync,
};

// Initialize all monitoring systems
export async function initializeMonitoring() {
  try {
    // Initialize OpenTelemetry
    await initializeTelemetry();

    // Initialize Sentry
    initializeSentry();

    logger.info('Monitoring systems initialized successfully');
  } catch (error) {
    console.error('Failed to initialize monitoring:', error);
  }
}

// Shutdown all monitoring systems
export async function shutdownMonitoring() {
  try {
    await shutdownTelemetry();
    logger.info('Monitoring systems shut down successfully');
  } catch (error) {
    console.error('Failed to shutdown monitoring:', error);
  }
}

// Middleware to track HTTP requests
export function createRequestTracker() {
  return async (req: Request, next: () => Promise<Response>) => {
    const startTime = Date.now();
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;

    // Create a new span for this request
    const span = tracer.startSpan(`${method} ${path}`, {
      attributes: {
        'http.method': method,
        'http.url': url.toString(),
        'http.target': path,
        'http.host': url.host,
        'http.scheme': url.protocol.replace(':', ''),
      },
    });

    // Set the span as active for this request
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const response = await next();
        const duration = Date.now() - startTime;

        // Update span with response information
        span.setAttributes({
          'http.status_code': response.status,
          'http.response_content_length':
            response.headers.get('content-length') || 0,
        });

        // Set span status based on HTTP status
        if (response.status >= 400) {
          span.setStatus({ code: SpanStatusCode.ERROR });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        // Record metrics
        ragMetrics.apiRequestDuration.record(duration, {
          method,
          path,
          status: response.status.toString(),
        });

        ragMetrics.apiRequestCount.add(1, {
          method,
          path,
          status: response.status.toString(),
        });

        if (response.status >= 500) {
          ragMetrics.apiErrorCount.add(1, {
            method,
            path,
            status: response.status.toString(),
          });
        }

        // Log the request
        logger.logApiRequest(method, path, response.status, duration);

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error in span
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });

        // Record error metrics
        ragMetrics.apiErrorCount.add(1, {
          method,
          path,
          error: (error as Error).name,
        });

        // Log and capture the error
        logger.error(
          `Request failed: ${method} ${path}`,
          {
            method,
            path,
            duration,
          },
          error as Error
        );

        captureException(error as Error, {
          method,
          path,
          duration,
        });

        throw error;
      } finally {
        span.end();
      }
    });
  };
}

// Helper to track RAG operations
export async function trackRAGOperation<T>(
  operation: string,
  metadata: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  return measureAsync(
    `rag.${operation}`,
    async () => {
      const startTime = Date.now();

      try {
        const result = await fn();
        const duration = Date.now() - startTime;

        // Log based on operation type
        switch (operation) {
          case 'vector_search': {
            ragMetrics.vectorSearchDuration.record(duration, metadata);
            if (metadata.resultCount !== undefined) {
              ragMetrics.vectorSearchResults.record(metadata.resultCount);
            }
            logger.logVectorSearch(
              metadata.query || '',
              metadata.resultCount || 0,
              duration
            );
            break;
          }

          case 'model_inference': {
            ragMetrics.modelInferenceDuration.record(duration, {
              model: metadata.model,
            });
            if (metadata.tokens) {
              ragMetrics.modelTokensUsed.record(metadata.tokens, {
                model: metadata.model,
              });
            }
            logger.logModelInference(
              metadata.model || '',
              metadata.promptTokens || 0,
              metadata.completionTokens || 0,
              duration
            );
            break;
          }

          case 'document_processing': {
            ragMetrics.documentProcessingDuration.record(duration);
            if (metadata.chunkCount !== undefined) {
              ragMetrics.documentChunkCount.record(metadata.chunkCount);
            }
            logger.logDocumentProcessing(
              metadata.documentId || '',
              metadata.chunkCount || 0,
              duration
            );
            break;
          }

          default:
            logger.info(`RAG operation completed: ${operation}`, {
              ...metadata,
              duration,
            });
        }

        return result;
      } catch (error) {
        if (operation === 'model_inference') {
          ragMetrics.modelErrors.add(1, { model: metadata.model });
        }

        logger.error(
          `RAG operation failed: ${operation}`,
          metadata,
          error as Error
        );
        captureException(error as Error, { operation, ...metadata });
        throw error;
      }
    },
    metadata
  );
}

// Helper to create child logger with request context
export function createRequestLogger(
  requestId: string,
  userId?: string,
  sessionId?: string
) {
  return logger.child({
    requestId,
    userId,
    sessionId,
  });
}
