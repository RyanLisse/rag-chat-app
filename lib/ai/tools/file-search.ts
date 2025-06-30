import { tool } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const fileSearchTool = tool({
  description: 'Search through uploaded documents to find relevant information',
  parameters: z.object({
    query: z.string().describe('The search query to find relevant information in documents'),
    limit: z.number().optional().default(5).describe('Maximum number of results to return'),
  }),
  execute: async ({ query, limit }) => {
    try {
      const vectorStoreId = process.env.OPENAI_VECTORSTORE_ID;
      
      if (!vectorStoreId) {
        return {
          success: false,
          error: 'Vector store not configured',
          results: [],
        };
      }

      // Create a thread with file search enabled
      const thread = await openai.threads.create({
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        tools: [
          {
            type: 'file_search',
          },
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId],
          },
        },
      });

      // Run the assistant to search files
      const run = await openai.threads.runs.create(thread.id, {
        assistant_id: process.env.OPENAI_ASSISTANT_ID || 'asst_abc123', // You'll need to create an assistant
        tools: [
          {
            type: 'file_search',
          },
        ],
      });

      // Wait for the run to complete
      let runStatus = await openai.threads.runs.retrieve(thread.id, run.id);
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status === 'failed') {
        return {
          success: false,
          error: 'File search failed',
          results: [],
        };
      }

      // Get the messages from the thread
      const messages = await openai.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

      if (!assistantMessage) {
        return {
          success: false,
          error: 'No results found',
          results: [],
        };
      }

      // Extract citations and content
      const content = assistantMessage.content[0];
      if (content.type !== 'text') {
        return {
          success: false,
          error: 'Unexpected response format',
          results: [],
        };
      }

      const annotations = content.text.annotations || [];
      const citations = annotations
        .filter((ann): ann is OpenAI.Beta.Threads.Messages.FileCitationAnnotation => 
          ann.type === 'file_citation'
        )
        .map(citation => ({
          text: citation.text,
          fileId: citation.file_citation.file_id,
          quote: citation.file_citation.quote,
        }));

      return {
        success: true,
        content: content.text.value,
        citations,
        threadId: thread.id,
      };
    } catch (error) {
      console.error('File search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
      };
    }
  },
});

// Alternative implementation using direct file search without assistant
export const directFileSearchTool = tool({
  description: 'Search through uploaded documents using direct vector store search',
  parameters: z.object({
    query: z.string().describe('The search query'),
    vectorStoreId: z.string().optional().describe('Vector store ID to search in'),
    maxResults: z.number().optional().default(5).describe('Maximum number of results'),
  }),
  execute: async ({ query, vectorStoreId, maxResults }) => {
    try {
      const storeId = vectorStoreId || process.env.OPENAI_VECTORSTORE_ID;
      
      if (!storeId) {
        return {
          success: false,
          error: 'Vector store not configured',
          results: [],
        };
      }

      // Note: OpenAI doesn't provide direct vector search API yet
      // This is a placeholder for when they add this functionality
      // For now, you need to use the assistant API as shown above
      
      return {
        success: false,
        error: 'Direct vector search not yet available in OpenAI API',
        results: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
      };
    }
  },
});