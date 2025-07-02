// Visual Regression Tests for Citation Artifact
import { test, expect, type Page } from '@playwright/test';
import { generateTestChatSession } from '../helpers/chat-helpers';
import { waitForArtifactLoad } from '../helpers/artifact-helpers';
import { getTestURL } from '../helpers/test-config';

test.describe('Citation Artifact Visual Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set consistent viewport for visual testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('citation artifact layout - desktop', async () => {
    await generateTestChatSession(page, {
      message: 'Create a research summary about quantum computing with citations',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    // Wait for all content to load
    await page.waitForTimeout(2000);

    // Take screenshot of full artifact
    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-artifact-desktop.png');
  });

  test('citation artifact layout - mobile', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await generateTestChatSession(page, {
      message: 'Mobile citation artifact layout test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-artifact-mobile.png');
  });

  test('citation artifact layout - tablet', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await generateTestChatSession(page, {
      message: 'Tablet citation artifact layout test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-artifact-tablet.png');
  });

  test('citation hover states', async () => {
    await generateTestChatSession(page, {
      message: 'Citation hover effects visual test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Hover over first citation
    const firstCitation = page.locator('sup[role="button"]').first();
    await firstCitation.hover();
    
    // Wait for hover animations
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-hover-state.png');
  });

  test('citation selected state', async () => {
    await generateTestChatSession(page, {
      message: 'Citation selection visual test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Click first citation
    const firstCitation = page.locator('sup[role="button"]').first();
    await firstCitation.click();
    
    // Wait for selection animations
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-selected-state.png');
  });

  test('source preview modal', async () => {
    await generateTestChatSession(page, {
      message: 'Source modal visual test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Open source modal
    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    await firstSource.click();
    
    // Wait for modal animation
    await page.waitForTimeout(1000);

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('source-preview-modal.png');
  });

  test('source preview modal - mobile', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await generateTestChatSession(page, {
      message: 'Mobile source modal test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    await firstSource.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('source-preview-modal-mobile.png');
  });

  test('statistics panel', async () => {
    await generateTestChatSession(page, {
      message: 'Statistics panel visual test with multiple source types',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Toggle to statistics view
    const statsButton = page.locator('button[aria-label*="Show statistics"]');
    await statsButton.click();
    
    // Wait for animation
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('statistics-panel.png');
  });

  test('statistics panel - mobile', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await generateTestChatSession(page, {
      message: 'Mobile statistics panel test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    const statsButton = page.locator('button[aria-label*="Show statistics"]');
    await statsButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('statistics-panel-mobile.png');
  });

  test('streaming state', async () => {
    // Start generating citation artifact
    await page.fill('textarea[placeholder*="Send a message"]', 'Streaming citation test');
    await page.press('textarea[placeholder*="Send a message"]', 'Enter');

    // Wait for streaming to start
    await expect(page.locator('text=Processing citations...')).toBeVisible({ timeout: 10000 });
    
    // Take screenshot during streaming
    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-streaming-state.png');
  });

  test('dark mode layout', async () => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await generateTestChatSession(page, {
      message: 'Dark mode citation artifact test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-artifact-dark.png');
  });

  test('dark mode source modal', async () => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await generateTestChatSession(page, {
      message: 'Dark mode source modal test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    await firstSource.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('source-modal-dark.png');
  });

  test('high contrast mode', async () => {
    // Enable high contrast
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    
    await generateTestChatSession(page, {
      message: 'High contrast citation test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-high-contrast.png');
  });

  test('empty state', async () => {
    await generateTestChatSession(page, {
      message: 'Empty citation artifact test',
      artifactType: 'citation',
      mockEmpty: true,
    });

    await waitForArtifactLoad(page, 'citation');
    await page.waitForTimeout(2000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-empty-state.png');
  });

  test('error state', async () => {
    // Mock error response
    await page.route('**/api/chat**', route => route.abort());
    
    await page.fill('textarea[placeholder*="Send a message"]', 'Error state test');
    await page.press('textarea[placeholder*="Send a message"]', 'Enter');

    // Wait for error to appear
    await expect(page.locator('text=Error')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-error-state.png');
  });

  test('focus states', async () => {
    await generateTestChatSession(page, {
      message: 'Focus states visual test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Focus first citation
    const firstCitation = page.locator('sup[role="button"]').first();
    await firstCitation.focus();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('citation-focus-state.png');
  });

  test('multiple citations highlighting', async () => {
    await generateTestChatSession(page, {
      message: 'Multiple citations highlighting test with related sources',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Click first citation
    await page.locator('sup[role="button"]').first().click();
    
    // Hover second citation
    await page.locator('sup[role="button"]').nth(1).hover();
    
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('multiple-citations-highlight.png');
  });

  test('source types diversity', async () => {
    await generateTestChatSession(page, {
      message: 'Citation with diverse source types - documents, webpages, APIs, databases',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Toggle to statistics to show source distribution
    await page.locator('button[aria-label*="Show statistics"]').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('source-types-diversity.png');
  });

  test('long content scrolling', async () => {
    await generateTestChatSession(page, {
      message: 'Generate a very long research article with many citations for scrolling test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Scroll to middle of content
    await page.locator('[role="article"]').evaluate(el => {
      el.scrollTop = el.scrollHeight / 2;
    });
    
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="artifact"]')).toHaveScreenshot('long-content-scrolled.png');
  });

  test('citation relevance indicators', async () => {
    await generateTestChatSession(page, {
      message: 'Citations with varying relevance scores for visual testing',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Open first source to show relevance
    await page.locator('[role="button"][aria-label*="Open source:"]').first().click();
    await page.waitForTimeout(1000);

    await expect(page.locator('[role="dialog"]')).toHaveScreenshot('citation-relevance-indicators.png');
  });
});