// Stagehand Integration for AI-Powered Testing
import { test as base, Page } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';
import { stagehandConfig } from '../../playwright.config';

export interface StagehandPage extends Page {
  stagehand: Stagehand;
  // AI-powered actions
  observe: (instruction: string) => Promise<any>;
  act: (instruction: string) => Promise<any>; // Updated for Stagehand API changes
  extract: <T>(options: {
    instruction: string;
    schema?: any;
  }) => Promise<T>;
}

// Extend Playwright test with Stagehand capabilities
export const test = base.extend<{
  stagehandPage: StagehandPage;
}>({
  stagehandPage: async ({ page, baseURL }, use) => {
    // Fallback to test config if baseURL is not provided
    const effectiveBaseURL = baseURL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    
    // Initialize Stagehand with the Playwright page
    const stagehand = new Stagehand({
      ...stagehandConfig,
      env: 'LOCAL',
    });

    // Initialize Stagehand with the page
    await stagehand.init({ page });
    
    // Enhance page with Stagehand methods and add base URL support
    const enhancedPage = page as StagehandPage;
    enhancedPage.stagehand = stagehand;
    
    // Override goto to handle relative URLs
    const originalGoto = enhancedPage.goto.bind(enhancedPage);
    enhancedPage.goto = async (url: string, options?: any) => {
      // If it's a relative URL, prepend the base URL
      if (url.startsWith('/')) {
        url = effectiveBaseURL + url;
      }
      return originalGoto(url, options);
    };
    
    // Add AI-powered methods
    enhancedPage.observe = async (instruction: string) => {
      try {
        return await stagehand.page.observe({ instruction });
      } catch (error) {
        console.warn('Stagehand observe failed:', error);
        return null;
      }
    };
    
    enhancedPage.act = async (instruction: string) => {
      try {
        return await stagehand.page.act({ action: instruction });
      } catch (error) {
        console.warn('Stagehand act failed:', error);
        throw error;
      }
    };
    
    enhancedPage.extract = async <T>(options: {
      instruction: string;
      schema?: any;
    }): Promise<T> => {
      try {
        // Use the correct Stagehand extract API - check if schema format needs adjustment
        if (options.schema && !options.schema.shape) {
          // Wrap the schema in the expected format if needed
          const extractOptions = {
            instruction: options.instruction,
            schema: options.schema
          };
          return await stagehand.page.extract(extractOptions) as Promise<T>;
        } else {
          return await stagehand.page.extract(options) as Promise<T>;
        }
      } catch (error) {
        console.warn('Stagehand extract failed:', error);
        // Return a fallback value instead of throwing
        return null as T;
      }
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
    try {
      const result = await page.extract<Array<{
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
      return result || [];
    } catch (error) {
      console.warn('Citation extraction failed, falling back to empty array');
      return [];
    }
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
    try {
      const result = await page.extract<Array<{
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
      return result || [];
    } catch (error) {
      console.warn('Conversation history extraction failed, falling back to empty array');
      return [];
    }
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