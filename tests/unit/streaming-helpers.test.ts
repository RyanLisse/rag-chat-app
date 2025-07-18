// Unit Tests for Streaming Test Helpers
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectStreamChunks,
  assertStreamingBehavior,
  MockSSEStream,
  createSlowStream,
  parseSSEStream,
} from '../utils/streaming-test-helpers';

// Setup fake timers for streaming tests
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('collectStreamChunks', () => {
  it('should collect all chunks from a stream', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('Hello '));
        controller.enqueue(encoder.encode('World'));
        controller.close();
      },
    });

    const chunks = await collectStreamChunks(stream);
    
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toBe('Hello ');
    expect(chunks[1].content).toBe('World');
    expect(chunks[0].timestamp).toBeLessThanOrEqual(chunks[1].timestamp);
  });

  it('should calculate chunk delays correctly', async () => {
    const encoder = new TextEncoder();
    
    // Create a controlled stream with fake timers
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('chunk1'));
        
        // Use fake timer compatible delay
        setTimeout(() => {
          controller.enqueue(encoder.encode('chunk2'));
          controller.close();
        }, 50);
      },
    });

    const collectPromise = collectStreamChunks(stream);
    
    // Advance timers to trigger the delay
    await vi.advanceTimersByTimeAsync(60);
    
    const chunks = await collectPromise;
    
    expect(chunks).toHaveLength(2);
    expect(chunks[0].content).toBe('chunk1');
    expect(chunks[1].content).toBe('chunk2');
    // With fake timers, the delta should be close to the setTimeout delay
    expect(chunks[1].delta).toBeGreaterThanOrEqual(45);
  });
});

describe('assertStreamingBehavior', () => {
  it('should validate streaming chunks meet requirements', () => {
    const chunks = [
      { content: 'Hello ', timestamp: 1000, delta: 0 },
      { content: 'World', timestamp: 1050, delta: 50 },
      { content: '!', timestamp: 1100, delta: 50 },
    ];

    // Should not throw
    assertStreamingBehavior(chunks, {
      minChunks: 2,
      maxChunkDelay: 100,
      totalContent: 'Hello World!',
    });
  });

  it('should fail when chunks are too slow', () => {
    const chunks = [
      { content: 'Hello', timestamp: 1000, delta: 0 },
      { content: 'World', timestamp: 2100, delta: 1100 }, // Too slow
    ];

    expect(() => {
      assertStreamingBehavior(chunks, {
        maxChunkDelay: 1000,
      });
    }).toThrow();
  });
});

describe('MockSSEStream', () => {
  it('should create SSE formatted streams', async () => {
    const sse = new MockSSEStream();
    const stream = sse.createStream();
    
    sse.sendEvent('message', { text: 'Hello' });
    sse.sendData('[DONE]');
    sse.close();
    
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    let content = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      content += decoder.decode(value);
    }
    
    expect(content).toContain('event: message');
    expect(content).toContain('data: {"text":"Hello"}');
    expect(content).toContain('data: [DONE]');
  });

  it('should handle errors in SSE stream', async () => {
    const sse = new MockSSEStream();
    const stream = sse.createStream();
    const error = new Error('Stream error');
    
    sse.error(error);
    
    const reader = stream.getReader();
    
    await expect(reader.read()).rejects.toThrow('Stream error');
  });
});

describe('createSlowStream', () => {
  it('should create a stream with controlled delays', async () => {
    const content = 'Hello World';
    const chunkSize = 5;
    const delay = 20;
    
    const stream = createSlowStream(content, chunkSize, delay);
    const collectPromise = collectStreamChunks(stream);
    
    // Advance timers gradually to simulate the delays
    await vi.advanceTimersByTimeAsync(delay); // First chunk delay
    await vi.advanceTimersByTimeAsync(delay); // Second chunk delay
    await vi.advanceTimersByTimeAsync(delay); // Third chunk delay
    
    const chunks = await collectPromise;
    
    expect(chunks).toHaveLength(3); // "Hello", " Worl", "d"
    expect(chunks[0].content).toBe('Hello');
    expect(chunks[1].content).toBe(' Worl');
    expect(chunks[2].content).toBe('d');
    
    // Check delays (with some tolerance for fake timers)
    expect(chunks[1].delta).toBeGreaterThanOrEqual(delay - 5);
    expect(chunks[2].delta).toBeGreaterThanOrEqual(delay - 5);
  });
});

describe('parseSSEStream', () => {
  it('should parse SSE formatted data', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"id":1}\n\n'));
        controller.enqueue(encoder.encode('data: {"id":2}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const events = await parseSSEStream(stream);
    
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ id: 1 });
    expect(events[1]).toEqual({ id: 2 });
  });

  it('should handle non-JSON SSE data', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: plain text\n\n'));
        controller.enqueue(encoder.encode('data: another line\n\n'));
        controller.close();
      },
    });

    const events = await parseSSEStream(stream);
    
    expect(events).toHaveLength(2);
    expect(events[0]).toBe('plain text');
    expect(events[1]).toBe('another line');
  });
});