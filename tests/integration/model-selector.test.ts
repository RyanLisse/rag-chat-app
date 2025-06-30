import { test, expect } from '@playwright/test';

test.describe('Model Selector Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat page
    await page.goto('/');
    
    // Wait for the model selector to be visible
    await page.waitForSelector('[data-testid="model-selector"]');
  });

  test('should display model selector with default model', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await expect(modelSelector).toBeVisible();
    
    // Check if default model is displayed
    await expect(modelSelector).toContainText('GPT-4.1');
    await expect(modelSelector).toContainText('🟢');
  });

  test('should open dropdown and show all available models', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Wait for dropdown to open
    await page.waitForSelector('[role="listbox"]');

    // Check provider groups
    await expect(page.getByText('OPENAI')).toBeVisible();
    await expect(page.getByText('ANTHROPIC')).toBeVisible();
    await expect(page.getByText('GOOGLE')).toBeVisible();

    // Check models are visible
    await expect(page.getByText('GPT-4.1')).toBeVisible();
    await expect(page.getByText('o4-mini')).toBeVisible();
    await expect(page.getByText('Claude 4')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Flash')).toBeVisible();
  });

  test('should display model metadata', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Find GPT-4.1 option
    const gpt4Option = page.locator('[role="option"]').filter({ hasText: 'GPT-4.1' });
    
    // Check metadata is displayed
    await expect(gpt4Option).toContainText('Context: 128K');
    await expect(gpt4Option).toContainText('$0.01/$0.03');
    await expect(gpt4Option).toContainText('Recommended');

    // Check capability icons
    const visionIcon = gpt4Option.locator('[title="Vision support"]');
    await expect(visionIcon).toBeVisible();
    
    const docSearchIcon = gpt4Option.locator('[title="Document search support"]');
    await expect(docSearchIcon).toBeVisible();
  });

  test('should search and filter models', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Type in search
    const searchInput = page.getByPlaceholder('Search models...');
    await searchInput.fill('claude');

    // Check only Claude is visible
    await expect(page.getByText('Claude 4')).toBeVisible();
    await expect(page.getByText('GPT-4.1')).not.toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).not.toBeVisible();

    // Clear search and search by tag
    await searchInput.clear();
    await searchInput.fill('fast');

    // Check fast models are visible
    await expect(page.getByText('o4-mini')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Flash')).toBeVisible();
    await expect(page.getByText('GPT-4.1')).not.toBeVisible();
  });

  test('should select a model and persist selection', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    
    // Open dropdown
    await modelSelector.click();

    // Select Claude 4
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await claudeOption.click();

    // Check model selector updated
    await expect(modelSelector).toContainText('Claude 4');
    await expect(modelSelector).toContainText('🟠');

    // Refresh page
    await page.reload();

    // Check selection persisted
    await page.waitForSelector('[data-testid="model-selector"]');
    const updatedSelector = page.getByTestId('model-selector');
    await expect(updatedSelector).toContainText('Claude 4');
  });

  test('should show different models for guest vs regular users', async ({ page, context }) => {
    // Test as guest user
    await context.clearCookies();
    await page.goto('/');
    
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Guest should only see OpenAI models
    await expect(page.getByText('GPT-4.1')).toBeVisible();
    await expect(page.getByText('o4-mini')).toBeVisible();
    await expect(page.getByText('Claude 4')).not.toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).not.toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');

    // Login as regular user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect back to chat
    await page.waitForURL('/');
    
    // Open model selector again
    await page.getByTestId('model-selector').click();

    // Regular user should see all models
    await expect(page.getByText('GPT-4.1')).toBeVisible();
    await expect(page.getByText('o4-mini')).toBeVisible();
    await expect(page.getByText('Claude 4')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Flash')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Check selection changed
    await expect(modelSelector).not.toContainText('GPT-4.1');
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Verify dropdown is open
    await expect(page.getByPlaceholder('Search models...')).toBeVisible();

    // Click outside
    await page.click('body', { position: { x: 0, y: 0 } });

    // Verify dropdown is closed
    await expect(page.getByPlaceholder('Search models...')).not.toBeVisible();
  });

  test('should display correct provider icons and colors', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Check provider headers have correct icons
    const openaiHeader = page.locator('text=OPENAI').locator('..');
    await expect(openaiHeader).toContainText('🟢');

    const anthropicHeader = page.locator('text=ANTHROPIC').locator('..');
    await expect(anthropicHeader).toContainText('🟠');

    const googleHeader = page.locator('text=GOOGLE').locator('..');
    await expect(googleHeader).toContainText('🔵');
  });

  test('should handle empty search results', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    const searchInput = page.getByPlaceholder('Search models...');
    await searchInput.fill('nonexistentmodel');

    // Check empty state
    await expect(page.getByText('No model found.')).toBeVisible();
  });
});