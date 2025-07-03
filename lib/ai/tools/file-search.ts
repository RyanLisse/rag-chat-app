import { tool } from 'ai';
import OpenAI from 'openai';
import { z } from 'zod';
import type { Citation, CitationSource } from '@/lib/types/citation';

interface FileSearchResult {
  success: boolean;
  content: string;
  citations: Citation[];
  sources: CitationSource[];
  results: string[];
  error?: string;
  threadId?: string;
  metadata?: {
    hasResults: boolean;
    citationCount: number;
    sourceCount: number;
    message: string;
  };
}

// Initialize OpenAI client (server-side only)
const openai =
  typeof window === 'undefined'
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      })
    : null;

// Create or get the assistant
async function getOrCreateAssistant() {
  if (!openai) throw new Error('OpenAI client not initialized');
  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (assistantId) {
    try {
      return await openai.beta.assistants.retrieve(assistantId);
    } catch (_error) {
      console.log('Assistant not found, creating new one');
    }
  }

  // Create a new assistant
  const assistant = await openai.beta.assistants.create({
    name: 'RAG Chat Assistant',
    instructions:
      'You are a document search assistant. Your PRIMARY function is to search through the vector store and provide information from uploaded documents. ALWAYS search the vector store comprehensively. ALWAYS cite your sources with specific quotes. ALWAYS prioritize document content over general knowledge. Return ALL relevant information found in the documents.',
    model: 'gpt-4o',
    tools: [{ type: 'file_search' }],
  });

  console.log('Created new assistant:', assistant.id);
  return assistant;
}

// File search tool for AI SDK 5.0
export const fileSearchTool = tool({
  description: 'Search through uploaded documents in the vector store',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant documents'),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe('Maximum number of results to return'),
  }),
  execute: async (params: { query: string; limit?: number }, _options: any) => {
    const { query, limit = 5 } = params;
    try {
      if (!openai) throw new Error('OpenAI client not initialized');

      const assistant = await getOrCreateAssistant();
      const thread = await openai.beta.threads.create();

      // Add user message with the query
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: query,
      });

      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      });

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });
      while (
        runStatus.status !== 'completed' &&
        runStatus.status !== 'failed'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, {
          thread_id: thread.id,
        });
      }

      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }

      // Get messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(
        (m) => m.role === 'assistant'
      );

      if (!assistantMessage) {
        throw new Error('No response from assistant');
      }

      // Extract content and citations
      const content = assistantMessage.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as any).text.value)
        .join('\n');

      const citations: Citation[] = [];
      const sources: CitationSource[] = [];

      // TODO: Extract actual citations from the assistant response

      const result: FileSearchResult = {
        success: true,
        content,
        citations,
        sources,
        results: [content],
        threadId: thread.id,
        metadata: {
          hasResults: content.length > 0,
          citationCount: citations.length,
          sourceCount: sources.length,
          message: `Found ${citations.length} results`,
        },
      };

      return result;
    } catch (error) {
      const errorResult: FileSearchResult = {
        success: false,
        content: '',
        citations: [],
        sources: [],
        results: [],
        error: error instanceof Error ? error.message : 'Search failed',
        metadata: {
          hasResults: false,
          citationCount: 0,
          sourceCount: 0,
          message: 'Search failed',
        },
      };

      return errorResult;
    }
  },
});

// Direct file search tool without dataStream
export const directFileSearchTool = tool({
  description: 'Direct search through uploaded documents in the vector store',
  inputSchema: z.object({
    query: z.string().describe('The search query to find relevant documents'),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe('Maximum number of results to return'),
  }),
  execute: async (params: { query: string; limit?: number }, options: any) => {
    const { query, limit = 5 } = params;
    return fileSearchTool.execute({ query, limit }, options);
  },
});
