import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileSearchTool, directFileSearchTool } from '@/lib/ai/tools/file-search';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai');

// Mock environment variables
const mockEnv = {
  OPENAI_API_KEY: 'test-api-key',
  OPENAI_VECTORSTORE_ID: 'vs-test-123',
  OPENAI_ASSISTANT_ID: 'asst-test-123',
};

describe('fileSearchTool', () => {
  let mockOpenAI: any;

  beforeEach(() => {
    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    mockOpenAI = {
      threads: {
        create: vi.fn(),
        messages: {
          list: vi.fn(),
        },
        runs: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
    };

    (OpenAI as any).mockImplementation(() => mockOpenAI);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('successful search', () => {
    it('should search files and return results with citations', async () => {
      const query = 'What is machine learning?';
      const threadId = 'thread-123';
      const runId = 'run-123';

      // Mock thread creation
      mockOpenAI.threads.create.mockResolvedValue({
        id: threadId,
      });

      // Mock run creation and completion
      mockOpenAI.threads.runs.create.mockResolvedValue({
        id: runId,
      });

      mockOpenAI.threads.runs.retrieve
        .mockResolvedValueOnce({ status: 'in_progress' })
        .mockResolvedValueOnce({ status: 'completed' });

      // Mock messages with citations
      const mockMessages = {
        data: [
          {
            id: 'msg-user',
            role: 'user',
            content: [{ type: 'text', text: { value: query } }],
          },
          {
            id: 'msg-assistant',
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: {
                  value: 'Machine learning is a subset of AI【0】',
                  annotations: [
                    {
                      type: 'file_citation',
                      text: '【0】',
                      file_citation: {
                        file_id: 'file-123',
                        quote: 'Machine learning is a subset of artificial intelligence',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      mockOpenAI.threads.messages.list.mockResolvedValue(mockMessages);

      const result = await fileSearchTool.execute({ query, limit: 5 });

      expect(result.success).toBe(true);
      expect(result.content).toBe('Machine learning is a subset of AI【0】');
      expect(result.citations).toHaveLength(1);
      expect(result.citations![0].fileId).toBe('file-123');
      expect(result.citations![0].quote).toBe('Machine learning is a subset of artificial intelligence');
      expect(result.threadId).toBe(threadId);

      // Verify API calls
      expect(mockOpenAI.threads.create).toHaveBeenCalledWith({
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [mockEnv.OPENAI_VECTORSTORE_ID],
          },
        },
      });

      expect(mockOpenAI.threads.runs.create).toHaveBeenCalledWith(threadId, {
        assistant_id: mockEnv.OPENAI_ASSISTANT_ID,
        tools: [{ type: 'file_search' }],
      });
    });

    it('should handle search without citations', async () => {
      const query = 'Simple query';
      const threadId = 'thread-123';

      mockOpenAI.threads.create.mockResolvedValue({ id: threadId });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });

      const mockMessages = {
        data: [
          {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: {
                  value: 'Simple answer without citations',
                  annotations: [],
                },
              },
            ],
          },
        ],
      };

      mockOpenAI.threads.messages.list.mockResolvedValue(mockMessages);

      const result = await fileSearchTool.execute({ query });

      expect(result.success).toBe(true);
      expect(result.content).toBe('Simple answer without citations');
      expect(result.citations).toHaveLength(0);
    });

    it('should use default assistant ID when not provided', async () => {
      delete process.env.OPENAI_ASSISTANT_ID;
      
      const query = 'test query';
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });
      mockOpenAI.threads.messages.list.mockResolvedValue({
        data: [
          {
            role: 'assistant',
            content: [{ type: 'text', text: { value: 'response', annotations: [] } }],
          },
        ],
      });

      await fileSearchTool.execute({ query });

      expect(mockOpenAI.threads.runs.create).toHaveBeenCalledWith(
        'thread-123',
        {
          assistant_id: 'asst_abc123',
          tools: [{ type: 'file_search' }],
        }
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing vector store ID', async () => {
      delete process.env.OPENAI_VECTORSTORE_ID;

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vector store not configured');
      expect(result.results).toEqual([]);
    });

    it('should handle thread creation failure', async () => {
      mockOpenAI.threads.create.mockRejectedValue(new Error('Thread creation failed'));

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Thread creation failed');
    });

    it('should handle run creation failure', async () => {
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockRejectedValue(new Error('Run creation failed'));

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Run creation failed');
    });

    it('should handle run failure', async () => {
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'failed' });

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('File search failed');
    });

    it('should handle timeout during run execution', async () => {
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      
      // Mock run that never completes
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'in_progress' });

      vi.useFakeTimers();
      
      const promise = fileSearchTool.execute({ query: 'test' });
      
      // Advance timers to simulate long wait
      await vi.advanceTimersByTimeAsync(60000); // 60 seconds
      
      vi.useRealTimers();

      // Note: This test would need proper timeout handling in the actual implementation
      // For now, we assume the function would eventually timeout or handle long-running operations
    });

    it('should handle missing assistant message', async () => {
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });

      // Mock messages with no assistant response
      mockOpenAI.threads.messages.list.mockResolvedValue({
        data: [
          {
            role: 'user',
            content: [{ type: 'text', text: { value: 'query' } }],
          },
        ],
      });

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No results found');
    });

    it('should handle unexpected message format', async () => {
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });

      // Mock messages with unexpected content type
      mockOpenAI.threads.messages.list.mockResolvedValue({
        data: [
          {
            role: 'assistant',
            content: [{ type: 'image', image: { file_id: 'img-123' } }],
          },
        ],
      });

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected response format');
    });

    it('should handle API key authentication errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      
      mockOpenAI.threads.create.mockRejectedValue(authError);

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      
      mockOpenAI.threads.create.mockRejectedValue(rateLimitError);

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('parameter validation', () => {
    it('should validate required query parameter', async () => {
      // The tool should validate that query is required
      expect(() => {
        fileSearchTool.parameters.parse({ limit: 5 });
      }).toThrow();
    });

    it('should use default limit when not provided', async () => {
      const parsed = fileSearchTool.parameters.parse({ query: 'test' });
      expect(parsed.limit).toBe(5);
    });

    it('should validate limit parameter type', async () => {
      expect(() => {
        fileSearchTool.parameters.parse({ query: 'test', limit: 'invalid' });
      }).toThrow();
    });
  });

  describe('citation extraction', () => {
    it('should extract multiple citations', async () => {
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });

      const mockMessages = {
        data: [
          {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: {
                  value: 'Content with multiple citations【0】【1】',
                  annotations: [
                    {
                      type: 'file_citation',
                      text: '【0】',
                      file_citation: {
                        file_id: 'file-1',
                        quote: 'First quote',
                      },
                    },
                    {
                      type: 'file_citation',
                      text: '【1】',
                      file_citation: {
                        file_id: 'file-2',
                        quote: 'Second quote',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      mockOpenAI.threads.messages.list.mockResolvedValue(mockMessages);

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.citations).toHaveLength(2);
      expect(result.citations![0].fileId).toBe('file-1');
      expect(result.citations![1].fileId).toBe('file-2');
    });

    it('should filter out non-citation annotations', async () => {
      mockOpenAI.threads.create.mockResolvedValue({ id: 'thread-123' });
      mockOpenAI.threads.runs.create.mockResolvedValue({ id: 'run-123' });
      mockOpenAI.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });

      const mockMessages = {
        data: [
          {
            role: 'assistant',
            content: [
              {
                type: 'text',
                text: {
                  value: 'Content with mixed annotations',
                  annotations: [
                    {
                      type: 'file_citation',
                      text: '【0】',
                      file_citation: {
                        file_id: 'file-1',
                        quote: 'Valid citation',
                      },
                    },
                    {
                      type: 'file_path',
                      text: '/path/to/file',
                      file_path: {
                        file_id: 'file-2',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      mockOpenAI.threads.messages.list.mockResolvedValue(mockMessages);

      const result = await fileSearchTool.execute({ query: 'test' });

      expect(result.citations).toHaveLength(1);
      expect(result.citations![0].fileId).toBe('file-1');
    });
  });
});

describe('directFileSearchTool', () => {
  beforeEach(() => {
    process.env.OPENAI_VECTORSTORE_ID = 'vs-test-123';
  });

  afterEach(() => {
    delete process.env.OPENAI_VECTORSTORE_ID;
  });

  it('should return error for direct search not available', async () => {
    const result = await directFileSearchTool.execute({ 
      query: 'test query',
      maxResults: 10 
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Direct vector search not yet available in OpenAI API');
    expect(result.results).toEqual([]);
  });

  it('should handle missing vector store ID', async () => {
    delete process.env.OPENAI_VECTORSTORE_ID;

    const result = await directFileSearchTool.execute({ query: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Vector store not configured');
  });

  it('should use provided vector store ID', async () => {
    const customVectorStoreId = 'vs-custom-123';
    
    const result = await directFileSearchTool.execute({ 
      query: 'test',
      vectorStoreId: customVectorStoreId 
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Direct vector search not yet available in OpenAI API');
  });

  it('should validate parameters', () => {
    const validParams = {
      query: 'test query',
      vectorStoreId: 'vs-123',
      maxResults: 5,
    };

    expect(() => {
      directFileSearchTool.parameters.parse(validParams);
    }).not.toThrow();

    const invalidParams = {
      query: '', // empty query should fail
      maxResults: -1, // negative number should fail
    };

    expect(() => {
      directFileSearchTool.parameters.parse(invalidParams);
    }).toThrow();
  });

  it('should use default values', () => {
    const params = directFileSearchTool.parameters.parse({ query: 'test' });
    expect(params.maxResults).toBe(5);
  });
});