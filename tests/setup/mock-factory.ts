import { vi } from 'vitest';

/**
 * Centralized mock factory to ensure consistent mock implementations
 * across all test files and prevent conflicts
 */

// OpenAI Mock Factory
export const createOpenAIMock = () => {
  const mockAssistantsRetrieve = vi.fn();
  const mockAssistantsCreate = vi.fn();
  const mockThreadsCreate = vi.fn();
  const mockMessagesCreate = vi.fn();
  const mockMessagesList = vi.fn();
  const mockRunsCreate = vi.fn();
  const mockRunsRetrieve = vi.fn();

  class MockOpenAI {
    files = {
      create: vi.fn(({ file, purpose }) => Promise.resolve({ 
        id: "file-123", 
        object: "file",
        filename: file?.name || "test.txt", 
        status: "processed", 
        headers: new Headers() 
      })),
      delete: vi.fn(() => Promise.resolve({ headers: new Headers() })),
    };
    
    vectorStores = {
      create: vi.fn(({ name }) => Promise.resolve({ id: 'vs-123', name: name || 'Test Store' })),
      retrieve: vi.fn((id) => {
        if (id === 'vs-test' || id === 'vs-test-123' || id === 'vs-123') {
          return Promise.resolve({ id, name: 'Test Store' });
        }
        return Promise.reject(new Error('Not found'));
      }),
      files: {
        create: vi.fn(() => Promise.resolve({ id: "file-123" })),
        retrieve: vi.fn((vsId, fileId) => {
          if (fileId === 'file-1' || fileId === 'file-2' || fileId === 'file-123') {
            return Promise.resolve({ 
              id: fileId, 
              object: 'vector_store.file',
              status: 'completed', 
              vector_store_id: vsId,
              created_at: 1234567890 
            });
          }
          return Promise.reject(new Error('File not found'));
        }),
        del: vi.fn(() => Promise.resolve({})),
        list: vi.fn(() => Promise.resolve({ 
          data: [
            { id: 'file-1', created_at: 1234567890, status: 'completed' },
            { id: 'file-2', created_at: 1234567891, status: 'completed' }
          ] 
        })),
        createBatch: vi.fn((vsId, fileIds) => {
          if (fileIds && fileIds.length > 0) {
            return Promise.resolve({ id: 'batch-123', status: 'in_progress' });
          }
          return Promise.reject(new Error('Batch failed'));
        }),
      },
      fileBatches: {
        create: vi.fn((vsId, { file_ids }) => {
          if (file_ids && file_ids.length > 0) {
            return Promise.resolve({ 
              id: 'batch-123', 
              object: 'vector_store.file_batch',
              status: 'in_progress',
              file_counts: { completed: 0, in_progress: file_ids.length, failed: 0, total: file_ids.length },
              vector_store_id: vsId,
              created_at: Date.now()
            });
          }
          return Promise.reject(new Error('Batch failed'));
        }),
        retrieve: vi.fn((vsId, batchId) => {
          if (batchId === 'batch-123') {
            return Promise.resolve({ 
              id: 'batch-123', 
              object: 'vector_store.file_batch',
              status: 'completed',
              file_counts: { completed: 1, in_progress: 0, failed: 0, cancelled: 0, total: 1 },
              vector_store_id: vsId,
              created_at: Date.now()
            });
          }
          return Promise.reject(new Error('Batch not found'));
        }),
      },
    };
    
    models = {
      list: vi.fn().mockResolvedValue({
        data: [
          { id: "gpt-4", object: "model" },
          { id: "gpt-3.5-turbo", object: "model" }
        ]
      })
    };
    
    beta = {
      assistants: {
        retrieve: mockAssistantsRetrieve,
        create: mockAssistantsCreate,
      },
      threads: {
        create: mockThreadsCreate,
        messages: {
          create: mockMessagesCreate,
          list: mockMessagesList,
        },
        runs: {
          create: mockRunsCreate,
          retrieve: mockRunsRetrieve,
        },
      },
    };
  }
  
  return {
    default: MockOpenAI,
  };
};

