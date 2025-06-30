# RAG Chat Application Monitoring Setup

This document describes the monitoring infrastructure for the RAG Chat application.

## Overview

The monitoring system provides:
- OpenTelemetry integration for distributed tracing and metrics
- Structured logging with contextual information
- Sentry integration for error tracking
- Custom metrics for RAG-specific operations
- Health check endpoints
- Performance monitoring for AI model calls

## Components

### 1. OpenTelemetry (`lib/monitoring/telemetry.ts`)
- Distributed tracing with automatic instrumentation
- Custom metrics for RAG operations
- Support for multiple exporters (OTLP, Console)

### 2. Logger (`lib/monitoring/logger.ts`)
- Structured JSON logging
- Automatic trace context injection
- Log levels: debug, info, warn, error
- RAG-specific logging methods

### 3. Sentry Integration (`lib/monitoring/sentry.ts`)
- Automatic error capture and reporting
- Performance monitoring
- Custom error context for RAG operations

### 4. AI Monitoring (`lib/monitoring/ai-monitoring.ts`)
- Model call tracking (latency, tokens, errors)
- Vector search performance monitoring
- Document processing metrics
- Streaming response monitoring

### 5. Middleware (`lib/monitoring/middleware.ts`)
- Request/response tracking
- Request ID generation
- Error handling and logging

## Configuration

### Environment Variables

```env
# OpenTelemetry
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
HONEYCOMB_API_KEY=your-honeycomb-api-key

# Sentry
SENTRY_DSN=your-sentry-dsn

# Metrics
METRICS_AUTH_TOKEN=your-metrics-auth-token

# Log Aggregation
LOG_AGGREGATION_SERVICE=elasticsearch
LOG_AGGREGATION_ENDPOINT=http://localhost:9200
LOG_AGGREGATION_API_KEY=your-api-key
LOG_AGGREGATION_INDEX=rag-chat-logs
LOG_BATCH_SIZE=100
LOG_FLUSH_INTERVAL=5000
```

## Health Check Endpoints

### `/api/health`
Main health check endpoint that verifies:
- Database connectivity
- Redis connectivity (if configured)
- Model provider configuration
- Overall system health

### `/api/health/ready`
Readiness check that verifies:
- Required environment variables
- Database connectivity
- AI provider configuration

### `/api/health/live`
Simple liveness check that returns:
- Process uptime
- Process ID
- Current timestamp

### `/api/health/metrics`
System metrics endpoint (protected by auth token):
- Process memory usage
- CPU usage
- Application version
- System information

## Usage Examples

### 1. Basic Logging

```typescript
import { logger } from '@/lib/monitoring';

// Simple logging
logger.info('Operation completed', { userId: '123', action: 'chat' });

// Error logging
try {
  // some operation
} catch (error) {
  logger.error('Operation failed', { userId: '123' }, error);
}
```

### 2. Tracking RAG Operations

```typescript
import { trackRAGOperation } from '@/lib/monitoring';

// Track vector search
const results = await trackRAGOperation(
  'vector_search',
  { query: 'user query', collection: 'documents' },
  async () => {
    const searchResults = await vectorStore.search(query);
    return { ...searchResults, resultCount: searchResults.length };
  }
);

// Track model inference
const response = await trackRAGOperation(
  'model_inference',
  { model: 'gpt-4', promptTokens: 100 },
  async () => {
    return await model.generate(prompt);
  }
);
```

### 3. Monitoring AI Model Calls

```typescript
import { monitorModelCall, monitorStreamingResponse } from '@/lib/monitoring/ai-monitoring';

// Non-streaming call
const result = await monitorModelCall(
  {
    model: 'gpt-4',
    provider: 'openai',
    temperature: 0.7,
  },
  async () => {
    return await openai.chat.completions.create({...});
  }
);

// Streaming call
const monitoring = monitorStreamingResponse({
  model: 'gpt-4',
  provider: 'openai',
});

const stream = await openai.chat.completions.create({
  stream: true,
  // ... other params
});

for await (const chunk of stream) {
  monitoring.onChunk(chunk.choices[0]?.delta?.content || '');
}

monitoring.onComplete({
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300,
});
```

### 4. Using Middleware

```typescript
import { apiRouteMiddleware } from '@/lib/monitoring/middleware';

export const GET = apiRouteMiddleware(async (request) => {
  // Your route logic here
  // Monitoring is automatically applied
  return Response.json({ data: 'example' });
});
```

## Metrics Reference

### RAG Metrics
- `rag.vector_search.duration` - Vector search latency (ms)
- `rag.vector_search.results_count` - Number of search results
- `rag.model.inference_duration` - Model inference latency (ms)
- `rag.model.tokens_used` - Token usage per model call
- `rag.model.errors` - Model error count
- `rag.chat.messages` - Chat message count
- `rag.chat.session_duration` - Chat session duration (s)
- `rag.document.processing_duration` - Document processing time (ms)
- `rag.document.chunk_count` - Document chunk count

### API Metrics
- `api.request.duration` - API request latency (ms)
- `api.request.count` - Total API requests
- `api.error.count` - API error count

## Best Practices

1. **Always use request IDs**: Include request IDs in all log entries for traceability
2. **Log at appropriate levels**: Use debug for development, info for important events, warn for issues, error for failures
3. **Include context**: Always include relevant context (userId, sessionId, etc.) in logs
4. **Track custom metrics**: Use the provided helpers to track RAG-specific operations
5. **Handle errors gracefully**: Use try-catch blocks and log errors with full context
6. **Monitor performance**: Track latency for all external calls (DB, AI models, etc.)

## Troubleshooting

### Logs not appearing
- Check environment variables are set correctly
- Verify log level settings
- Ensure monitoring is initialized in `instrumentation.ts`

### Metrics not being exported
- Verify OTLP endpoints are accessible
- Check for network/firewall issues
- Review exporter configuration

### High memory usage
- Adjust log batch size and flush interval
- Check for memory leaks in custom instrumentation
- Review metric cardinality

## Integration with External Services

### Honeycomb
Set `HONEYCOMB_API_KEY` and configure OTLP endpoints to send traces to Honeycomb.

### Elasticsearch
Configure log aggregation to send structured logs to Elasticsearch for analysis.

### Grafana
Use OTLP metrics exporter to send metrics to Grafana Cloud or self-hosted instance.

### Datadog
Replace Sentry with Datadog APM for unified monitoring and alerting.