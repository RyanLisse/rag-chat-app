import { tool } from 'ai';
import { z } from 'zod';
import type { Citation, CitationSource } from '@/lib/types/citation';
import { generateUUID } from '@/lib/utils';

export const createCitationTool = tool({
  description: 'Create a citation artifact to display search results with proper citations',
  parameters: z.object({
    title: z.string().describe('Title of the citation artifact'),
    content: z.string().describe('The main content with citations'),
    citations: z.array(z.object({
      source: z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(['document', 'webpage', 'api', 'database', 'file']),
        url: z.string().optional(),
        metadata: z.object({
          author: z.string().optional(),
          date: z.string().optional(),
          lastModified: z.string().optional(),
          excerpt: z.string().optional(),
        }).optional(),
      }),
      text: z.string(),
      relevanceScore: z.number().optional(),
      position: z.object({
        start: z.number(),
        end: z.number(),
      }),
    })),
  }),
  execute: async ({ title, content, citations }, { dataStream }) => {
    try {
      // Process citations to add IDs
      const processedCitations: Citation[] = citations.map(citation => ({
        id: generateUUID(),
        ...citation,
      }));

      // Extract unique sources
      const sourceMap = new Map<string, CitationSource>();
      processedCitations.forEach(citation => {
        if (!sourceMap.has(citation.source.id)) {
          sourceMap.set(citation.source.id, citation.source);
        }
      });
      const sources = Array.from(sourceMap.values());

      // Calculate statistics
      const statistics = {
        totalCitations: processedCitations.length,
        uniqueSources: sources.length,
        sourceDistribution: sources.reduce((acc, source) => {
          const count = processedCitations.filter(c => c.source.id === source.id).length;
          acc[source.title] = count;
          return acc;
        }, {} as Record<string, number>),
        avgRelevanceScore: processedCitations.reduce((sum, c) => sum + (c.relevanceScore || 0), 0) / processedCitations.length,
      };

      // Create the artifact metadata
      const metadata = {
        citations: processedCitations,
        sources,
        statistics,
      };

      // Send the citation artifact to the data stream
      dataStream.writeData({
        type: 'create-citation',
        content: {
          title,
          content,
          kind: 'citation',
          language: 'text',
          metadata,
        },
      });

      return {
        success: true,
        message: 'Citation artifact created successfully',
      };
    } catch (error) {
      console.error('Error creating citation artifact:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create citation artifact',
      };
    }
  },
});