import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/(chat)/api/files/status/route';
import OpenAI from 'openai';

// Mock dependencies
vi.mock('openai');
vi.mock('@/app/(auth)/auth');

describe('Status Route', () => {
  let mockOpenAI: any;
  let mockAuth: any;

  beforeEach(() => {
    // Mock OpenAI client
    mockOpenAI = {
      vectorStores: {
        fileBatches: {
          retrieve: vi.fn(),
        },
        files: {
          retrieve: vi.fn(),
        },
      },
    };

    (OpenAI as any).mockImplementation(() => mockOpenAI);

    // Mock auth
    mockAuth = vi.fn();
    vi.doMock('@/app/(auth)/auth', () => ({
      auth: mockAuth,
    }));

    // Set environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({ vectorStoreId: 'vs-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });

      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        id: 'batch-123',
        status: 'completed',
        file_counts: { completed: 1, in_progress: 0, failed: 0 },
      });

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAuth).toHaveBeenCalled();
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should validate required vectorStoreId', async () => {
      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({ batchId: 'batch-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('vectorStoreId');
    });

    it('should require either batchId or fileIds', async () => {
      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({ vectorStoreId: 'vs-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either batchId or fileIds must be provided');
    });

    it('should validate fileIds array', async () => {
      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: 'not-an-array',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('fileIds');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process request');
    });
  });

  describe('Batch Status Checking', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should return batch status successfully', async () => {
      const mockBatch = {
        id: 'batch-123',
        status: 'completed',
        file_counts: {
          completed: 3,
          in_progress: 0,
          failed: 1,
        },
      };

      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue(mockBatch);

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        status: 'completed',
        completedCount: 3,
        inProgressCount: 0,
        failedCount: 1,
      });

      expect(mockOpenAI.vectorStores.fileBatches.retrieve).toHaveBeenCalledWith(
        'vs-123',
        'batch-123'
      );
    });

    it('should handle different batch statuses', async () => {
      const statuses = ['in_progress', 'failed', 'cancelled'] as const;

      for (const status of statuses) {
        mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
          id: 'batch-123',
          status,
          file_counts: { completed: 0, in_progress: 1, failed: 0 },
        });

        const request = new NextRequest('http://localhost/api/files/status', {
          method: 'POST',
          body: JSON.stringify({
            vectorStoreId: 'vs-123',
            batchId: 'batch-123',
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe(status);
      }
    });

    it('should handle batch retrieval errors', async () => {
      mockOpenAI.vectorStores.fileBatches.retrieve.mockRejectedValue(
        new Error('Batch not found')
      );

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'invalid-batch',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to retrieve batch status');
    });
  });

  describe('Individual File Status Checking', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should return file statuses successfully', async () => {
      const mockFiles = [
        { id: 'file-1', status: 'completed' },
        { id: 'file-2', status: 'in_progress' },
      ];

      mockOpenAI.vectorStores.files.retrieve
        .mockResolvedValueOnce(mockFiles[0])
        .mockResolvedValueOnce(mockFiles[1]);

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: ['file-1', 'file-2'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        status: 'in_progress', // Because one file is still in progress
        files: [
          { id: 'file-1', status: 'completed' },
          { id: 'file-2', status: 'in_progress' },
        ],
        completedCount: 1,
        inProgressCount: 1,
        failedCount: 0,
      });
    });

    it('should handle mix of successful and failed file retrievals', async () => {
      mockOpenAI.vectorStores.files.retrieve
        .mockResolvedValueOnce({ id: 'file-1', status: 'completed' })
        .mockRejectedValueOnce(new Error('File not found'));

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: ['file-1', 'file-2'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.files).toHaveLength(2);
      expect(data.files[0].status).toBe('completed');
      expect(data.files[1].status).toBe('failed');
      expect(data.files[1].error).toBe('File not found or retrieval failed');
    });

    it('should calculate overall status correctly', async () => {
      // Test all files completed
      mockOpenAI.vectorStores.files.retrieve
        .mockResolvedValueOnce({ status: 'completed' })
        .mockResolvedValueOnce({ status: 'completed' });

      let request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: ['file-1', 'file-2'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      let response = await POST(request);
      let data = await response.json();

      expect(data.status).toBe('completed');

      // Test all files failed
      mockOpenAI.vectorStores.files.retrieve
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'));

      request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: ['file-3', 'file-4'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      response = await POST(request);
      data = await response.json();

      expect(data.status).toBe('failed');
    });

    it('should handle empty file IDs array', async () => {
      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: [],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either batchId or fileIds must be provided');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should handle OpenAI API errors', async () => {
      const apiError = new Error('OpenAI API Error');
      (apiError as any).status = 429;
      
      mockOpenAI.vectorStores.fileBatches.retrieve.mockRejectedValue(apiError);

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to retrieve batch status');
    });

    it('should handle individual file retrieval errors', async () => {
      mockOpenAI.vectorStores.files.retrieve.mockRejectedValue(
        new Error('File retrieval failed')
      );

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: ['file-1'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to retrieve file statuses');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      
      mockOpenAI.vectorStores.fileBatches.retrieve.mockRejectedValue(networkError);

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Network error');
    });

    it('should handle unknown errors gracefully', async () => {
      mockOpenAI.vectorStores.fileBatches.retrieve.mockRejectedValue('Unknown error');

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Unknown error');
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should return correct batch response format', async () => {
      mockOpenAI.vectorStores.fileBatches.retrieve.mockResolvedValue({
        id: 'batch-123',
        status: 'completed',
        file_counts: { completed: 2, in_progress: 0, failed: 1 },
      });

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toMatchObject({
        success: expect.any(Boolean),
        status: expect.any(String),
        completedCount: expect.any(Number),
        inProgressCount: expect.any(Number),
        failedCount: expect.any(Number),
      });

      // Should not include files array for batch responses
      expect(data.files).toBeUndefined();
    });

    it('should return correct file response format', async () => {
      mockOpenAI.vectorStores.files.retrieve.mockResolvedValue({
        id: 'file-1',
        status: 'completed',
      });

      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: ['file-1'],
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toMatchObject({
        success: expect.any(Boolean),
        status: expect.any(String),
        files: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            status: expect.any(String),
          }),
        ]),
        completedCount: expect.any(Number),
        inProgressCount: expect.any(Number),
        failedCount: expect.any(Number),
      });
    });

    it('should include error details in failed responses', async () => {
      const request = new NextRequest('http://localhost/api/files/status', {
        method: 'POST',
        body: JSON.stringify({ vectorStoreId: 'vs-123' }), // Missing required fields
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Either batchId or fileIds must be provided');
    });
  });

  describe('Concurrent Requests', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should handle multiple concurrent status checks', async () => {
      mockOpenAI.vectorStores.fileBatches.retrieve.mockImplementation(
        async (vectorStoreId: string, batchId: string) => {
          // Simulate different response times
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          return {
            id: batchId,
            status: 'completed',
            file_counts: { completed: 1, in_progress: 0, failed: 0 },
          };
        }
      );

      const requests = Array.from({ length: 5 }, (_, i) =>
        new NextRequest('http://localhost/api/files/status', {
          method: 'POST',
          body: JSON.stringify({
            vectorStoreId: 'vs-123',
            batchId: `batch-${i}`,
          }),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const responses = await Promise.all(requests.map(request => POST(request)));
      const data = await Promise.all(responses.map(response => response.json()));

      expect(responses.every(response => response.status === 200)).toBe(true);
      expect(data.every(d => d.success === true)).toBe(true);
    });
  });
});