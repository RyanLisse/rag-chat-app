import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorStoreClient } from '@/lib/ai/vector-store';
import { 
  FileStatusSchema, 
  VectorStoreConfigSchema,
  FileUploadOptionsSchema,
  SearchOptionsSchema 
} from '@/lib/types/vector-store';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai');

describe('VectorStoreClient', () => {
  let client: VectorStoreClient;
  let mockOpenAI: any;

  beforeEach(() => {
    mockOpenAI = {
      vectorStores: {
        create: vi.fn(),
        retrieve: vi.fn(),
        files: {
          create: vi.fn(),
          retrieve: vi.fn(),
          del: vi.fn(),
          list: vi.fn(),
        },
        fileBatches: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
      files: {
        create: vi.fn(),
        del: vi.fn(),
      },
    };

    (OpenAI as any).mockImplementation(() => mockOpenAI);
    
    client = new VectorStoreClient('test-api-key');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with API key', () => {
      expect(client).toBeInstanceOf(VectorStoreClient);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should accept vector store ID', () => {
      const clientWithId = new VectorStoreClient('test-key', 'vs-123');
      expect(clientWithId.getVectorStoreId()).toBe('vs-123');
    });

    it('should validate API key is provided', () => {
      expect(() => new VectorStoreClient('')).toThrow();
    });
  });

  describe('ensureVectorStore', () => {
    it('should return existing vector store ID if available', async () => {
      const existingId = 'vs-existing';
      const clientWithId = new VectorStoreClient('test-key', existingId);
      
      mockOpenAI.vectorStores.retrieve.mockResolvedValue({
        id: existingId,
        name: 'Test Store',
      });

      const result = await clientWithId.ensureVectorStore();
      
      expect(result).toBe(existingId);
      expect(mockOpenAI.vectorStores.retrieve).toHaveBeenCalledWith(existingId);
    });

    it('should create new vector store if none exists', async () => {
      const newId = 'vs-new';
      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: newId,
        name: 'RAG Chat Vector Store',
      });

      const result = await client.ensureVectorStore();
      
      expect(result).toBe(newId);
      expect(mockOpenAI.vectorStores.create).toHaveBeenCalledWith({
        name: 'RAG Chat Vector Store',
        description: 'Vector store for RAG chat application file search',
      });
    });

    it('should create vector store with custom name', async () => {
      const customName = 'Custom Store';
      const newId = 'vs-custom';
      
      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: newId,
        name: customName,
      });

      const result = await client.ensureVectorStore(customName);
      
      expect(result).toBe(newId);
      expect(mockOpenAI.vectorStores.create).toHaveBeenCalledWith({
        name: customName,
        description: 'Vector store for RAG chat application file search',
      });
    });

    it('should handle vector store retrieval errors', async () => {
      const clientWithId = new VectorStoreClient('test-key', 'vs-invalid');
      
      mockOpenAI.vectorStores.retrieve.mockRejectedValue(new Error('Not found'));
      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: 'vs-new',
        name: 'RAG Chat Vector Store',
      });

      const result = await clientWithId.ensureVectorStore();
      
      expect(result).toBe('vs-new');
      expect(mockOpenAI.vectorStores.create).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const uploadOptions = { file: mockFile, filename: 'test.txt' };

    beforeEach(() => {
      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: 'vs-test',
        name: 'Test Store',
      });
    });

    it('should upload file successfully', async () => {
      const fileId = 'file-123';
      mockOpenAI.files.create.mockResolvedValue({ id: fileId });
      mockOpenAI.vectorStores.files.create.mockResolvedValue({ id: fileId });

      const result = await client.uploadFile(uploadOptions);

      expect(result.status).toBe('processing');
      expect(result.id).toBe(fileId);
      expect(result.filename).toBe('test.txt');
      expect(mockOpenAI.files.create).toHaveBeenCalledWith({
        file: expect.any(File),
        purpose: 'assistants',
      });
    });

    it('should handle file upload errors', async () => {
      mockOpenAI.files.create.mockRejectedValue(new Error('Upload failed'));

      const result = await client.uploadFile(uploadOptions);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Upload failed');
      expect(result.filename).toBe('test.txt');
    });

    it('should handle vector store addition errors', async () => {
      const fileId = 'file-123';
      mockOpenAI.files.create.mockResolvedValue({ id: fileId });
      mockOpenAI.vectorStores.files.create.mockRejectedValue(new Error('Vector store error'));

      const result = await client.uploadFile(uploadOptions);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Vector store error');
    });

    it('should validate file upload options', async () => {
      const invalidOptions = { file: mockFile, filename: '' };
      
      await expect(async () => {
        FileUploadOptionsSchema.parse(invalidOptions);
      }).rejects.toThrow();
    });
  });

  describe('uploadFiles', () => {
    const mockFiles = [
      { file: new File(['content1'], 'file1.txt'), filename: 'file1.txt' },
      { file: new File(['content2'], 'file2.txt'), filename: 'file2.txt' },
    ];

    beforeEach(() => {
      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: 'vs-test',
        name: 'Test Store',
      });
    });

    it('should upload multiple files successfully', async () => {
      const fileIds = ['file-1', 'file-2'];
      const batchId = 'batch-123';

      mockOpenAI.files.create
        .mockResolvedValueOnce({ id: fileIds[0] })
        .mockResolvedValueOnce({ id: fileIds[1] });
      
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({
        id: batchId,
        status: 'in_progress',
      });

      const result = await client.uploadFiles(mockFiles);

      expect(result.batchId).toBe(batchId);
      expect(result.files).toHaveLength(2);
      expect(result.files[0].status).toBe('processing');
      expect(result.files[1].status).toBe('processing');
      expect(mockOpenAI.vectorStores.fileBatches.create).toHaveBeenCalledWith(
        'vs-test',
        { file_ids: fileIds }
      );
    });

    it('should handle partial upload failures', async () => {
      const fileId = 'file-1';
      
      mockOpenAI.files.create
        .mockResolvedValueOnce({ id: fileId })
        .mockRejectedValueOnce(new Error('Upload failed'));
      
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({
        id: 'batch-123',
        status: 'in_progress',
      });

      const result = await client.uploadFiles(mockFiles);

      expect(result.files).toHaveLength(2);
      expect(result.files[0].status).toBe('processing');
      expect(result.files[1].status).toBe('failed');
      expect(result.files[1].error).toBe('Upload failed');
    });

    it('should handle empty file list', async () => {
      const result = await client.uploadFiles([]);

      expect(result.batchId).toBe('');
      expect(result.files).toHaveLength(0);
    });

    it('should handle batch creation failure', async () => {
      mockOpenAI.files.create.mockResolvedValue({ id: 'file-1' });
      mockOpenAI.vectorStores.fileBatches.create.mockRejectedValue(new Error('Batch failed'));

      await expect(client.uploadFiles(mockFiles.slice(0, 1))).rejects.toThrow('Batch failed');
    });
  });

  describe('checkBatchStatus', () => {
    it('should return batch status', async () => {
      const batchId = 'batch-123';
      const mockBatch = {
        id: batchId,
        status: 'completed',
        file_counts: {
          completed: 2,
          in_progress: 0,
          failed: 0,
          cancelled: 0,
          total: 2,
        },
      };

      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-test' });
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue(mockBatch);

      const result = await client.checkBatchStatus(batchId);

      expect(result.status).toBe('completed');
      expect(result.completedCount).toBe(2);
      expect(result.inProgressCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should handle batch retrieval errors', async () => {
      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-test' });
      mockOpenAI.vectorStores.fileBatches.retrieve.mockRejectedValue(new Error('Batch not found'));

      await expect(client.checkBatchStatus('invalid-batch')).rejects.toThrow('Batch not found');
    });
  });

  describe('checkFileStatus', () => {
    beforeEach(() => {
      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-test' });
    });

    it('should return file statuses', async () => {
      const fileIds = ['file-1', 'file-2'];
      const mockFiles = [
        { id: 'file-1', status: 'completed', created_at: 1234567890 },
        { id: 'file-2', status: 'in_progress', created_at: 1234567891 },
      ];

      mockOpenAI.vectorStores.files.retrieve
        .mockResolvedValueOnce(mockFiles[0])
        .mockResolvedValueOnce(mockFiles[1]);

      const result = await client.checkFileStatus(fileIds);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('processing');
    });

    it('should handle file not found errors', async () => {
      const fileIds = ['file-invalid'];
      
      mockOpenAI.vectorStores.files.retrieve.mockRejectedValue(new Error('File not found'));

      const result = await client.checkFileStatus(fileIds);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('failed');
      expect(result[0].error).toBe('File not found');
    });
  });

  describe('waitForProcessing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-test' });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should wait for batch completion', async () => {
      const batchId = 'batch-123';
      
      mockOpenAI.vectorStores.fileBatches.retrieve
        .mockResolvedValueOnce({
          status: 'in_progress',
          file_counts: { completed: 1, in_progress: 1, failed: 0 },
        })
        .mockResolvedValueOnce({
          status: 'completed',
          file_counts: { completed: 2, in_progress: 0, failed: 0 },
        });

      const promise = client.waitForProcessing(batchId, { pollInterval: 1000 });
      
      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(1000);
      
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should timeout after max wait time', async () => {
      const batchId = 'batch-123';
      
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        status: 'in_progress',
        file_counts: { completed: 0, in_progress: 2, failed: 0 },
      });

      const promise = client.waitForProcessing(batchId, { 
        maxWaitTime: 5000, 
        pollInterval: 1000 
      });
      
      // Advance past max wait time
      await vi.advanceTimersByTimeAsync(6000);
      
      await expect(promise).rejects.toThrow('Processing timeout');
    });

    it('should handle failed batch status', async () => {
      const batchId = 'batch-123';
      
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        status: 'failed',
        file_counts: { completed: 0, in_progress: 0, failed: 2 },
      });

      const result = await client.waitForProcessing(batchId);
      expect(result).toBe(false);
    });

    it('should call progress callback', async () => {
      const batchId = 'batch-123';
      const progressCallback = vi.fn();
      
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        status: 'completed',
        file_counts: { completed: 2, in_progress: 0, failed: 0 },
      });

      await client.waitForProcessing(batchId, { onProgress: progressCallback });
      
      expect(progressCallback).toHaveBeenCalledWith({
        status: 'completed',
        completedCount: 2,
        inProgressCount: 0,
        failedCount: 0,
      });
    });
  });

  describe('deleteFile', () => {
    beforeEach(() => {
      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-test' });
    });

    it('should delete file from vector store and files API', async () => {
      const fileId = 'file-123';
      
      mockOpenAI.vectorStores.files.del.mockResolvedValue({});
      mockOpenAI.files.del.mockResolvedValue({});

      await client.deleteFile(fileId);

      expect(mockOpenAI.vectorStores.files.del).toHaveBeenCalledWith('vs-test', fileId);
      expect(mockOpenAI.files.del).toHaveBeenCalledWith(fileId);
    });

    it('should handle deletion errors', async () => {
      const fileId = 'file-123';
      
      mockOpenAI.vectorStores.files.del.mockRejectedValue(new Error('Delete failed'));

      await expect(client.deleteFile(fileId)).rejects.toThrow('Delete failed');
    });
  });

  describe('listFiles', () => {
    beforeEach(() => {
      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-test' });
    });

    it('should list files in vector store', async () => {
      const mockFiles = {
        data: [
          { id: 'file-1', created_at: 1234567890, status: 'completed' },
          { id: 'file-2', created_at: 1234567891, status: 'processing' },
        ],
      };

      mockOpenAI.vectorStores.files.list.mockResolvedValue(mockFiles);

      const result = await client.listFiles();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('file-1');
      expect(result[0].status).toBe('completed');
      expect(result[0].createdAt).toEqual(new Date(1234567890 * 1000));
    });

    it('should handle custom limit', async () => {
      mockOpenAI.vectorStores.files.list.mockResolvedValue({ data: [] });

      await client.listFiles(50);

      expect(mockOpenAI.vectorStores.files.list).toHaveBeenCalledWith('vs-test', {
        limit: 50,
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      
      mockOpenAI.vectorStores.create.mockRejectedValue(networkError);

      await expect(client.ensureVectorStore()).rejects.toThrow('Network error');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;
      
      mockOpenAI.vectorStores.create.mockRejectedValue(rateLimitError);

      await expect(client.ensureVectorStore()).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle API authentication errors', async () => {
      const authError = new Error('Invalid API key');
      (authError as any).status = 401;
      
      mockOpenAI.vectorStores.create.mockRejectedValue(authError);

      await expect(client.ensureVectorStore()).rejects.toThrow('Invalid API key');
    });
  });

  describe('data validation', () => {
    it('should validate file status schema', () => {
      const validStatus = {
        id: 'file-123',
        filename: 'test.txt',
        status: 'completed' as const,
        createdAt: new Date(),
      };

      expect(() => FileStatusSchema.parse(validStatus)).not.toThrow();
    });

    it('should reject invalid file status', () => {
      const invalidStatus = {
        id: '',
        filename: 'test.txt',
        status: 'invalid-status',
        createdAt: 'not-a-date',
      };

      expect(() => FileStatusSchema.parse(invalidStatus)).toThrow();
    });

    it('should validate search options', () => {
      const validOptions = {
        query: 'test query',
        limit: 10,
      };

      expect(() => SearchOptionsSchema.parse(validOptions)).not.toThrow();
    });

    it('should reject invalid search options', () => {
      const invalidOptions = {
        query: '',
        limit: -1,
      };

      expect(() => SearchOptionsSchema.parse(invalidOptions)).toThrow();
    });
  });
});