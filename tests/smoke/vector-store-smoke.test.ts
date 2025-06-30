import { describe, it, expect } from 'vitest';
import { VectorStoreClient } from '@/lib/ai/vector-store';
import { 
  FileStatusSchema, 
  SearchOptionsSchema,
  UploadResponseSchema,
  StatusResponseSchema 
} from '@/lib/types/vector-store';

describe('Vector Store Smoke Tests', () => {
  it('should create VectorStoreClient with valid API key', () => {
    const client = new VectorStoreClient('test-api-key');
    expect(client).toBeDefined();
    expect(client.getVectorStoreId()).toBeUndefined();
  });

  it('should throw error with invalid API key', () => {
    expect(() => new VectorStoreClient('')).toThrow('API key is required');
    expect(() => new VectorStoreClient('   ')).toThrow('API key is required');
  });

  it('should accept vector store ID in constructor', () => {
    const client = new VectorStoreClient('test-key', 'vs-123');
    expect(client.getVectorStoreId()).toBe('vs-123');
  });

  it('should validate FileStatus schema', () => {
    const validStatus = {
      id: 'file-123',
      filename: 'test.txt',
      status: 'completed' as const,
      createdAt: new Date(),
    };

    const result = FileStatusSchema.safeParse(validStatus);
    expect(result.success).toBe(true);
  });

  it('should validate SearchOptions schema', () => {
    const validOptions = {
      query: 'test query',
      limit: 10,
    };

    const result = SearchOptionsSchema.safeParse(validOptions);
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(10);
  });

  it('should validate UploadResponse schema', () => {
    const validResponse = {
      success: true,
      files: [
        {
          id: 'file-123',
          filename: 'test.txt',
          status: 'processing' as const,
          createdAt: new Date(),
        }
      ],
      vectorStoreId: 'vs-123',
      batchId: 'batch-123',
      message: 'Upload successful',
    };

    const result = UploadResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should validate StatusResponse schema', () => {
    const validResponse = {
      success: true,
      status: 'completed' as const,
      completedCount: 1,
      inProgressCount: 0,
      failedCount: 0,
    };

    const result = StatusResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should reject invalid schemas', () => {
    const invalidStatus = {
      id: '',
      filename: 'test.txt',
      status: 'invalid-status',
      createdAt: 'not-a-date',
    };

    const result = FileStatusSchema.safeParse(invalidStatus);
    expect(result.success).toBe(false);
  });

  it('should handle schema defaults correctly', () => {
    const searchOptions = SearchOptionsSchema.parse({ query: 'test' });
    expect(searchOptions.limit).toBe(10); // default value
  });
});

describe('Type Exports', () => {
  it('should export all required types', () => {
    // Verify that all types can be imported without errors
    expect(FileStatusSchema).toBeDefined();
    expect(SearchOptionsSchema).toBeDefined();
    expect(UploadResponseSchema).toBeDefined();
    expect(StatusResponseSchema).toBeDefined();
  });
});

describe('Constants', () => {
  it('should export required constants', async () => {
    const types = await import('@/lib/types/vector-store');
    
    expect(types.SUPPORTED_FILE_TYPES).toBeDefined();
    expect(types.MAX_FILE_SIZE).toBe(512 * 1024 * 1024);
    expect(types.MAX_FILES_PER_BATCH).toBe(20);
    expect(types.DEFAULT_SEARCH_LIMIT).toBe(10);
    expect(types.MAX_SEARCH_LIMIT).toBe(100);
  });
});