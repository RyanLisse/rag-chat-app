import { VectorStoreClient } from '@/lib/ai/vector-store';
import OpenAI from 'openai';

export interface MockVectorStore {
  id: string;
  files: MockVectorStoreFile[];
  batches: MockBatch[];
}

export interface MockVectorStoreFile {
  id: string;
  filename: string;
  status: 'in_progress' | 'completed' | 'failed';
  created_at: number;
  error?: string;
}

export interface MockBatch {
  id: string;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  file_counts: {
    completed: number;
    in_progress: number;
    failed: number;
  };
  file_ids: string[];
}

/**
 * Mock vector store for testing
 */
export class MockVectorStoreClient {
  private stores: Map<string, MockVectorStore> = new Map();
  private files: Map<string, { id: string; content: string }> = new Map();

  constructor() {
    // Create default test store
    this.stores.set('test-vs-123', {
      id: 'test-vs-123',
      files: [],
      batches: [],
    });
  }

  createVectorStore(name: string): MockVectorStore {
    const id = `vs-${Date.now()}`;
    const store: MockVectorStore = {
      id,
      files: [],
      batches: [],
    };
    this.stores.set(id, store);
    return store;
  }

  getVectorStore(id: string): MockVectorStore | undefined {
    return this.stores.get(id);
  }

  uploadFile(storeId: string, file: { id: string; filename: string; content: string }): MockVectorStoreFile {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error('Vector store not found');
    }

    const vectorFile: MockVectorStoreFile = {
      id: file.id,
      filename: file.filename,
      status: 'in_progress',
      created_at: Math.floor(Date.now() / 1000),
    };

    store.files.push(vectorFile);
    this.files.set(file.id, { id: file.id, content: file.content });

    // Simulate processing completion after a delay
    setTimeout(() => {
      vectorFile.status = 'completed';
    }, 100);

