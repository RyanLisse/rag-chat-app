// Unit Tests for AI Mocking Utilities
import { describe, it, expect, vi } from 'vitest';
import { 
  AIResponseMocker,
  createModelMock,
  mockFileSearchResponse 
} from '../utils/ai-mocks';

describe('AIResponseMocker', () => {
  it('should generate contextual responses based on prompt', () => {
    const mocker = new AIResponseMocker({
      provider: 'openai',
      model: 'gpt-4',
    });

    // Test response generation
    const testPrompt = 'This is a test prompt';
    const streamingResponse = mocker.createStreamingResponse(testPrompt);
    
    expect(streamingResponse).toBeInstanceOf(Response);
  });

  it('should generate citation-aware responses', async () => {
    const mocker = new AIResponseMocker({
      provider: 'openai',
      model: 'gpt-4',
    });

    const messages = [{
      id: '1',
      role: 'user' as const,
      content: 'Tell me about citations and sources',
      createdAt: new Date(),
    }];

    const response = await mocker.mockChatCompletion(messages);
    
    expect(response.choices[0].message.content).toContain('[1]');
    expect(response.choices[0].message.content).toContain('[2]');
    expect(response.choices[0].message.content).toContain('[3]');
  });

  it('should simulate streaming with configurable delays', async () => {
    vi.useFakeTimers();
    
    const mocker = new AIResponseMocker({
      provider: 'openai',
      model: 'gpt-4',
      streamDelay: 10,
    });

    const chunks: string[] = [];
    const streamPromise = (async () => {
      for await (const chunk of mocker.generateStream('test')) {
        chunks.push(chunk);
      }
    })();
    
    // Advance timers to allow the stream to complete
    await vi.advanceTimersByTimeAsync(1000); // Advance enough for all chunks
    await streamPromise;
    
    expect(chunks.length).toBeGreaterThan(0);
    
    vi.useRealTimers();
  });

  it('should simulate errors based on error rate', async () => {
    vi.useFakeTimers();
    
    const mocker = new AIResponseMocker({
      provider: 'openai',
      model: 'gpt-4',
      errorRate: 1, // 100% error rate
    });

    await expect(async () => {
      const generator = mocker.generateStream('test');
      
      // This should throw an error immediately due to 100% error rate
      const result = await generator.next();
      
      // Advance timers if needed
      await vi.advanceTimersByTimeAsync(100);
      
      return result;
    }).rejects.toThrow('Mock stream error');
    
    vi.useRealTimers();
  });
});

describe('createModelMock', () => {
  it('should create model-specific mocks', () => {
    const gptMock = createModelMock('openai', 'gpt-4');
    const claudeMock = createModelMock('anthropic', 'claude-3-opus');
    
    expect(gptMock).toBeInstanceOf(AIResponseMocker);
    expect(claudeMock).toBeInstanceOf(AIResponseMocker);
  });
});

describe('mockFileSearchResponse', () => {
  it('should generate file search results with citations', () => {
    const files = ['document1.pdf', 'document2.txt', 'research.md'];
    const query = 'machine learning';
    
    const result = mockFileSearchResponse(query, files);
    
    expect(result.citations).toHaveLength(files.length);
    expect(result.response).toContain('[1]');
    expect(result.response).toContain('[2]');
    expect(result.response).toContain('[3]');
    
    result.citations.forEach((citation, index) => {
      expect(citation.index).toBe(index + 1);
      expect(citation.file).toBe(files[index]);
      expect(citation.snippet).toContain(query);
      expect(citation.relevance).toBeGreaterThanOrEqual(0);
      expect(citation.relevance).toBeLessThanOrEqual(1);
    });
  });
});