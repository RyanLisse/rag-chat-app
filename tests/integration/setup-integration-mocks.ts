import { vi } from 'vitest';

// Mock the OpenAI module completely
vi.mock('openai', () => {
  const mockClient = {
  files: {
    create: vi.fn().mockImplementation((params) => 
      Promise.resolve({ 
        id: `file-${Date.now()}`, 
        object: 'file',
        bytes: params.file?.size || 1024,
        created_at: Date.now(),
        filename: params.file?.name || 'test.txt',
        purpose: params.purpose || 'assistants',
        status: 'processed',
      })
    ),
    del: vi.fn().mockResolvedValue({ id: 'file-123', deleted: true }),
    retrieve: vi.fn().mockResolvedValue({ id: 'file-123', status: 'processed' }),
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
  vectorStores: {
    create: vi.fn().mockResolvedValue({ id: 'vs-123', name: 'Test Store' }),
    retrieve: vi.fn().mockResolvedValue({ id: 'vs-123', name: 'Test Store' }),
    del: vi.fn().mockResolvedValue({ id: 'vs-123', deleted: true }),
    list: vi.fn().mockResolvedValue({ data: [] }),
    files: {
      create: vi.fn().mockResolvedValue({ id: 'vsf-123', status: 'in_progress' }),
      retrieve: vi.fn().mockImplementation((vectorStoreId: string, fileId: string) =>
        Promise.resolve({ 
          id: fileId, 
          object: 'vector_store.file',
          status: 'completed',
          vector_store_id: vectorStoreId,
          created_at: Date.now(),
        })
      ),
      del: vi.fn().mockResolvedValue({ id: 'vsf-123', deleted: true }),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    fileBatches: {
      create: vi.fn().mockResolvedValue({
        id: 'batch-123',
        object: 'vector_store.file_batch',
        status: 'in_progress',
        file_counts: { completed: 0, in_progress: 1, failed: 0, total: 1 },
        vector_store_id: 'vs-123',
        created_at: Date.now(),
      }),
      retrieve: vi.fn().mockImplementation((vectorStoreId: string, batchId: string) => 
        Promise.resolve({
          id: batchId,
          object: 'vector_store.file_batch',
          status: 'completed',
          file_counts: { completed: 1, in_progress: 0, failed: 0, total: 1 },
          vector_store_id: vectorStoreId,
          created_at: Date.now(),
        })
      ),
      cancel: vi.fn().mockResolvedValue({ id: 'batch-123', status: 'cancelled' }),
      listFiles: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
  beta: {
    threads: {
      create: vi.fn().mockResolvedValue({ id: 'thread-123' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'thread-123' }),
      del: vi.fn().mockResolvedValue({ id: 'thread-123', deleted: true }),
      messages: {
        create: vi.fn().mockResolvedValue({ id: 'msg-123', role: 'user' }),
        list: vi.fn().mockResolvedValue({ data: [] }),
        retrieve: vi.fn().mockResolvedValue({ id: 'msg-123', role: 'user' }),
      },
      runs: {
        create: vi.fn().mockResolvedValue({ id: 'run-123', status: 'queued' }),
        retrieve: vi.fn().mockResolvedValue({ id: 'run-123', status: 'completed' }),
        list: vi.fn().mockResolvedValue({ data: [] }),
        cancel: vi.fn().mockResolvedValue({ id: 'run-123', status: 'cancelled' }),
      },
    },
    assistants: {
      create: vi.fn().mockResolvedValue({ id: 'asst-123', name: 'Test Assistant' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'asst-123', name: 'Test Assistant' }),
      update: vi.fn().mockResolvedValue({ id: 'asst-123', name: 'Test Assistant' }),
      del: vi.fn().mockResolvedValue({ id: 'asst-123', deleted: true }),
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Mock response' },
          finish_reason: 'stop',
        }],
      }),
    },
  },
  };

  const OpenAI = vi.fn().mockImplementation(() => mockClient);
  
  return {
    default: OpenAI,
  };
});