    return vectorFile;
  }

  createBatch(storeId: string, fileIds: string[]): MockBatch {
    const store = this.stores.get(storeId);
    if (!store) {
      throw new Error('Vector store not found');
    }

    const batch: MockBatch = {
      id: `batch-${Date.now()}`,
      status: 'in_progress',
      file_counts: {
        completed: 0,
        in_progress: fileIds.length,
        failed: 0,
      },
      file_ids: fileIds,
    };

    store.batches.push(batch);

    // Simulate batch processing
    setTimeout(() => {
      batch.status = 'completed';
      batch.file_counts.completed = fileIds.length;
      batch.file_counts.in_progress = 0;
    }, 200);

    return batch;
  }

  getBatch(storeId: string, batchId: string): MockBatch | undefined {
    const store = this.stores.get(storeId);
    if (!store) {
      return undefined;
    }
    return store.batches.find(b => b.id === batchId);
  }

  simulateFileProcessingFailure(fileId: string, error: string) {
    for (const store of this.stores.values()) {
      const file = store.files.find(f => f.id === fileId);
      if (file) {
        file.status = 'failed';
        file.error = error;
        break;
      }
    }
  }

  simulateBatchFailure(storeId: string, batchId: string) {
    const batch = this.getBatch(storeId, batchId);
    if (batch) {
      batch.status = 'failed';
      batch.file_counts.failed = batch.file_ids.length;
      batch.file_counts.in_progress = 0;
    }
  }

  searchFiles(storeId: string, query: string): Array<{ id: string; content: string; score: number }> {
    const store = this.stores.get(storeId);
    if (!store) {
      return [];
    }

    const results = [];
    for (const file of store.files) {
      if (file.status === 'completed') {
        const fileContent = this.files.get(file.id);
        if (fileContent && fileContent.content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: file.id,
            content: fileContent.content,
            score: Math.random(), // Mock relevance score
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  reset() {
    this.stores.clear();
    this.files.clear();
    // Recreate default store
    this.stores.set('test-vs-123', {
      id: 'test-vs-123',
      files: [],
      batches: [],
    });
  }
}

/**
 * Create mock OpenAI client for testing
 */
export function createMockOpenAI(mockStore: MockVectorStoreClient): any {
  return {
    files: {
      create: jest.fn().mockImplementation(async ({ file, purpose }) => {
        const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return { id, status: 'processed', purpose };
      }),
      del: jest.fn().mockResolvedValue({ deleted: true }),
    },
    vectorStores: {
      create: jest.fn().mockImplementation(async ({ name }) => {
        const store = mockStore.createVectorStore(name);
        return store;
      }),
      retrieve: jest.fn().mockImplementation(async (id: string) => {
        const store = mockStore.getVectorStore(id);
        if (!store) {
          throw new Error('Vector store not found');
        }
        return store;
      }),
      files: {
        create: jest.fn().mockImplementation(async (storeId: string, { file_id }: { file_id: string }) => {
          const store = mockStore.getVectorStore(storeId);
          if (!store) {
            throw new Error('Vector store not found');
          }
          
          const file = mockStore.uploadFile(storeId, {
            id: file_id,
            filename: `file-${file_id}`,
            content: 'Mock file content',
          });
          
          return file;
        }),
        list: jest.fn().mockImplementation(async (storeId: string) => {
          const store = mockStore.getVectorStore(storeId);
          return { data: store?.files || [] };
        }),
        retrieve: jest.fn().mockImplementation(async (storeId: string, fileId: string) => {
          const store = mockStore.getVectorStore(storeId);
          const file = store?.files.find(f => f.id === fileId);
          if (!file) {
            throw new Error('File not found');
          }
          return file;
        }),
        del: jest.fn().mockResolvedValue({ deleted: true }),
      },
      fileBatches: {
        create: jest.fn().mockImplementation(async (storeId: string, { file_ids }: { file_ids: string[] }) => {
          return mockStore.createBatch(storeId, file_ids);
        }),
        retrieve: jest.fn().mockImplementation(async (storeId: string, batchId: string) => {
          const batch = mockStore.getBatch(storeId, batchId);
          if (!batch) {
            throw new Error('Batch not found');
          }
          return batch;
        }),
      },
    },
  };
}

/**
 * Test utilities for file upload testing
 */
export class FileUploadTestHelper {
  private mockStore: MockVectorStoreClient;

  constructor() {
    this.mockStore = new MockVectorStoreClient();
  }

  createTestFile(name: string, content: string, type: string = 'text/plain'): File {
    return new File([content], name, { type });
  }

  createTestFiles(count: number): File[] {
    const files = [];
    for (let i = 0; i < count; i++) {
      files.push(this.createTestFile(
        `test-file-${i + 1}.txt`,
        `This is test file ${i + 1} content with some relevant information.`,
        'text/plain'
      ));
    }
    return files;
  }

  createFormDataWithFiles(files: File[]): FormData {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    return formData;
  }

  mockSuccessfulUpload(files: File[]) {
    return {
      success: true,
      files: files.map((file, index) => ({
        id: `file-${index + 1}`,
        filename: file.name,
        status: 'processing' as const,
      })),
      vectorStoreId: 'test-vs-123',
      batchId: 'test-batch-123',
      message: `Successfully uploaded ${files.length} file(s). Processing in vector store...`,
    };
  }

  mockUploadError(error: string) {
    return {
      success: false,
      error,
    };
  }

  mockProcessingStatus(
    status: 'in_progress' | 'completed' | 'failed',
    completedCount: number,
    inProgressCount: number,
    failedCount: number
  ) {
    return {
      success: true,
      status,
      completedCount,
      inProgressCount,
      failedCount,
    };
  }

  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  reset() {
    this.mockStore.reset();
  }

  getMockStore() {
    return this.mockStore;
  }
}

/**
 * Global test helper instance
 */
export const fileUploadTestHelper = new FileUploadTestHelper();