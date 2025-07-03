import { vi, beforeEach, afterEach } from 'vitest';
import {
  createOpenAIMock,
  createAISDKMock,
  createVectorStoreMock,
  createAuthMock,
  createLoggerMock,
  createProviderUtilsMock,
  mockRegistry
} from './mock-factory';

// Pre-register mocks to avoid hoisting issues
const openaiMock = createOpenAIMock();
const authMock = createAuthMock();
const aiSdkMock = createAISDKMock();
const vectorStoreMock = createVectorStoreMock();
const loggerMock = createLoggerMock();
const providerUtilsMock = createProviderUtilsMock();

// Register all global mocks using the factory system
vi.mock('openai', () => {
  mockRegistry.register('openai', () => openaiMock);
  return openaiMock;
});

// Auth mock
vi.mock('@/app/(auth)/auth', () => {
  mockRegistry.register('auth', () => authMock);
  return authMock;
});

// AI SDK mock
vi.mock('ai', () => {
  mockRegistry.register('ai-sdk', () => aiSdkMock);
  return aiSdkMock;
});

vi.mock('@/lib/ai', () => ({
  customModel: (model: string) => model,
}));

// Logger mock
vi.mock('@/lib/monitoring/logger', () => {
  mockRegistry.register('logger', () => loggerMock);
  return loggerMock;
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
  mockRegistry.register('vector-store', () => vectorStoreMock);
  return vectorStoreMock;
});

// Provider utils mock
vi.mock('@/lib/ai/providers/utils', () => {
  mockRegistry.register('provider-utils', () => providerUtilsMock);
  return providerUtilsMock;
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

// Mock isolation utilities
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
};

export const createCleanMockEnvironment = () => {
  vi.clearAllMocks();
  // Reset any module-level state
  vi.resetModules();
};

// Global test hooks with mock registry management
beforeEach(() => {
  // Don't automatically set fake timers globally - let individual tests control this
  vi.clearAllMocks();
  // Reset mock registry state but keep registrations
  mockRegistry.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Clean up timers if they were set by individual tests
  try {
    vi.useRealTimers();
  } catch (e) {
    // Ignore if real timers were already in use
  }
  vi.clearAllMocks();
});
