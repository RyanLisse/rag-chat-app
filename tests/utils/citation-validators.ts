// Citation Validation Helpers
import { expect } from 'vitest';

export interface Citation {
  index: number;
  source: string;
  snippet: string;
  file?: string;
  page?: number;
  relevance?: number;
}

export interface CitationValidationOptions {
  requireSource?: boolean;
  requireSnippet?: boolean;
  requireFile?: boolean;
  minRelevance?: number;
  allowDuplicates?: boolean;
}

// Extract citations from text using common patterns
export function extractCitations(text: string): number[] {
  // Match patterns like [1], [2], etc. but exclude [0] as it's typically not a valid citation
  const pattern = /\[(\d+)\]/g;
  const matches = text.matchAll(pattern);
  const citations = Array.from(matches)
    .map(match => parseInt(match[1]))
    .filter(num => num > 0); // Exclude 0 and negative numbers
  return [...new Set(citations)]; // Remove duplicates
}

// Validate citation format and structure
export function validateCitation(
  citation: Citation,
  options: CitationValidationOptions = {}
): void {
  const {
    requireSource = true,
    requireSnippet = true,
    requireFile = false,
    minRelevance = 0,
  } = options;

  // Basic structure validation
  expect(citation).toHaveProperty('index');
  expect(typeof citation.index).toBe('number');
  expect(citation.index).toBeGreaterThan(0);

  // Source validation
  if (requireSource) {
    expect(citation).toHaveProperty('source');
    expect(citation.source).toBeTruthy();
    expect(typeof citation.source).toBe('string');
  }

  // Snippet validation
  if (requireSnippet) {
    expect(citation).toHaveProperty('snippet');
    expect(citation.snippet).toBeTruthy();
    expect(typeof citation.snippet).toBe('string');
    expect(citation.snippet.length).toBeGreaterThan(10);
  }

  // File validation
  if (requireFile) {
    expect(citation).toHaveProperty('file');
    expect(citation.file).toBeTruthy();
  }

  // Relevance validation
  if (citation.relevance !== undefined) {
    expect(citation.relevance).toBeGreaterThanOrEqual(minRelevance);
    expect(citation.relevance).toBeLessThanOrEqual(1);
  }
}

// Validate citations in response match the referenced indices
export function validateCitationReferences(
  text: string,
  citations: Citation[]
): void {
  const referencedIndices = extractCitations(text);
  const providedIndices = citations.map(c => c.index);

  // Check all referenced citations are provided
  referencedIndices.forEach(index => {
    expect(providedIndices).toContain(index);
  });

  // Check no orphaned citations (citations not referenced in text)
  const orphanedCitations = citations.filter(
    c => !referencedIndices.includes(c.index)
  );
  
  if (orphanedCitations.length > 0) {
    console.warn(
      `Found ${orphanedCitations.length} orphaned citations:`,
      orphanedCitations.map(c => c.index)
    );
  }
}

// Check citation consistency across a conversation
export function validateCitationConsistency(
  citations: Citation[][],
  options: { allowNewCitations?: boolean } = {}
): void {
  const { allowNewCitations = true } = options;
  const citationMap = new Map<string, Citation>();

  citations.forEach((messageCitations, messageIndex) => {
    messageCitations.forEach(citation => {
      const key = `${citation.source}-${citation.file || 'unknown'}`;
      const existing = citationMap.get(key);

      if (existing) {
        // Check consistency of repeated citations
        expect(citation.source).toBe(existing.source);
        if (citation.file) {
          expect(citation.file).toBe(existing.file);
        }
      } else if (!allowNewCitations && messageIndex > 0) {
        throw new Error(
          `New citation introduced in message ${messageIndex}: ${key}`
        );
      } else {
        citationMap.set(key, citation);
      }
    });
  });
}

// Validate citation quality and relevance
export function assessCitationQuality(
  citation: Citation,
  query: string
): number {
  let score = 0.2; // Base score for having a citation
  const queryTokens = query.toLowerCase().split(' ').filter(token => token.length > 2);
  const snippetLower = citation.snippet.toLowerCase();
  const sourceLower = citation.source.toLowerCase();

  // Check keyword overlap in snippet (more weight)
  const snippetMatches = queryTokens.filter(token => 
    snippetLower.includes(token)
  ).length;
  score += (snippetMatches / queryTokens.length) * 0.4;

  // Check keyword overlap in source (less weight)
  const sourceMatches = queryTokens.filter(token => 
    sourceLower.includes(token)
  ).length;
  score += (sourceMatches / queryTokens.length) * 0.2;

  // Check snippet length (longer usually means more context)
  if (citation.snippet.length > 50) score += 0.1;
  if (citation.snippet.length > 100) score += 0.1;

  // Check if file/page info is provided
  if (citation.file) score += 0.05;
  if (citation.page) score += 0.05;

  return Math.min(1, score);
}

// Test helper for citation-aware responses
export async function testCitationResponse(
  response: string,
  citations: Citation[],
  expectations: {
    minCitations?: number;
    maxCitations?: number;
    requiredSources?: string[];
    minQuality?: number;
    query?: string;
  } = {}
): Promise<void> {
  const {
    minCitations = 1,
    maxCitations = 10,
    requiredSources = [],
    minQuality = 0.3,
    query,
  } = expectations;

  // Validate citation count
  expect(citations.length).toBeGreaterThanOrEqual(minCitations);
  expect(citations.length).toBeLessThanOrEqual(maxCitations);

  // Validate each citation
  citations.forEach(citation => {
    validateCitation(citation);
  });

  // Validate references match
  validateCitationReferences(response, citations);

  // Check required sources
  const sources = citations.map(c => c.source);
  requiredSources.forEach(source => {
    expect(sources).toContain(source);
  });

  // Assess quality if query provided
  if (query) {
    citations.forEach(citation => {
      const quality = assessCitationQuality(citation, query);
      expect(quality).toBeGreaterThanOrEqual(minQuality);
    });
  }
}

// Create mock citations for testing
export function createMockCitations(count: number = 3): Citation[] {
  const sources = [
    'Research Paper: AI Advances 2024',
    'Technical Report: Neural Networks',
    'Journal: Machine Learning Quarterly',
    'Conference Proceedings: NeurIPS 2023',
    'Book: Deep Learning Fundamentals',
  ];

  return Array.from({ length: count }, (_, i) => ({
    index: i + 1,
    source: sources[i % sources.length],
    snippet: `This is a relevant snippet from the source discussing important concepts related to the topic at hand. It provides context and supporting evidence for the claims made in the response.`,
    file: `document-${i + 1}.pdf`,
    page: Math.floor(Math.random() * 100) + 1,
    relevance: 0.7 + Math.random() * 0.3,
  }));
}