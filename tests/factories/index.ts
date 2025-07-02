// Test Data Factories
import { faker } from '@faker-js/faker';
// TODO: Re-enable UIMessage import after AI SDK 5.0 compatibility
// import type { UIMessage } from 'ai';
import type { User } from '@/lib/db/schema';

// User factory
export const createUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  password: faker.internet.password(),
  ...overrides,
});

// UIMessage factory - TODO: Update for AI SDK 5.0 structure
export const createUIMessage = (overrides?: any): any => ({
  id: faker.string.uuid(),
  role: faker.helpers.arrayElement(['user', 'assistant', 'system']),
  content: faker.lorem.paragraph(),
  createdAt: new Date(),
  ...overrides,
});

// Chat factory
export const createChat = (overrides?: any) => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  userId: faker.string.uuid(),
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [],
  ...overrides,
});

// Document factory
export const createDocument = (overrides?: any) => ({
  id: faker.string.uuid(),
  title: faker.lorem.words(3),
  content: faker.lorem.paragraphs(3),
  kind: faker.helpers.arrayElement(['text', 'code']),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// File upload factory
export const createFileUpload = (overrides?: any) => ({
  id: faker.string.uuid(),
  filename: faker.system.fileName(),
  mimeType: faker.helpers.arrayElement(['application/pdf', 'text/plain', 'text/markdown']),
  size: faker.number.int({ min: 1000, max: 10000000 }),
  status: 'completed',
  createdAt: new Date(),
  ...overrides,
});

// Vector search result factory
export const createVectorSearchResult = (overrides?: any) => ({
  id: faker.string.uuid(),
  fileId: faker.string.uuid(),
  filename: faker.system.fileName(),
  snippet: faker.lorem.paragraph(),
  score: faker.number.float({ min: 0.5, max: 1, multipleOf: 0.01 }),
  metadata: {
    page: faker.number.int({ min: 1, max: 100 }),
    section: faker.lorem.word(),
  },
  ...overrides,
});

// Citation factory
export const createCitation = (index: number, overrides?: any) => ({
  index,
  source: faker.helpers.arrayElement([
    'Research Paper',
    'Technical Documentation',
    'Academic Journal',
    'Conference Proceedings',
  ]) + ': ' + faker.lorem.words(3),
  snippet: faker.lorem.sentences(2),
  file: faker.system.fileName(),
  page: faker.number.int({ min: 1, max: 200 }),
  relevance: faker.number.float({ min: 0.7, max: 1, multipleOf: 0.01 }),
  ...overrides,
});

// AI model response factory
export const createAIResponse = (overrides?: any) => ({
  id: faker.string.uuid(),
  model: faker.helpers.arrayElement(['gpt-4', 'claude-3-opus', 'gemini-pro']),
  content: faker.lorem.paragraphs(2),
  citations: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, (_, i) => 
    createCitation(i + 1)
  ),
  usage: {
    promptTokens: faker.number.int({ min: 100, max: 1000 }),
    completionTokens: faker.number.int({ min: 50, max: 500 }),
    totalTokens: faker.number.int({ min: 150, max: 1500 }),
  },
  ...overrides,
});

// Conversation factory
export const createConversation = (messageCount: number = 5) => {
  const messages: any[] = [];
  
  for (let i = 0; i < messageCount; i++) {
    messages.push(
      createUIMessage({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: i % 2 === 0 
          ? faker.lorem.sentence() + '?'
          : faker.lorem.paragraph() + ' [1] According to the source...',
      })
    );
  }
  
  return messages;
};

// Test file factory
export const createTestFile = (overrides?: any): File => {
  const content = overrides?.content || faker.lorem.paragraphs(5);
  const blob = new Blob([content], { type: overrides?.type || 'text/plain' });
  
  return new File(
    [blob],
    overrides?.name || faker.system.fileName(),
    {
      type: overrides?.type || 'text/plain',
      lastModified: Date.now(),
    }
  );
};

// Batch factories for creating multiple items
export const createUsers = (count: number) => 
  Array.from({ length: count }, () => createUser());

export const createUIMessages = (count: number) => 
  Array.from({ length: count }, () => createUIMessage());

export const createDocuments = (count: number) => 
  Array.from({ length: count }, () => createDocument());

export const createCitations = (count: number) => 
  Array.from({ length: count }, (_, i) => createCitation(i + 1));

// Scenario-specific factories
export const createRAGScenario = () => {
  const files = Array.from({ length: 3 }, () => createFileUpload());
  const searchResults = files.map(file => 
    createVectorSearchResult({ fileId: file.id, filename: file.filename })
  );
  const citations = searchResults.map((result, i) => 
    createCitation(i + 1, {
      source: result.filename,
      snippet: result.snippet,
    })
  );
  
  return {
    files,
    searchResults,
    citations,
    response: createAIResponse({ citations }),
  };
};

// Error scenario factories
export const createErrorScenarios = () => ({
  rateLimitError: {
    error: 'Rate limit exceeded',
    code: 'rate_limit_exceeded',
    retryAfter: 60,
  },
  authError: {
    error: 'Authentication failed',
    code: 'auth_failed',
  },
  validationError: {
    error: 'Invalid request',
    code: 'validation_error',
    details: {
      field: 'messages',
      message: 'UIMessages array cannot be empty',
    },
  },
  vectorStoreError: {
    error: 'Vector store operation failed',
    code: 'vector_store_error',
    details: 'Failed to process file',
  },
});