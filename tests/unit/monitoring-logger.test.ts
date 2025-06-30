// Unit Tests for lib/monitoring/logger.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, logger, type LogContext, type LogLevel } from '@/lib/monitoring/logger';

// Mock OpenTelemetry
const mockAddEvent = vi.fn();
const mockRecordException = vi.fn();
const mockSpanContext = vi.fn();

const mockSpan = {
  addEvent: mockAddEvent,
  recordException: mockRecordException,
  spanContext: mockSpanContext,
};

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: vi.fn(() => mockSpan),
  },
}));

describe('Logger', () => {
  let consoleSpy: any;
  
  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    
    mockSpanContext.mockReturnValue({
      traceId: 'trace-123',
      spanId: 'span-456',
    });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  describe('constructor', () => {
    it('should create logger with default service name', () => {
      const testLogger = new Logger();
      testLogger.info('test message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"service":"rag-chat-app"')
      );
    });

    it('should create logger with custom service name', () => {
      const testLogger = new Logger('custom-service');
      testLogger.info('test message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"service":"custom-service"')
      );
    });

    it('should use NODE_ENV for environment', () => {
      process.env.NODE_ENV = 'production';
      const testLogger = new Logger();
      testLogger.info('test message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"environment":"production"')
      );
    });

    it('should default to development environment', () => {
      delete process.env.NODE_ENV;
      const testLogger = new Logger();
      testLogger.info('test message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"environment":"development"')
      );
    });
  });

  describe('formatMessage', () => {
    it('should format message with correct structure', () => {
      const testLogger = new Logger();
      testLogger.info('test message', { userId: 'user-123' });

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog).toMatchObject({
        level: 'info',
        message: 'test message',
        service: 'rag-chat-app',
        environment: 'development',
        traceId: 'trace-123',
        spanId: 'span-456',
        userId: 'user-123',
      });
      
      expect(parsedLog.timestamp).toBeDefined();
    });

    it('should include OpenTelemetry trace context', () => {
      const testLogger = new Logger();
      testLogger.info('test message');

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.traceId).toBe('trace-123');
      expect(parsedLog.spanId).toBe('span-456');
    });

    it('should handle missing trace context', () => {
      const { trace } = require('@opentelemetry/api');
      trace.getActiveSpan.mockReturnValueOnce(null);
      
      const testLogger = new Logger();
      testLogger.info('test message');

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.traceId).toBeUndefined();
      expect(parsedLog.spanId).toBeUndefined();
    });
  });

  describe('log levels', () => {
    let testLogger: Logger;

    beforeEach(() => {
      testLogger = new Logger();
    });

    it('should log debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      testLogger.debug('debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
      expect(mockAddEvent).toHaveBeenCalledWith('log.debug', {
        'log.message': 'debug message',
        'log.severity': 'debug',
      });
    });

    it('should not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      testLogger.debug('debug message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(mockAddEvent).toHaveBeenCalled(); // Still adds to span
    });

    it('should log info messages', () => {
      testLogger.info('info message', { userId: 'user-123' });

      expect(consoleSpy.info).toHaveBeenCalled();
      expect(mockAddEvent).toHaveBeenCalledWith('log.info', {
        'log.message': 'info message',
        'log.severity': 'info',
        userId: 'user-123',
      });
    });

    it('should log warning messages', () => {
      testLogger.warn('warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(mockAddEvent).toHaveBeenCalledWith('log.warn', {
        'log.message': 'warning message',
        'log.severity': 'warn',
      });
    });

    it('should log error messages', () => {
      const testError = new Error('Test error');
      testLogger.error('error message', { requestId: 'req-123' }, testError);

      expect(consoleSpy.error).toHaveBeenCalledTimes(2); // Message + stack
      expect(mockAddEvent).toHaveBeenCalledWith('log.error', {
        'log.message': 'error message',
        'log.severity': 'error',
        requestId: 'req-123',
      });
      expect(mockRecordException).toHaveBeenCalledWith(testError);
    });

    it('should log error messages without Error object', () => {
      testLogger.error('error message');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1); // Just message
      expect(mockRecordException).not.toHaveBeenCalled();
    });
  });

  describe('child logger', () => {
    it('should create child logger with additional context', () => {
      const testLogger = new Logger();
      const childLogger = testLogger.child({ sessionId: 'session-123' });
      
      childLogger.info('child message', { requestId: 'req-456' });

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.sessionId).toBe('session-123');
      expect(parsedLog.requestId).toBe('req-456');
    });

    it('should override parent context with child context', () => {
      const testLogger = new Logger();
      const childLogger = testLogger.child({ userId: 'parent-user' });
      
      childLogger.info('child message', { userId: 'child-user' });

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.userId).toBe('child-user');
    });
  });

  describe('RAG-specific logging methods', () => {
    let testLogger: Logger;

    beforeEach(() => {
      testLogger = new Logger();
    });

    it('should log vector search events', () => {
      testLogger.logVectorSearch('test query', 5, 150, { userId: 'user-123' });

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.message).toBe('Vector search completed');
      expect(parsedLog.query).toBe('test query');
      expect(parsedLog.resultCount).toBe(5);
      expect(parsedLog.duration).toBe(150);
      expect(parsedLog.operation).toBe('vector_search');
      expect(parsedLog.userId).toBe('user-123');
    });

    it('should log model inference events', () => {
      testLogger.logModelInference('gpt-4', 100, 50, 2000, { sessionId: 'session-123' });

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.message).toBe('Model inference completed');
      expect(parsedLog.model).toBe('gpt-4');
      expect(parsedLog.promptTokens).toBe(100);
      expect(parsedLog.completionTokens).toBe(50);
      expect(parsedLog.totalTokens).toBe(150);
      expect(parsedLog.duration).toBe(2000);
      expect(parsedLog.operation).toBe('model_inference');
      expect(parsedLog.sessionId).toBe('session-123');
    });

    it('should log document processing events', () => {
      testLogger.logDocumentProcessing('doc-123', 10, 5000, { requestId: 'req-456' });

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.message).toBe('Document processed');
      expect(parsedLog.documentId).toBe('doc-123');
      expect(parsedLog.chunkCount).toBe(10);
      expect(parsedLog.duration).toBe(5000);
      expect(parsedLog.operation).toBe('document_processing');
      expect(parsedLog.requestId).toBe('req-456');
    });

    it('should log API request events with info level for success', () => {
      testLogger.logApiRequest('GET', '/api/documents', 200, 150);

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.level).toBe('info');
      expect(parsedLog.message).toBe('API GET /api/documents');
      expect(parsedLog.method).toBe('GET');
      expect(parsedLog.path).toBe('/api/documents');
      expect(parsedLog.statusCode).toBe(200);
      expect(parsedLog.duration).toBe(150);
      expect(parsedLog.operation).toBe('api_request');
    });

    it('should log API request events with warn level for client errors', () => {
      testLogger.logApiRequest('POST', '/api/documents', 400, 75);

      const loggedMessage = consoleSpy.warn.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.level).toBe('warn');
      expect(parsedLog.statusCode).toBe(400);
    });

    it('should log API request events with error level for server errors', () => {
      testLogger.logApiRequest('GET', '/api/documents', 500, 1000);

      const loggedMessage = consoleSpy.error.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.level).toBe('error');
      expect(parsedLog.statusCode).toBe(500);
    });
  });

  describe('singleton logger', () => {
    it('should export singleton logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should use singleton logger consistently', () => {
      logger.info('singleton test');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"message":"singleton test"')
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null context gracefully', () => {
      const testLogger = new Logger();
      expect(() => {
        testLogger.info('test message', null as any);
      }).not.toThrow();
    });

    it('should handle undefined context gracefully', () => {
      const testLogger = new Logger();
      expect(() => {
        testLogger.info('test message', undefined);
      }).not.toThrow();
    });

    it('should handle complex context objects', () => {
      const testLogger = new Logger();
      const complexContext = {
        nested: { object: { with: 'value' } },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };

      testLogger.info('test message', complexContext);

      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);

      expect(parsedLog.nested).toEqual({ object: { with: 'value' } });
      expect(parsedLog.array).toEqual([1, 2, 3]);
      expect(parsedLog.nullValue).toBeNull();
      expect(parsedLog.undefinedValue).toBeUndefined();
    });

    it('should handle empty messages', () => {
      const testLogger = new Logger();
      
      expect(() => {
        testLogger.info('');
      }).not.toThrow();
      
      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);
      expect(parsedLog.message).toBe('');
    });

    it('should handle very long messages', () => {
      const testLogger = new Logger();
      const longMessage = 'A'.repeat(10000);
      
      expect(() => {
        testLogger.info(longMessage);
      }).not.toThrow();
      
      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);
      expect(parsedLog.message).toBe(longMessage);
    });

    it('should handle special characters in messages', () => {
      const testLogger = new Logger();
      const specialMessage = 'Message with "quotes", \\backslashes\\\\ and émojis 🚀';
      
      testLogger.info(specialMessage);
      
      const loggedMessage = consoleSpy.info.mock.calls[0][0];
      const parsedLog = JSON.parse(loggedMessage);
      expect(parsedLog.message).toBe(specialMessage);
    });
  });
});