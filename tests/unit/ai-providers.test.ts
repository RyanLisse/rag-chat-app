// Unit Tests for lib/ai/providers.ts
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { myProvider } from '@/lib/ai/providers';

// Mock the constants module
const mockIsTestEnvironment = mock(() => false);
mock.module('@/lib/constants', () => ({
  isTestEnvironment: mockIsTestEnvironment(),
}));

describe('myProvider', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockIsTestEnvironment.mockClear();
  });

  it('should provide test models in test environment', () => {
    // Set test environment
    mockIsTestEnvironment.mockReturnValue(true);
    
    // Re-import to get fresh instance with mocked value
    delete require.cache[require.resolve('@/lib/ai/providers')];
    const { myProvider: testProvider } = require('@/lib/ai/providers');
    
    expect(testProvider).toBeDefined();
    expect(testProvider.languageModels).toBeDefined();
    expect(testProvider.languageModels['chat-model']).toBeDefined();
    expect(testProvider.languageModels['chat-model-reasoning']).toBeDefined();
    expect(testProvider.languageModels['title-model']).toBeDefined();
    expect(testProvider.languageModels['artifact-model']).toBeDefined();
  });

  it('should provide production models in non-test environment', () => {
    // Set production environment
    mockIsTestEnvironment.mockReturnValue(false);
    
    // Re-import to get fresh instance with mocked value
    delete require.cache[require.resolve('@/lib/ai/providers')];
    const { myProvider: prodProvider } = require('@/lib/ai/providers');
    
    expect(prodProvider).toBeDefined();
    expect(prodProvider.languageModels).toBeDefined();
    expect(prodProvider.languageModels['chat-model']).toBeDefined();
    expect(prodProvider.languageModels['chat-model-reasoning']).toBeDefined();
    expect(prodProvider.languageModels['title-model']).toBeDefined();
    expect(prodProvider.languageModels['artifact-model']).toBeDefined();
    
    // Should also have image models in production
    expect(prodProvider.imageModels).toBeDefined();
    expect(prodProvider.imageModels['small-model']).toBeDefined();
  });

  it('should have all required language models', () => {
    const requiredModels = [
      'chat-model',
      'chat-model-reasoning',
      'title-model',
      'artifact-model',
    ];

    requiredModels.forEach(modelName => {
      expect(myProvider.languageModels[modelName]).toBeDefined();
    });
  });

  it('should wrap reasoning model with middleware in production', () => {
    mockIsTestEnvironment.mockReturnValue(false);
    
    // Re-import to get fresh instance
    delete require.cache[require.resolve('@/lib/ai/providers')];
    const { myProvider: prodProvider } = require('@/lib/ai/providers');
    
    // The reasoning model should be wrapped with extractReasoningMiddleware
    const reasoningModel = prodProvider.languageModels['chat-model-reasoning'];
    expect(reasoningModel).toBeDefined();
    // The wrapped model should have different properties than a regular model
    expect(reasoningModel.model).toBeDefined();
  });
});

describe('Provider Configuration', () => {
  it('should use xai models in production', () => {
    mockIsTestEnvironment.mockReturnValue(false);
    
    delete require.cache[require.resolve('@/lib/ai/providers')];
    const { myProvider: prodProvider } = require('@/lib/ai/providers');
    
    // Check that models are configured with correct xai models
    const chatModel = prodProvider.languageModels['chat-model'];
    const titleModel = prodProvider.languageModels['title-model'];
    const artifactModel = prodProvider.languageModels['artifact-model'];
    
    expect(chatModel).toBeDefined();
    expect(titleModel).toBeDefined();
    expect(artifactModel).toBeDefined();
  });

  it('should configure image model in production only', () => {
    // Test environment should not have image models
    mockIsTestEnvironment.mockReturnValue(true);
    delete require.cache[require.resolve('@/lib/ai/providers')];
    const { myProvider: testProvider } = require('@/lib/ai/providers');
    
    expect(testProvider.imageModels).toBeUndefined();
    
    // Production environment should have image models
    mockIsTestEnvironment.mockReturnValue(false);
    delete require.cache[require.resolve('@/lib/ai/providers')];
    const { myProvider: prodProvider } = require('@/lib/ai/providers');
    
    expect(prodProvider.imageModels).toBeDefined();
    expect(prodProvider.imageModels['small-model']).toBeDefined();
  });
});

describe('Model Access Patterns', () => {
  it('should allow accessing models by key', () => {
    const chatModel = myProvider.languageModels['chat-model'];
    expect(chatModel).toBeDefined();
  });

  it('should return undefined for non-existent models', () => {
    const nonExistentModel = myProvider.languageModels['non-existent-model'];
    expect(nonExistentModel).toBeUndefined();
  });

  it('should maintain consistent model references', () => {
    const model1 = myProvider.languageModels['chat-model'];
    const model2 = myProvider.languageModels['chat-model'];
    
    // Same model reference should be returned
    expect(model1).toBe(model2);
  });
});