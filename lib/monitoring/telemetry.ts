import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { trace, metrics, DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';

// Enable diagnostics for debugging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const environment = process.env.NODE_ENV || 'development';
const serviceName = 'rag-chat-app';
const serviceVersion = process.env.npm_package_version || '1.0.0';

// Configure resource
const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
    environment,
    'deployment.environment': environment,
  })
);

// Configure trace exporter
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {
    'x-honeycomb-team': process.env.HONEYCOMB_API_KEY || '',
  },
});

// Configure metrics exporter
const metricExporter = process.env.NODE_ENV === 'production'
  ? new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
    })
  : new ConsoleMetricExporter();

// Create SDK
export const otelSDK = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable fs instrumentation to reduce noise
      },
      '@opentelemetry/instrumentation-net': {
        enabled: false, // Disable net instrumentation to reduce noise
      },
    }),
  ],
});

// Get tracer and meter instances
export const tracer = trace.getTracer(serviceName, serviceVersion);
export const meter = metrics.getMeter(serviceName, serviceVersion);

// Create custom metrics
export const ragMetrics = {
  // Vector search metrics
  vectorSearchDuration: meter.createHistogram('rag.vector_search.duration', {
    description: 'Duration of vector similarity searches in milliseconds',
    unit: 'ms',
  }),
  vectorSearchResults: meter.createHistogram('rag.vector_search.results_count', {
    description: 'Number of results returned from vector search',
  }),
  
  // Model metrics
  modelInferenceDuration: meter.createHistogram('rag.model.inference_duration', {
    description: 'Duration of model inference calls in milliseconds',
    unit: 'ms',
  }),
  modelTokensUsed: meter.createHistogram('rag.model.tokens_used', {
    description: 'Number of tokens used in model calls',
  }),
  modelErrors: meter.createCounter('rag.model.errors', {
    description: 'Count of model errors',
  }),
  
  // Chat metrics
  chatMessageCount: meter.createCounter('rag.chat.messages', {
    description: 'Total number of chat messages processed',
  }),
  chatSessionDuration: meter.createHistogram('rag.chat.session_duration', {
    description: 'Duration of chat sessions in seconds',
    unit: 's',
  }),
  
  // Document processing metrics
  documentProcessingDuration: meter.createHistogram('rag.document.processing_duration', {
    description: 'Time taken to process documents in milliseconds',
    unit: 'ms',
  }),
  documentChunkCount: meter.createHistogram('rag.document.chunk_count', {
    description: 'Number of chunks created from documents',
  }),
  
  // API metrics
  apiRequestDuration: meter.createHistogram('api.request.duration', {
    description: 'Duration of API requests in milliseconds',
    unit: 'ms',
  }),
  apiRequestCount: meter.createCounter('api.request.count', {
    description: 'Total number of API requests',
  }),
  apiErrorCount: meter.createCounter('api.error.count', {
    description: 'Total number of API errors',
  }),
};

// Helper function to measure async operations
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = tracer.startSpan(name, { attributes });
  const startTime = Date.now();
  
  try {
    const result = await operation();
    span.setStatus({ code: 1 }); // OK
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
    throw error;
  } finally {
    const duration = Date.now() - startTime;
    span.setAttribute('duration.ms', duration);
    span.end();
  }
}

// Initialize OpenTelemetry
export async function initializeTelemetry() {
  try {
    await otelSDK.start();
    console.log('OpenTelemetry initialized successfully');
  } catch (error) {
    console.error('Error initializing OpenTelemetry:', error);
  }
}

// Shutdown OpenTelemetry gracefully
export async function shutdownTelemetry() {
  try {
    await otelSDK.shutdown();
    console.log('OpenTelemetry shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry:', error);
  }
}