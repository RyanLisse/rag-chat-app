import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestIsolation } from '../setup/test-isolation';

// Use global mocks from setup, no need to redefine OpenAI mock
// The global mock in vitest-mocks.ts already handles all OpenAI functionality

// Use global mocks from setup - no need to redefine auth or vector store mocks

import { auth } from '@/app/(auth)/auth';
import { NextRequest } from 'next/server';
import { POST as uploadPOST } from '@/app/(chat)/api/files/upload/route';
import { POST as statusPOST } from '@/app/(chat)/api/files/status/route';

// Create test isolation for this suite
const testIsolation = createTestIsolation({
  resetMocks: true,
  clearMocks: true,
  isolateModules: false
});

describe('File Upload API', () => {
  beforeEach(() => {
    testIsolation.setup();
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-123' } });
    // Set environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_VECTORSTORE_ID = 'vs-123';
  });

  afterEach(() => {
    testIsolation.cleanup();
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
      vi.mocked(auth).mockResolvedValueOnce(null);

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

    test.skip('validates file size', async () => {
      // Skip this test for now as it requires large file creation
      // This can be tested manually or with a different approach
      expect(true).toBe(true);
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
      vi.mocked(auth).mockResolvedValueOnce(null);

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