import { test, expect } from '@playwright/test';

test.describe('Model Selector Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="model-selector"]');
  });

  test('model selector closed state', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    
    // Take screenshot of closed state
    await expect(modelSelector).toHaveScreenshot('model-selector-closed.png');
  });

  test('model selector opened state - light theme', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Wait for dropdown animation
    await page.waitForTimeout(300);
    
    // Take screenshot of opened dropdown
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-dropdown-light.png');
  });

  test('model selector opened state - dark theme', async ({ page }) => {
    // Switch to dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Wait for dropdown animation
    await page.waitForTimeout(300);
    
    // Take screenshot of opened dropdown in dark theme
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-dropdown-dark.png');
  });

  test('model selector with search results', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const searchInput = page.getByPlaceholder('Search models...');
    await searchInput.fill('claude');
    
    // Wait for search results
    await page.waitForTimeout(200);
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-search-results.png');
  });

  test('model selector empty search state', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const searchInput = page.getByPlaceholder('Search models...');
    await searchInput.fill('nonexistent');
    
    // Wait for empty state
    await page.waitForTimeout(200);
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-empty-search.png');
  });

  test('model selector different selected states', async ({ page }) => {
    // Test with different models selected
    const models = ['gpt-4.1', 'claude-4', 'gemini-2.5-pro'];
    
    for (const modelId of models) {
      // Navigate with model pre-selected
      await page.goto(`/?model=${modelId}`);
      await page.waitForSelector('[data-testid="model-selector"]');
      
      const modelSelector = page.getByTestId('model-selector');
      await expect(modelSelector).toHaveScreenshot(`model-selector-${modelId}.png`);
    }
  });

  test('model selector hover states', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Hover over first model option
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.hover();
    
    // Wait for hover animation
    await page.waitForTimeout(200);
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-hover-state.png');
  });

  test('model selector mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    
    const modelSelector = page.getByTestId('model-selector');
    
    // Closed state on mobile
    await expect(modelSelector).toHaveScreenshot('model-selector-mobile-closed.png');
    
    // Open dropdown
    await modelSelector.click();
    await page.waitForTimeout(300);
    
    // Opened state on mobile
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-mobile-dropdown.png');
  });

  test('model selector tablet view', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    await page.waitForTimeout(300);
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-tablet-dropdown.png');
  });

  test('model selector with capability badges', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Focus on a model with many capabilities (like Gemini Pro)
    const geminiOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Pro' });
    await geminiOption.scrollIntoViewIfNeeded();
    
    await expect(geminiOption).toHaveScreenshot('model-option-with-capabilities.png');
  });

  test('model selector pricing display', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Get all model options
    const options = page.locator('[role="option"]');
    const count = await options.count();
    
    // Take screenshot showing pricing for all models
    const dropdown = page.locator('[role="listbox"]');
    
    // Scroll to show all options
    for (let i = 0; i < count; i++) {
      await options.nth(i).scrollIntoViewIfNeeded();
    }
    
    await expect(dropdown).toHaveScreenshot('model-selector-pricing-display.png');
  });

  test('model selector group headers', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Focus on provider group headers
    const openaiGroup = page.locator('text=OPENAI').locator('..');
    const anthropicGroup = page.locator('text=ANTHROPIC').locator('..');
    const googleGroup = page.locator('text=GOOGLE').locator('..');
    
    // Take screenshots of each group
    await expect(openaiGroup).toHaveScreenshot('model-selector-openai-group.png');
    await expect(anthropicGroup).toHaveScreenshot('model-selector-anthropic-group.png');
    await expect(googleGroup).toHaveScreenshot('model-selector-google-group.png');
  });
});