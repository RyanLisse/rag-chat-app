// Optional OpenTelemetry imports with fallbacks
let trace: any = null;
try {
  const otelApi = require('@opentelemetry/api');
  trace = otelApi.trace;
} catch (error) {
  // OpenTelemetry not available, use no-op implementation
  trace = {
    getActiveSpan: () => null,
    setSpan: (context: any, span: any) => context,
  };
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private serviceName: string;
  private environment: string;

  constructor(serviceName = 'rag-chat-app') {
    this.serviceName = serviceName;
    this.environment = process.env.NODE_ENV || 'development';
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    const logEntry = {
      timestamp,
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      ...context,
    };

    return JSON.stringify(logEntry);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    const formattedMessage = this.formatMessage(level, message, context);

    switch (level) {
      case 'debug':
        if (this.environment === 'development') {
          console.debug(formattedMessage);
        }
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error': {
        console.error(formattedMessage);
        if (error) {
          console.error(error.stack);
        }
        break;
      }
    }

    // Add to current span if available
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent(`log.${level}`, {
        'log.message': message,
        'log.severity': level,
        ...context,
      });

      if (error) {
        activeSpan.recordException(error);
      }
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log('error', message, context, error);
  }

  // Create a child logger with additional context
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (
      level: LogLevel,
      message: string,
      additionalContext?: LogContext,
      error?: Error
    ) => {
      originalLog(level, message, { ...context, ...additionalContext }, error);
    };

    return childLogger;
  }

  // Log RAG-specific events
  logVectorSearch(
    query: string,
    resultCount: number,
    duration: number,
    context?: LogContext
  ) {
    this.info('Vector search completed', {
      ...context,
      query,
      resultCount,
      duration,
      operation: 'vector_search',
    });
  }

  logModelInference(
    model: string,
    promptTokens: number,
    completionTokens: number,
    duration: number,
    context?: LogContext
  ) {
    this.info('Model inference completed', {
      ...context,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      duration,
      operation: 'model_inference',
    });
  }

  logDocumentProcessing(
    documentId: string,
    chunkCount: number,
    duration: number,
    context?: LogContext
  ) {
    this.info('Document processed', {
      ...context,
      documentId,
      chunkCount,
      duration,
      operation: 'document_processing',
    });
  }

  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ) {
    const level =
      statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `API ${method} ${path}`, {
      ...context,
      method,
      path,
      statusCode,
      duration,
      operation: 'api_request',
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or creating custom instances
export { Logger };
