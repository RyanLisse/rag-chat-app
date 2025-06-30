// Unit Tests for lib/ai/tools
import { describe, it, expect, beforeEach, afterEach, vi, vi } from 'vitest';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { DataStreamWriter } from 'ai';
import { Session } from 'next-auth';
import { z } from 'zod';

describe('getWeather Tool', () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = vi.fn((url: string) => {
      if (url.includes('open-meteo.com')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            current: {
              temperature_2m: 22.5,
              time: '2024-01-01T12:00',
            },
            hourly: {
              temperature_2m: [20, 21, 22, 23, 24],
            },
            daily: {
              sunrise: ['2024-01-01T06:00'],
              sunset: ['2024-01-01T18:00'],
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockRestore();
  
  });

  it('should have correct tool configuration', () => {
    expect(getWeather.description).toBe('Get the current weather at a location');
    expect(getWeather.parameters).toBeDefined();
  });

  it('should validate parameters correctly', () => {
    const validParams = { latitude: 40.7128, longitude: -74.0060 };
    const result = getWeather.parameters.safeParse(validParams);
    expect(result.success).toBe(true);

    const invalidParams = { latitude: 'not-a-number', longitude: -74.0060 };
    const invalidResult = getWeather.parameters.safeParse(invalidParams);
    expect(invalidResult.success).toBe(false);
  });

  it('should fetch weather data successfully', async () => {
    const params = { latitude: 40.7128, longitude: -74.0060 };
    const result = await getWeather.execute(params);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.open-meteo.com/v1/forecast')
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`latitude=${params.latitude}`)
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`longitude=${params.longitude}`)
    );

    expect(result).toHaveProperty('current');
    expect(result).toHaveProperty('hourly');
    expect(result).toHaveProperty('daily');
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('API Error')));

    try {
      await getWeather.execute({ latitude: 40.7128, longitude: -74.0060 });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('API Error');
    }
  });

  it('should work with edge case coordinates', async () => {
    const edgeCases = [
      { latitude: 90, longitude: 0 }, // North Pole
      { latitude: -90, longitude: 0 }, // South Pole
      { latitude: 0, longitude: 180 }, // International Date Line
      { latitude: 0, longitude: -180 }, // International Date Line (negative)
    ];

    for (const coords of edgeCases) {
      const result = await getWeather.execute(coords);
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`latitude=${coords.latitude}&longitude=${coords.longitude}`)
      );
    }
  });
});

