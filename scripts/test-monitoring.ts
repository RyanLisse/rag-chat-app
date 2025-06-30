#!/usr/bin/env bun
import { logger, ragMetrics, trackRAGOperation, initializeMonitoring, shutdownMonitoring } from '../lib/monitoring';
import { monitorModelCall, monitorVectorSearch } from '../lib/monitoring/ai-monitoring';

async function testMonitoring() {
  console.log('🚀 Testing monitoring setup...\n');
  
  // Initialize monitoring
  await initializeMonitoring();
  
  // Test 1: Basic logging
  console.log('1️⃣ Testing basic logging...');
  logger.info('Test info message', { test: true, timestamp: Date.now() });
  logger.warn('Test warning message', { level: 'warning' });
  logger.error('Test error message', { error: 'test' }, new Error('Test error'));
  
  // Test 2: RAG metrics
  console.log('\n2️⃣ Testing RAG metrics...');
  
  // Simulate vector search
  await trackRAGOperation(
    'vector_search',
    { query: 'test query', collection: 'documents' },
    async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate latency
      logger.logVectorSearch('test query', 10, 100);
      return { resultCount: 10 };
    }
  );
  
  // Simulate model inference
  await trackRAGOperation(
    'model_inference',
    { model: 'gpt-4', provider: 'openai' },
    async () => {
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate latency
      logger.logModelInference('gpt-4', 100, 50, 200);
      return { tokens: 150 };
    }
  );
  
  // Simulate document processing
  await trackRAGOperation(
    'document_processing',
    { documentId: 'doc-123', documentType: 'pdf' },
    async () => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate latency
      logger.logDocumentProcessing('doc-123', 25, 300);
      return { chunkCount: 25 };
    }
  );
  
  // Test 3: Custom metrics
  console.log('\n3️⃣ Testing custom metrics...');
  ragMetrics.chatMessageCount.add(1, { type: 'user' });
  ragMetrics.chatMessageCount.add(1, { type: 'assistant' });
  ragMetrics.chatSessionDuration.record(120, { userId: 'test-user' });
  ragMetrics.apiRequestCount.add(1, { method: 'POST', path: '/api/chat' });
  ragMetrics.apiRequestDuration.record(150, { method: 'POST', path: '/api/chat', status: '200' });
  
  // Test 4: Error tracking
  console.log('\n4️⃣ Testing error tracking...');
  try {
    await trackRAGOperation(
      'model_inference',
      { model: 'gpt-4', provider: 'openai' },
      async () => {
        throw new Error('Simulated model error');
      }
    );
  } catch (error) {
    console.log('✅ Error properly tracked');
  }
  
  // Test 5: Child logger
  console.log('\n5️⃣ Testing child logger...');
  const requestLogger = logger.child({ requestId: 'req-123', userId: 'user-456' });
  requestLogger.info('Request processed', { duration: 100 });
  
  // Wait a bit for metrics to be exported
  console.log('\n⏳ Waiting for metrics export...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Shutdown monitoring
  console.log('\n🛑 Shutting down monitoring...');
  await shutdownMonitoring();
  
  console.log('\n✅ Monitoring test completed!');
  console.log('\nCheck your configured endpoints for:');
  console.log('- Traces in OpenTelemetry collector or Honeycomb');
  console.log('- Logs in console or log aggregation service');
  console.log('- Errors in Sentry (if configured)');
}

// Run the test
testMonitoring().catch(console.error);