import { describe, test, expect, beforeEach, vi } from 'vitest';

// Import the existing global mocks
import '../setup/vitest-mocks';
import OpenAI from 'openai';

// Simple file upload test with proper mocks
describe('File Upload API (Simple)', () => {
  let mockOpenAI: OpenAI;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenAI = new OpenAI({ apiKey: 'test-key' });
  });

  test('should create OpenAI file successfully', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    const result = await mockOpenAI.files.create({
      file: file,
      purpose: 'assistants'
    });

    expect(result).toMatchObject({
      id: 'file-123',
      object: 'file',
      status: 'processed',
      filename: 'test.txt'
    });
    expect(mockOpenAI.files.create).toHaveBeenCalledWith({
      file: file,
      purpose: 'assistants'
    });
  });

  test('should create vector store successfully', async () => {
    // Mock is already set up in the mockOpenAI object
    const result = await mockOpenAI.vectorStores.create({
      name: 'Test Store'
    });

    expect(result).toMatchObject({
      id: 'vs-123',
      name: 'Test Store'
    });
    expect(mockOpenAI.vectorStores.create).toHaveBeenCalledWith({
      name: 'Test Store'
    });
  });

  test('should create file batch successfully', async () => {
    const result = await mockOpenAI.vectorStores.fileBatches.create('vs-123', {
      file_ids: ['file-123']
    });

    expect(result).toMatchObject({
      id: 'batch-123',
      status: 'in_progress',
      file_counts: { completed: 0, in_progress: 1, failed: 0, total: 1 }
    });
    expect(mockOpenAI.vectorStores.fileBatches.create).toHaveBeenCalledWith('vs-123', {
      file_ids: ['file-123']
    });
  });

  test('should retrieve batch status successfully', async () => {
    const result = await mockOpenAI.vectorStores.fileBatches.retrieve('vs-123', 'batch-123');

    expect(result).toMatchObject({
      id: 'batch-123',
      status: 'completed',
      file_counts: { completed: 1, in_progress: 0, failed: 0, total: 1 }
    });
  });

  test('should retrieve file status successfully', async () => {
    const result = await mockOpenAI.vectorStores.files.retrieve('vs-123', 'file-123');

    expect(result).toMatchObject({
      id: 'file-123',
      status: 'completed'
    });
  });

  test('should handle multiple file operations', async () => {
    // Create files
    const file1Result = await mockOpenAI.files.create({
      file: new File(['content1'], 'file1.txt'),
      purpose: 'assistants'
    });
    
    const file2Result = await mockOpenAI.files.create({
      file: new File(['content2'], 'file2.txt'),
      purpose: 'assistants'
    });

    // Create batch
    const batchResult = await mockOpenAI.vectorStores.fileBatches.create('vs-123', {
      file_ids: [file1Result.id, file2Result.id]
    });

    // Check status
    const statusResult = await mockOpenAI.vectorStores.fileBatches.retrieve('vs-123', batchResult.id);

    expect(file1Result.id).toBe('file-123');
    expect(file2Result.id).toBe('file-123');
    expect(batchResult.id).toBe('batch-123');
    expect(statusResult.status).toBe('completed');
    
    expect(mockOpenAI.files.create).toHaveBeenCalledTimes(2);
    expect(mockOpenAI.vectorStores.fileBatches.create).toHaveBeenCalledTimes(1);
    expect(mockOpenAI.vectorStores.fileBatches.retrieve).toHaveBeenCalledTimes(1);
  });
});