import { myProvider } from '@/lib/ai/providers';
import type { Citation, CitationSource } from '@/lib/types/citation';
// TODO: Find correct type for DataStreamWriter in AI SDK 5.0
import { convertToCoreMessages, streamObject, streamText } from 'ai';
import { z } from 'zod';

const citationExtractionSchema = z.object({
  citations: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      sourceId: z.string(),
      relevanceScore: z.number().min(0).max(1).optional(),
    })
  ),
  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().optional(),
      type: z.enum(['document', 'webpage', 'api', 'database', 'file']),
      metadata: z.record(z.any()).optional(),
    })
  ),
});

export async function generateCitationArtifact({
  dataStream,
  uiStream,
  documentId,
  content,
  title,
  messages,
  userContent,
}: {
  dataStream: any; // TODO: Fix type for AI SDK 5.0
  uiStream: any;
  documentId: string;
  content: string;
  title: string;
  messages: any[];
  userContent: string;
}) {
  const extractedCitations = await streamObject({
    model: myProvider.languageModel('o4-mini'),
    schema: citationExtractionSchema,
    prompt: `Extract citations and sources from the following AI response. Identify specific claims or facts that should be cited, and match them with their sources.

AI Response:
${content}

Instructions:
1. Identify all factual claims, statistics, or referenced information
2. Create citations for each identified claim
3. Extract source information for each citation
4. Assign relevance scores (0-1) based on how central the citation is to the response`,
  });

  const citations: Citation[] = [];
  const sources: CitationSource[] = [];

  for await (const delta of extractedCitations.fullStream) {
    if (delta.type === 'object' && delta.object) {
      if (delta.object.citations) {
        const currentContent = await processContentWithCitations(
          content,
          delta.object.citations,
          citations
        );

        dataStream.writeData({
          type: 'citation-delta',
          content: currentContent,
        });
      }

      if (delta.object.sources) {
        const validSources = delta.object.sources.filter((source): source is CitationSource => 
          source !== undefined && source !== null
        );
        sources.push(...validSources);
        dataStream.writeData({
          type: 'sources-update',
          content: sources,
        });
      }
    }
  }

  dataStream.writeData({
    type: 'title',
    content: title,
  });

  dataStream.writeData({
    type: 'kind',
    content: 'citation',
  });

  dataStream.writeData({
    type: 'id',
    content: documentId,
  });

  const result = await streamText({
    model: myProvider.languageModel('o4-mini'),
    messages: convertToCoreMessages(messages),
  });

  dataStream.writeData({
    type: 'clear',
    content: '',
  });

  for await (const delta of result.fullStream) {
    if (delta.type === 'text') {
      dataStream.writeData({
        type: 'citation-delta',
        content: delta.text,
      });
    }
  }

  uiStream.update({
    type: 'citation-artifact',
    documentId,
    content,
    title,
    kind: 'citation',
    citations,
    sources,
  });

  dataStream.writeData({
    type: 'finish',
    content: '',
  });
}

async function processContentWithCitations(
  content: string,
  citations: any[],
  processedCitations: Citation[]
): Promise<string> {
  let processedContent = content;
  let offset = 0;

  citations.forEach((citation, index) => {
    const citationMarker = `[${index + 1}]`;
    const searchText = citation.text.slice(0, 50);
    const position = processedContent.indexOf(searchText, offset);

    if (position !== -1) {
      const endPosition = position + citation.text.length;
      processedContent =
        processedContent.slice(0, endPosition) +
        citationMarker +
        processedContent.slice(endPosition);

      processedCitations.push({
        id: citation.id,
        source: { id: citation.sourceId } as CitationSource,
        text: citation.text,
        relevanceScore: citation.relevanceScore,
        position: {
          start: position,
          end: endPosition + citationMarker.length,
        },
      });

      offset = endPosition + citationMarker.length;
    }
  });

  return processedContent;
}