describe('createDocument Tool', () => {
  let mockDataStream: DataStreamWriter;
  let mockSession: Session;
  let mockGenerateUUID: ReturnType<typeof mock>;

  beforeEach(() => {
    // Mock DataStreamWriter
    mockDataStream = {
      writeData: vi.fn(() => {}),
    } as any;

    // Mock session
    mockSession = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    } as Session;

    // Mock generateUUID
    mockGenerateUUID = vi.fn(() => 'test-uuid-123');
    mock.module('@/lib/utils', () => ({
      generateUUID: mockGenerateUUID,
    }));

    // Mock document handlers
    mock.module('@/lib/artifacts/server', () => ({
      artifactKinds: ['text', 'code', 'sheet'],
      documentHandlersByArtifactKind: [
        {
          kind: 'text',
          onCreateDocument: vi.fn(async () => {}),
        },
        {
          kind: 'code',
          onCreateDocument: vi.fn(async () => {}),
        },
        {
          kind: 'sheet',
          onCreateDocument: vi.fn(async () => {}),
        },
      ],
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mock.restore();
  
  });

  it('should create document tool with session and dataStream', () => {
    const tool = createDocument({ session: mockSession, dataStream: mockDataStream });
    
    expect(tool.description).toContain('Create a document');
    expect(tool.parameters).toBeDefined();
  });

  it('should validate parameters correctly', () => {
    const tool = createDocument({ session: mockSession, dataStream: mockDataStream });
    
    const validParams = { title: 'My Document', kind: 'text' as const };
    const result = tool.parameters.safeParse(validParams);
    expect(result.success).toBe(true);

    const invalidParams = { title: 'My Document', kind: 'invalid' };
    const invalidResult = tool.parameters.safeParse(invalidParams);
    expect(invalidResult.success).toBe(false);
  });

  it('should execute document creation successfully', async () => {
    const { documentHandlersByArtifactKind } = require('@/lib/artifacts/server');
    const textHandler = documentHandlersByArtifactKind[0];
    
    const tool = createDocument({ session: mockSession, dataStream: mockDataStream });
    const result = await tool.execute({ title: 'Test Document', kind: 'text' });

    // Verify UUID generation
    expect(mockGenerateUUID).toHaveBeenCalled();
    
    // Verify data stream writes
    expect(mockDataStream.writeData).toHaveBeenCalledWith({
      type: 'kind',
      content: 'text',
    });
    expect(mockDataStream.writeData).toHaveBeenCalledWith({
      type: 'id',
      content: 'test-uuid-123',
    });
    expect(mockDataStream.writeData).toHaveBeenCalledWith({
      type: 'title',
      content: 'Test Document',
    });
    expect(mockDataStream.writeData).toHaveBeenCalledWith({
      type: 'clear',
      content: '',
    });
    expect(mockDataStream.writeData).toHaveBeenCalledWith({
      type: 'finish',
      content: '',
    });

    // Verify handler was called
    expect(textHandler.onCreateDocument).toHaveBeenCalledWith({
      id: 'test-uuid-123',
      title: 'Test Document',
      dataStream: mockDataStream,
      session: mockSession,
    });

    // Verify result
    expect(result).toEqual({
      id: 'test-uuid-123',
      title: 'Test Document',
      kind: 'text',
      content: 'A document was created and is now visible to the user.',
    });
  });

  it('should handle different document kinds', async () => {
    const tool = createDocument({ session: mockSession, dataStream: mockDataStream });
    const kinds: Array<'text' | 'code' | 'sheet'> = ['text', 'code', 'sheet'];

    for (const kind of kinds) {
      mockDataStream.writeData.mockClear();
      
      const result = await tool.execute({ title: `${kind} Document`, kind });
      
      expect(result.kind).toBe(kind);
      expect(mockDataStream.writeData).toHaveBeenCalledWith({
        type: 'kind',
        content: kind,
      });
    }
  });

  it('should throw error for unknown document kind', async () => {
    // Mock with no handlers
    mock.module('@/lib/artifacts/server', () => ({
      artifactKinds: ['text'],
      documentHandlersByArtifactKind: [],
    }));

    const tool = createDocument({ session: mockSession, dataStream: mockDataStream });
    
    try {
      await tool.execute({ title: 'Test', kind: 'text' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('No document handler found for kind: text');
    }
  });
});

describe('requestSuggestions Tool', () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    mockFetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          suggestions: [
            'How can I improve this?',
            'What are the alternatives?',
            'Can you explain this concept?',
          ],
        }),
      })
    );
    
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockFetch.mockRestore();
  
  });

  it('should have correct tool configuration', async () => {
    // Import dynamically to ensure mocks are in place
    const { requestSuggestions } = await import('@/lib/ai/tools/request-suggestions');
    
    expect(requestSuggestions.description).toContain('Request suggestions');
    expect(requestSuggestions.parameters).toBeDefined();
  });

  it('should validate parameters correctly', async () => {
    const { requestSuggestions } = await import('@/lib/ai/tools/request-suggestions');
    
    const validParams = { context: 'Current conversation context' };
    const result = requestSuggestions.parameters.safeParse(validParams);
    expect(result.success).toBe(true);

    const invalidParams = { context: 123 }; // Should be string
    const invalidResult = requestSuggestions.parameters.safeParse(invalidParams);
    expect(invalidResult.success).toBe(false);
  });

  it('should fetch suggestions successfully', async () => {
    const { requestSuggestions } = await import('@/lib/ai/tools/request-suggestions');
    
    const result = await requestSuggestions.execute({ 
      context: 'User is asking about machine learning' 
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/suggestions',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'User is asking about machine learning' }),
      })
    );

    expect(result).toHaveProperty('suggestions');
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBe(3);
  });

  it('should handle API errors', async () => {
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    );

    const { requestSuggestions } = await import('@/lib/ai/tools/request-suggestions');
    
    try {
      await requestSuggestions.execute({ context: 'test' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Failed to fetch suggestions: Internal Server Error');
    }
  });

  it('should handle network errors', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

    const { requestSuggestions } = await import('@/lib/ai/tools/request-suggestions');
    
    try {
      await requestSuggestions.execute({ context: 'test' });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Network error');
    }
  });
});

describe('Tool Integration Tests', () => {
  it('should have consistent parameter validation across tools', async () => {
    // All tools should use Zod for parameter validation
    const tools = [getWeather, requestSuggestions];
    
    tools.forEach(tool => {
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters._def).toBeDefined(); // Zod schema property
    });
  });

  it('should have descriptive tool descriptions', () => {
    expect(getWeather.description).toMatch(/weather/i);
    // Additional tools can be checked here
  });

  it('should handle async execution properly', async () => {
    // All tool executions should return promises
    const weatherPromise = getWeather.execute({ latitude: 0, longitude: 0 });
    expect(weatherPromise).toBeInstanceOf(Promise);
    
    // Ensure promise resolves/rejects properly
    await expect(weatherPromise).resolves.toBeDefined();
  });
});