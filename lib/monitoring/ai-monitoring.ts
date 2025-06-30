import type { StreamData } from 'ai';
import { logger, ragMetrics, trackRAGOperation } from './index';
import { captureModelError } from './sentry';

interface ModelCallMetadata {
  model: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
}

interface ModelResponse {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason?: string;
}

// Wrapper for model calls with monitoring
export async function monitorModelCall<T>(
  metadata: ModelCallMetadata,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  return trackRAGOperation('model_inference', metadata, async () => {
    try {
      logger.info('Model call started', {
        ...metadata,
        operation: 'model_inference',
      });

      const result = await operation();

      const duration = Date.now() - startTime;
      logger.info('Model call completed', {
        ...metadata,
        duration,
        operation: 'model_inference',
      });

      return result;
    } catch (error) {
      captureModelError(error as Error, metadata.model, metadata.systemPrompt);
      throw error;
    }
  });
}

// Monitor streaming responses
export function monitorStreamingResponse(
  metadata: ModelCallMetadata,
  streamData?: StreamData
) {
  const startTime = Date.now();
  let tokenCount = 0;
  let chunkCount = 0;

  return {
    onChunk: (chunk: string) => {
      chunkCount++;
      tokenCount += chunk.length / 4; // Rough estimation
    },

    onComplete: (response?: ModelResponse) => {
      const duration = Date.now() - startTime;

      const tokens = response?.totalTokens || Math.floor(tokenCount);

      ragMetrics.modelInferenceDuration.record(duration, {
        model: metadata.model,
        provider: metadata.provider,
        streaming: true,
      });

      ragMetrics.modelTokensUsed.record(tokens, {
        model: metadata.model,
        provider: metadata.provider,
      });

      logger.logModelInference(
        metadata.model,
        response?.promptTokens || 0,
        response?.completionTokens || tokens,
        duration,
        {
          provider: metadata.provider,
          streaming: true,
          chunkCount,
        }
      );

      // Append monitoring data to stream if available
      if (streamData) {
        streamData.append({
          monitoring: {
            duration,
            tokens,
            chunkCount,
            model: metadata.model,
            provider: metadata.provider,
          },
        });
      }
    },

    onError: (error: Error) => {
      const duration = Date.now() - startTime;

      ragMetrics.modelErrors.add(1, {
        model: metadata.model,
        provider: metadata.provider,
        error: error.name,
      });

      logger.error(
        'Streaming model call failed',
        {
          ...metadata,
          duration,
          chunkCount,
          operation: 'model_inference',
        },
        error
      );

      captureModelError(error, metadata.model);
    },
  };
}

// Monitor vector search operations
export async function monitorVectorSearch<T>(
  query: string,
  metadata: Record<string, any>,
  operation: () => Promise<T & { resultCount?: number }>
): Promise<T> {
  return trackRAGOperation(
    'vector_search',
    { query, ...metadata },
    async () => {
      const result = await operation();

      // Extract result count if available
      if ('resultCount' in result && typeof result.resultCount === 'number') {
        ragMetrics.vectorSearchResults.record(result.resultCount, metadata);
      }

      return result;
    }
  );
}

// Monitor document processing
export async function monitorDocumentProcessing<T>(
  documentId: string,
  documentType: string,
  operation: () => Promise<T & { chunkCount?: number }>
): Promise<T> {
  return trackRAGOperation(
    'document_processing',
    { documentId, documentType },
    async () => {
      const result = await operation();

      // Extract chunk count if available
      if ('chunkCount' in result && typeof result.chunkCount === 'number') {
        ragMetrics.documentChunkCount.record(result.chunkCount, {
          documentType,
        });
      }

      return result;
    }
  );
}

// Create monitored versions of common AI SDK functions
export function createMonitoredModel(provider: string) {
  return {
    async generateText(params: any) {
      return monitorModelCall(
        {
          model: params.model,
          provider,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
        },
        async () => {
          // Call the actual model here
          // This is a placeholder - integrate with your actual AI SDK
          throw new Error('Implement actual model call');
        }
      );
    },

    async streamText(params: any) {
      const monitoring = monitorStreamingResponse({
        model: params.model,
        provider,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });

      // Return a monitored stream
      // This is a placeholder - integrate with your actual streaming implementation
      return {
        ...params,
        onChunk: monitoring.onChunk,
        onComplete: monitoring.onComplete,
        onError: monitoring.onError,
      };
    },
  };
}