// AI SDK Mock Factory
export const createAISDKMock = () => {
  const mockStreamObject = vi.fn(() => ({
    fullStream: async function* () {
      yield {
        type: "object",
        object: {
          citations: [
            {
              id: "citation-1",
              text: "Machine learning has revolutionized data analysis",
              sourceId: "source-1",
              relevanceScore: 0.9
            }
          ],
          sources: [
            {
              id: "source-1",
              title: "Introduction to Machine Learning",
              url: "https://example.com/ml-intro",
              type: "document",
              metadata: {
                author: "Dr. Alice Johnson",
                date: "2023-01-15",
                excerpt: "A comprehensive guide to machine learning fundamentals."
              }
            }
          ]
        }
      };
    }
  }));
  
  const mockStreamText = vi.fn(() => ({
    fullStream: async function* () {
      yield { type: "text-delta", textDelta: "Machine learning has revolutionized data analysis [1]. " };
      yield { type: "text-delta", textDelta: "Neural networks are particularly effective for pattern recognition [2]. " };
      yield { type: "text-delta", textDelta: "These technologies continue to evolve rapidly." };
    }
  }));
  
  const mockTool = vi.fn(() => ({
    description: 'Mock tool',
    parameters: {},
    execute: vi.fn(() => Promise.resolve({ success: true, content: 'Mock result', citations: [] }))
  }));
  
  return {
    streamObject: mockStreamObject,
    streamText: mockStreamText,
    convertToCoreMessages: (messages: any[]) => messages,
    customProvider: vi.fn(),
    tool: mockTool
  };
};

// Vector Store Mock Factory
export const createVectorStoreMock = () => {
  class MockVectorStoreClient {
    private mockStore: any;
    
    constructor(apiKey: string, vectorStoreId?: string) {
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is required');
      }
      
      this.mockStore = {
        id: vectorStoreId,
        files: [],
        batches: []
      };
    }
    
    async ensureVectorStore(name?: string) {
      if (!this.mockStore.id) {
        this.mockStore.id = 'vs-123';
        this.mockStore.name = name || 'Test Store';
      }
      return this.mockStore.id;
    }
    
    async uploadFile() {
      return {
        id: 'file-123',
        filename: 'test.txt',
        status: 'processing' as const,
        createdAt: new Date(),
      };
    }
    
    async uploadFiles() {
      return {
        batchId: 'batch-123',
        files: [{
          id: 'file-123',
          filename: 'test.txt',
          status: 'processing' as const,
          createdAt: new Date(),
        }]
      };
    }
    
    async checkBatchStatus() {
      return {
        status: 'completed' as const,
        completedCount: 1,
        inProgressCount: 0,
        failedCount: 0,
      };
    }
    
    async checkFileStatus() {
      return [{
        id: 'file-123',
        filename: 'test.txt',
        status: 'completed' as const,
        createdAt: new Date(),
      }];
    }
    
    async waitForProcessing() {
      return true;
    }
    
    async deleteFile() {
      return;
    }
    
    async listFiles() {
      return [];
    }
    
    getVectorStoreId() {
      return this.mockStore.id;
    }
  }
  
  return {
    VectorStoreClient: MockVectorStoreClient
  };
};

// Auth Mock Factory
export const createAuthMock = () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "test-user" } }))
});

// Logger Mock Factory
export const createLoggerMock = () => {
  class MockLogger {
    serviceName;
    environment;
    
    constructor(serviceName = "rag-chat-app") {
      this.serviceName = serviceName;
      this.environment = process.env.NODE_ENV || "development";
    }
    
    formatMessage(level: string, message: string, context?: any) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        service: this.serviceName,
        environment: this.environment,
        ...context
      };
      return JSON.stringify(logEntry);
    }
    
    log(level: string, message: string, context?: any, error?: Error) {
      const formattedMessage = this.formatMessage(level, message, context);
      switch (level) {
        case "debug":
          if (this.environment === "development") {
            console.debug(formattedMessage);
          }
          break;
        case "info":
          console.info(formattedMessage);
          break;
        case "warn":
          console.warn(formattedMessage);
          break;
        case "error": {
          console.error(formattedMessage);
          if (error) {
            console.error(error.stack);
          }
          break;
        }
      }
    }
    
    debug(message: string, context?: any) {
      this.log("debug", message, context);
    }
    
    info(message: string, context?: any) {
      this.log("info", message, context);
    }
    
    warn(message: string, context?: any) {
      this.log("warn", message, context);
    }
    
    error(message: string, context?: any, error?: Error) {
      this.log("error", message, context, error);
    }
    
    child(context: any) {
      const childLogger = new MockLogger(this.serviceName);
      const originalFormatMessage = childLogger.formatMessage.bind(childLogger);
      childLogger.formatMessage = (level: string, message: string, additionalContext?: any) => {
        const mergedContext = { ...context, ...additionalContext };
        return originalFormatMessage(level, message, mergedContext);
      };
      return childLogger;
    }
    
    logVectorSearch(query: string, resultCount: number, duration: number, context?: any) {
      this.info("Vector search completed", {
        query,
        resultCount,
        duration,
        operation: "vector_search",
        ...context
      });
    }
    
    logModelInference(model: string, promptTokens: number, completionTokens: number, duration: number, context?: any) {
      this.info("Model inference completed", {
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        duration,
        operation: "model_inference",
        ...context
      });
    }
    
    logDocumentProcessing(documentId: string, chunkCount: number, duration: number, context?: any) {
      this.info("Document processed", {
        documentId,
        chunkCount,
        duration,
        operation: "document_processing",
        ...context
      });
    }
    
    logApiRequest(method: string, path: string, statusCode: number, duration: number, context?: any) {
      const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
      this.log(level, `API ${method} ${path}`, {
        method,
        path,
        statusCode,
        duration,
        operation: "api_request",
        ...context
      });
    }
  }
  
  return {
    Logger: MockLogger,
    logger: new MockLogger()
  };
};

