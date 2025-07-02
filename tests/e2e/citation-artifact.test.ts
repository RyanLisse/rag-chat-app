// E2E Tests for Citation Artifact
import { test, expect, type Page } from '@playwright/test';
import { generateTestChatSession } from '../helpers/chat-helpers';
import { waitForArtifactLoad } from '../helpers/artifact-helpers';
import { getTestURL } from '../helpers/test-config';

test.describe('Citation Artifact E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set viewport size for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Navigate to chat
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should create and display citation artifact', async () => {
    // Generate a test chat session with citations
    const chatSession = await generateTestChatSession(page, {
      message: 'Create a research summary about artificial intelligence with proper citations',
      artifactType: 'citation',
    });

    // Wait for citation artifact to load
    await waitForArtifactLoad(page, 'citation');

    // Check that citation artifact is visible
    await expect(page.locator('[data-testid="artifact"]')).toBeVisible();
    
    // Check main content area
    await expect(page.locator('h1')).toContainText('AI Research Summary');
    
    // Check citations sidebar
    await expect(page.locator('text=Sources & Citations')).toBeVisible();
    
    // Check that citation numbers are present
    await expect(page.locator('sup[role="button"]')).toHaveCount(3); // Assuming 3 citations
    
    // Check that sources are listed
    await expect(page.locator('[role="button"][aria-label*="Open source:"]')).toHaveCount(2); // Assuming 2 sources
  });

  test('should handle citation interactions', async () => {
    await generateTestChatSession(page, {
      message: 'Explain machine learning with citations',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Click on first citation
    const firstCitation = page.locator('sup[role="button"]').first();
    await firstCitation.click();

    // Check that citation is highlighted
    await expect(firstCitation).toHaveClass(/bg-blue-500/);

    // Check that related source is highlighted in sidebar
    await expect(page.locator('.ring-blue-500')).toBeVisible();
  });

  test('should open source preview modal', async () => {
    await generateTestChatSession(page, {
      message: 'Write about neural networks with academic sources',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Click on first source card
    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    await firstSource.click();

    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Check modal content
    await expect(page.locator('text=SOURCE INFORMATION')).toBeVisible();
    await expect(page.locator('text=CITATIONS FROM THIS SOURCE')).toBeVisible();

    // Check that citation details are shown
    await expect(page.locator('text=Citation #1')).toBeVisible();

    // Close modal
    await page.locator('button[aria-label*="close"]', { hasText: 'Close' }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should toggle statistics panel', async () => {
    await generateTestChatSession(page, {
      message: 'Research summary with multiple sources and citations',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Click statistics button
    const statsButton = page.locator('button[aria-label*="Show statistics"]');
    await statsButton.click();

    // Check that statistics panel is visible
    await expect(page.locator('text=Total Citations')).toBeVisible();
    await expect(page.locator('text=Unique Sources')).toBeVisible();
    await expect(page.locator('text=Relevance Quality')).toBeVisible();

    // Check specific statistics
    await expect(page.locator('text=Excellent')).toBeVisible();
    await expect(page.locator('text=Source Types')).toBeVisible();

    // Toggle back to sources view
    const hideStatsButton = page.locator('button[aria-label*="Hide statistics"]');
    await hideStatsButton.click();

    // Check that source list is visible again
    await expect(page.locator('[role="button"][aria-label*="Open source:"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async () => {
    await generateTestChatSession(page, {
      message: 'Technical article with citations for accessibility testing',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Navigate to first citation using Tab
    await page.keyboard.press('Tab');
    const firstCitation = page.locator('sup[role="button"]').first();
    await firstCitation.focus();

    // Press Enter to activate citation
    await page.keyboard.press('Enter');
    await expect(firstCitation).toHaveClass(/bg-blue-500/);

    // Navigate to source card using Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // May need multiple tabs to reach source
    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    
    // Press Enter to open modal
    await firstSource.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Press Escape to close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should handle citation hover effects', async () => {
    await generateTestChatSession(page, {
      message: 'Article with hover-interactive citations',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    const firstCitation = page.locator('sup[role="button"]').first();
    
    // Hover over citation
    await firstCitation.hover();
    
    // Check hover effects (scale and highlight)
    await expect(firstCitation).toHaveClass(/hover:scale-110/);
    
    // Check that related source is highlighted
    await expect(page.locator('.ring-blue-500')).toBeVisible();

    // Move away from citation
    await page.locator('h1').hover();
    
    // Check that highlight is removed
    await expect(page.locator('.ring-blue-500')).not.toBeVisible();
  });

  test('should copy source URL', async () => {
    await generateTestChatSession(page, {
      message: 'Research with external web sources',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Open source modal
    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    await firstSource.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click copy URL button
    const copyButton = page.locator('button[title="Copy URL"]');
    await copyButton.click();

    // Check that success toast appears
    await expect(page.locator('text=URL copied to clipboard')).toBeVisible({ timeout: 5000 });
  });

  test('should open external links', async () => {
    await generateTestChatSession(page, {
      message: 'Academic paper summary with external links',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Open source modal
    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    await firstSource.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Set up listener for new page
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.locator('button[title="Open in new tab"]').click(),
    ]);

    // Check that new page opened
    expect(newPage.url()).toContain('http');
    await newPage.close();
  });

  test('should handle streaming citation updates', async () => {
    // Start generating citation artifact
    await page.goto('/');
    await page.fill('textarea[placeholder*="Send a message"]', 'Generate a research summary about climate change with citations');
    await page.press('textarea[placeholder*="Send a message"]', 'Enter');

    // Wait for streaming to start
    await expect(page.locator('text=Processing citations...')).toBeVisible({ timeout: 10000 });

    // Check that streaming indicator is present
    await expect(page.locator('[role="status"]')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toBeVisible();

    // Wait for streaming to complete
    await waitForArtifactLoad(page, 'citation');

    // Check that final content is present
    await expect(page.locator('sup[role="button"]')).toHaveCount(3, { timeout: 15000 });
    
    // Check that streaming indicator is gone
    await expect(page.locator('text=Processing citations...')).not.toBeVisible();
  });

  test('should handle responsive design on mobile', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await generateTestChatSession(page, {
      message: 'Mobile-responsive citation artifact test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Check that layout adapts to mobile
    const container = page.locator('[data-testid="artifact"]');
    await expect(container).toBeVisible();

    // Check that content is accessible on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Sources & Citations')).toBeVisible();

    // Check that citations are still interactive
    const firstCitation = page.locator('sup[role="button"]').first();
    await firstCitation.click();
    await expect(firstCitation).toHaveClass(/bg-blue-500/);

    // Check that modal works on mobile
    const firstSource = page.locator('[role="button"][aria-label*="Open source:"]').first();
    await firstSource.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should display correct citation counts and statistics', async () => {
    await generateTestChatSession(page, {
      message: 'Comprehensive research article with multiple citation types',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Check citation count display
    const citationCount = await page.locator('text=/\\d+ citations from \\d+ sources/').textContent();
    expect(citationCount).toMatch(/\d+ citations from \d+ sources/);

    // Open statistics panel
    await page.locator('button[aria-label*="Show statistics"]').click();

    // Check statistics accuracy
    await expect(page.locator('text=Total Citations')).toBeVisible();
    const totalCitations = await page.locator('text=Total Citations').locator('../..').locator('.text-lg').textContent();
    
    await expect(page.locator('text=Unique Sources')).toBeVisible();
    const uniqueSources = await page.locator('text=Unique Sources').locator('../..').locator('.text-lg').textContent();

    // Verify counts match
    expect(parseInt(totalCitations || '0')).toBeGreaterThan(0);
    expect(parseInt(uniqueSources || '0')).toBeGreaterThan(0);

    // Check relevance score
    await expect(page.locator('text=/\d+\.\d+%/')).toBeVisible();
  });

  test('should handle error states gracefully', async () => {
    // Mock network error
    await page.route('**/api/**', route => route.abort());

    await page.goto('/');
    await page.fill('textarea[placeholder*="Send a message"]', 'Test citation with network error');
    await page.press('textarea[placeholder*="Send a message"]', 'Enter');

    // Check that error is handled gracefully
    // (Implementation depends on error handling strategy)
    await expect(page.locator('text=Error')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain citation state during navigation', async () => {
    await generateTestChatSession(page, {
      message: 'Citation state persistence test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');

    // Select a citation
    const firstCitation = page.locator('sup[role="button"]').first();
    await firstCitation.click();
    await expect(firstCitation).toHaveClass(/bg-blue-500/);

    // Navigate away and back
    await page.goto('/');
    await page.goBack();

    // Check that citation state is maintained
    await waitForArtifactLoad(page, 'citation');
    await expect(page.locator('sup[role="button"]').first()).toHaveClass(/bg-blue-500/);
  });
});