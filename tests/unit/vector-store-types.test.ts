// Unit Tests for lib/types/vector-store.ts
import { describe, it, expect } from 'vitest';

// Import types for testing
import type {
  VectorStoreConfig,
  VectorStoreProvider,
  EmbeddingConfig,
  SearchOptions,
  SearchResult,
  DocumentChunk,
  VectorStoreMetrics,
} from '@/lib/types/vector-store';

describe('VectorStore Types', () => {
  describe('Type Structure Validation', () => {
    it('should have correct VectorStoreConfig structure', () => {
      const config: VectorStoreConfig = {
        provider: 'pinecone',
        apiKey: 'test-key',
        environment: 'test',
        indexName: 'test-index',
        dimensions: 1536,
        metric: 'cosine',
      };

      expect(config.provider).toBe('pinecone');
      expect(config.dimensions).toBe(1536);
      expect(config.metric).toBe('cosine');
    });

    it('should accept different vector store providers', () => {
      const providers: VectorStoreProvider[] = ['pinecone', 'weaviate', 'milvus', 'chroma'];
      
      providers.forEach(provider => {
        const config: VectorStoreConfig = {
          provider,
          apiKey: 'test-key',
          environment: 'test',
          indexName: 'test-index',
          dimensions: 1536,
          metric: 'cosine',
        };
        
        expect(config.provider).toBe(provider);
      });
    });

    it('should have correct EmbeddingConfig structure', () => {
      const config: EmbeddingConfig = {
        model: 'text-embedding-ada-002',
        dimensions: 1536,
        batchSize: 100,
        maxTokens: 8191,
      };

      expect(config.model).toBe('text-embedding-ada-002');
      expect(config.dimensions).toBe(1536);
      expect(config.batchSize).toBe(100);
    });

    it('should have correct SearchOptions structure', () => {
      const options: SearchOptions = {
        topK: 10,
        threshold: 0.7,
        includeMetadata: true,
        includeValues: false,
        filter: {
          documentType: 'pdf',
          createdBy: 'user-123',
        },
      };

      expect(options.topK).toBe(10);
      expect(options.threshold).toBe(0.7);
      expect(options.includeMetadata).toBe(true);
      expect(options.filter).toEqual({
        documentType: 'pdf',
        createdBy: 'user-123',
      });
    });

    it('should have correct DocumentChunk structure', () => {
      const chunk: DocumentChunk = {
        id: 'chunk-123',
        documentId: 'doc-456',
        content: 'This is test content',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          page: 1,
          section: 'introduction',
          chunkIndex: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(chunk.id).toBe('chunk-123');
      expect(chunk.documentId).toBe('doc-456');
      expect(chunk.content).toBe('This is test content');
      expect(chunk.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(chunk.metadata.page).toBe(1);
    });

    it('should have correct SearchResult structure', () => {
      const result: SearchResult = {
        id: 'chunk-123',
        score: 0.95,
        content: 'Matching content',
        metadata: {
          documentId: 'doc-456',
          title: 'Test Document',
          page: 1,
        },
        embedding: [0.1, 0.2, 0.3],
      };

      expect(result.id).toBe('chunk-123');
      expect(result.score).toBe(0.95);
      expect(result.content).toBe('Matching content');
      expect(result.metadata.documentId).toBe('doc-456');
    });

    it('should have correct VectorStoreMetrics structure', () => {
      const metrics: VectorStoreMetrics = {
        totalDocuments: 1000,
        totalChunks: 15000,
        indexSize: 2.5,
        averageEmbeddingTime: 150,
        averageSearchTime: 50,
        lastIndexed: new Date(),
        health: {
          status: 'healthy',
          lastChecked: new Date(),
          uptime: 99.9,
        },
      };

      expect(metrics.totalDocuments).toBe(1000);
      expect(metrics.totalChunks).toBe(15000);
      expect(metrics.indexSize).toBe(2.5);
      expect(metrics.health.status).toBe('healthy');
      expect(metrics.health.uptime).toBe(99.9);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow optional fields in SearchOptions', () => {
      const minimalOptions: SearchOptions = {
        topK: 5,
      };

      const fullOptions: SearchOptions = {
        topK: 10,
        threshold: 0.8,
        includeMetadata: true,
        includeValues: true,
        filter: { category: 'tech' },
      };

      expect(minimalOptions.topK).toBe(5);
      expect(fullOptions.threshold).toBe(0.8);
    });

    it('should allow optional fields in DocumentChunk', () => {
      const minimalChunk: DocumentChunk = {
        id: 'chunk-1',
        documentId: 'doc-1',
        content: 'Content',
        embedding: [],
        metadata: {},
        createdAt: new Date(),
      };

      expect(minimalChunk.updatedAt).toBeUndefined();
      
      const fullChunk: DocumentChunk = {
        ...minimalChunk,
        updatedAt: new Date(),
      };

      expect(fullChunk.updatedAt).toBeDefined();
    });

    it('should handle different metric types', () => {
      const metrics = ['cosine', 'euclidean', 'dotproduct'] as const;
      
      metrics.forEach(metric => {
        const config: VectorStoreConfig = {
          provider: 'pinecone',
          apiKey: 'test-key',
          environment: 'test',
          indexName: 'test-index',
          dimensions: 1536,
          metric,
        };
        
        expect(config.metric).toBe(metric);
      });
    });

    it('should handle flexible metadata types', () => {
      const stringMetadata: Record<string, any> = {
        title: 'Document Title',
        author: 'John Doe',
      };

      const numberMetadata: Record<string, any> = {
        page: 1,
        wordCount: 1500,
      };

      const mixedMetadata: Record<string, any> = {
        title: 'Mixed Document',
        page: 2,
        tags: ['important', 'review'],
        published: true,
      };

      expect(stringMetadata.title).toBe('Document Title');
      expect(numberMetadata.page).toBe(1);
      expect(mixedMetadata.tags).toEqual(['important', 'review']);
      expect(mixedMetadata.published).toBe(true);
    });
  });

  describe('Type Edge Cases', () => {
    it('should handle empty arrays and objects', () => {
      const emptyChunk: DocumentChunk = {
        id: '',
        documentId: '',
        content: '',
        embedding: [],
        metadata: {},
        createdAt: new Date(),
      };

      expect(emptyChunk.embedding).toHaveLength(0);
      expect(Object.keys(emptyChunk.metadata)).toHaveLength(0);
    });

    it('should handle large embedding vectors', () => {
      const largeEmbedding = new Array(4096).fill(0).map((_, i) => i * 0.001);
      
      const chunk: DocumentChunk = {
        id: 'large-chunk',
        documentId: 'large-doc',
        content: 'Content with large embedding',
        embedding: largeEmbedding,
        metadata: {},
        createdAt: new Date(),
      };

      expect(chunk.embedding).toHaveLength(4096);
      expect(chunk.embedding[0]).toBe(0);
      expect(chunk.embedding[4095]).toBeCloseTo(4.095);
    });

    it('should handle extreme score values', () => {
      const perfectMatch: SearchResult = {
        id: 'perfect',
        score: 1.0,
        content: 'Perfect match',
        metadata: {},
      };

      const noMatch: SearchResult = {
        id: 'none',
        score: 0.0,
        content: 'No match',
        metadata: {},
      };

      expect(perfectMatch.score).toBe(1.0);
      expect(noMatch.score).toBe(0.0);
    });

    it('should handle large metric values', () => {
      const metrics: VectorStoreMetrics = {
        totalDocuments: 1000000,
        totalChunks: 50000000,
        indexSize: 1024.5, // GB
        averageEmbeddingTime: 5000, // ms
        averageSearchTime: 1000, // ms
        lastIndexed: new Date(),
        health: {
          status: 'degraded',
          lastChecked: new Date(),
          uptime: 95.5,
          message: 'Performance degraded due to high load',
        },
      };

      expect(metrics.totalDocuments).toBe(1000000);
      expect(metrics.indexSize).toBe(1024.5);
      expect(metrics.health.status).toBe('degraded');
      expect(metrics.health.message).toContain('degraded');
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support typical search workflow', () => {
      // Setup
      const config: VectorStoreConfig = {
        provider: 'pinecone',
        apiKey: 'pk-123',
        environment: 'production',
        indexName: 'documents',
        dimensions: 1536,
        metric: 'cosine',
      };

      // Search
      const searchOptions: SearchOptions = {
        topK: 5,
        threshold: 0.7,
        includeMetadata: true,
        filter: {
          documentType: 'research',
          published: true,
        },
      };

      // Results
      const results: SearchResult[] = [
        {
          id: 'chunk-1',
          score: 0.95,
          content: 'Research findings...',
          metadata: {
            documentId: 'paper-123',
            title: 'AI Research Paper',
            page: 3,
          },
        },
        {
          id: 'chunk-2',
          score: 0.87,
          content: 'Additional context...',
          metadata: {
            documentId: 'paper-456',
            title: 'Related Work',
            page: 1,
          },
        },
      ];

      expect(config.provider).toBe('pinecone');
      expect(searchOptions.topK).toBe(5);
      expect(results).toHaveLength(2);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should support document chunking workflow', () => {
      const chunks: DocumentChunk[] = [
        {
          id: 'chunk-1',
          documentId: 'doc-123',
          content: 'Introduction to the topic...',
          embedding: new Array(1536).fill(0.1),
          metadata: {
            chunkIndex: 0,
            section: 'introduction',
            startChar: 0,
            endChar: 500,
          },
          createdAt: new Date(),
        },
        {
          id: 'chunk-2',
          documentId: 'doc-123',
          content: 'Detailed analysis follows...',
          embedding: new Array(1536).fill(0.2),
          metadata: {
            chunkIndex: 1,
            section: 'analysis',
            startChar: 500,
            endChar: 1000,
          },
          createdAt: new Date(),
        },
      ];

      expect(chunks).toHaveLength(2);
      expect(chunks[0].metadata.chunkIndex).toBe(0);
      expect(chunks[1].metadata.chunkIndex).toBe(1);
      expect(chunks.every(c => c.documentId === 'doc-123')).toBe(true);
    });
  });
});