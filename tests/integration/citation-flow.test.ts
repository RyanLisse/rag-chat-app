// Integration Tests for Citation Flow
import { test, expect } from 'vitest';
import {
  extractCitations,
  validateCitation,
  validateCitationReferences,
  validateCitationConsistency,
  assessCitationQuality,
  testCitationResponse,
  createMockCitations,
} from '../utils/citation-validators';
import { createAIResponse, createConversation } from '../factories';

describe('Citation Flow Integration', () => {
  it('should extract citations from various text formats', () => {
    const testCases = [
      {
        text: 'According to [1] the research shows that [2] and [3] are related.',
        expected: [1, 2, 3],
      },
      {
        text: 'The study[1] confirms earlier findings[2].',
        expected: [1, 2],
      },
      {
        text: 'Multiple sources [1][2][3] support this claim.',
        expected: [1, 2, 3],
      },
      {
        text: 'No citations in this text.',
        expected: [],
      },
    ];

    testCases.forEach(({ text, expected }) => {
      const citations = extractCitations(text);
      expect(citations).toEqual(expected);
    });
  });

  it('should validate citation structure and content', () => {
    const validCitation = {
      index: 1,
      source: 'Research Paper 2024',
      snippet: 'This study demonstrates the effectiveness of RAG systems in improving response accuracy.',
      file: 'research-2024.pdf',
      page: 42,
      relevance: 0.95,
    };

    // Should not throw
    validateCitation(validCitation);

    // Test with minimal citation
    const minimalCitation = {
      index: 2,
      source: 'Blog Post',
      snippet: 'RAG is revolutionary.',
    };

    validateCitation(minimalCitation, {
      requireFile: false,
      minRelevance: 0,
    });
  });

  it('should validate citation references match text', () => {
    const text = 'As shown in [1] and further explained in [3], the results are conclusive.';
    const citations = [
      createMockCitations(1)[0], // Citation 1
      { ...createMockCitations(1)[0], index: 2 }, // Citation 2 (not referenced)
      { ...createMockCitations(1)[0], index: 3 }, // Citation 3
    ];

    // Should validate successfully and warn about orphaned citation [2]
    validateCitationReferences(text, citations);
  });

  it('should assess citation quality based on query relevance', () => {
    const query = 'neural networks deep learning transformer';
    
    const highQualityCitation = {
      index: 1,
      source: 'Deep Learning Textbook',
      snippet: 'Neural networks form the foundation of deep learning. Transformer architectures have revolutionized the field by introducing self-attention mechanisms that allow models to process sequences more effectively than traditional recurrent networks.',
      file: 'dl-textbook.pdf',
      page: 245,
    };

    const lowQualityCitation = {
      index: 2,
      source: 'General AI Blog',
      snippet: 'AI is cool.',
      file: 'blog.html',
    };

    const highScore = assessCitationQuality(highQualityCitation, query);
    const lowScore = assessCitationQuality(lowQualityCitation, query);

    expect(highScore).toBeGreaterThan(0.7);
    expect(lowScore).toBeLessThan(0.3);
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it('should validate citation consistency across conversation', () => {
    // Simulate a multi-turn conversation
    const conversation = [
      // First response citations
      [
        { index: 1, source: 'Paper A', snippet: 'First finding', file: 'a.pdf' },
        { index: 2, source: 'Paper B', snippet: 'Second finding', file: 'b.pdf' },
      ],
      // Second response citations - reuses some, adds new
      [
        { index: 1, source: 'Paper A', snippet: 'First finding', file: 'a.pdf' }, // Consistent
        { index: 3, source: 'Paper C', snippet: 'Third finding', file: 'c.pdf' }, // New
      ],
      // Third response citations
      [
        { index: 2, source: 'Paper B', snippet: 'Second finding', file: 'b.pdf' }, // Consistent
        { index: 3, source: 'Paper C', snippet: 'Third finding', file: 'c.pdf' }, // Consistent
      ],
    ];

    // Should pass - citations are consistent when reused
    validateCitationConsistency(conversation, { allowNewCitations: true });
  });

  it('should test complete citation response flow', async () => {
    const response = `Based on recent research [1], transformer models have shown superior performance 
    in NLP tasks. The attention mechanism [2] allows for better context understanding compared to 
    traditional RNNs [3]. Studies have demonstrated [4] significant improvements in translation quality.`;

    const citations = [
      {
        index: 1,
        source: 'Attention is All You Need (2017)',
        snippet: 'We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
        file: 'transformer-paper.pdf',
        page: 1,
        relevance: 0.98,
      },
      {
        index: 2,
        source: 'Neural Machine Translation Review',
        snippet: 'Self-attention mechanisms compute representations of sequences by relating different positions.',
        file: 'nmt-review.pdf',
        page: 15,
        relevance: 0.85,
      },
      {
        index: 3,
        source: 'RNN vs Transformer Comparison',
        snippet: 'While RNNs process sequences sequentially, Transformers can process all positions in parallel.',
        file: 'comparison-study.pdf',
        page: 8,
        relevance: 0.82,
      },
      {
        index: 4,
        source: 'BLEU Score Analysis 2023',
        snippet: 'Transformer models achieve 41.8 BLEU on WMT 2014 English-to-German translation.',
        file: 'bleu-analysis.pdf',
        page: 3,
        relevance: 0.79,
      },
    ];

    await testCitationResponse(response, citations, {
      minCitations: 3,
      maxCitations: 10,
      requiredSources: ['Attention is All You Need (2017)'],
      minQuality: 0.3,
      query: 'transformer models NLP performance',
    });
  });

  it('should handle edge cases in citation processing', () => {
    // Empty citations
    const emptyText = '';
    const emptyCitations = extractCitations(emptyText);
    expect(emptyCitations).toHaveLength(0);

    // Malformed citations
    const malformedText = 'This [a] is not [999] a valid [0] citation [-1].';
    const malformedCitations = extractCitations(malformedText);
    expect(malformedCitations).toEqual([999]); // Only valid positive number extracted

    // Duplicate citations
    const duplicateText = 'See [1] and [1] again, also [1].';
    const duplicateCitations = extractCitations(duplicateText);
    expect(duplicateCitations).toEqual([1]); // Deduped
  });

  it('should integrate with AI response generation', () => {
    const aiResponse = createAIResponse({
      content: 'According to [1] recent advances in AI, particularly [2] in the field of NLP, have led to [3] breakthrough applications.',
      citations: createMockCitations(3),
    });

    // Extract and validate
    const extractedIndices = extractCitations(aiResponse.content);
    expect(extractedIndices).toEqual([1, 2, 3]);
    expect(aiResponse.citations).toHaveLength(3);

    // Validate references match
    validateCitationReferences(aiResponse.content, aiResponse.citations);
  });
});