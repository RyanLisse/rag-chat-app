// Unit Tests for lib/utils.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cn,
  fetcher,
  fetchWithErrorHandlers,
  getLocalStorage,
  generateUUID,
  getMostRecentUserMessage,
  getDocumentTimestampByIndex,
  getTrailingMessageId,
  sanitizeText,
} from '@/lib/utils';
import { ChatSDKError } from '@/lib/errors';
import type { UIMessage } from 'ai';
import type { Document } from '@/lib/db/schema';

describe('cn (classname utility)', () => {
  it('should merge classnames correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classnames', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('should merge tailwind classes properly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle arrays and objects', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null, undefined)).toBe('');
  });

  it('should handle complex combinations', () => {
    // When using twMerge, later classes should override earlier ones for the same property
    const result = cn(
      'base-class',
      ['array-class-1', 'array-class-2'],
      { 'conditional-true': true, 'conditional-false': false },
      'override-class px-4',
      'px-2' // Should override px-4
    );
    
    // Check that the result contains all expected classes
    expect(result).toContain('base-class');
    expect(result).toContain('array-class-1');
    expect(result).toContain('array-class-2');
    expect(result).toContain('conditional-true');
    expect(result).toContain('override-class');
    expect(result).not.toContain('conditional-false');
    
    // For conflicting Tailwind classes, the last one should win
    expect(result).toContain('px-2');
    expect(result).not.toContain('px-4');
  });
});

describe('fetcher', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn((url: string) => {
      if (url === '/api/success') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        });
      }
      if (url === '/api/error') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ code: 'test:error', cause: 'Test error' }),
        });
      }
      return Promise.reject(new Error('Network error'));
    });
    
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and return JSON data for successful requests', async () => {
    const result = await fetcher('/api/success');
    expect(result).toEqual({ data: 'success' });
    expect(mockFetch).toHaveBeenCalledWith('/api/success');
  });

  it('should throw ChatSDKError for non-ok responses', async () => {
    try {
      await fetcher('/api/error');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ChatSDKError);
      expect((error as ChatSDKError).code).toBe('test:error');
      expect((error as ChatSDKError).message).toBe('Something went wrong. Please try again later.');
      expect((error as ChatSDKError).cause).toBe('Test error');
    }
  });

  it('should propagate network errors', async () => {
    try {
      await fetcher('/api/network-error');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Network error');
    }
  });
});

describe('fetchWithErrorHandlers', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let originalNavigator: typeof navigator;

  beforeEach(() => {
    mockFetch = vi.fn((url: string) => {
      if (url === '/api/success') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        });
      }
      if (url === '/api/error') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ code: 'test:error', cause: 'Test error' }),
        });
      }
      return Promise.reject(new Error('Network error'));
    });
    
    global.fetch = mockFetch as any;
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.navigator = originalNavigator;
  });

  it('should return response for successful requests', async () => {
    const response = await fetchWithErrorHandlers('/api/success');
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data).toEqual({ data: 'success' });
  });

  it('should throw ChatSDKError for non-ok responses', async () => {
    try {
      await fetchWithErrorHandlers('/api/error');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ChatSDKError);
      expect((error as ChatSDKError).code).toBe('test:error');
    }
  });

  it('should throw offline error when navigator is offline', async () => {
    // Mock navigator.onLine
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    });

    try {
      await fetchWithErrorHandlers('/api/network-error');
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(ChatSDKError);
      expect((error as ChatSDKError).code).toBe('offline:chat');
    }
  });

  it('should accept and pass RequestInit options', async () => {
    await fetchWithErrorHandlers('/api/success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });
  });

  it('should work with URL objects', async () => {
    const url = new URL('https://example.com/api/success');
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: 'success' }),
    }));

    const response = await fetchWithErrorHandlers(url);
    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(url, undefined);
  });
});

