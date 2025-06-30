import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'sk-test-openai-key-1234567890';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-anthropic-key-1234567890';
process.env.GOOGLE_API_KEY = 'test-google-key-1234567890';
process.env.XAI_API_KEY = 'test-xai-key-1234567890';
// Set test environment flag
process.env.PLAYWRIGHT_TEST_BASE_URL = 'http://localhost:3000';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.matchMedia for components that use it
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock IntersectionObserver
if (typeof global !== 'undefined') {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Mock ResizeObserver
if (typeof global !== 'undefined') {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Mock crypto for Node.js compatibility
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2),
    subtle: {} as SubtleCrypto,
    getRandomValues: (arr: any) => arr.map(() => Math.floor(Math.random() * 256)),
  } as Crypto;
}

// Mock Response for Node.js compatibility
if (!global.Response) {
  global.Response = class MockResponse {
    status: number;
    headers: Map<string, string>;
    body: any;

    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map();
      
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => this.headers.set(key, value));
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => this.headers.set(key, value));
        } else {
          Object.entries(init.headers).forEach(([key, value]) => this.headers.set(key, value));
        }
      }
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

    get ok() {
      return this.status >= 200 && this.status < 300;
    }
  } as any;
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});