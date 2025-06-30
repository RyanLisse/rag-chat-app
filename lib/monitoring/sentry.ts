// Sentry temporarily removed for simplified setup
// TODO: Re-add Sentry integration once core monitoring is stable

import { logger } from './logger';

export function initializeSentry() {
  logger.info('Sentry disabled - using console logging only');
}

// Helper to capture exceptions with additional context
export function captureException(error: Error, context?: Record<string, any>) {
  logger.error('Exception captured (Sentry disabled)', { 
    error: error.message, 
    stack: error.stack,
    context 
  });
}

// Helper to capture messages
export function captureMessage(
  message: string,
  level: string = 'info',
  context?: Record<string, any>
) {
  logger.info('Message captured (Sentry disabled)', { message, level, ...context });
}

// Helper to set user context
export function setUser(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  logger.info('User context set (Sentry disabled)', { user });
}

// Helper to add breadcrumb
export function addBreadcrumb(breadcrumb: any) {
  logger.info('Breadcrumb added (Sentry disabled)', { breadcrumb });
}

// Helper to measure transactions
export function startTransaction(name: string, op: string) {
  logger.info('Transaction started (Sentry disabled)', { name, op });
  return { finish: () => logger.info('Transaction finished (Sentry disabled)', { name, op }) };
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