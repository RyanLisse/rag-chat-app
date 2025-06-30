import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GoogleProvider } from './google-provider';
import * as ai from 'ai';
import { 
  ProviderAuthenticationError, 
  ProviderRateLimitError,
  ProviderQuotaExceededError,
  ProviderInvalidRequestError,
  ProviderInternalError 
} from './provider';

vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
  StreamingTextResponse: vi.fn().mockImplementation((stream) => ({ stream })),
}));

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn().mockReturnValue('mocked-google-model'),
}));

describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  const mockApiKey = 'test-google-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = mockApiKey;
    provider = new GoogleProvider();
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(() => new GoogleProvider()).not.toThrow();
    });

    it('should initialize with provided API key', () => {
      expect(() => new GoogleProvider('custom-key')).not.toThrow();
    });

    it('should throw error when no API key is available', () => {
      delete process.env.GOOGLE_API_KEY;
      expect(() => new GoogleProvider()).toThrow(ProviderAuthenticationError);
    });
  });

  describe('getModel', () => {
    it('should return a model for valid model ID', () => {
      const model = provider.getModel('gemini-2.0-flash-exp');
      expect(model).toBe('mocked-google-model');
    });

    it('should throw error for invalid model ID', () => {
      expect(() => provider.getModel('invalid-model')).toThrow(ProviderInvalidRequestError);
    });
  });

  describe('chat', () => {
    const mockChatParams = {
      messages: [
        { role: 'system' as const, content: 'You are a helpful assistant' },
        { role: 'user' as const, content: 'Hello' },
      ],
      model: 'gemini-2.0-flash-exp',
      temperature: 0.7,
    };

    it('should handle streaming chat successfully', async () => {
      const mockStream = { toDataStream: vi.fn().mockRetu rnValue('data-stream') };
      (ai.streamText as Mock).mockResolvedValue(mockStream);

      const result = await provider.chat(mockChatParams);

      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        model: 'mocked-google-model',
        messages: mockChatParams.messages,
        temperature: mockChatParams.temperature,
      }));
      expect(result).toBeDefined();
    });

    it('should handle non-streaming chat successfully', async () => {
      const mockResult = { text: 'Hello! How can I help you?' };
      (ai.generateText as Mock).mockResolvedValue(mockResult);

      const result = await provider.chat({ ...mockChatParams, stream: false });

      expect(ai.generateText).toHaveBeenCalledWith(expect.objectContaining({
        model: 'mocked-google-model',
        messages: mockChatParams.messages,
        temperature: mockChatParams.temperature,
      }));
      expect(result).toBeDefined();
    });

    it('should format messages correctly', async () => {
      const mockStream = { toDataStream: vi.fn().mockReturnValue('data-stream') };
      (ai.streamText as Mock).mockResolvedValue(mockStream);

      const messagesWithWhitespace = [
        { role: 'user' as const, content: '  Hello  ' },
        { role: 'assistant' as const, content: '\n\nHi there!\n\n' },
      ];

      await provider.chat({
        ...mockChatParams,
        messages: messagesWithWhitespace,
      });

      const calledMessages = (ai.streamText as Mock).mock.calls[0][0].messages;
      expect(calledMessages[0].content).toBe('Hello');
      expect(calledMessages[1].content).toBe('Hi there!');
    });

    it('should handle function calling for supported models', async () => {
      const mockStream = { toDataStream: vi.fn().mockReturnValue('data-stream') };
      (ai.streamText as Mock).mockResolvedValue(mockStream);

      const functions = [
        {
          name: 'get_weather',
          description: 'Get weather information',
          parameters: { type: 'object', properties: {} },
        },
      ];

      await provider.chat({
        ...mockChatParams,
        functions,
      });

      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({
              name: 'get_weather',
            }),
          }),
        ]),
      }));
    });
  });

  describe('error handling', () => {
    it('should handle rate limit errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gemini-2.0-flash-exp',
      })).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle authentication errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Invalid credentials'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gemini-2.0-flash-exp',
      })).rejects.toThrow(ProviderAuthenticationError);
    });

    it('should handle quota errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Quota exceeded'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gemini-2.0-flash-exp',
      })).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle billing errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Billing account required'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gemini-2.0-flash-exp',
      })).rejects.toThrow(ProviderQuotaExceededError);
    });

    it('should handle service unavailable errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Service unavailable'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gemini-2.0-flash-exp',
      })).rejects.toThrow(ProviderInternalError);
    });
  });

  describe('models', () => {
    it('should have correct model configurations', () => {
      expect(provider.models).toHaveLength(4);
      
      const gemini2Flash = provider.models.find(m => m.id === 'gemini-2.0-flash-exp');
      expect(gemini2Flash).toMatchObject({
        name: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        maxOutput: 8192,
        supportsFunctions: true,
        supportsVision: true,
        supportsSystemPrompt: true,
      });

      const gemini15Pro = provider.models.find(m => m.id === 'gemini-1.5-pro');
      expect(gemini15Pro).toMatchObject({
        name: 'Gemini 2.5 Pro',
        contextWindow: 2097152,
      });
    });
  });
});