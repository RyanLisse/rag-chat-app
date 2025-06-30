// Unit Tests for Citation Parsing Logic
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateCitationArtifact } from '@/artifacts/citation/server';
import type { Citation, CitationSource } from '@/lib/types/citation';

// Mock AI dependencies
const mockStreamObject = vi.fn(() => ({
  fullStream: async function* () {
    yield {
      type: 'object',
      object: {
        citations: [
          {
            id: 'citation-1',
            text: 'Machine learning has revolutionized data analysis',
            sourceId: 'source-1',
            relevanceScore: 0.9,
          },
          {
            id: 'citation-2',
            text: 'Neural networks are particularly effective for pattern recognition',
            sourceId: 'source-2',
            relevanceScore: 0.85,
          },
        ],
        sources: [
          {
            id: 'source-1',
            title: 'Introduction to Machine Learning',
            url: 'https://example.com/ml-intro',
            type: 'document',
            metadata: {
              author: 'Dr. Alice Johnson',
              date: '2023-01-15',
              excerpt: 'A comprehensive guide to machine learning fundamentals.',
            },
          },
          {
            id: 'source-2',
            title: 'Neural Network Applications',
            url: 'https://example.com/neural-networks',
            type: 'webpage',
            metadata: {
              author: 'Bob Wilson',
              date: '2023-03-20',
              excerpt: 'Exploring practical applications of neural networks.',
            },
          },
        ],
      },
    };
  },
}));

const mockStreamText = vi.fn(() => ({
  fullStream: async function* () {
    yield { type: 'text-delta', textDelta: 'Machine learning has revolutionized data analysis [1]. ' };
    yield { type: 'text-delta', textDelta: 'Neural networks are particularly effective for pattern recognition [2]. ' };
    yield { type: 'text-delta', textDelta: 'These technologies continue to evolve rapidly.' };
  },
}));

mock.module('ai', () => ({
  streamObject: mockStreamObject,
  streamText: mockStreamText,
  convertToCoreMessages: (messages: any[]) => messages,
}));

mock.module('@/lib/ai', () => ({
  customModel: (model: string) => model,
}));

// Mock data stream writer
class MockDataStreamWriter {
  public data: Array<{ type: string; content: any }> = [];

  writeData(data: { type: string; content: any }) {
    this.data.push(data);
  }
}

