// Unit Tests for Citation Types
import { describe, it, expect } from 'vitest';
import type { CitationArtifactMetadata, Citation, CitationSource } from '@/lib/types/citation';

describe('Citation Types', () => {
  it('should create valid citation metadata', () => {
    const metadata: CitationArtifactMetadata = {
      citations: [],
      sources: [],
      statistics: {
        totalCitations: 0,
        uniqueSources: 0,
        sourceDistribution: {},
        avgRelevanceScore: 0,
      },
    };

    expect(metadata.citations).toEqual([]);
    expect(metadata.sources).toEqual([]);
    expect(metadata.statistics.totalCitations).toBe(0);
  });

  it('should create valid citation', () => {
    const citation: Citation = {
      id: 'test-1',
      text: 'Test citation text',
      source: { id: 'source-1' } as CitationSource,
      relevanceScore: 0.9,
      position: { start: 0, end: 10 },
    };

    expect(citation.id).toBe('test-1');
    expect(citation.text).toBe('Test citation text');
    expect(citation.relevanceScore).toBe(0.9);
    expect(citation.position.start).toBe(0);
    expect(citation.position.end).toBe(10);
  });

  it('should create valid citation source', () => {
    const source: CitationSource = {
      id: 'source-1',
      title: 'Test Source',
      type: 'article',
      url: 'https://example.com',
      author: 'Test Author',
      publishedDate: '2024-01-01',
      excerpt: 'Test excerpt',
      relevance: 0.8,
    };

    expect(source.id).toBe('source-1');
    expect(source.title).toBe('Test Source');
    expect(source.type).toBe('article');
    expect(source.url).toBe('https://example.com');
  });
});