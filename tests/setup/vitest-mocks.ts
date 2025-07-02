import { vi, beforeEach, afterEach } from 'vitest';

// Single comprehensive OpenAI mock
vi.mock('openai', () => {
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
        filename: file.name || "test.txt", 
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
});

// Auth mock
vi.mock('@/app/(auth)/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "test-user" } }))
}));

// Remove duplicate OpenAI mock - already defined above

// AI SDK mock
vi.mock('ai', () => {
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
    convertToCoreMessages: (messages) => messages,
    customProvider: vi.fn(),
    tool: mockTool
  };
});

vi.mock('@/lib/ai', () => ({
  customModel: (model: string) => model,
}));

// Custom AI lib mock
vi.mock('@/lib/ai', () => ({
  customModel: (model: string) => model,
}));

// Logger mock
vi.mock('@/lib/monitoring/logger', () => {
  const actualLogger = vi.importActual("@/lib/monitoring/logger");

  class MockLogger {
    serviceName;
    environment;
    constructor(serviceName = "rag-chat-app") {
      this.serviceName = serviceName;
      this.environment = process.env.NODE_ENV || "development";
    }
    formatMessage(level, message, context) {
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
    log(level, message, context, error) {
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
    debug(message, context) {
      this.log("debug", message, context);
    }
    info(message, context) {
      this.log("info", message, context);
    }
    warn(message, context) {
      this.log("warn", message, context);
    }
    error(message, context, error) {
      this.log("error", message, context, error);
    }
    child(context) {
      const childLogger = new MockLogger(this.serviceName);
      const originalFormatMessage = childLogger.formatMessage.bind(childLogger);
      childLogger.formatMessage = (level, message, additionalContext) => {
        const mergedContext = { ...context, ...additionalContext };
        return originalFormatMessage(level, message, mergedContext);
      };
      return childLogger;
    }
    logVectorSearch(query, resultCount, duration, context) {
      this.info("Vector search completed", {
        query,
        resultCount,
        duration,
        operation: "vector_search",
        ...context
      });
    }
    logModelInference(model, promptTokens, completionTokens, duration, context) {
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
    logDocumentProcessing(documentId, chunkCount, duration, context) {
      this.info("Document processed", {
        documentId,
        chunkCount,
        duration,
        operation: "document_processing",
        ...context
      });
    }
    logApiRequest(method, path, statusCode, duration, context) {
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
    ...actualLogger,
    Logger: MockLogger,
    logger: new MockLogger
  };
});

// Providers mock
vi.mock('@/lib/ai/providers', () => ({
  myProvider: {
    languageModel: vi.fn((modelId: string) => ({
      modelId,
      provider: 'test',
      name: `Test ${modelId}`,
    })),
  },
}));

// Weather tool mock
vi.mock('@/lib/ai/tools/get-weather', () => ({
  getWeather: {
    description: 'Get the current weather at a location',
    parameters: {
      _def: {
        typeName: 'ZodObject'
      }
    },
    execute: vi.fn(() => Promise.resolve({ success: true, weather: 'sunny' }))
  }
}));

// Vector Store mock
vi.mock('@/lib/ai/vector-store', () => {
  class MockVectorStoreClient {
    private mockStore: any;
    
    constructor(apiKey: string, vectorStoreId?: string) {
      // Validate API key like the real implementation
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('API key is required');
      }
      
      this.mockStore = {
        id: vectorStoreId, // Don't set default, keep it undefined if not provided
        files: [],
        batches: []
      };
    }
    
    async ensureVectorStore(name?: string) {
      // If no vector store ID is set, create a new one
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
        status: 'processing',
        createdAt: new Date(),
      };
    }
    
    async uploadFiles() {
      return {
        batchId: 'batch-123',
        files: [{
          id: 'file-123',
          filename: 'test.txt',
          status: 'processing',
          createdAt: new Date(),
        }]
      };
    }
    
    async checkBatchStatus() {
      return {
        status: 'completed',
        completedCount: 1,
        inProgressCount: 0,
        failedCount: 0,
      };
    }
    
    async checkFileStatus() {
      return [{
        id: 'file-123',
        filename: 'test.txt',
        status: 'completed',
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
});

// Provider utils mock
vi.mock('@/lib/ai/providers/utils', () => {
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
        // Check if error is retryable (NetworkError has retryable: true)
        if (error && typeof error === 'object' && 'retryable' in error && !error.retryable) {
          throw error; // Don't retry non-retryable errors
        }
        if (attempt === maxRetries) {
          throw error; // No more retries left
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
});

// External SDK mocks
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        type: "message",
        content: []
      })
    }
  }))
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => "test response" }
      })
    }))
  }))
}));

// Navigation mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(() => Promise.resolve()),
  }),
}));

// Action mocks
vi.mock('@/app/(chat)/actions', () => {
  const mockUpdateChatVisibility = vi.fn(() => Promise.resolve());
  const mockSaveChatModelAsCookie = vi.fn(() => Promise.resolve());
  return {
    updateChatVisibility: mockUpdateChatVisibility,
    saveChatModelAsCookie: mockSaveChatModelAsCookie,
  };
});

vi.mock('@/components/sidebar-history', () => {
  const mockGetChatHistoryPaginationKey = vi.fn(() => ['history', 'key']);
  return {
    getChatHistoryPaginationKey: mockGetChatHistoryPaginationKey,
  };
});

// Hooks mocks
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false) // Default to desktop
}));

vi.mock('@/hooks/use-scroll-to-bottom', () => ({
  useScrollToBottom: vi.fn(() => ({
    containerRef: { current: null },
    endRef: { current: null },
    isAtBottom: false,
    scrollToBottom: vi.fn(),
    scrollToBottomOfLastMessage: vi.fn()
  }))
}));

vi.mock('@/hooks/use-auto-resume', () => ({
  useAutoResume: vi.fn(() => ({
    resumeChat: vi.fn(),
    isResuming: false
  }))
}));

// Setup fake timers for all tests

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.clearAllMocks();
});