// Provider Utils Mock Factory
export const createProviderUtilsMock = () => {
  const mockValidateApiKey = vi.fn((key: string, provider?: string) => {
    if (!key) return false;
    
    switch (provider) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 10;
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length > 15;
      case 'google':
        return key.length > 10;
      default:
        return key.length > 10;
    }
  });
  
  const mockRetryWithBackoff = vi.fn(async (operation: () => Promise<any>, config?: { maxRetries?: number }) => {
    const maxRetries = config?.maxRetries || 3;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (error && typeof error === 'object' && 'retryable' in error && !error.retryable) {
          throw error;
        }
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
    throw lastError;
  });
  
  const mockMeasureExecutionTime = vi.fn(async (operation: () => Promise<any>) => {
    const start = Date.now();
    const result = await operation();
    return { result, duration: Date.now() - start };
  });
  
  class MockCircuitBreaker {
    private isOpen = false;
    private failureCount = 0;
    private threshold: number;
    private timeout: number;
    
    constructor(threshold: number = 3, timeout: number = 30000) {
      this.threshold = threshold;
      this.timeout = timeout;
    }
    
    async execute(operation: () => Promise<any>) {
      if (this.isOpen) {
        throw new Error('Circuit breaker is open');
      }
      try {
        const result = await operation();
        this.failureCount = 0;
        return result;
      } catch (error) {
        this.failureCount++;
        if (this.failureCount >= this.threshold) {
          this.isOpen = true;
        }
        throw error;
      }
    }
  }
  
  return {
    validateApiKey: mockValidateApiKey,
    retryWithBackoff: mockRetryWithBackoff,
    measureExecutionTime: mockMeasureExecutionTime,
    CircuitBreaker: MockCircuitBreaker,
    DEFAULT_RETRY_CONFIG: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2
    }
  };
};

// Centralized mock registry to prevent conflicts
export class MockRegistry {
  private static instance: MockRegistry;
  private mocks: Map<string, any> = new Map();
  
  static getInstance(): MockRegistry {
    if (!MockRegistry.instance) {
      MockRegistry.instance = new MockRegistry();
    }
    return MockRegistry.instance;
  }
  
  register(key: string, factory: () => any): any {
    if (!this.mocks.has(key)) {
      try {
        this.mocks.set(key, factory());
      } catch (error) {
        console.warn(`Failed to register mock for key ${key}:`, error);
        // Return a simple fallback mock
        this.mocks.set(key, {});
      }
    }
    return this.mocks.get(key);
  }
  
  get(key: string): any {
    return this.mocks.get(key);
  }
  
  has(key: string): boolean {
    return this.mocks.has(key);
  }
  
  clear(): void {
    this.mocks.clear();
  }
  
  reset(): void {
    // Reset all registered mocks
    for (const [key, mock] of this.mocks.entries()) {
      if (mock && typeof mock.reset === 'function') {
        try {
          mock.reset();
        } catch (error) {
          console.warn(`Failed to reset mock for key ${key}:`, error);
        }
      }
    }
  }
  
  // Force register (override existing)
  forceRegister(key: string, factory: () => any): any {
    try {
      const mock = factory();
      this.mocks.set(key, mock);
      return mock;
    } catch (error) {
      console.warn(`Failed to force register mock for key ${key}:`, error);
      this.mocks.set(key, {});
      return this.mocks.get(key);
    }
  }
}

// Export singleton registry instance
export const mockRegistry = MockRegistry.getInstance();