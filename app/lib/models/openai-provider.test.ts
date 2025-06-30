import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { OpenAIProvider } from './openai-provider';
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

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn().mockReturnValue('mocked-model'),
}));

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = mockApiKey;
    provider = new OpenAIProvider();
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(() => new OpenAIProvider()).not.toThrow();
    });

    it('should initialize with provided API key', () => {
      expect(() => new OpenAIProvider('custom-key')).not.toThrow();
    });

    it('should throw error when no API key is available', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIProvider()).toThrow(ProviderAuthenticationError);
    });
  });

  describe('getModel', () => {
    it('should return a model for valid model ID', () => {
      const model = provider.getModel('gpt-4-turbo-2024-04-09');
      expect(model).toBe('mocked-model');
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
      model: 'gpt-4-turbo-2024-04-09',
      temperature: 0.7,
    };

    it('should handle streaming chat successfully', async () => {
      const mockStream = { toDataStream: vi.fn().mockReturnValue('data-stream') };
      (ai.streamText as Mock).mockResolvedValue(mockStream);

      const result = await provider.chat(mockChatParams);

      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        model: 'mocked-model',
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
        model: 'mocked-model',
        messages: mockChatParams.messages,
        temperature: mockChatParams.temperature,
      }));
      expect(result).toBeDefined();
    });

    it('should filter system messages for o1-mini model', async () => {
      const mockStream = { toDataStream: vi.fn().mockReturnValue('data-stream') };
      (ai.streamText as Mock).mockResolvedValue(mockStream);

      await provider.chat({
        ...mockChatParams,
        model: 'o1-mini',
      });

      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        messages: mockChatParams.messages.filter(m => m.role !== 'system'),
      }));
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
        model: 'gpt-4-turbo-2024-04-09',
      })).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle authentication errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Invalid API key'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gpt-4-turbo-2024-04-09',
      })).rejects.toThrow(ProviderAuthenticationError);
    });

    it('should handle quota errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Quota exceeded'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gpt-4-turbo-2024-04-09',
      })).rejects.toThrow(ProviderQuotaExceededError);
    });

    it('should handle invalid request errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Invalid request'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gpt-4-turbo-2024-04-09',
      })).rejects.toThrow(ProviderInvalidRequestError);
    });

    it('should handle server errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gpt-4-turbo-2024-04-09',
      })).rejects.toThrow(ProviderInternalError);
    });

    it('should handle unknown errors', async () => {
      (ai.streamText as Mock).mockRejectedValue('Unknown error');

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'gpt-4-turbo-2024-04-09',
      })).rejects.toThrow(ProviderInternalError);
    });
  });

  describe('models', () => {
    it('should have correct model configurations', () => {
      expect(provider.models).toHaveLength(4);
      
      const gpt4Turbo = provider.models.find(m => m.id === 'gpt-4-turbo-2024-04-09');
      expect(gpt4Turbo).toMatchObject({
        name: 'GPT-4.1 Turbo',
        contextWindow: 128000,
        maxOutput: 4096,
        supportsFunctions: true,
        supportsVision: true,
        supportsSystemPrompt: true,
      });

      const o1Mini = provider.models.find(m => m.id === 'o1-mini');
      expect(o1Mini).toMatchObject({
        name: 'o4-mini',
        supportsFunctions: false,
        supportsVision: false,
        supportsSystemPrompt: false,
      });
    });
  });
});