describe('getLocalStorage', () => {
  let originalWindow: typeof window;
  let mockStorage: { [key: string]: string } = {};

  beforeEach(() => {
    originalWindow = global.window;
    mockStorage = {};
    
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: Object.keys(mockStorage).length,
      key: (index: number) => Object.keys(mockStorage)[index] || null,
    };
    
    // Mock both window.localStorage and global localStorage
    Object.defineProperty(global, 'window', {
      value: {
        localStorage: mockLocalStorage,
      },
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    } else {
      delete (global as any).window;
    }
    
    // Clean up global localStorage mock
    delete (global as any).localStorage;
  });

  it('should return parsed JSON from localStorage', () => {
    window.localStorage.setItem('testKey', JSON.stringify(['item1', 'item2']));
    const result = getLocalStorage('testKey');
    expect(result).toEqual(['item1', 'item2']);
  });

  it('should return empty array if key does not exist', () => {
    const result = getLocalStorage('nonExistentKey');
    expect(result).toEqual([]);
  });

  it('should return empty array if localStorage contains invalid JSON', () => {
    window.localStorage.setItem('invalidJson', 'not-json');
    const result = getLocalStorage('invalidJson');
    expect(result).toEqual([]);
  });

  it('should return empty array in non-browser environment', () => {
    // Temporarily remove window
    delete (global as any).window;
    const result = getLocalStorage('anyKey');
    expect(result).toEqual([]);
    
    // Restore window
    global.window = originalWindow;
  });

  it('should handle complex data structures', () => {
    const complexData = {
      users: ['user1', 'user2'],
      settings: { theme: 'dark', language: 'en' },
      count: 42,
    };
    window.localStorage.setItem('complex', JSON.stringify(complexData));
    const result = getLocalStorage('complex');
    expect(result).toEqual(complexData);
  });
});

describe('generateUUID', () => {
  it('should generate a valid UUID format', () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique UUIDs', () => {
    const uuids = new Set();
    for (let i = 0; i < 1000; i++) {
      uuids.add(generateUUID());
    }
    expect(uuids.size).toBe(1000);
  });

  it('should always have 4 in the third segment', () => {
    for (let i = 0; i < 100; i++) {
      const uuid = generateUUID();
      const thirdSegment = uuid.split('-')[2];
      expect(thirdSegment[0]).toBe('4');
    }
  });

  it('should have correct variant bits in fourth segment', () => {
    for (let i = 0; i < 100; i++) {
      const uuid = generateUUID();
      const fourthSegment = uuid.split('-')[3];
      const firstChar = fourthSegment[0].toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(firstChar);
    }
  });
});

describe('getMostRecentUserMessage', () => {
  it('should return the most recent user message', () => {
    const messages: UIMessage[] = [
      { id: '1', role: 'user', content: 'First user message', createdAt: new Date('2024-01-01') },
      { id: '2', role: 'assistant', content: 'Assistant response', createdAt: new Date('2024-01-02') },
      { id: '3', role: 'user', content: 'Second user message', createdAt: new Date('2024-01-03') },
      { id: '4', role: 'assistant', content: 'Another response', createdAt: new Date('2024-01-04') },
      { id: '5', role: 'user', content: 'Most recent user message', createdAt: new Date('2024-01-05') },
    ];

    const result = getMostRecentUserMessage(messages);
    expect(result?.id).toBe('5');
    expect(result?.content).toBe('Most recent user message');
  });

  it('should return undefined for empty messages array', () => {
    const result = getMostRecentUserMessage([]);
    expect(result).toBeUndefined();
  });

  it('should return undefined when no user messages exist', () => {
    const messages: UIMessage[] = [
      { id: '1', role: 'assistant', content: 'Assistant message 1', createdAt: new Date() },
      { id: '2', role: 'assistant', content: 'Assistant message 2', createdAt: new Date() },
    ];

    const result = getMostRecentUserMessage(messages);
    expect(result).toBeUndefined();
  });

  it('should handle messages with tool role', () => {
    const messages: UIMessage[] = [
      { id: '1', role: 'user', content: 'User message', createdAt: new Date('2024-01-01') },
      { id: '2', role: 'tool', content: 'Tool message', createdAt: new Date('2024-01-02') },
      { id: '3', role: 'assistant', content: 'Assistant message', createdAt: new Date('2024-01-03') },
    ];

    const result = getMostRecentUserMessage(messages);
    expect(result?.id).toBe('1');
  });
});

