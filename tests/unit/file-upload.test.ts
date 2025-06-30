import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { VectorStoreClient } from '@/lib/ai/vector-store';
import OpenAI from 'openai';

// Mock OpenAI
const mockOpenAI = {
  files: {
    create: mock(() => Promise.resolve({ id: 'file-123', status: 'processed' })),
    del: mock(() => Promise.resolve({ id: 'file-123', deleted: true })),
  },
  vectorStores: {
    create: mock(() => Promise.resolve({ id: 'vs-123', name: 'Test Store' })),
    retrieve: mock(() => Promise.resolve({ id: 'vs-123', name: 'Test Store' })),
    files: {
      create: mock(() => Promise.resolve({ id: 'vsf-123', status: 'in_progress' })),
      list: mock(() => Promise.resolve({ data: [] })),
      retrieve: mock(() => Promise.resolve({ id: 'vsf-123', status: 'completed' })),
      del: mock(() => Promise.resolve({ id: 'vsf-123', deleted: true })),
    },
    fileBatches: {
      create: mock(() => Promise.resolve({ 
        id: 'batch-123', 
        status: 'in_progress',
        file_counts: { completed: 0, in_progress: 1, failed: 0 }
      })),
      retrieve: mock(() => Promise.resolve({ 
        id: 'batch-123', 
        status: 'completed',
        file_counts: { completed: 1, in_progress: 0, failed: 0 }
      })),
    },
  },
};

// Mock the OpenAI constructor
mock.module('openai', () => ({
  default: function() { return mockOpenAI; }
}));

