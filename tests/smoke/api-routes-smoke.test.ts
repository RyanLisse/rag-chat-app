import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('API Routes Smoke Tests', () => {
  it('should have upload route file', () => {
    const uploadPath = join(process.cwd(), 'app/(chat)/api/files/upload/route.ts');
    expect(existsSync(uploadPath)).toBe(true);
  });

  it('should have status route file', () => {
    const statusPath = join(process.cwd(), 'app/(chat)/api/files/status/route.ts');
    expect(existsSync(statusPath)).toBe(true);
  });

  it('should have file search tool', async () => {
    try {
      const fileSearchTool = await import('@/lib/ai/tools/file-search');
      expect(fileSearchTool.fileSearchTool).toBeDefined();
      expect(fileSearchTool.directFileSearchTool).toBeDefined();
    } catch (error) {
      throw new Error(`File search tool import failed: ${error}`);
    }
  });

  it('should have vector store client', async () => {
    try {
      const { VectorStoreClient } = await import('@/lib/ai/vector-store');
      expect(VectorStoreClient).toBeDefined();
      expect(typeof VectorStoreClient).toBe('function');
    } catch (error) {
      throw new Error(`Vector store client import failed: ${error}`);
    }
  });

  it('should have all type definitions', async () => {
    try {
      const types = await import('@/lib/types/vector-store');
      
      // Check schema exports
      expect(types.FileStatusSchema).toBeDefined();
      expect(types.SearchOptionsSchema).toBeDefined();
      expect(types.UploadResponseSchema).toBeDefined();
      expect(types.StatusResponseSchema).toBeDefined();
      expect(types.BatchStatusSchema).toBeDefined();
      
      // Check constant exports  
      expect(types.SUPPORTED_FILE_TYPES).toBeDefined();
      expect(types.MAX_FILE_SIZE).toBeDefined();
      expect(types.MAX_FILES_PER_BATCH).toBeDefined();
      
    } catch (error) {
      throw new Error(`Type definitions import failed: ${error}`);
    }
  });

  it('should export correct file type constants', async () => {
    const types = await import('@/lib/types/vector-store');
    
    expect(types.SUPPORTED_FILE_TYPES).toContain('text/plain');
    expect(types.SUPPORTED_FILE_TYPES).toContain('application/pdf');
    expect(types.SUPPORTED_FILE_TYPES).toContain('text/markdown');
    expect(types.SUPPORTED_FILE_TYPES).toContain('application/json');
    
    expect(types.MAX_FILE_SIZE).toBe(512 * 1024 * 1024); // 512MB
    expect(types.MAX_FILES_PER_BATCH).toBe(20);
    expect(types.DEFAULT_SEARCH_LIMIT).toBe(10);
  });

  it('should validate citation schema', async () => {
    const { CitationSchema } = await import('@/lib/types/vector-store');
    
    const validCitation = {
      text: '【0】',
      fileId: 'file-123',
      quote: 'Sample quote from document',
    };
    
    const result = CitationSchema.safeParse(validCitation);
    expect(result.success).toBe(true);
  });

  it('should validate vector store config schema', async () => {
    const { VectorStoreConfigSchema } = await import('@/lib/types/vector-store');
    
    const validConfig = {
      apiKey: 'test-key',
      vectorStoreId: 'vs-123',
      maxFileSize: 512 * 1024 * 1024,
      maxFiles: 20,
    };
    
    const result = VectorStoreConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });
});

describe('Implementation Completeness', () => {
  it('should have all required API endpoints', async () => {
    // Check that we have the required endpoints
    const uploadRoute = await import('@/app/(chat)/api/files/upload/route');
    const statusRoute = await import('@/app/(chat)/api/files/status/route');
    
    expect(uploadRoute.POST).toBeDefined();
    expect(statusRoute.POST).toBeDefined();
  });

  it('should have vector store operations', async () => {
    const { VectorStoreClient } = await import('@/lib/ai/vector-store');
    const client = new VectorStoreClient('test-key');
    
    // Check that all required methods exist
    expect(typeof client.ensureVectorStore).toBe('function');
    expect(typeof client.uploadFile).toBe('function');
    expect(typeof client.uploadFiles).toBe('function');
    expect(typeof client.checkBatchStatus).toBe('function');
    expect(typeof client.checkFileStatus).toBe('function');
    expect(typeof client.waitForProcessing).toBe('function');
    expect(typeof client.deleteFile).toBe('function');
    expect(typeof client.listFiles).toBe('function');
    expect(typeof client.getVectorStoreId).toBe('function');
  });

  it('should have search tools configured', async () => {
    const tools = await import('@/lib/ai/tools/file-search');
    
    expect(tools.fileSearchTool).toBeDefined();
    expect(tools.directFileSearchTool).toBeDefined();
    
    // Verify tool structure
    expect(tools.fileSearchTool.description).toBeDefined();
    expect(tools.fileSearchTool.parameters).toBeDefined();
    expect(tools.fileSearchTool.execute).toBeDefined();
  });
});