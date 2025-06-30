// Global test setup for Bun test runner
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.join(process.cwd(), '.env.test') });

// Mock environment setup
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
  
  // Set up global mocks
  global.fetch = global.fetch || (() => Promise.resolve(new Response()));
  
  // Mock window object for components that need it
  if (typeof window === 'undefined') {
    // @ts-ignore
    global.window = {
      location: { href: 'http://localhost:3000' },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      },
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
      },
    };
  }
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  if (global.fetch && typeof global.fetch === 'function' && 'mockClear' in global.fetch) {
    (global.fetch as any).mockClear();
  }
});

// Global teardown
afterAll(() => {
  console.log('✅ Test suite completed');
});