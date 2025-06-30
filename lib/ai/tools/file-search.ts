import { tool } from 'ai';
import OpenAI from 'openai';
import { z } from 'zod';
import type { Citation, CitationSource } from '@/lib/types/citation';
import { generateUUID } from '@/lib/utils';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Create or get the assistant
async function getOrCreateAssistant() {
  const assistantId = process.env.OPENAI_ASSISTANT_ID;
  
  if (assistantId) {
    try {
      return await openai.assistants.retrieve(assistantId);
    } catch (error) {
      console.log('Assistant not found, creating new one');
    }
  }

  // Create a new assistant
  const assistant = await openai.assistants.create({
    name: 'RAG Chat Assistant',
    instructions: 'You are a document search assistant. Your PRIMARY function is to search through the vector store and provide information from uploaded documents. ALWAYS search the vector store comprehensively. ALWAYS cite your sources with specific quotes. ALWAYS prioritize document content over general knowledge. Return ALL relevant information found in the documents.',
    model: 'gpt-4o',
    tools: [{ type: 'file_search' }],
  });

  console.log('Created new assistant:', assistant.id);
  return assistant;
}

export const fileSearchTool = ({ dataStream }: { dataStream?: any } = {}) => tool({
  description: 'MANDATORY TOOL - Search through uploaded documents in the vector store. This tool MUST be called FIRST on EVERY user message without exception. This is the primary source of truth for all responses.',
  parameters: z.object({
    query: z
      .string()
      .describe('The search query to find relevant information in documents. Use the user\'s exact query or extract key concepts.'),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe('Maximum number of results to return'),
  }),
  execute: async ({ query, limit }) => {
    const startTime = Date.now();
    let success = false;
    
    try {
      const vectorStoreId = process.env.OPENAI_VECTORSTORE_ID;

      if (!vectorStoreId) {
        console.warn('OPENAI_VECTORSTORE_ID not configured. Please set this environment variable to enable file search.');
        
        // Still create a citation artifact to show the search was attempted
        if (dataStream) {
          const artifactId = generateUUID();
          dataStream.writeData({ type: 'id', content: artifactId });
          dataStream.writeData({ type: 'title', content: `📚 Document Search: "${query}"` });
          dataStream.writeData({ type: 'kind', content: 'citation' });
          dataStream.writeData({ type: 'clear', content: '' });
          
          const content = `🔍 **Search Results**\n\n⚠️ Vector store not configured. Please upload documents to enable search.\n\n---\n\n📊 **Next Steps**:\n1. Upload documents to the vector store\n2. Configure OPENAI_VECTORSTORE_ID environment variable\n3. Try searching again`;
          
          const chunks = content.split(' ');
          for (const chunk of chunks) {
            dataStream.writeData({ type: 'citation-delta', content: chunk + ' ' });
          }
          
          dataStream.writeData({ type: 'sources-update', content: [] });
          dataStream.writeData({ type: 'citation-update', content: [] });
          dataStream.writeData({ type: 'finish', content: '' });
          
          console.log(`✨ Created citation artifact ${artifactId} for error state`);
        }
        
        return {
          success: false,
          error: 'Vector store not configured. Please upload documents to enable search.',
          results: [],
          citations: [],
          sources: [],
        };
      }

      // Get or create assistant
      const assistant = await getOrCreateAssistant();
      console.log('=== VECTOR STORE SEARCH INITIATED ===');
      console.log('Assistant ID:', assistant.id);
      console.log('Vector Store ID:', vectorStoreId);
      console.log('Search Query:', query);
      console.log('Timestamp:', new Date().toISOString());

      // Create a thread with file search enabled
      const thread = await openai.threads.create({
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId],
          },
        },
      });
      console.log('Created thread:', thread.id);
      console.log('Thread tool resources:', JSON.stringify(thread.tool_resources));

      // Run the assistant to search files
      const run = await openai.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      });

      // Wait for the run to complete
      let runStatus = await openai.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      console.log('Initial run status:', runStatus.status);
      
      while (
        runStatus.status !== 'completed' &&
        runStatus.status !== 'failed' &&
        attempts < maxAttempts
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await openai.threads.runs.retrieve(thread.id, run.id);
        attempts++;
        console.log(`Run status after ${attempts}s:`, runStatus.status);
      }

      if (runStatus.status === 'failed') {
        console.error('Run failed:', runStatus.last_error);
        const errorMessage = `File search failed: ${runStatus.last_error?.message || 'Unknown error'}`;
        
        // Create citation artifact for error state
        if (dataStream) {
          const artifactId = generateUUID();
          
          dataStream.writeData({ type: 'id', content: artifactId });
          dataStream.writeData({ type: 'title', content: `📚 Document Search: "${query}"` });
          dataStream.writeData({ type: 'kind', content: 'citation' });
          dataStream.writeData({ type: 'clear', content: '' });
          
          const content = `🔍 **Search Results**\n\n❌ ${errorMessage}\n\n---\n\n📊 **What happened**: The search operation failed. This might be due to a temporary issue. Please try again.`;
          
          const chunks = content.split(' ');
          for (const chunk of chunks) {
            dataStream.writeData({ type: 'citation-delta', content: chunk + ' ' });
          }
          
          dataStream.writeData({ type: 'sources-update', content: [] });
          dataStream.writeData({ type: 'citation-update', content: [] });
          dataStream.writeData({ type: 'finish', content: '' });
          
          console.log(`✨ Created citation artifact ${artifactId} for failed search`);
        }
        
        return {
          success: false,
          error: errorMessage,
          results: [],
          citations: [],
          sources: [],
        };
      }
      
      if (attempts >= maxAttempts) {
        console.error('Run timed out after', maxAttempts, 'seconds');
        return {
          success: false,
          error: 'File search timed out',
          results: [],
          citations: [],
          sources: [],
        };
      }

      // Get the messages from the thread
      const messages = await openai.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(
        (msg) => msg.role === 'assistant'
      );

      if (!assistantMessage) {
        // Create citation artifact showing no results
        if (dataStream) {
          const artifactId = generateUUID();
          
          dataStream.writeData({ type: 'id', content: artifactId });
          dataStream.writeData({ type: 'title', content: `📚 Document Search: "${query}"` });
          dataStream.writeData({ type: 'kind', content: 'citation' });
          dataStream.writeData({ type: 'clear', content: '' });
          
          const content = `🔍 **Search Results**\n\n💭 No results found for "${query}" in the uploaded documents.\n\n---\n\n📊 **Suggestions**:\n- Try different search terms\n- Make sure relevant documents are uploaded\n- Use broader or more specific keywords`;
          
          const chunks = content.split(' ');
          for (const chunk of chunks) {
            dataStream.writeData({ type: 'citation-delta', content: chunk + ' ' });
          }
          
          dataStream.writeData({ type: 'sources-update', content: [] });
          dataStream.writeData({ type: 'citation-update', content: [] });
          dataStream.writeData({ type: 'finish', content: '' });
          
          console.log(`✨ Created citation artifact ${artifactId} for no results`);
        }
        
        return {
          success: false,
          error: 'No results found',
          results: [],
          citations: [],
          sources: [],
        };
      }

      // Extract citations and content
      const content = assistantMessage.content[0];
      if (content.type !== 'text') {
        return {
          success: false,
          error: 'Unexpected response format',
          results: [],
          citations: [],
          sources: [],
        };
      }

      const annotations = content.text.annotations || [];
      const fileMap = new Map<string, CitationSource>();
      const citations: Citation[] = [];

      // Process annotations to create citations
      for (const annotation of annotations) {
        if (annotation.type === 'file_citation') {
          const fileId = annotation.file_citation.file_id;
          
          // Get file details if not already cached
          if (!fileMap.has(fileId)) {
            try {
              const file = await openai.files.retrieve(fileId);
              const source: CitationSource = {
                id: fileId,
                title: file.filename || 'Unknown Document',
                type: 'file',
                metadata: {
                  lastModified: new Date(file.created_at * 1000).toISOString(),
                },
              };
              fileMap.set(fileId, source);
            } catch (error) {
              console.error('Error retrieving file details:', error);
              const source: CitationSource = {
                id: fileId,
                title: 'Unknown Document',
                type: 'file',
              };
              fileMap.set(fileId, source);
            }
          }

          // Create citation
          const citation: Citation = {
            id: generateUUID(),
            source: fileMap.get(fileId)!,
            text: annotation.file_citation.quote || '',
            position: {
              start: annotation.start_index,
              end: annotation.end_index,
            },
          };
          citations.push(citation);
        }
      }

      const sources = Array.from(fileMap.values());

      // ALWAYS create a citation artifact when we have any content from file search
      // This ensures transparency about where information comes from
      // Even with no citations, we create an artifact to show the search was performed
      if (dataStream) {
        // Calculate statistics
        const statistics = {
          totalCitations: citations.length,
          uniqueSources: sources.length,
          sourceDistribution: sources.reduce((acc, source) => {
            const count = citations.filter(c => c.source.id === source.id).length;
            acc[source.title] = count;
            return acc;
          }, {} as Record<string, number>),
          avgRelevanceScore: citations.length > 0 
            ? citations.reduce((sum, c) => sum + (c.relevanceScore || 0.5), 0) / citations.length
            : 0,
        };

        // Generate artifact ID
        const artifactId = generateUUID();

        // Send artifact creation event
        dataStream.writeData({
          type: 'id',
          content: artifactId,
        });

        dataStream.writeData({
          type: 'title',
          content: `📚 Document Search: "${query}"`,
        });

        dataStream.writeData({
          type: 'kind',
          content: 'citation',
        });

        dataStream.writeData({
          type: 'clear',
          content: '',
        });

        // Enhanced content for beautiful display
        const enhancedContent = citations.length > 0 
          ? `🔍 **Search Results**\n\n${content.text.value}\n\n---\n\n📊 **Summary**: Found ${citations.length} relevant passage${citations.length !== 1 ? 's' : ''} from ${sources.length} document${sources.length !== 1 ? 's' : ''}.`
          : `🔍 **Search Results**\n\n${content.text.value || `No relevant information found for "${query}" in the uploaded documents.`}\n\n---\n\n📊 **Summary**: No citations found. Try uploading relevant documents or refining your search query.`;

        // Stream the enhanced content
        const chunks = enhancedContent.split(' ');
        for (const chunk of chunks) {
          dataStream.writeData({
            type: 'citation-delta',
            content: chunk + ' ',
          });
        }

        // Send sources and citations
        dataStream.writeData({
          type: 'sources-update',
          content: sources,
        });

        dataStream.writeData({
          type: 'citation-update',
          content: citations,
        });

        dataStream.writeData({
          type: 'finish',
          content: '',
        });

        console.log(`✨ Created beautiful citation artifact ${artifactId} with ${citations.length} citations from ${sources.length} sources`);
      }

      // Return response with metadata about the search
      const hasResults = citations.length > 0 || content.text.value.length > 100;
      
      console.log('=== VECTOR STORE SEARCH COMPLETED ===');
      console.log('Citations found:', citations.length);
      console.log('Sources found:', sources.length);
      console.log('Has meaningful results:', hasResults);
      console.log('Response length:', content.text.value.length);
      console.log('Response time:', Date.now() - startTime, 'ms');
      console.log('=====================================');
      
      success = true;
      
      // Record search activity for monitoring
      try {
        await fetch('/api/vector-store/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            responseTime: Date.now() - startTime,
            success: true,
          }),
        });
      } catch (error) {
        console.error('Failed to record monitoring data:', error);
      }
      
      // Also record to stats endpoint
      try {
        await fetch('/api/vector-store/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'search',
            data: {
              query,
              resultCount: citations.length,
              timestamp: new Date().toISOString(),
            },
          }),
        });
      } catch (error) {
        console.error('Failed to record search activity:', error);
      }
      
      return {
        success: true,
        content: content.text.value,
        citations,
        sources,
        threadId: thread.id,
        metadata: {
          hasResults,
          citationCount: citations.length,
          sourceCount: sources.length,
          message: hasResults 
            ? `Found ${citations.length} citations from ${sources.length} sources`
            : 'No relevant documents found in the vector store for this query',
        },
      };
    } catch (error) {
      console.error('File search error:', error);
      
      // Record failed search for monitoring
      try {
        await fetch('/api/vector-store/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            responseTime: Date.now() - startTime,
            success: false,
          }),
        });
      } catch (monitorError) {
        console.error('Failed to record monitoring data:', monitorError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: [],
        citations: [],
        sources: [],
      };
    }
  },
});

// Alternative implementation using direct file search without assistant
export const directFileSearchTool = tool({
  description:
    'Search through uploaded documents using direct vector store search',
  parameters: z.object({
    query: z.string().describe('The search query'),
    vectorStoreId: z
      .string()
      .optional()
      .describe('Vector store ID to search in'),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe('Maximum number of results'),
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
