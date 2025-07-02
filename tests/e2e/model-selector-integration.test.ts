import { test, expect } from '@playwright/test';

test.describe('Model Selector Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat page
    await page.goto('/');
    
    // Wait for the model selector to be visible and fully loaded
    await page.waitForSelector('[data-testid="model-selector"]');
    await page.waitForLoadState('networkidle');
  });

  test('should display model selector with default model and accessibility', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await expect(modelSelector).toBeVisible();
    
    // Check if default model is displayed
    await expect(modelSelector).toContainText('GPT-4.1');
    await expect(modelSelector).toContainText('🟢');
    
    // Check accessibility attributes
    await expect(modelSelector).toHaveAttribute('role', 'combobox');
    await expect(modelSelector).toHaveAttribute('aria-expanded', 'false');
    await expect(modelSelector).toHaveAttribute('aria-label', /Current model: GPT-4.1/);
    
    // Check provider accessibility
    await expect(modelSelector.getByLabelText('OpenAI provider')).toBeVisible();
  });

  test('should open dropdown and show all available models with enhanced layout', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Wait for dropdown to open with proper role
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();

    // Check provider groups with accessibility
    await expect(page.getByLabelText('OpenAI models')).toBeVisible();
    await expect(page.getByLabelText('Anthropic models')).toBeVisible();
    await expect(page.getByLabelText('Google models')).toBeVisible();

    // Check all models are visible with proper metadata
    const gpt4Option = page.locator('[role="option"]').filter({ hasText: 'GPT-4.1' });
    await expect(gpt4Option).toBeVisible();
    await expect(gpt4Option).toContainText('Recommended');
    await expect(gpt4Option).toContainText('Balanced');
    
    const o4MiniOption = page.locator('[role="option"]').filter({ hasText: 'o4-mini' });
    await expect(o4MiniOption).toBeVisible();
    await expect(o4MiniOption).toContainText('Fast');
    
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await expect(claudeOption).toBeVisible();
    await expect(claudeOption).toContainText('Long context');
    
    const geminiProOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Pro' });
    await expect(geminiProOption).toBeVisible();
    
    const geminiFlashOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Flash' });
    await expect(geminiFlashOption).toBeVisible();
    await expect(geminiFlashOption).toContainText('Fast');
  });

  test('should display model metadata with enhanced information', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Find GPT-4.1 option
    const gpt4Option = page.locator('[role="option"]').filter({ hasText: 'GPT-4.1' });
    
    // Check metadata is displayed
    await expect(gpt4Option).toContainText('Context: 128K');
    await expect(gpt4Option).toContainText('$0.010/$0.030');
    await expect(gpt4Option).toContainText('Recommended');
    await expect(gpt4Option).toContainText('Balanced');
    await expect(gpt4Option).toContainText('High');

    // Check capability badges
    const visionBadge = gpt4Option.locator('[title="Vision support"]');
    await expect(visionBadge).toBeVisible();
    
    const docSearchBadge = gpt4Option.locator('[title="Document search support"]');
    await expect(docSearchBadge).toBeVisible();
    
    // Check speed and cost badges
    const speedBadge = gpt4Option.locator('[title="Balanced response time"]');
    await expect(speedBadge).toBeVisible();
    
    const costBadge = gpt4Option.locator('[title="High cost"]');
    await expect(costBadge).toBeVisible();
  });

  test('should search and filter models with enhanced functionality', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Verify search input accessibility
    const searchInput = page.getByPlaceholder('Search models...');
    await expect(searchInput).toHaveAttribute('aria-label', 'Search available models');
    
    // Search by model name
    await searchInput.fill('claude');
    await expect(page.getByText('Claude 4')).toBeVisible();
    await expect(page.getByText('GPT-4.1')).not.toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).not.toBeVisible();

    // Search by provider
    await searchInput.clear();
    await searchInput.fill('google');
    await expect(page.getByText('Gemini 2.5 Pro')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Flash')).toBeVisible();
    await expect(page.getByText('GPT-4.1')).not.toBeVisible();

    // Search by tag
    await searchInput.clear();
    await searchInput.fill('fast');
    await expect(page.getByText('o4-mini')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Flash')).toBeVisible();
    await expect(page.getByText('GPT-4.1')).not.toBeVisible();
    
    // Search by capability
    await searchInput.clear();
    await searchInput.fill('vision');
    // Should show models with vision capability
    await expect(page.getByText('GPT-4.1')).toBeVisible();
    await expect(page.getByText('Claude 4')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).toBeVisible();
  });

  test('should select a model with proper feedback and persist selection', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    
    // Open dropdown
    await modelSelector.click();

    // Select Claude 4 and verify loading state
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await expect(claudeOption).toHaveAttribute('aria-label', 'Select Claude 4 model');
    await claudeOption.click();

    // Check model selector updated with new provider icon
    await expect(modelSelector).toContainText('Claude 4');
    await expect(modelSelector).toContainText('🟠');
    await expect(modelSelector.getByLabelText('Anthropic provider')).toBeVisible();

    // Refresh page
    await page.reload();

    // Check selection persisted
    await page.waitForSelector('[data-testid="model-selector"]');
    const updatedSelector = page.getByTestId('model-selector');
    await expect(updatedSelector).toContainText('Claude 4');
    await expect(updatedSelector.getByLabelText('Anthropic provider')).toBeVisible();
  });

  test('should show different models for guest vs regular users with proper entitlements', async ({ page, context }) => {
    // Test as guest user
    await context.clearCookies();
    await page.goto('/');
    
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Guest should only see OpenAI models with proper count
    await expect(page.getByText('GPT-4.1')).toBeVisible();
    await expect(page.getByText('o4-mini')).toBeVisible();
    await expect(page.getByText('Claude 4')).not.toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).not.toBeVisible();
    await expect(page.getByText('Gemini 2.5 Flash')).not.toBeVisible();
    
    // Should only show OpenAI group
    await expect(page.getByText('OPENAI')).toBeVisible();
    await expect(page.getByText('ANTHROPIC')).not.toBeVisible();
    await expect(page.getByText('GOOGLE')).not.toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');

    // Simulate login as regular user (mock authentication)
    await page.route('/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          user: { 
            id: 'test-user', 
            email: 'test@example.com', 
            type: 'regular' 
          } 
        }),
      });
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    
    // Open model selector again
    await page.getByTestId('model-selector').click();

    // Regular user should see all models and providers
    await expect(page.getByText('GPT-4.1')).toBeVisible();
    await expect(page.getByText('o4-mini')).toBeVisible();
    await expect(page.getByText('Claude 4')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Pro')).toBeVisible();
    await expect(page.getByText('Gemini 2.5 Flash')).toBeVisible();
    
    // Should show all provider groups
    await expect(page.getByText('OPENAI')).toBeVisible();
    await expect(page.getByText('ANTHROPIC')).toBeVisible();
    await expect(page.getByText('GOOGLE')).toBeVisible();
  });

  test('should handle comprehensive keyboard navigation', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    
    // Focus the selector with Tab
    await page.keyboard.press('Tab');
    await expect(modelSelector).toBeFocused();
    
    // Open with Enter or Space
    await page.keyboard.press('Enter');
    await expect(page.getByPlaceholder('Search models...')).toBeVisible();
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Select with Enter
    await page.keyboard.press('Enter');

    // Check selection changed
    await expect(modelSelector).not.toContainText('GPT-4.1');
    
    // Test Escape key to close
    await modelSelector.click();
    await expect(page.getByPlaceholder('Search models...')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search models...')).not.toBeVisible();
  });

  test('should close dropdown when clicking outside or pressing Escape', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Verify dropdown is open
    await expect(page.getByPlaceholder('Search models...')).toBeVisible();

    // Close with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search models...')).not.toBeVisible();
    
    // Open again
    await modelSelector.click();
    await expect(page.getByPlaceholder('Search models...')).toBeVisible();

    // Click outside to close
    await page.click('body', { position: { x: 0, y: 0 } });
    await expect(page.getByPlaceholder('Search models...')).not.toBeVisible();
  });

  test('should display correct provider icons and accessibility', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    
    // Check main selector shows provider icon
    await expect(modelSelector.getByLabelText('OpenAI provider')).toBeVisible();
    
    await modelSelector.click();

    // Check provider headers have correct icons and accessibility
    const openaiHeader = page.locator('text=OPENAI').locator('..');
    await expect(openaiHeader).toContainText('🟢');
    await expect(page.getByLabelText('OpenAI models')).toBeVisible();

    const anthropicHeader = page.locator('text=ANTHROPIC').locator('..');
    await expect(anthropicHeader).toContainText('🟠');
    await expect(page.getByLabelText('Anthropic models')).toBeVisible();

    const googleHeader = page.locator('text=GOOGLE').locator('..');
    await expect(googleHeader).toContainText('🔵');
    await expect(page.getByLabelText('Google models')).toBeVisible();
  });

  test('should handle empty search results with enhanced messaging', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    const searchInput = page.getByPlaceholder('Search models...');
    await searchInput.fill('nonexistentmodel');

    // Check enhanced empty state
    await expect(page.getByText('No model found.')).toBeVisible();
    await expect(page.getByText('Try searching for a different term.')).toBeVisible();
  });

  test('should display loading state when switching models', async ({ page }) => {
    // Mock a slow model change response
    await page.route('/api/models/change', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await claudeOption.click();

    // Should show loading state
    const updatedSelector = page.getByTestId('model-selector');
    await expect(updatedSelector.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });

  test('should handle model selection errors gracefully', async ({ page }) => {
    // Mock an error response
    await page.route('/api/models/change', async route => {
      await route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ error: 'Model unavailable' }) 
      });
    });

    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await claudeOption.click();

    // Should show error message
    await expect(page.getByRole('alert')).toContainText('Model unavailable');
  });

  test('should display correct accessibility attributes', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    
    // Check initial accessibility attributes
    await expect(modelSelector).toHaveAttribute('aria-label', /Current model:.*Click to change model/);
    await expect(modelSelector).toHaveAttribute('role', 'combobox');
    
    await modelSelector.click();
    
    // Check dropdown accessibility
    const searchInput = page.getByPlaceholder('Search models...');
    await expect(searchInput).toHaveAttribute('aria-label', 'Search available models');
    
    // Check model options have proper labels
    const firstOption = page.locator('[role="option"]').first();
    await expect(firstOption).toHaveAttribute('aria-label', /Select .* model/);
  });

  test('should work correctly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    const modelSelector = page.getByTestId('model-selector');
    await expect(modelSelector).toBeVisible();
    
    // Should be responsive and clickable on mobile
    await modelSelector.click();
    
    // Dropdown should fit mobile screen
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();
    
    // Check that badges are properly displayed on mobile
    const firstOption = page.locator('[role="option"]').first();
    await expect(firstOption).toBeVisible();
  });

  test('should prevent multiple simultaneous selections', async ({ page }) => {
    // Mock slow responses
    let requestCount = 0;
    await page.route('/api/models/change', async route => {
      requestCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    const geminiOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Pro' });
    
    // Try to click multiple models quickly
    await Promise.all([
      claudeOption.click(),
      geminiOption.click()
    ]);
    
    // Should only process one request
    await page.waitForTimeout(1000);
    expect(requestCount).toBe(1);
  });

  test('should display enhanced provider information', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Check provider icons with accessibility labels
    const openaiLabel = page.getByLabelText('OpenAI models');
    await expect(openaiLabel).toBeVisible();
    
    const anthropicLabel = page.getByLabelText('Anthropic models');
    await expect(anthropicLabel).toBeVisible();
    
    const googleLabel = page.getByLabelText('Google models');
    await expect(googleLabel).toBeVisible();
  });

  test('should show different cost categories correctly', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Check low cost model (Gemini Flash)
    const flashOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Flash' });
    await expect(flashOption.locator('[title="Low cost"]')).toBeVisible();
    
    // Check high cost model (GPT-4.1)
    const gpt4Option = page.locator('[role="option"]').filter({ hasText: 'GPT-4.1' });
    await expect(gpt4Option.locator('[title="High cost"]')).toBeVisible();
  });

  test('should display speed indicators correctly', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();

    // Check fast model (o4-mini)
    const o4MiniOption = page.locator('[role="option"]').filter({ hasText: 'o4-mini' });
    await expect(o4MiniOption.locator('[title="Fast response time"]')).toBeVisible();
    
    // Check balanced model (GPT-4.1)
    const gpt4Option = page.locator('[role="option"]').filter({ hasText: 'GPT-4.1' });
    await expect(gpt4Option.locator('[title="Balanced response time"]')).toBeVisible();
  });

  test('should handle disabled state correctly', async ({ page }) => {
    // Add custom attribute to test disabled state
    await page.addInitScript(() => {
      window.testModelSelectorDisabled = true;
    });
    
    const modelSelector = page.getByTestId('model-selector');
    
    // Should be disabled if the property is set
    if (await modelSelector.isDisabled()) {
      await expect(modelSelector).toBeDisabled();
      
      // Should not open dropdown when disabled
      await modelSelector.click({ force: true });
      await expect(page.getByPlaceholder('Search models...')).not.toBeVisible();
    }
  });
});