describe('Citation Parsing Logic', () => {
  let dataStream: MockDataStreamWriter;
  let uiStream: { update: ReturnType<typeof mock> };

  beforeEach(() => {
    dataStream = new MockDataStreamWriter();
    uiStream = { update: vi.fn(() => {}) };
    mock.restoreAll();
  });

  describe('generateCitationArtifact', () => {
    it('should extract citations and sources from content', async () => {
      const content = 'Machine learning has revolutionized data analysis. Neural networks are particularly effective for pattern recognition.';
      
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'test-doc-1',
        content,
        title: 'AI Research Summary',
        messages: [{ role: 'user', content: 'Tell me about AI' }],
        userContent: 'Tell me about AI',
      });

      // Check that citations were extracted
      const citationDeltas = dataStream.data.filter(d => d.type === 'citation-delta');
      expect(citationDeltas.length).toBeGreaterThan(0);

      // Check that sources were updated
      const sourceUpdates = dataStream.data.filter(d => d.type === 'sources-update');
      expect(sourceUpdates.length).toBeGreaterThan(0);

      // Check that UI stream was updated
      expect(uiStream.update).toHaveBeenCalledWith({
        type: 'citation-artifact',
        documentId: 'test-doc-1',
        content,
        title: 'AI Research Summary',
        kind: 'citation',
        citations: expect.any(Array),
        sources: expect.any(Array),
      });
    });

    it('should handle empty content gracefully', async () => {
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'empty-doc',
        content: '',
        title: 'Empty Document',
        messages: [],
        userContent: '',
      });

      // Should still complete without errors
      const finishEvents = dataStream.data.filter(d => d.type === 'finish');
      expect(finishEvents).toHaveLength(1);
    });

    it('should write correct metadata to data stream', async () => {
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'metadata-test',
        content: 'Test content',
        title: 'Metadata Test',
        messages: [],
        userContent: '',
      });

      // Check title
      const titleData = dataStream.data.find(d => d.type === 'title');
      expect(titleData?.content).toBe('Metadata Test');

      // Check kind
      const kindData = dataStream.data.find(d => d.type === 'kind');
      expect(kindData?.content).toBe('citation');

      // Check document ID
      const idData = dataStream.data.find(d => d.type === 'id');
      expect(idData?.content).toBe('metadata-test');

      // Check finish event
      const finishData = dataStream.data.find(d => d.type === 'finish');
      expect(finishData).toBeDefined();
    });
  });

  describe('processContentWithCitations', () => {
    // This function is internal to the server module, so we test it indirectly
    it('should insert citation markers correctly', async () => {
      const content = 'Machine learning has revolutionized data analysis. Neural networks are particularly effective.';
      
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'citation-markers',
        content,
        title: 'Citation Markers Test',
        messages: [],
        userContent: '',
      });

      // Check that citation deltas contain markers
      const citationDeltas = dataStream.data
        .filter(d => d.type === 'citation-delta')
        .map(d => d.content);

      const hasMarkers = citationDeltas.some((content: string) => 
        content.includes('[1]') || content.includes('[2]')
      );
      
      expect(hasMarkers).toBe(true);
    });

    it('should handle overlapping citations', async () => {
      const content = 'This sentence contains multiple overlapping cited phrases that reference the same concepts.';
      
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'overlapping-citations',
        content,
        title: 'Overlapping Citations Test',
        messages: [],
        userContent: '',
      });

      // Should complete without errors even with overlapping text
      const finishEvents = dataStream.data.filter(d => d.type === 'finish');
      expect(finishEvents).toHaveLength(1);
    });

    it('should preserve original content structure', async () => {
      const content = 'Paragraph one with citation.\n\nParagraph two with another citation.';
      
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'structure-test',
        content,
        title: 'Structure Preservation Test',
        messages: [],
        userContent: '',
      });

      // Check that newlines and structure are preserved
      const finalContent = dataStream.data
        .filter(d => d.type === 'citation-delta')
        .map(d => d.content)
        .join('');

      expect(finalContent).toContain('\n\n');
    });
  });

  describe('Citation Validation', () => {
    it('should validate citation schema', async () => {
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'validation-test',
        content: 'Test content for validation',
        title: 'Validation Test',
        messages: [],
        userContent: '',
      });

      const sourceUpdates = dataStream.data.filter(d => d.type === 'sources-update');
      
      if (sourceUpdates.length > 0) {
        const sources = sourceUpdates[0].content;
        
        // Validate source structure
        sources.forEach((source: any) => {
          expect(source).toHaveProperty('id');
          expect(source).toHaveProperty('title');
          expect(source).toHaveProperty('type');
          expect(['document', 'webpage', 'api', 'database', 'file']).toContain(source.type);
        });
      }
    });

    it('should handle invalid citation data gracefully', async () => {
      // Mock invalid data
      const invalidStreamObject = vi.fn(() => ({
        fullStream: async function* () {
          yield {
            type: 'object',
            object: {
              citations: [
                {
                  // Missing required fields
                  text: 'Invalid citation',
                },
              ],
              sources: [],
            },
          };
        },
      }));

      const originalStreamObject = mockStreamObject;
      mock.module('ai', () => ({
        streamObject: invalidStreamObject,
        streamText: mockStreamText,
        convertToCoreMessages: (messages: any[]) => messages,
      }));

      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'invalid-data',
        content: 'Test content',
        title: 'Invalid Data Test',
        messages: [],
        userContent: '',
      });

      // Should still complete
      const finishEvents = dataStream.data.filter(d => d.type === 'finish');
      expect(finishEvents).toHaveLength(1);

      // Restore original mock
      mock.module('ai', () => ({
        streamObject: originalStreamObject,
        streamText: mockStreamText,
        convertToCoreMessages: (messages: any[]) => messages,
      }));
    });
  });

  describe('Streaming Behavior', () => {
    it('should handle streaming errors gracefully', async () => {
      const errorStreamObject = vi.fn(() => ({
        fullStream: async function* () {
          throw new Error('Stream error');
        },
      }));

      mock.module('ai', () => ({
        streamObject: errorStreamObject,
        streamText: mockStreamText,
        convertToCoreMessages: (messages: any[]) => messages,
      }));

      // Should not throw
      await expect(
        generateCitationArtifact({
          dataStream: dataStream as any,
          uiStream,
          documentId: 'error-test',
          content: 'Test content',
          title: 'Error Test',
          messages: [],
          userContent: '',
        })
      ).not.toThrow();
    });

    it('should clear content before streaming new content', async () => {
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'clear-test',
        content: 'Test content',
        title: 'Clear Test',
        messages: [],
        userContent: '',
      });

      // Check that clear event is sent
      const clearEvents = dataStream.data.filter(d => d.type === 'clear');
      expect(clearEvents).toHaveLength(1);
      expect(clearEvents[0].content).toBe('');
    });

    it('should stream text deltas progressively', async () => {
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'streaming-test',
        content: 'Progressive streaming test',
        title: 'Streaming Test',
        messages: [{ role: 'user', content: 'Test message' }],
        userContent: 'Test message',
      });

      // Check that multiple text deltas were streamed
      const textDeltas = dataStream.data.filter(d => d.type === 'citation-delta');
      expect(textDeltas.length).toBeGreaterThan(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large documents efficiently', async () => {
      const largeContent = 'Large document content. '.repeat(1000);
      
      const startTime = performance.now();
      
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'large-doc',
        content: largeContent,
        title: 'Large Document Test',
        messages: [],
        userContent: '',
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should handle many citations efficiently', async () => {
      const manyCitationsContent = Array.from({ length: 100 }, (_, i) => 
        `Citation ${i + 1} content that should be cited.`
      ).join(' ');
      
      await generateCitationArtifact({
        dataStream: dataStream as any,
        uiStream,
        documentId: 'many-citations',
        content: manyCitationsContent,
        title: 'Many Citations Test',
        messages: [],
        userContent: '',
      });
      
      // Should complete without errors
      const finishEvents = dataStream.data.filter(d => d.type === 'finish');
      expect(finishEvents).toHaveLength(1);
    });

    it('should handle concurrent citation processing', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        generateCitationArtifact({
          dataStream: new MockDataStreamWriter() as any,
          uiStream: { update: vi.fn(() => {}) },
          documentId: `concurrent-${i}`,
          content: `Concurrent test content ${i}`,
          title: `Concurrent Test ${i}`,
          messages: [],
          userContent: '',
        })
      );
      
      // All should complete without errors
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });
});