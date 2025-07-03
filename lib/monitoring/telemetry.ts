// Simplified OpenTelemetry setup using @vercel/otel for Next.js 15
import { logger } from './logger';

// Simplified telemetry initialization for development
export function initializeTelemetry() {
  try {
    // In Next.js 15 with @vercel/otel, most of the setup is handled automatically
    // via the instrumentation.ts file
    logger.info('OpenTelemetry initialized via @vercel/otel');
  } catch (error) {
    logger.warn('Failed to initialize OpenTelemetry', error as any);
  }
}

// Custom metrics for RAG operations
export function trackRAGOperation(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) {
  logger.info('RAG operation tracked', {
    operation,
    duration,
    ...metadata,
  });
}

// Model inference tracking
export function trackModelInference(
  model: string,
  duration: number,
  tokenCount?: number
) {
  logger.info('Model inference tracked', {
    model,
    duration,
    tokenCount,
  });
}

// Vector search tracking
export function trackVectorSearch(
  query: string,
  results: number,
  duration: number
) {
  logger.info('Vector search tracked', {
    queryLength: query.length,
    resultCount: results,
    duration,
  });
}

// Document processing tracking
export function trackDocumentProcessing(
  stage: string,
  documentId: string,
  duration: number
) {
  logger.info('Document processing tracked', {
    stage,
    documentId,
    duration,
  });
}

// Citation generation tracking
export function trackCitationGeneration(
  citationCount: number,
  duration: number
) {
  logger.info('Citation generation tracked', {
    citationCount,
    duration,
  });
}
