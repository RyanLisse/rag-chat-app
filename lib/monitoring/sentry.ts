import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Performance Monitoring
    integrations: [
      // Automatically instrument Node.js libraries and frameworks
      Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    ],

    // Set sample rates
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Custom error filtering
    beforeSend(event, _hint) {
      // Filter out non-critical errors
      if (event.level === 'warning') {
        return null;
      }

      // Add custom context
      if (event.contexts) {
        event.contexts.app = {
          ...event.contexts.app,
          service: 'rag-chat-app',
        };
      }

      return event;
    },

    // Custom breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }

      return breadcrumb;
    },
  });

  logger.info('Sentry initialized successfully');
}

// Helper to capture exceptions with additional context
export function captureException(error: Error, context?: Record<string, any>) {
  logger.error('Exception captured', context, error);

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
}

// Helper to capture messages
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  logger.info('Message captured', { message, level, ...context });

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureMessage(message, level);
  });
}

// Helper to set user context
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser(user);
}

// Helper to add breadcrumb
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

// Helper to measure transactions
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op });
}

// RAG-specific error tracking
export function captureRAGError(
  error: Error,
  operation: string,
  metadata?: Record<string, any>
) {
  captureException(error, {
    operation,
    component: 'rag',
    ...metadata,
  });
}

// Model-specific error tracking
export function captureModelError(
  error: Error,
  model: string,
  prompt?: string
) {
  captureException(error, {
    operation: 'model_inference',
    model,
    promptLength: prompt?.length,
  });
}

// Document processing error tracking
export function captureDocumentError(
  error: Error,
  documentId: string,
  stage: string
) {
  captureException(error, {
    operation: 'document_processing',
    documentId,
    stage,
  });
}
