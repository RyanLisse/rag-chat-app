// Streaming Response Test Utilities
import { expect } from 'vitest';
import type { ReadableStream } from 'stream/web';

export interface StreamChunk {
  content: string;
  timestamp: number;
  delta: number;
}

// Helper to collect streaming chunks
export async function collectStreamChunks(
  stream: ReadableStream<Uint8Array>
): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let lastTimestamp = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const currentTimestamp = Date.now();
      const content = decoder.decode(value, { stream: true });
      
      chunks.push({
        content,
        timestamp: currentTimestamp,
        delta: currentTimestamp - lastTimestamp,
      });
      
      lastTimestamp = currentTimestamp;
    }
  } finally {
    reader.releaseLock();
  }

  return chunks;
}

// Assert streaming behavior
export function assertStreamingBehavior(
  chunks: StreamChunk[],
  options: {
    minChunks?: number;
    maxChunkDelay?: number;
    totalContent?: string;
  } = {}
) {
  const { minChunks = 2, maxChunkDelay = 5000, totalContent } = options;

  // Check minimum chunks
  expect(chunks.length).toBeGreaterThanOrEqual(minChunks);

  // Check streaming delays
  const delays = chunks.slice(1).map(c => c.delta);
  delays.forEach(delay => {
    expect(delay).toBeLessThanOrEqual(maxChunkDelay);
  });

  // Check total content if provided
  if (totalContent) {
    const reconstructed = chunks.map(c => c.content).join('');
    expect(reconstructed).toBe(totalContent);
  }
}

// Mock SSE (Server-Sent Events) for testing
export class MockSSEStream {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private encoder = new TextEncoder();

  createStream(): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        this.controller = null;
      },
    });
  }

  sendEvent(event: string, data: any) {
    if (!this.controller) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.controller.enqueue(this.encoder.encode(message));
  }

  sendData(data: string) {
    if (!this.controller) return;

    const message = `data: ${data}\n\n`;
    this.controller.enqueue(this.encoder.encode(message));
  }

  close() {
    this.controller?.close();
  }

  error(error: Error) {
    this.controller?.error(error);
  }
}

// Test helper for streaming chat responses
export async function testStreamingChat(
  endpoint: string,
  messages: any[],
  assertions: (chunks: StreamChunk[]) => void
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  expect(response.ok).toBe(true);
  expect(response.headers.get('content-type')).toContain('text/event-stream');

  if (!response.body) {
    throw new Error('No response body');
  }

  const chunks = await collectStreamChunks(response.body);
  assertions(chunks);
}

// Utility to simulate slow network conditions
export function createSlowStream(
  content: string,
  chunkSize: number = 10,
  delay: number = 100
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let position = 0;

  return new ReadableStream({
    async pull(controller) {
      if (position >= content.length) {
        controller.close();
        return;
      }

      // Better timer handling for test environments
      if (delay > 0) {
        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay);
          // In test environments, ensure proper cleanup for timer stability
          if (typeof global !== 'undefined' && global.process?.env?.NODE_ENV === 'test') {
            timer.unref?.();
          }
        });
      }
      
      const chunk = content.slice(position, position + chunkSize);
      position += chunkSize;
      
      controller.enqueue(encoder.encode(chunk));
    },
  });
}

// Parse SSE stream data
export async function parseSSEStream(stream: ReadableStream<Uint8Array>): Promise<any[]> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  const events: any[] = [];
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          
          try {
            events.push(JSON.parse(data));
          } catch (e) {
            // Handle non-JSON data
            events.push(data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return events;
}