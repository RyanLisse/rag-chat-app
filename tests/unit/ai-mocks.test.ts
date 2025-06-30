// Unit Tests for AI Mocking Utilities
import { describe, it, expect } from 'bun:test';
import { 
  AIResponseMocker,
  createModelMock,
  mockFileSearchResponse 
} from '../utils/ai-mocks';
import { StreamingTextResponse } from 'ai';

describe('AIResponseMocker', () => {
  it('should generate contextual responses based on prompt', () => {
    const mocker = new AIResponseMocker({
      provider: 'openai',
      model: 'gpt-4',
    });

    // Test response generation
    const testPrompt = 'This is a test prompt';
    const streamingResponse = mocker.createStreamingResponse(testPrompt);
    
    expect(streamingResponse).toBeInstanceOf(StreamingTextResponse);
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
    const mocker = new AIResponseMocker({
      provider: 'openai',
      model: 'gpt-4',
      streamDelay: 10,
    });

    const chunks: string[] = [];
    const startTime = Date.now();
    
    for await (const chunk of mocker.generateStream('test')) {
      chunks.push(chunk);
    }
    
    const duration = Date.now() - startTime;
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(duration).toBeGreaterThan(chunks.length * 5); // At least 5ms per chunk
  });

  it('should simulate errors based on error rate', async () => {
    const mocker = new AIResponseMocker({
      provider: 'openai',
      model: 'gpt-4',
      errorRate: 1, // 100% error rate
    });

    let errorThrown = false;
    
    try {
      for await (const chunk of mocker.generateStream('test')) {
        // Should throw before yielding
      }
    } catch (error) {
      errorThrown = true;
      expect(error.message).toBe('Mock stream error');
    }
    
    expect(errorThrown).toBe(true);
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