import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST as uploadPOST } from '@/app/(chat)/api/files/upload/route';
import { POST as statusPOST } from '@/app/(chat)/api/files/status/route';

// Mock auth
import { auth } from '@/app/(auth)/auth';
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(),
}));

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    files: {
      create: jest.fn().mockResolvedValue({ id: 'file-123', status: 'processed' }),
    },
    vectorStores: {
      create: jest.fn().mockResolvedValue({ id: 'vs-123', name: 'Test Store' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'vs-123', name: 'Test Store' }),
      files: {
        create: jest.fn().mockResolvedValue({ id: 'vsf-123', status: 'in_progress' }),
        retrieve: jest.fn().mockResolvedValue({ id: 'vsf-123', status: 'completed' }),
      },
      fileBatches: {
        create: jest.fn().mockResolvedValue({
          id: 'batch-123',
          status: 'in_progress',
          file_counts: { completed: 0, in_progress: 1, failed: 0 }
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: 'batch-123',
          status: 'completed',
          file_counts: { completed: 1, in_progress: 0, failed: 0 }
        }),
      },
    },
  })),
}));

describe('File Upload API', () => {
  beforeEach(() => {
    // Mock authenticated user
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-123' } });
    // Set environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/files/upload', () => {
    test('successfully uploads single file', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('files', file);

      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await uploadPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files).toHaveLength(1);
      expect(data.files[0].filename).toBe('test.txt');
      expect(data.files[0].status).toBe('processing');
      expect(data.batchId).toBe('batch-123');
      expect(data.vectorStoreId).toBe('vs-123');
    });

    test('successfully uploads multiple files', async () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('files', file1);
      formData.append('files', file2);

      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await uploadPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files).toHaveLength(2);
      expect(data.files[0].filename).toBe('file1.txt');
      expect(data.files[1].filename).toBe('file2.pdf');
    });

    test('rejects unauthenticated request', async () => {
      (auth as jest.Mock).mockResolvedValueOnce(null);

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('files', file);

      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await uploadPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('validates file size', async () => {
      // Create a file larger than 512MB
      const largeContent = new Uint8Array(513 * 1024 * 1024); // 513MB
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('files', file);

      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await uploadPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File size should be less than 512MB');
    });

    test('validates file type', async () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const formData = new FormData();
      formData.append('files', file);

      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await uploadPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File type should be one of');
    });

    test('handles empty request', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await uploadPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No files uploaded');
    });
  });

  describe('POST /api/files/status', () => {
    test('checks batch status successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
      });

      const response = await statusPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('completed');
      expect(data.completedCount).toBe(1);
      expect(data.inProgressCount).toBe(0);
      expect(data.failedCount).toBe(0);
    });

    test('checks individual file status', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          fileIds: ['file-1', 'file-2'],
        }),
      });

      const response = await statusPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files).toHaveLength(2);
      expect(data.completedCount).toBe(2);
    });

    test('rejects unauthenticated request', async () => {
      (auth as jest.Mock).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/files/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
      });

      const response = await statusPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('validates request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing vectorStoreId
          batchId: 'batch-123',
        }),
      });

      const response = await statusPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    test('requires either batchId or fileIds', async () => {
      const request = new NextRequest('http://localhost:3000/api/files/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vectorStoreId: 'vs-123',
        }),
      });

      const response = await statusPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either batchId or fileIds must be provided');
    });
  });
});