describe('VectorStoreClient', () => {
  let client: VectorStoreClient;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockOpenAI.files).forEach(fn => fn.mockClear?.());
    Object.values(mockOpenAI.vectorStores).forEach(fn => {
      if (typeof fn === 'function') fn.mockClear?.();
    });
    Object.values(mockOpenAI.vectorStores.files).forEach(fn => fn.mockClear?.());
    Object.values(mockOpenAI.vectorStores.fileBatches).forEach(fn => fn.mockClear?.());
    
    client = new VectorStoreClient('test-api-key');
  });

  describe('ensureVectorStore', () => {
    test('creates new vector store if none exists', async () => {
      const storeId = await client.ensureVectorStore('Test Store');
      
      expect(storeId).toBe('vs-123');
      expect(mockOpenAI.vectorStores.create).toHaveBeenCalledWith({
        name: 'Test Store',
        description: 'Vector store for RAG chat application file search',
      });
    });

    test('uses existing vector store if ID provided', async () => {
      client = new VectorStoreClient('test-api-key', 'existing-vs-123');
      mockOpenAI.vectorStores.retrieve.mockResolvedValueOnce({ 
        id: 'existing-vs-123', 
        name: 'Existing Store' 
      });
      
      const storeId = await client.ensureVectorStore();
      
      expect(storeId).toBe('existing-vs-123');
      expect(mockOpenAI.vectorStores.retrieve).toHaveBeenCalledWith('existing-vs-123');
      expect(mockOpenAI.vectorStores.create).not.toHaveBeenCalled();
    });

    test('creates new store if existing one not found', async () => {
      client = new VectorStoreClient('test-api-key', 'non-existent-vs');
      mockOpenAI.vectorStores.retrieve.mockRejectedValueOnce(new Error('Not found'));
      
      const storeId = await client.ensureVectorStore();
      
      expect(storeId).toBe('vs-123');
      expect(mockOpenAI.vectorStores.create).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    test('successfully uploads a single file', async () => {
      const file = new Blob(['test content'], { type: 'text/plain' });
      const result = await client.uploadFile({
        file,
        filename: 'test.txt',
      });

      expect(result.status).toBe('processing');
      expect(result.filename).toBe('test.txt');
      expect(result.id).toBe('file-123');
      expect(mockOpenAI.files.create).toHaveBeenCalled();
      expect(mockOpenAI.vectorStores.files.create).toHaveBeenCalled();
    });

    test('handles upload failure gracefully', async () => {
      mockOpenAI.files.create.mockRejectedValueOnce(new Error('Upload failed'));
      
      const file = new Blob(['test content'], { type: 'text/plain' });
      const result = await client.uploadFile({
        file,
        filename: 'test.txt',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('uploadFiles', () => {
    test('uploads multiple files and creates batch', async () => {
      const files = [
        { file: new Blob(['content1'], { type: 'text/plain' }), filename: 'file1.txt' },
        { file: new Blob(['content2'], { type: 'text/plain' }), filename: 'file2.txt' },
      ];

      mockOpenAI.files.create
        .mockResolvedValueOnce({ id: 'file-1', status: 'processed' })
        .mockResolvedValueOnce({ id: 'file-2', status: 'processed' });

      const result = await client.uploadFiles(files);

      expect(result.batchId).toBe('batch-123');
      expect(result.files).toHaveLength(2);
      expect(result.files[0].status).toBe('processing');
      expect(result.files[1].status).toBe('processing');
      expect(mockOpenAI.vectorStores.fileBatches.create).toHaveBeenCalledWith(
        'vs-123',
        { file_ids: ['file-1', 'file-2'] }
      );
    });

    test('handles partial upload failure', async () => {
      const files = [
        { file: new Blob(['content1'], { type: 'text/plain' }), filename: 'file1.txt' },
        { file: new Blob(['content2'], { type: 'text/plain' }), filename: 'file2.txt' },
      ];

      mockOpenAI.files.create
        .mockResolvedValueOnce({ id: 'file-1', status: 'processed' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      const result = await client.uploadFiles(files);

      expect(result.batchId).toBe('batch-123');
      expect(result.files).toHaveLength(2);
      expect(result.files[0].status).toBe('processing');
      expect(result.files[1].status).toBe('failed');
      expect(mockOpenAI.vectorStores.fileBatches.create).toHaveBeenCalledWith(
        'vs-123',
        { file_ids: ['file-1'] }
      );
    });
  });

  describe('checkBatchStatus', () => {
    test('retrieves batch status successfully', async () => {
      const status = await client.checkBatchStatus('batch-123');

      expect(status.status).toBe('completed');
      expect(status.completedCount).toBe(1);
      expect(status.inProgressCount).toBe(0);
      expect(status.failedCount).toBe(0);
    });
  });

  describe('waitForProcessing', () => {
    test('polls until completion', async () => {
      let callCount = 0;
      mockOpenAI.vectorStores.fileBatches.retrieve.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            id: 'batch-123',
            status: 'in_progress',
            file_counts: { completed: 0, in_progress: 1, failed: 0 }
          });
        }
        return Promise.resolve({
          id: 'batch-123',
          status: 'completed',
          file_counts: { completed: 1, in_progress: 0, failed: 0 }
        });
      });

      const result = await client.waitForProcessing('batch-123', {
        pollInterval: 10,
      });

      expect(result).toBe(true);
      expect(mockOpenAI.vectorStores.fileBatches.retrieve).toHaveBeenCalledTimes(3);
    });

    test('returns false on failure', async () => {
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValueOnce({
        id: 'batch-123',
        status: 'failed',
        file_counts: { completed: 0, in_progress: 0, failed: 1 }
      });

      const result = await client.waitForProcessing('batch-123');

      expect(result).toBe(false);
    });

    test('throws on timeout', async () => {
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        id: 'batch-123',
        status: 'in_progress',
        file_counts: { completed: 0, in_progress: 1, failed: 0 }
      });

      await expect(
        client.waitForProcessing('batch-123', {
          maxWaitTime: 50,
          pollInterval: 20,
        })
      ).rejects.toThrow('Processing timeout');
    });
  });

  describe('deleteFile', () => {
    test('deletes file from vector store and OpenAI', async () => {
      await client.deleteFile('file-123');

      expect(mockOpenAI.vectorStores.files.del).toHaveBeenCalledWith('vs-123', 'file-123');
      expect(mockOpenAI.files.del).toHaveBeenCalledWith('file-123');
    });
  });

  describe('listFiles', () => {
    test('lists files in vector store', async () => {
      mockOpenAI.vectorStores.files.list.mockResolvedValueOnce({
        data: [
          { id: 'file-1', created_at: 1234567890, status: 'completed' },
          { id: 'file-2', created_at: 1234567891, status: 'completed' },
        ],
      });

      const files = await client.listFiles();

      expect(files).toHaveLength(2);
      expect(files[0].id).toBe('file-1');
      expect(files[0].status).toBe('completed');
      expect(files[0].createdAt).toBeInstanceOf(Date);
    });
  });
});