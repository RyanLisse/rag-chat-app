// Stagehand Integration for AI-Powered Testing
import { test as base, Page } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';
import { stagehandConfig } from '../../playwright.config';

export interface StagehandPage extends Page {
  stagehand: Stagehand;
  // AI-powered actions
  observe: (instruction: string) => Promise<any>;
  act: (instruction: string) => Promise<void>;
  extract: <T>(options: {
    instruction: string;
    schema?: any;
  }) => Promise<T>;
}

// Extend Playwright test with Stagehand capabilities
export const test = base.extend<{
  stagehandPage: StagehandPage;
}>({
  stagehandPage: async ({ page }, use) => {
    // Initialize Stagehand
    const stagehand = new Stagehand({
      ...stagehandConfig,
      env: 'LOCAL', // Use local browser instead of Browserbase
    });

    // Initialize with existing Playwright page
    await stagehand.init();
    
    // Enhance page with Stagehand methods
    const enhancedPage = page as StagehandPage;
    enhancedPage.stagehand = stagehand;
    
    // Add AI-powered methods
    enhancedPage.observe = async (instruction: string) => {
      return stagehand.page.observe(instruction);
    };
    
    enhancedPage.act = async (instruction: string) => {
      return stagehand.page.act(instruction);
    };
    
    enhancedPage.extract = async <T>(options: {
      instruction: string;
      schema?: any;
    }): Promise<T> => {
      return stagehand.page.extract(options) as Promise<T>;
    };

    // Use the enhanced page
    await use(enhancedPage);

    // Cleanup
    await stagehand.close();
  },
});

// Helper functions for common RAG chat testing patterns
export const ragHelpers = {
  // AI-powered chat interaction
  async sendChatMessage(
    page: StagehandPage,
    message: string,
    options: { waitForResponse?: boolean } = {}
  ) {
    await page.act(`Type "${message}" in the chat input`);
    await page.act('Send the message');
    
    if (options.waitForResponse) {
      await page.observe('Wait for the assistant response to complete');
    }
  },

  // Extract citations from response
  async extractCitations(page: StagehandPage) {
    return page.extract<Array<{
      index: number;
      source: string;
      snippet: string;
    }>>({
      instruction: 'Extract all citations from the assistant response',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'number' },
            source: { type: 'string' },
            snippet: { type: 'string' },
          },
        },
      },
    });
  },

  // Upload files with AI assistance
  async uploadDocuments(
    page: StagehandPage,
    descriptions: string[]
  ) {
    for (const description of descriptions) {
      await page.act(`Upload a document: ${description}`);
      await page.observe('Wait for upload to complete');
    }
  },

  // Verify UI state with natural language
  async verifyUIState(
    page: StagehandPage,
    expectations: string[]
  ): Promise<boolean> {
    const results = await Promise.all(
      expectations.map(expectation => 
        page.observe(expectation).then(() => true).catch(() => false)
      )
    );
    
    return results.every(result => result === true);
  },

  // Extract conversation history
  async getConversationHistory(page: StagehandPage) {
    return page.extract<Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp?: string;
    }>>({
      instruction: 'Extract the entire conversation history',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['user', 'assistant'] },
            content: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    });
  },

  // Select AI model
  async selectModel(
    page: StagehandPage,
    modelName: string
  ) {
    await page.act(`Select the ${modelName} model from the model selector`);
    await page.observe(`Confirm ${modelName} is selected`);
  },

  // Natural language assertions
  async assertContent(
    page: StagehandPage,
    assertion: string
  ): Promise<void> {
    const result = await page.observe(assertion);
    if (!result) {
      throw new Error(`Assertion failed: ${assertion}`);
    }
  },
};

// Export Playwright's expect for convenience
export { expect } from '@playwright/test';

// Stagehand-specific matchers
export const stagehandMatchers = {
  async toHaveCitations(page: StagehandPage, minCount: number = 1) {
    const citations = await ragHelpers.extractCitations(page);
    return {
      pass: citations.length >= minCount,
      message: () => 
        `Expected at least ${minCount} citations, found ${citations.length}`,
    };
  },

  async toShowModel(page: StagehandPage, modelName: string) {
    const result = await page.observe(
      `Check if ${modelName} is displayed as the current model`
    );
    return {
      pass: result === true,
      message: () => `Expected ${modelName} to be selected`,
    };
  },

  async toHaveUploadedFiles(page: StagehandPage, count: number) {
    const files = await page.extract<string[]>({
      instruction: 'List all uploaded file names',
    });
    return {
      pass: files.length === count,
      message: () => 
        `Expected ${count} uploaded files, found ${files.length}`,
    };
  },
};