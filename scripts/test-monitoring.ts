#!/usr/bin/env bun
import {
  initializeMonitoring,
  logger,
  ragMetrics,
  shutdownMonitoring,
  trackRAGOperation,
} from '../lib/monitoring';

async function testMonitoring() {
  // Initialize monitoring
  await initializeMonitoring();
  logger.info('Test info message', { test: true, timestamp: Date.now() });
  logger.warn('Test warning message', { level: 'warning' });
  logger.error(
    'Test error message',
    { error: 'test' },
    new Error('Test error')
  );

  // Simulate vector search
  await trackRAGOperation(
    'vector_search',
    { query: 'test query', collection: 'documents' },
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate latency
      logger.logVectorSearch('test query', 10, 100);
      return { resultCount: 10 };
    }
  );

  // Simulate model inference
  await trackRAGOperation(
    'model_inference',
    { model: 'gpt-4', provider: 'openai' },
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate latency
      logger.logModelInference('gpt-4', 100, 50, 200);
      return { tokens: 150 };
    }
  );

  // Simulate document processing
  await trackRAGOperation(
    'document_processing',
    { documentId: 'doc-123', documentType: 'pdf' },
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate latency
      logger.logDocumentProcessing('doc-123', 25, 300);
      return { chunkCount: 25 };
    }
  );
  ragMetrics.chatMessageCount.add(1, { type: 'user' });
  ragMetrics.chatMessageCount.add(1, { type: 'assistant' });
  ragMetrics.chatSessionDuration.record(120, { userId: 'test-user' });
  ragMetrics.apiRequestCount.add(1, { method: 'POST', path: '/api/chat' });
  ragMetrics.apiRequestDuration.record(150, {
    method: 'POST',
    path: '/api/chat',
    status: '200',
  });
  try {
    await trackRAGOperation(
      'model_inference',
      { model: 'gpt-4', provider: 'openai' },
      async () => {
        throw new Error('Simulated model error');
      }
    );
  } catch (_error) {}
  const requestLogger = logger.child({
    requestId: 'req-123',
    userId: 'user-456',
  });
  requestLogger.info('Request processed', { duration: 100 });
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await shutdownMonitoring();
}

// Run the test
testMonitoring().catch(console.error);
