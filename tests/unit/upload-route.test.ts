import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/(chat)/api/files/upload/route';
import OpenAI from 'openai';

// Mock dependencies
vi.mock('openai');
vi.mock('@/app/(auth)/auth');

describe('Upload Route', () => {
  let mockOpenAI: any;
  let mockAuth: any;

  beforeEach(() => {
    // Mock OpenAI client
    mockOpenAI = {
      vectorStores: {
        create: vi.fn(),
        retrieve: vi.fn(),
        fileBatches: {
          create: vi.fn(),
        },
      },
      files: {
        create: vi.fn(),
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
    process.env.OPENAI_VECTORSTORE_ID = 'vs-test-123';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_VECTORSTORE_ID;
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: new FormData(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated requests', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });

      const formData = new FormData();
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      // Mock successful vector store operations
      mockOpenAI.vectorStores.retrieve.mockResolvedValue({ id: 'vs-test-123' });
      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockAuth).toHaveBeenCalled();
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should reject requests with empty body', async () => {
      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: null,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Request body is empty');
    });

    it('should reject requests with no files', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No files uploaded');
    });

    it('should validate file types', async () => {
      const formData = new FormData();
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      formData.append('files', invalidFile);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File type should be one of');
    });

    it('should validate file sizes', async () => {
      const formData = new FormData();
      // Create a mock file that's too large
      const largeContent = 'x'.repeat(513 * 1024 * 1024); // 513MB
      const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      // Mock the file size property
      Object.defineProperty(largeFile, 'size', {
        value: 513 * 1024 * 1024,
        writable: false,
      });

      formData.append('files', largeFile);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File size should be less than');
    });

    it('should accept valid files', async () => {
      const formData = new FormData();
      const validFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('files', validFile);

      mockOpenAI.vectorStores.retrieve.mockResolvedValue({ id: 'vs-test-123' });
      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should validate multiple files', async () => {
      const formData = new FormData();
      const validFile = new File(['valid'], 'valid.txt', { type: 'text/plain' });
      const invalidFile = new File(['invalid'], 'invalid.exe', { type: 'application/x-executable' });
      
      formData.append('files', validFile);
      formData.append('files', invalidFile);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File 2');
      expect(data.error).toContain('invalid.exe');
    });
  });

  describe('Vector Store Operations', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should use existing vector store when available', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.vectorStores.retrieve.mockResolvedValue({ id: 'vs-test-123' });
      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockOpenAI.vectorStores.retrieve).toHaveBeenCalledWith('vs-test-123');
      expect(mockOpenAI.vectorStores.create).not.toHaveBeenCalled();
      expect(data.vectorStoreId).toBe('vs-test-123');
    });

    it('should create new vector store when none exists', async () => {
      delete process.env.OPENAI_VECTORSTORE_ID;

      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-new-123' });
      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockOpenAI.vectorStores.create).toHaveBeenCalledWith({
        name: 'RAG Chat Vector Store',
        description: 'Vector store for RAG chat application file search',
      });
      expect(data.vectorStoreId).toBe('vs-new-123');
    });

    it('should create new vector store when retrieval fails', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.vectorStores.retrieve.mockRejectedValue(new Error('Not found'));
      mockOpenAI.vectorStores.create.mockResolvedValue({ id: 'vs-new-123' });
      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockOpenAI.vectorStores.create).toHaveBeenCalled();
      expect(data.vectorStoreId).toBe('vs-new-123');
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
      mockOpenAI.vectorStores.retrieve.mockResolvedValue({ id: 'vs-test-123' });
    });

    it('should upload single file successfully', async () => {
      const formData = new FormData();
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files).toHaveLength(1);
      expect(data.files[0].id).toBe('file-123');
      expect(data.files[0].filename).toBe('test.txt');
      expect(data.files[0].status).toBe('processing');
      expect(data.batchId).toBe('batch-123');
    });

    it('should upload multiple files successfully', async () => {
      const formData = new FormData();
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' });
      
      formData.append('files', file1);
      formData.append('files', file2);

      mockOpenAI.files.create
        .mockResolvedValueOnce({ id: 'file-1' })
        .mockResolvedValueOnce({ id: 'file-2' });
      
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.files).toHaveLength(2);
      expect(data.files[0].filename).toBe('file1.txt');
      expect(data.files[1].filename).toBe('file2.pdf');
    });

    it('should handle file upload failures', async () => {
      const formData = new FormData();
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
      
      formData.append('files', file1);
      formData.append('files', file2);

      mockOpenAI.files.create
        .mockResolvedValueOnce({ id: 'file-1' })
        .mockRejectedValueOnce(new Error('Upload failed'));
      
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.files).toHaveLength(2);
      expect(data.files[0].status).toBe('processing');
      expect(data.files[1].status).toBe('failed');
      expect(data.files[1].error).toBe('Upload failed');
    });

    it('should handle batch creation failure', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockRejectedValue(new Error('Batch failed'));

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Files uploaded but failed to add to vector store');
      expect(data.error).toBe('Batch failed');
    });

    it('should return failure when no files uploaded successfully', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.files.create.mockRejectedValue(new Error('Upload failed'));

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('No files were successfully uploaded');
      expect(data.files[0].status).toBe('failed');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: { id: 'user-123' } });
    });

    it('should handle FormData parsing errors', async () => {
      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: 'invalid-form-data',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process request');
    });

    it('should handle OpenAI API errors', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      const apiError = new Error('OpenAI API Error');
      (apiError as any).status = 429;
      mockOpenAI.vectorStores.retrieve.mockRejectedValue(apiError);
      mockOpenAI.vectorStores.create.mockRejectedValue(apiError);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process request');
      expect(data.details).toBe('OpenAI API Error');
    });

    it('should handle network errors', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      mockOpenAI.vectorStores.retrieve.mockRejectedValue(networkError);
      mockOpenAI.vectorStores.create.mockRejectedValue(networkError);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Network error');
    });

    it('should handle unknown errors gracefully', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.vectorStores.retrieve.mockRejectedValue('Unknown error type');

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
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
      mockOpenAI.vectorStores.retrieve.mockResolvedValue({ id: 'vs-test-123' });
    });

    it('should return correct response format for successful upload', async () => {
      const formData = new FormData();
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      formData.append('files', testFile);

      mockOpenAI.files.create.mockResolvedValue({ id: 'file-123' });
      mockOpenAI.vectorStores.fileBatches.create.mockResolvedValue({ id: 'batch-123' });

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toMatchObject({
        success: true,
        files: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            filename: expect.any(String),
            status: expect.any(String),
          }),
        ]),
        vectorStoreId: expect.any(String),
        batchId: expect.any(String),
        message: expect.any(String),
      });
    });

    it('should include error details in failed responses', async () => {
      const formData = new FormData();
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      formData.append('files', invalidFile);

      const request = new NextRequest('http://localhost/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data.error).toContain('File type should be one of');
    });
  });
});