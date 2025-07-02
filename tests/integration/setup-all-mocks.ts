import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Setup process environment
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.GOOGLE_API_KEY = 'test-google-key';

// Mock Response class if not available
if (typeof global.Response === 'undefined') {
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
if (typeof global.Headers === 'undefined') {
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

// Mock fetch globally before any imports
global.fetch = vi.fn();

// Mock AI SDK providers
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn((config) => {
    return vi.fn((modelId) => ({
      modelId,
      provider: 'openai',
      doGenerate: vi.fn(),
      doStream: vi.fn(),
    }));
  }),
  openai: vi.fn((modelId) => ({
    modelId,
    provider: 'openai',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn((config) => {
    return vi.fn((modelId) => ({
      modelId,
      provider: 'anthropic',
      doGenerate: vi.fn(),
      doStream: vi.fn(),
    }));
  }),
  anthropic: vi.fn((modelId) => ({
    modelId,
    provider: 'anthropic',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn((config) => {
    return vi.fn((modelId) => ({
      modelId,
      provider: 'google',
      doGenerate: vi.fn(),
      doStream: vi.fn(),
    }));
  }),
  google: vi.fn((modelId) => ({
    modelId,
    provider: 'google',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  })),
}));

// Setup fetch responses
export function setupFetchMocks() {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  
  mockFetch.mockImplementation((url: string | URL, options?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // OpenAI endpoints
    if (urlString.includes('api.openai.com')) {
      if (urlString.includes('/models')) {
        return Promise.resolve(new Response(JSON.stringify({
          data: [
            { id: 'gpt-4', object: 'model' },
            { id: 'gpt-4-turbo-2024-04-09', object: 'model' },
            { id: 'gpt-4.1', object: 'model' },
            { id: 'o4-mini', object: 'model' },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Test response',
          },
          finish_reason: 'stop',
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    }
    
    // Anthropic endpoints
    if (urlString.includes('api.anthropic.com')) {
      return Promise.resolve(new Response(JSON.stringify({
        id: 'msg-test',
        type: 'message',
        role: 'assistant',
        content: [{
          type: 'text',
          text: 'Test response',
        }],
        model: 'claude-3-opus-20240229',
        stop_reason: 'end_turn',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    }
    
    // Google endpoints
    if (urlString.includes('generativelanguage.googleapis.com')) {
      if (urlString.includes('/models')) {
        return Promise.resolve(new Response(JSON.stringify({
          models: [
            { 
              name: 'models/gemini-2.5-pro',
              supportedGenerationMethods: ['generateContent'],
              displayName: 'Gemini 2.5 Pro',
            },
            { 
              name: 'models/gemini-2.5-flash',
              supportedGenerationMethods: ['generateContent'],
              displayName: 'Gemini 2.5 Flash',
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: 'Test response',
            }],
            role: 'model',
          },
          finishReason: 'STOP',
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    }
    
    // Default 404 response
    return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
    }));
  });
}

// Setup all mocks before tests
beforeAll(() => {
  setupFetchMocks();
});

// Clear mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Restore everything after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

export { setupFetchMocks as setupIntegrationMocks };
export function clearIntegrationMocks() {
  vi.clearAllMocks();
  vi.restoreAllMocks();
}