describe('getDocumentTimestampByIndex', () => {
  const mockDocuments: Document[] = [
    { id: '1', createdAt: new Date('2024-01-01'), title: 'Doc 1' } as Document,
    { id: '2', createdAt: new Date('2024-01-02'), title: 'Doc 2' } as Document,
    { id: '3', createdAt: new Date('2024-01-03'), title: 'Doc 3' } as Document,
  ];

  it('should return the correct document timestamp by index', () => {
    const timestamp = getDocumentTimestampByIndex(mockDocuments, 1);
    expect(timestamp).toEqual(new Date('2024-01-02'));
  });

  it('should return the first document timestamp for index 0', () => {
    const timestamp = getDocumentTimestampByIndex(mockDocuments, 0);
    expect(timestamp).toEqual(new Date('2024-01-01'));
  });

  it('should return current date if documents is undefined', () => {
    const timestamp = getDocumentTimestampByIndex(undefined as any, 0);
    const now = new Date();
    expect(timestamp.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
  });

  it('should return current date if index is out of bounds', () => {
    const timestamp = getDocumentTimestampByIndex(mockDocuments, 10);
    const now = new Date();
    expect(timestamp.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
  });

  it('should return current date for negative index', () => {
    const timestamp = getDocumentTimestampByIndex(mockDocuments, -1);
    const now = new Date();
    expect(timestamp.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
  });

  it('should handle empty documents array', () => {
    const timestamp = getDocumentTimestampByIndex([], 0);
    const now = new Date();
    expect(timestamp.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
  });
});

describe('getTrailingMessageId', () => {
  it('should return the id of the last message', () => {
    const messages = [
      { id: '1', role: 'assistant' as const, content: 'First' },
      { id: '2', role: 'tool' as const, content: 'Second' },
      { id: '3', role: 'assistant' as const, content: 'Last' },
    ];

    const result = getTrailingMessageId({ messages });
    expect(result).toBe('3');
  });

  it('should return null for empty messages array', () => {
    const result = getTrailingMessageId({ messages: [] });
    expect(result).toBeNull();
  });

  it('should work with single message', () => {
    const messages = [
      { id: 'only-one', role: 'assistant' as const, content: 'Single message' },
    ];

    const result = getTrailingMessageId({ messages });
    expect(result).toBe('only-one');
  });

  it('should handle messages with complex content', () => {
    const messages = [
      { 
        id: 'complex-1', 
        role: 'assistant' as const, 
        content: 'Text',
        tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }],
      },
      { 
        id: 'complex-2', 
        role: 'tool' as const, 
        content: 'Tool result',
        tool_call_id: '1',
      },
    ];

    const result = getTrailingMessageId({ messages });
    expect(result).toBe('complex-2');
  });
});

describe('sanitizeText', () => {
  it('should remove <has_function_call> tag from text', () => {
    const input = 'Some text <has_function_call> more text';
    const result = sanitizeText(input);
    expect(result).toBe('Some text  more text');
  });

  it('should handle text without the tag', () => {
    const input = 'Normal text without special tags';
    const result = sanitizeText(input);
    expect(result).toBe('Normal text without special tags');
  });

  it('should remove multiple occurrences of the tag', () => {
    const input = '<has_function_call>Start<has_function_call>Middle<has_function_call>End';
    const result = sanitizeText(input);
    expect(result).toBe('StartMiddleEnd');
  });

  it('should handle empty string', () => {
    const result = sanitizeText('');
    expect(result).toBe('');
  });

  it('should handle text with only the tag', () => {
    const result = sanitizeText('<has_function_call>');
    expect(result).toBe('');
  });

  it('should preserve other HTML-like tags', () => {
    const input = '<div>Content</div> <has_function_call> <span>More</span>';
    const result = sanitizeText(input);
    expect(result).toBe('<div>Content</div>  <span>More</span>');
  });

  it('should handle text with newlines and special characters', () => {
    const input = 'Line 1\n<has_function_call>\nLine 2\t<has_function_call>\rLine 3';
    const result = sanitizeText(input);
    expect(result).toBe('Line 1\n\nLine 2\t\rLine 3');
  });
});