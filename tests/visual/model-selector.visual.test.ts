import { test, expect } from '@playwright/test';
import { getTestURL } from '../helpers/test-config';

test.describe('Model Selector Visual Tests', () => {
  // Configure for visual regression testing
  test.use({ 
    // Reduce animations for consistent screenshots
    reducedMotion: 'reduce'
  });
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="model-selector"]');
    await page.waitForLoadState('networkidle');
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('model selector closed state with different models', async ({ page }) => {
    // Test default state (GPT-4.1)
    const modelSelector = page.getByTestId('model-selector');
    await expect(modelSelector).toHaveScreenshot('model-selector-closed-gpt4.png');
    
    // Change to Claude and test
    await modelSelector.click();
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await claudeOption.click();
    await page.waitForTimeout(500); // Wait for state update
    await expect(modelSelector).toHaveScreenshot('model-selector-closed-claude.png');
    
    // Change to Gemini and test
    await modelSelector.click();
    const geminiOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Pro' });
    await geminiOption.click();
    await page.waitForTimeout(500);
    await expect(modelSelector).toHaveScreenshot('model-selector-closed-gemini.png');
  });

  test('model selector opened state - light theme with enhanced layout', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Wait for dropdown animation
    await page.waitForTimeout(300);
    
    // Take screenshot of opened dropdown with new badges and layout
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-dropdown-light-enhanced.png');
  });

  test('model selector opened state - dark theme with enhanced layout', async ({ page }) => {
    // Switch to dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    await page.waitForLoadState('networkidle');
    
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Wait for dropdown animation
    await page.waitForTimeout(300);
    
    // Take screenshot of opened dropdown in dark theme with new elements
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-dropdown-dark-enhanced.png');
  });

  test('model selector with search results and enhanced metadata', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const searchInput = page.getByPlaceholder('Search models...');
    await searchInput.fill('claude');
    
    // Wait for search results
    await page.waitForTimeout(200);
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-search-results-enhanced.png');
    
    // Test search by provider
    await searchInput.clear();
    await searchInput.fill('google');
    await page.waitForTimeout(200);
    await expect(dropdown).toHaveScreenshot('model-selector-search-google.png');
    
    // Test search by tag
    await searchInput.clear();
    await searchInput.fill('fast');
    await page.waitForTimeout(200);
    await expect(dropdown).toHaveScreenshot('model-selector-search-fast.png');
  });

  test('model selector empty search state with enhanced messaging', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const searchInput = page.getByPlaceholder('Search models...');
    await searchInput.fill('nonexistent');
    
    // Wait for empty state
    await page.waitForTimeout(200);
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-empty-search-enhanced.png');
  });

  test('model selector different selected states with enhanced styling', async ({ page }) => {
    // Test with different models selected
    const models = [
      { id: 'gpt-4.1', name: 'gpt4' },
      { id: 'claude-4', name: 'claude' },
      { id: 'gemini-2.5-pro', name: 'gemini-pro' },
      { id: 'o4-mini', name: 'o4-mini' },
      { id: 'gemini-2.5-flash', name: 'gemini-flash' }
    ];
    
    for (const model of models) {
      // Navigate with model pre-selected
      await page.goto(`/?model=${model.id}`);
      await page.waitForSelector('[data-testid="model-selector"]');
      await page.waitForLoadState('networkidle');
      
      const modelSelector = page.getByTestId('model-selector');
      await expect(modelSelector).toHaveScreenshot(`model-selector-${model.name}-enhanced.png`);
    }
  });

  test('model selector hover and focus states', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Hover over first model option
    const firstOption = page.locator('[role="option"]').first();
    await firstOption.hover();
    
    // Wait for hover animation
    await page.waitForTimeout(200);
    
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-hover-state-enhanced.png');
    
    // Test focused state via keyboard navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await expect(dropdown).toHaveScreenshot('model-selector-focus-state.png');
  });

  test('model selector responsive views with enhanced layout', async ({ page }) => {
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    await page.waitForLoadState('networkidle');
    
    const modelSelector = page.getByTestId('model-selector');
    
    // Closed state on mobile
    await expect(modelSelector).toHaveScreenshot('model-selector-mobile-closed-enhanced.png');
    
    // Open dropdown
    await modelSelector.click();
    await page.waitForTimeout(300);
    
    // Opened state on mobile with enhanced badges
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-mobile-dropdown-enhanced.png');
    
    // Small tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('model-selector').click();
    await page.waitForTimeout(300);
    
    const tabletDropdown = page.locator('[role="listbox"]');
    await expect(tabletDropdown).toHaveScreenshot('model-selector-tablet-dropdown-enhanced.png');
  });

  test('model selector with enhanced badges and metadata', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Focus on a model with many capabilities (like Gemini Pro)
    const geminiOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Pro' });
    await geminiOption.scrollIntoViewIfNeeded();
    await expect(geminiOption).toHaveScreenshot('model-option-with-capabilities-enhanced.png');
    
    // Test different model types with various badges
    const gpt4Option = page.locator('[role="option"]').filter({ hasText: 'GPT-4.1' });
    await gpt4Option.scrollIntoViewIfNeeded();
    await expect(gpt4Option).toHaveScreenshot('model-option-gpt4-badges.png');
    
    const o4MiniOption = page.locator('[role="option"]').filter({ hasText: 'o4-mini' });
    await o4MiniOption.scrollIntoViewIfNeeded();
    await expect(o4MiniOption).toHaveScreenshot('model-option-o4mini-fast.png');
    
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await claudeOption.scrollIntoViewIfNeeded();
    await expect(claudeOption).toHaveScreenshot('model-option-claude-context.png');
  });

  test('model selector enhanced pricing and speed display', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Get all model options
    const options = page.locator('[role="option"]');
    const count = await options.count();
    
    // Take screenshot showing enhanced pricing and speed for all models
    const dropdown = page.locator('[role="listbox"]');
    
    // Scroll to show all options
    for (let i = 0; i < count; i++) {
      await options.nth(i).scrollIntoViewIfNeeded();
    }
    
    await expect(dropdown).toHaveScreenshot('model-selector-pricing-speed-enhanced.png');
  });

  test('model selector provider groups with enhanced accessibility', async ({ page }) => {
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    // Focus on provider group headers with enhanced styling
    const openaiGroup = page.locator('text=OPENAI').locator('..');
    const anthropicGroup = page.locator('text=ANTHROPIC').locator('..');
    const googleGroup = page.locator('text=GOOGLE').locator('..');
    
    // Take screenshots of each group with enhanced design
    await expect(openaiGroup).toHaveScreenshot('model-selector-openai-group-enhanced.png');
    await expect(anthropicGroup).toHaveScreenshot('model-selector-anthropic-group-enhanced.png');
    await expect(googleGroup).toHaveScreenshot('model-selector-google-group-enhanced.png');
    
    // Test complete provider section view
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toHaveScreenshot('model-selector-all-groups-enhanced.png');
  });

  test('model selector loading and error states', async ({ page }) => {
    // Test loading state
    await page.route('/api/models/change', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });
    
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const claudeOption = page.locator('[role="option"]').filter({ hasText: 'Claude 4' });
    await claudeOption.click();
    
    // Screenshot of loading state
    await expect(modelSelector).toHaveScreenshot('model-selector-loading-state.png');
    
    await page.waitForTimeout(2500); // Wait for loading to complete
    
    // Test error state
    await page.route('/api/models/change', async route => {
      await route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ error: 'Model temporarily unavailable' }) 
      });
    });
    
    await modelSelector.click();
    const geminiOption = page.locator('[role="option"]').filter({ hasText: 'Gemini 2.5 Pro' });
    await geminiOption.click();
    
    // Wait for error to appear
    await page.waitForTimeout(1000);
    
    // Screenshot of error state
    const errorContainer = page.locator('[role="alert"]');
    await expect(errorContainer).toHaveScreenshot('model-selector-error-state.png');
  });
  
  test('model selector disabled state', async ({ page }) => {
    // Inject script to simulate disabled state
    await page.addInitScript(() => {
      window.testDisabledModelSelector = true;
    });
    
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    
    const modelSelector = page.getByTestId('model-selector');
    
    // Mock disabled state visually
    await page.evaluate(() => {
      const selector = document.querySelector('[data-testid="model-selector"]');
      if (selector) {
        selector.setAttribute('disabled', 'true');
        selector.style.opacity = '0.5';
        selector.style.cursor = 'not-allowed';
      }
    });
    
    await expect(modelSelector).toHaveScreenshot('model-selector-disabled-state.png');
  });
  
  test('model selector with different user types', async ({ page }) => {
    // Test guest user view (limited models)
    await page.context().clearCookies();
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    
    const guestDropdown = page.locator('[role="listbox"]');
    await expect(guestDropdown).toHaveScreenshot('model-selector-guest-view.png');
    
    // Simulate regular user login
    await page.keyboard.press('Escape');
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
    
    await page.getByTestId('model-selector').click();
    const regularDropdown = page.locator('[role="listbox"]');
    await expect(regularDropdown).toHaveScreenshot('model-selector-regular-user-view.png');
  });
  
  test('model selector theme variations', async ({ page }) => {
    // Light theme
    const modelSelector = page.getByTestId('model-selector');
    await modelSelector.click();
    const lightDropdown = page.locator('[role="listbox"]');
    await expect(lightDropdown).toHaveScreenshot('model-selector-light-theme-full.png');
    
    await page.keyboard.press('Escape');
    
    // Dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('model-selector').click();
    const darkDropdown = page.locator('[role="listbox"]');
    await expect(darkDropdown).toHaveScreenshot('model-selector-dark-theme-full.png');
    
    // High contrast mode (if supported)
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
    await page.reload();
    await page.waitForSelector('[data-testid="model-selector"]');
    await page.waitForLoadState('networkidle');
    
    await page.getByTestId('model-selector').click();
    const contrastDropdown = page.locator('[role="listbox"]');
    await expect(contrastDropdown).toHaveScreenshot('model-selector-high-contrast.png');
  });
});