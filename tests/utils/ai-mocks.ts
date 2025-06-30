// AI Model Response Mocking Utilities
import { StreamingTextResponse } from 'ai';
import type { Message } from 'ai';

export interface MockModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  defaultResponse?: string;
  streamDelay?: number;
  errorRate?: number;
}

// Mock response generator
export class AIResponseMocker {
  private config: MockModelConfig;

  constructor(config: MockModelConfig) {
    this.config = {
      streamDelay: 50,
      errorRate: 0,
      ...config,
    };
  }

  // Generate a mock streaming response
  async *generateStream(prompt: string): AsyncGenerator<string> {
    const response = this.config.defaultResponse || this.generateResponse(prompt);
    const words = response.split(' ');

    for (const word of words) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, this.config.streamDelay));
      
      // Simulate random errors
      if (Math.random() < (this.config.errorRate || 0)) {
        throw new Error('Mock stream error');
      }
      
      yield word + ' ';
    }
  }

  // Generate a contextual response based on prompt
  private generateResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('test')) {
      return 'This is a test response from the mocked AI model.';
    }
    
    if (lowerPrompt.includes('citation') || lowerPrompt.includes('source')) {
      return 'According to [1] the research paper, the key findings indicate that [2] machine learning models can achieve high accuracy. Furthermore, [3] recent studies have shown significant improvements.';
    }
    
    if (lowerPrompt.includes('code')) {
      return 'Here is an example code snippet:\n```typescript\nfunction example() {\n  return "Hello, World!";\n}\n```';
    }
    
    return `This is a mock response to: "${prompt}"`;
  }

  // Create a mock StreamingTextResponse
  createStreamingResponse(prompt: string): StreamingTextResponse {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of this.generateStream(prompt)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }.bind(this),
    });

    return new StreamingTextResponse(stream);
  }

  // Mock a complete chat response
  async mockChatCompletion(messages: Message[]): Promise<{
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
      index: number;
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }>;
  }> {
    const lastMessage = messages[messages.length - 1];
    const response = this.config.defaultResponse || this.generateResponse(lastMessage.content);

    return {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now(),
      model: this.config.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response,
          },
          finish_reason: 'stop',
        },
      ],
    };
  }
}

// Factory for creating model-specific mockers
export const createModelMock = (provider: string, model: string) => {
  const configs: Record<string, MockModelConfig> = {
    'gpt-4': {
      provider: 'openai',
      model: 'gpt-4',
      streamDelay: 30,
    },
    'claude-3-opus': {
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      streamDelay: 40,
    },
    'gemini-pro': {
      provider: 'google',
      model: 'gemini-pro',
      streamDelay: 35,
    },
  };

  return new AIResponseMocker(configs[model] || { provider: 'openai', model });
};

// Mock function for testing file search with citations
export const mockFileSearchResponse = (query: string, files: string[]) => {
  const citations = files.map((file, index) => ({
    index: index + 1,
    file,
    snippet: `Relevant content from ${file} related to "${query}"`,
    relevance: Math.random(),
  }));

  const response = citations
    .map(c => `[${c.index}] According to ${c.file}: ${c.snippet}`)
    .join(' ');

  return {
    response,
    citations,
  };
};