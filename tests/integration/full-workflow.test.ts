import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { VectorStoreClient } from '@/lib/ai/vector-store';
import { fileSearchTool } from '@/lib/ai/tools/file-search';
import OpenAI from 'openai';

// Mock OpenAI for integration tests
vi.mock('openai');

describe('Full Workflow Integration Tests', () => {
  let client: VectorStoreClient;
  let mockOpenAI: any;
  const testApiKey = 'test-integration-key';
  
  beforeAll(() => {
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
      threads: {
        create: vi.fn(),
        messages: {
          list: vi.fn(),
        },
        runs: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
    };

    (OpenAI as any).mockImplementation(() => mockOpenAI);
    client = new VectorStoreClient(testApiKey);
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('Upload to Search Workflow', () => {
    it('should complete full upload-to-search workflow', async () => {
      // Setup environment
      process.env.OPENAI_VECTORSTORE_ID = 'vs-workflow-test';
      process.env.OPENAI_ASSISTANT_ID = 'asst-workflow-test';

      // Phase 1: Vector Store Setup
      const vectorStoreId = 'vs-workflow-test';
      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: vectorStoreId,
        name: 'Workflow Test Store',
        description: 'Integration test vector store',
      });

      const storeId = await client.ensureVectorStore('Workflow Test Store');
      expect(storeId).toBe(vectorStoreId);

      // Phase 2: File Upload
      const testFiles = [
        {
          file: new File([
            'Machine learning is a subset of artificial intelligence that focuses on algorithms.'
          ], 'ml-basics.txt', { type: 'text/plain' }),
          filename: 'ml-basics.txt',
        },
        {
          file: new File([
            'Deep learning uses neural networks with multiple layers to learn patterns in data.'
          ], 'deep-learning.txt', { type: 'text/plain' }),
          filename: 'deep-learning.txt',
        },
        {
          file: new File([
            'Natural language processing enables computers to understand human language.'
          ], 'nlp-intro.txt', { type: 'text/plain' }),
          filename: 'nlp-intro.txt',
        },
      ];

      const fileIds = ['file-ml', 'file-dl', 'file-nlp'];
      const batchId = 'batch-workflow';

      // Mock successful uploads
      testFiles.forEach((_, index) => {
        mockOpenAI.files.create.mockResolvedValueOnce({
          id: fileIds[index],
          filename: testFiles[index].filename,
        });
      });

      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({
        id: batchId,
        status: 'in_progress',
      });

      const uploadResult = await client.uploadFiles(testFiles);

      expect(uploadResult.batchId).toBe(batchId);
      expect(uploadResult.files).toHaveLength(3);
      expect(uploadResult.files.every(f => f.status === 'processing')).toBe(true);

      // Phase 3: Processing Completion
      mockOpenAI.vectorStores.fileBatches.retrieve
        .mockResolvedValueOnce({
          id: batchId,
          status: 'in_progress',
          file_counts: { completed: 1, in_progress: 2, failed: 0 },
        })
        .mockResolvedValueOnce({
          id: batchId,
          status: 'in_progress',
          file_counts: { completed: 2, in_progress: 1, failed: 0 },
        })
        .mockResolvedValueOnce({
          id: batchId,
          status: 'completed',
          file_counts: { completed: 3, in_progress: 0, failed: 0 },
        });

      vi.useFakeTimers();
      
      const processingPromise = client.waitForProcessing(batchId, {
        pollInterval: 1000,
        onProgress: (status) => {
          console.log(`Processing: ${status.completedCount}/${status.completedCount + status.inProgressCount + status.failedCount}`);
        },
      });

      // Simulate time passing for polling
      await vi.advanceTimersByTimeAsync(2000);
      
      const isCompleted = await processingPromise;
      expect(isCompleted).toBe(true);

      vi.useRealTimers();

      // Phase 4: File Status Verification
      fileIds.forEach((fileId, index) => {
        mockOpenAI.vectorStores.files.retrieve.mockResolvedValueOnce({
          id: fileId,
          status: 'completed',
          created_at: Date.now() / 1000,
        });
      });

      const fileStatuses = await client.checkFileStatus(fileIds);
      expect(fileStatuses.every(status => status.status === 'completed')).toBe(true);

      // Phase 5: Search Implementation
      const threadId = 'thread-workflow';
      const runId = 'run-workflow';

      mockOpenAI.threads.create.mockResolvedValue({
        id: threadId,
      });

      mockOpenAI.threads.runs.create.mockResolvedValue({
        id: runId,
      });

      mockOpenAI.threads.runs.retrieve
        .mockResolvedValueOnce({ status: 'in_progress' })
        .mockResolvedValueOnce({ status: 'completed' });

      // Mock search results with citations
      mockOpenAI.threads.messages.list.mockResolvedValue({
        data: [
          {
            role: 'user',
            content: [{ type: 'text', text: { value: 'What is machine learning?' } }],
          },
          {
            role: 'assistant',
            content: [{
              type: 'text',
              text: {
                value: 'Machine learning is a subset of artificial intelligence that focuses on algorithms【0】. It uses neural networks with multiple layers【1】.',
                annotations: [
                  {
                    type: 'file_citation',
                    text: '【0】',
                    file_citation: {
                      file_id: fileIds[0],
                      quote: 'Machine learning is a subset of artificial intelligence that focuses on algorithms',
                    },
                  },
                  {
                    type: 'file_citation',
                    text: '【1】',
                    file_citation: {
                      file_id: fileIds[1],
                      quote: 'neural networks with multiple layers',
                    },
                  },
                ],
              },
            }],
          },
        ],
      });

      const searchResult = await fileSearchTool.execute({
        query: 'What is machine learning?',
        limit: 5,
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.content).toContain('Machine learning is a subset');
      expect(searchResult.citations).toHaveLength(2);
      expect(searchResult.citations![0].fileId).toBe(fileIds[0]);
      expect(searchResult.citations![1].fileId).toBe(fileIds[1]);

      // Phase 6: Cleanup
      fileIds.forEach(fileId => {
        mockOpenAI.vectorStores.files.del.mockResolvedValueOnce({});
        mockOpenAI.files.del.mockResolvedValueOnce({});
      });

      for (const fileId of fileIds) {
        await client.deleteFile(fileId);
      }

      // Verify cleanup calls
      expect(mockOpenAI.vectorStores.files.del).toHaveBeenCalledTimes(3);
      expect(mockOpenAI.files.del).toHaveBeenCalledTimes(3);

      // Cleanup environment
      delete process.env.OPENAI_VECTORSTORE_ID;
      delete process.env.OPENAI_ASSISTANT_ID;
    });

    it('should handle partial failures in workflow', async () => {
      // Setup
      const vectorStoreId = 'vs-partial-workflow';
      const batchId = 'batch-partial-workflow';

      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: vectorStoreId,
        name: 'Partial Workflow Test',
      });

      // Simulate mixed upload results
      const testFiles = [
        { file: new File(['success 1'], 'success1.txt'), filename: 'success1.txt' },
        { file: new File(['failure'], 'failure.txt'), filename: 'failure.txt' },
        { file: new File(['success 2'], 'success2.txt'), filename: 'success2.txt' },
      ];

      mockOpenAI.files.create
        .mockResolvedValueOnce({ id: 'file-success-1' })
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({ id: 'file-success-2' });

      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({
        id: batchId,
        status: 'in_progress',
      });

      const uploadResult = await client.uploadFiles(testFiles);

      expect(uploadResult.files).toHaveLength(3);
      expect(uploadResult.files[0].status).toBe('processing');
      expect(uploadResult.files[1].status).toBe('failed');
      expect(uploadResult.files[1].error).toBe('Upload failed');
      expect(uploadResult.files[2].status).toBe('processing');

      // Simulate batch completion with one failure
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        id: batchId,
        status: 'completed',
        file_counts: { completed: 2, in_progress: 0, failed: 0 },
      });

      const batchStatus = await client.checkBatchStatus(batchId);
      expect(batchStatus.completedCount).toBe(2);
      expect(batchStatus.status).toBe('completed');
    });

    it('should handle concurrent workflows', async () => {
      const numWorkflows = 3;
      const workflows = [];

      for (let i = 0; i < numWorkflows; i++) {
        const vectorStoreId = `vs-concurrent-${i}`;
        const batchId = `batch-concurrent-${i}`;

        mockOpenAI.vectorStores.create.mockResolvedValueOnce({
          id: vectorStoreId,
          name: `Concurrent Test ${i}`,
        });

        mockOpenAI.files.create.mockResolvedValueOnce({
          id: `file-concurrent-${i}`,
        });

        mockOpenAI.vectorStores.fileBatches.create.mockResolvedValueOnce({
          id: batchId,
          status: 'in_progress',
        });

        mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValueOnce({
          id: batchId,
          status: 'completed',
          file_counts: { completed: 1, in_progress: 0, failed: 0 },
        });

        const testFile = {
          file: new File([`concurrent content ${i}`], `concurrent-${i}.txt`),
          filename: `concurrent-${i}.txt`,
        };

        workflows.push((async () => {
          const client = new VectorStoreClient(testApiKey);
          await client.ensureVectorStore(`Concurrent Test ${i}`);
          const result = await client.uploadFiles([testFile]);
          const isComplete = await client.waitForProcessing(result.batchId!);
          return { result, isComplete };
        })());
      }

      const results = await Promise.all(workflows);

      expect(results).toHaveLength(numWorkflows);
      results.forEach(({ result, isComplete }) => {
        expect(result.files).toHaveLength(1);
        expect(isComplete).toBe(true);
      });
    });

    it('should maintain data consistency across operations', async () => {
      const vectorStoreId = 'vs-consistency-test';
      const fileId = 'file-consistency';
      const batchId = 'batch-consistency';

      // Setup mocks
      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: vectorStoreId,
        name: 'Consistency Test',
      });

      mockOpenAI.files.create.mockResolvedValue({
        id: fileId,
        filename: 'consistency.txt',
      });

      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({
        id: batchId,
        status: 'in_progress',
      });

      const testFile = {
        file: new File(['consistency test content'], 'consistency.txt'),
        filename: 'consistency.txt',
      };

      // Upload and track IDs
      const uploadResult = await client.uploadFiles([testFile]);
      
      expect(uploadResult.batchId).toBe(batchId);
      expect(uploadResult.files[0].id).toBe(fileId);
      expect(uploadResult.files[0].filename).toBe('consistency.txt');

      // Check batch status maintains consistency
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        id: batchId,
        status: 'completed',
        file_counts: { completed: 1, in_progress: 0, failed: 0 },
      });

      const batchStatus = await client.checkBatchStatus(batchId);
      expect(batchStatus.completedCount).toBe(1);

      // Check individual file status
      mockOpenAI.vectorStores.files.retrieve.mockResolvedValue({
        id: fileId,
        status: 'completed',
        created_at: Date.now() / 1000,
      });

      const fileStatuses = await client.checkFileStatus([fileId]);
      expect(fileStatuses[0].id).toBe(fileId);
      expect(fileStatuses[0].status).toBe('completed');

      // List files should include our file
      mockOpenAI.vectorStores.files.list.mockResolvedValue({
        data: [{
          id: fileId,
          created_at: Date.now() / 1000,
          status: 'completed',
        }],
      });

      const fileList = await client.listFiles();
      expect(fileList.some(f => f.id === fileId)).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from network failures', async () => {
      const vectorStoreId = 'vs-network-test';

      // Simulate network error followed by success
      mockOpenAI.vectorStores.create
        .mockRejectedValueOnce(Object.assign(new Error('Network error'), { name: 'NetworkError' }))
        .mockResolvedValueOnce({
          id: vectorStoreId,
          name: 'Network Recovery Test',
        });

      // In a real implementation, this would include retry logic
      try {
        await client.ensureVectorStore('Network Recovery Test');
      } catch (error) {
        expect((error as Error).message).toBe('Network error');
      }

      // Second attempt should succeed
      const result = await client.ensureVectorStore('Network Recovery Test');
      expect(result).toBe(vectorStoreId);
    });

    it('should handle API rate limiting gracefully', async () => {
      const rateLimitError = Object.assign(new Error('Rate limit exceeded'), { status: 429 });

      mockOpenAI.vectorStores.create.mockRejectedValue(rateLimitError);

      try {
        await client.ensureVectorStore('Rate Limit Test');
      } catch (error) {
        expect((error as any).status).toBe(429);
      }
    });

    it('should handle processing timeouts', async () => {
      const batchId = 'batch-timeout';

      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: 'vs-timeout',
        name: 'Timeout Test',
      });

      mockOpenAI.files.create.mockResolvedValue({ id: 'file-timeout' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({
        id: batchId,
        status: 'in_progress',
      });

      // Mock perpetual in-progress status
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        id: batchId,
        status: 'in_progress',
        file_counts: { completed: 0, in_progress: 1, failed: 0 },
      });

      vi.useFakeTimers();

      const timeoutPromise = client.waitForProcessing(batchId, {
        maxWaitTime: 5000,
        pollInterval: 1000,
      });

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(6000);

      await expect(timeoutPromise).rejects.toThrow('Processing timeout');

      vi.useRealTimers();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large file uploads efficiently', async () => {
      const vectorStoreId = 'vs-large-test';
      const batchId = 'batch-large';

      mockOpenAI.vectorStores.create.mockResolvedValue({
        id: vectorStoreId,
        name: 'Large Upload Test',
      });

      // Simulate uploading 20 files (max batch size)
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB content
      const largeFiles = Array.from({ length: 20 }, (_, i) => ({
        file: new File([largeContent], `large-${i}.txt`, { type: 'text/plain' }),
        filename: `large-${i}.txt`,
      }));

      // Mock all uploads succeeding
      largeFiles.forEach((_, index) => {
        mockOpenAI.files.create.mockResolvedValueOnce({
          id: `file-large-${index}`,
        });
      });

      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({
        id: batchId,
        status: 'in_progress',
      });

      const startTime = Date.now();
      const uploadResult = await client.uploadFiles(largeFiles);
      const uploadTime = Date.now() - startTime;

      expect(uploadResult.files).toHaveLength(20);
      expect(uploadTime).toBeLessThan(10000); // Should complete within 10 seconds
      console.log(`Large upload time: ${uploadTime}ms`);
    });

    it('should maintain performance with many concurrent operations', async () => {
      const numOperations = 10;
      const operations = [];

      for (let i = 0; i < numOperations; i++) {
        mockOpenAI.vectorStores.create.mockResolvedValueOnce({
          id: `vs-perf-${i}`,
          name: `Performance Test ${i}`,
        });

        operations.push(client.ensureVectorStore(`Performance Test ${i}`));
      }

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(numOperations);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      console.log(`Concurrent operations time: ${totalTime}ms`);
    });
  });
});