// Create OpenAI mock factory function
const createOpenAIMock = () => {
  const mockClient = {
    files: {
      create: vi.fn().mockImplementation((params) => 
        Promise.resolve({ 
          id: `file-${Date.now()}`, 
          object: 'file',
          bytes: params.file?.size || 1024,
          created_at: Date.now(),
          filename: params.file?.name || 'test.txt',
          purpose: params.purpose || 'assistants',
          status: 'processed',
        })
      ),
    },
    vectorStores: {
      create: vi.fn().mockResolvedValue({ id: 'vs-123', name: 'Test Store' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'vs-123', name: 'Test Store' }),
      fileBatches: {
        create: vi.fn().mockResolvedValue({
          id: 'batch-123',
          object: 'vector_store.file_batch',
          status: 'in_progress',
          file_counts: { completed: 0, in_progress: 1, failed: 0, total: 1 },
          vector_store_id: 'vs-123',
          created_at: Date.now(),
        }),
        retrieve: vi.fn().mockImplementation((vectorStoreId: string, batchId: string) => 
          Promise.resolve({
            id: batchId,
            object: 'vector_store.file_batch',
            status: 'completed',
            file_counts: { completed: 1, in_progress: 0, failed: 0, total: 1 },
            vector_store_id: vectorStoreId,
            created_at: Date.now(),
          })
        ),
      },
      files: {
        retrieve: vi.fn().mockImplementation((vectorStoreId: string, fileId: string) =>
          Promise.resolve({ 
            id: fileId, 
            object: 'vector_store.file',
            status: 'completed',
            vector_store_id: vectorStoreId,
            created_at: Date.now(),
          })
        ),
      },
    },
  };
  
  return mockClient;
};

// Export the mock factory function for tests to use  
export { createOpenAIMock };

// Mock fetch responses for integration tests
export function setupIntegrationMocks() {
  // Mock Response class if not available
  if (typeof Response === 'undefined') {
    global.Response = class MockResponse {
      status: number;
      ok: boolean;
      headers: Headers;
      statusText: string;
      private body: any;

      constructor(body?: any, init?: ResponseInit) {
        this.body = body;
        this.status = init?.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = init?.statusText || 'OK';
        this.headers = new Headers(init?.headers);
      }

      static json(data: any, init?: ResponseInit) {
        return new MockResponse(JSON.stringify(data), {
          ...init,
          headers: {
            'content-type': 'application/json',
            ...(init?.headers || {}),
          },
        });
      }

      async json() {
        return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
      }

      async text() {
        return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
      }
    } as any;
  }

  // Mock Headers class if not available
  if (typeof Headers === 'undefined') {
    global.Headers = class MockHeaders {
      private headers: Map<string, string> = new Map();

      constructor(init?: HeadersInit) {
        if (init) {
          if (init instanceof Array) {
            init.forEach(([key, value]) => this.headers.set(key.toLowerCase(), value));
          } else if (typeof init === 'object') {
            Object.entries(init).forEach(([key, value]) => {
              this.headers.set(key.toLowerCase(), String(value));
            });
          }
        }
      }

      get(name: string) {
        return this.headers.get(name.toLowerCase()) || null;
      }

      set(name: string, value: string) {
        this.headers.set(name.toLowerCase(), value);
      }

      forEach(callback: (value: string, key: string) => void) {
        this.headers.forEach((value, key) => callback(value, key));
      }
    } as any;
  }

  // Mock successful OpenAI API responses
  const mockOpenAIResponse = () => {
    return Promise.resolve(new Response(JSON.stringify({
      id: 'mock-openai-response',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Mock OpenAI response',
        },
        finish_reason: 'stop',
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
  };

  // Mock successful Anthropic API responses
  const mockAnthropicResponse = () => {
    return Promise.resolve(new Response(JSON.stringify({
      id: 'mock-anthropic-response',
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: 'Mock Anthropic response',
      }],
      model: 'claude-3-opus-20240229',
      stop_reason: 'end_turn',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
  };

  // Mock successful Google API responses
  const mockGoogleResponse = () => {
    return Promise.resolve(new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            text: 'Mock Google response',
          }],
          role: 'model',
        },
        finishReason: 'STOP',
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
  };

  // Setup fetch mock with URL-based routing
  global.fetch = vi.fn((url, options) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Mock OpenAI endpoints
    if (urlString.includes('api.openai.com')) {
      if (urlString.includes('/models')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: [
            { id: 'gpt-4', object: 'model' },
            { id: 'gpt-4-turbo-2024-04-09', object: 'model' },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }));
      }
      return mockOpenAIResponse();
    }
    
    // Mock Anthropic endpoints
    if (urlString.includes('api.anthropic.com')) {
      // Mock health check endpoint
      if (urlString.includes('/v1/messages') && options?.method === 'POST') {
        return mockAnthropicResponse();
      }
      return mockAnthropicResponse();
    }
    
    // Mock Google endpoints
    if (urlString.includes('generativelanguage.googleapis.com')) {
      if (urlString.includes('/v1beta/models')) {
        return Promise.resolve(new Response(JSON.stringify({
          models: [
            { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }));
      }
      return mockGoogleResponse();
    }
    
    // Default response for unknown endpoints
    return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
    }));
  }) as any;
}

// Clear mocks
export function clearIntegrationMocks() {
  vi.clearAllMocks();
  vi.restoreAllMocks();
}