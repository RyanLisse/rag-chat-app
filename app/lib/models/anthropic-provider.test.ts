import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { AnthropicProvider } from './anthropic-provider';
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

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn().mockReturnValue('mocked-anthropic-model'),
}));

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  const mockApiKey = 'test-anthropic-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = mockApiKey;
    provider = new AnthropicProvider();
  });

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(() => new AnthropicProvider()).not.toThrow();
    });

    it('should initialize with provided API key', () => {
      expect(() => new AnthropicProvider('custom-key')).not.toThrow();
    });

    it('should throw error when no API key is available', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AnthropicProvider()).toThrow(ProviderAuthenticationError);
    });
  });

  describe('getModel', () => {
    it('should return a model for valid model ID', () => {
      const model = provider.getModel('claude-3-5-sonnet-20241022');
      expect(model).toBe('mocked-anthropic-model');
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
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
    };

    it('should handle streaming chat successfully', async () => {
      const mockStream = { toDataStream: vi.fn().mockReturnValue('data-stream') };
      (ai.streamText as Mock).mockResolvedValue(mockStream);

      const result = await provider.chat(mockChatParams);

      expect(ai.streamText).toHaveBeenCalledWith(expect.objectContaining({
        model: 'mocked-anthropic-model',
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
        model: 'mocked-anthropic-model',
        messages: mockChatParams.messages,
        temperature: mockChatParams.temperature,
      }));
      expect(result).toBeDefined();
    });

    it('should format messages correctly', async () => {
      const mockStream = { toDataStream: vi.fn().mockReturnValue('data-stream') };
      (ai.streamText as Mock).mockResolvedValue(mockStream);

      // Test consecutive messages of same role get merged
      const consecutiveMessages = [
        { role: 'user' as const, content: 'First message' },
        { role: 'user' as const, content: 'Second message' },
        { role: 'assistant' as const, content: 'Assistant response' },
      ];

      await provider.chat({
        ...mockChatParams,
        messages: consecutiveMessages,
      });

      const calledMessages = (ai.streamText as Mock).mock.calls[0][0].messages;
      expect(calledMessages).toHaveLength(2);
      expect(calledMessages[0].content).toBe('First message\n\nSecond message');
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
        model: 'claude-3-5-sonnet-20241022',
      })).rejects.toThrow(ProviderRateLimitError);
    });

    it('should handle authentication errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Unauthorized'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'claude-3-5-sonnet-20241022',
      })).rejects.toThrow(ProviderAuthenticationError);
    });

    it('should handle quota errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Quota exceeded'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'claude-3-5-sonnet-20241022',
      })).rejects.toThrow(ProviderQuotaExceededError);
    });

    it('should handle overloaded errors', async () => {
      (ai.streamText as Mock).mockRejectedValue(new Error('Service overloaded'));

      await expect(provider.chat({
        messages: [{ role: 'user' as const, content: 'Hello' }],
        model: 'claude-3-5-sonnet-20241022',
      })).rejects.toThrow(ProviderInternalError);
    });
  });

  describe('models', () => {
    it('should have correct model configurations', () => {
      expect(provider.models).toHaveLength(3);
      
      const claudeSonnet = provider.models.find(m => m.id === 'claude-3-5-sonnet-20241022');
      expect(claudeSonnet).toMatchObject({
        name: 'Claude 4 Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
        supportsFunctions: true,
        supportsVision: true,
        supportsSystemPrompt: true,
      });

      const claudeHaiku = provider.models.find(m => m.id === 'claude-3-5-haiku-20241022');
      expect(claudeHaiku).toMatchObject({
        name: 'Claude 4 Haiku',
        supportsVision: false,
      });
    });
  });
});