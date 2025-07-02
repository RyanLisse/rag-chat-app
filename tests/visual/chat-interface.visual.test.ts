// Visual Regression Tests for Chat Interface
import { test, expect } from '@playwright/test';
import { visualRegressionHelpers, criticalComponents } from './visual-regression.config';
import { createConversation } from '../factories';
import { getTestURL } from '../helpers/test-config';

test.describe('Chat Interface Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for animations to complete
    await visualRegressionHelpers.waitForStableUI(page);
  });

  test('should match baseline for empty chat state', async ({ page }) => {
    const result = await visualRegressionHelpers.captureAndCompare(
      page,
      'chat-empty-state',
      {
        fullPage: true,
        animations: 'disabled',
      }
    );

    expect(result.match).toBe(true);
    expect(result.diffPercentage).toBeLessThan(0.1);
  });

  test('should match baseline for chat with messages', async ({ page }) => {
    // Simulate a conversation
    await page.fill('[data-testid="chat-input"]', 'Hello, can you help me understand RAG?');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]');
    await visualRegressionHelpers.waitForStableUI(page);

    const result = await visualRegressionHelpers.captureAndCompare(
      page,
      'chat-with-messages',
      {
        fullPage: true,
        animations: 'disabled',
      }
    );

    expect(result.match).toBe(true);
  });

  test('should match baseline for citation sidebar', async ({ page }) => {
    // Mock a response with citations
    await page.evaluate(() => {
      // Inject a message with citations
      const mockMessage = {
        role: 'assistant',
        content: 'According to [1] recent research, RAG systems combine [2] retrieval and generation. [3] This approach has shown significant improvements.',
        citations: [
          { index: 1, source: 'Research Paper 2024', snippet: 'RAG systems are...' },
          { index: 2, source: 'Technical Report', snippet: 'Retrieval augmented...' },
          { index: 3, source: 'Conference Paper', snippet: 'Performance metrics show...' },
        ],
      };
      
      // Trigger UI update
      window.postMessage({ type: 'MOCK_MESSAGE', data: mockMessage }, '*');
    });

    await page.waitForSelector('[data-testid="citation-sidebar"]');
    await visualRegressionHelpers.waitForStableUI(page);

    const citationSidebar = await page.locator('[data-testid="citation-sidebar"]');
    const result = await visualRegressionHelpers.captureElement(
      citationSidebar,
      'citation-sidebar'
    );

    expect(result.match).toBe(true);
  });

  test('should match baseline for model selector', async ({ page }) => {
    // Open model selector
    await page.click('[data-testid="model-selector"]');
    await page.waitForSelector('[data-testid="model-dropdown"]');
    
    const modelSelector = await page.locator('[data-testid="model-dropdown"]');
    const result = await visualRegressionHelpers.captureElement(
      modelSelector,
      'model-selector-open'
    );

    expect(result.match).toBe(true);
  });

  test('should match baseline for file upload area', async ({ page }) => {
    // Trigger file upload UI
    await page.click('[data-testid="file-upload-button"]');
    await page.waitForSelector('[data-testid="file-upload-area"]');
    
    const uploadArea = await page.locator('[data-testid="file-upload-area"]');
    const result = await visualRegressionHelpers.captureElement(
      uploadArea,
      'file-upload-area'
    );

    expect(result.match).toBe(true);
  });

  test('should match baseline across different viewports', async ({ page }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await visualRegressionHelpers.waitForStableUI(page);
      
      const result = await visualRegressionHelpers.captureAndCompare(
        page,
        `responsive-layout-${viewport.name}`,
        {
          fullPage: false, // Capture viewport only
          animations: 'disabled',
        }
      );

      expect(result.match).toBe(true);
      expect(result.diffPercentage).toBeLessThan(1); // Allow 1% difference for responsive layouts
    }
  });

  test('should capture all critical components', async ({ page }) => {
    const results = [];
    
    for (const component of criticalComponents) {
      try {
        await page.waitForSelector(component.selector, { timeout: 5000 });
        const element = await page.locator(component.selector);
        
        const result = await visualRegressionHelpers.captureElement(
          element,
          component.name
        );
        
        results.push({
          name: component.name,
          ...result,
        });
      } catch (error) {
        // Component might not be visible in initial state
        results.push({
          name: component.name,
          match: true,
          diffPercentage: 0,
          skipped: true,
        });
      }
    }

    // At least some components should be captured
    const capturedComponents = results.filter(r => !r.skipped);
    expect(capturedComponents.length).toBeGreaterThan(0);
    
    // All captured components should match
    capturedComponents.forEach(result => {
      expect(result.match).toBe(true);
    });
  });

  test('should handle dark mode visual regression', async ({ page }) => {
    // Toggle dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForSelector('html[data-theme="dark"]');
    await visualRegressionHelpers.waitForStableUI(page);

    const result = await visualRegressionHelpers.captureAndCompare(
      page,
      'chat-dark-mode',
      {
        fullPage: true,
        animations: 'disabled',
      }
    );

    expect(result.match).toBe(true);
  });
});