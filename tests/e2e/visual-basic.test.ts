import { test, expect } from '@playwright/test';

test.describe('Basic Visual Regression Tests', () => {
  test('homepage screenshot comparison', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    
    // Wait for UI to stabilize
    await page.waitForTimeout(3000);
    
    // Take screenshot and compare
    await expect(page).toHaveScreenshot('homepage-basic.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.3, // Allow 30% difference for dynamic content
    });
  });

  test('model selector visual test', async ({ page }) => {
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find and click model selector
    await page.locator('[data-testid="model-selector"], button:has-text("GPT")').first().click();
    await page.waitForTimeout(1000);
    
    // Take screenshot of opened selector
    await expect(page).toHaveScreenshot('model-selector-open.png', {
      fullPage: false,
      animations: 'disabled',
      threshold: 0.3,
    });
  });

  test('responsive mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('mobile-layout.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.3,
    });
  });

  test('responsive tablet layout', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('tablet-layout.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.3,
    });
  });
});