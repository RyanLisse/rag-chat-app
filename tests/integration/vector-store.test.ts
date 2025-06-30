// Integration Tests for Vector Store Operations
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  MockVectorStore,
  testVectorStoreUpload,
  assertSearchQuality,
  createTestDocuments
} from '../utils/vector-store-helpers';
import { mockFileSearchResponse } from '../utils/ai-mocks';

describe('Vector Store Integration', () => {
  let vectorStore: MockVectorStore;

  beforeAll(() => {
    vectorStore = new MockVectorStore('vs_test_integration', 50);
  });

  afterAll(() => {
    vectorStore.clear();
  });

  it('should upload and process multiple documents', async () => {
    const documents = createTestDocuments();
    
    const uploadedFiles = await testVectorStoreUpload(vectorStore, documents);
    
    expect(uploadedFiles).toHaveLength(documents.length);
    uploadedFiles.forEach(file => {
      expect(file.status).toBe('completed');
      expect(file.id).toBeTruthy();
    });
  });

  it('should search documents with relevance scoring', async () => {
    // Upload test documents first
    const documents = createTestDocuments();
    await testVectorStoreUpload(vectorStore, documents);
    
    // Search for specific topics
    const searchResults = await vectorStore.search('neural networks architecture', {
      limit: 5,
      threshold: 0.3,
    });
    
    assertSearchQuality(searchResults, {
      minResults: 1,
      maxResults: 5,
      requiredFiles: ['neural-networks.txt'],
      minScore: 0.3,
    });
  });

  it('should handle concurrent file uploads', async () => {
    const files = Array.from({ length: 10 }, (_, i) => ({
      name: `concurrent-file-${i}.txt`,
      content: `This is test content for file ${i}. It contains information about AI and machine learning.`,
    }));
    
    // Upload all files concurrently
    const uploadPromises = files.map(file => 
      vectorStore.uploadFile(file.name, file.content)
    );
    
    const results = await Promise.all(uploadPromises);
    
    // All uploads should succeed
    expect(results).toHaveLength(files.length);
    results.forEach(result => {
      expect(result.status).toBe('uploading');
      expect(result.id).toBeTruthy();
    });
    
    // Wait for all processing
    await Promise.all(
      results.map(file => vectorStore.waitForProcessing(file.id))
    );
    
    // Verify all files are processed
    const allFiles = vectorStore.getAllFiles();
    const processedCount = allFiles.filter(f => f.status === 'completed').length;
    expect(processedCount).toBeGreaterThanOrEqual(files.length);
  });

  it('should integrate with AI response generation', async () => {
    // Upload documents
    const documents = createTestDocuments();
    await testVectorStoreUpload(vectorStore, documents);
    
    // Simulate a search query
    const query = 'explain transformer models and their advantages';
    const searchResults = await vectorStore.search(query, { limit: 3 });
    
    // Generate mock response with citations
    const files = searchResults.map(r => r.filename);
    const { response, citations } = mockFileSearchResponse(query, files);
    
    // Verify response quality
    expect(response).toContain('[1]');
    expect(response).toContain('[2]');
    expect(citations).toHaveLength(files.length);
    
    // Each citation should reference actual search results
    citations.forEach((citation, index) => {
      expect(citation.file).toBe(searchResults[index].filename);
      expect(citation.snippet).toContain(query);
    });
  });

  it('should handle search with no results gracefully', async () => {
    const results = await vectorStore.search('nonexistent quantum blockchain NFT', {
      threshold: 0.9, // High threshold
    });
    
    expect(results).toHaveLength(0);
  });

  it('should support fuzzy search capabilities', async () => {
    // Upload a document
    await vectorStore.uploadFile(
      'fuzzy-test.txt',
      'Machine learning algorithms can be categorized into supervised, unsupervised, and reinforcement learning.'
    );
    
    await vectorStore.waitForProcessing(
      vectorStore.getAllFiles().find(f => f.filename === 'fuzzy-test.txt')!.id
    );
    
    // Search with typos/variations
    const searches = [
      'machne lerning', // typo
      'ML algorithms', // abbreviation
      'categorised', // spelling variation
    ];
    
    for (const searchTerm of searches) {
      const results = await vectorStore.search(searchTerm, { threshold: 0.3 });
      // Should still find results despite variations
      expect(results.length).toBeGreaterThan(0);
    }
  });

  it('should maintain search performance with large corpus', async () => {
    // Upload many documents
    const largeBatch = Array.from({ length: 100 }, (_, i) => ({
      name: `doc-${i}.txt`,
      content: `Document ${i}: ${['AI', 'ML', 'Deep Learning', 'Neural Networks', 'NLP'][i % 5]} content with various topics and keywords.`,
    }));
    
    await testVectorStoreUpload(vectorStore, largeBatch);
    
    // Measure search performance
    const startTime = Date.now();
    const results = await vectorStore.search('deep learning neural', { limit: 10 });
    const searchTime = Date.now() - startTime;
    
    console.log(`Search time for ${largeBatch.length} documents: ${searchTime}ms`);
    
    expect(searchTime).toBeLessThan(100); // Should be fast even with many docs
    expect(results.length).toBeGreaterThan(0);
  });
});