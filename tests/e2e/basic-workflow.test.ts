// Basic E2E Test using Standard Playwright
import { test, expect } from '@playwright/test';

test.describe('Basic RAG Chat Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the chat interface', async ({ page }) => {
    // Check if main elements are present
    await expect(page).toHaveTitle('Next.js Chatbot Template');
    
    // Look for chat input with specific placeholder (it's actually a textarea)
    const chatInput = page.locator('textarea[placeholder="Send a message..."], input[placeholder="Send a message..."]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Look for model selector button
    const modelButton = page.locator('button').filter({ hasText: /GPT-4/ });
    await expect(modelButton).toBeVisible();
    
    console.log('✅ Chat interface loaded successfully');
  });

  test('should be able to send a basic message', async ({ page }) => {
    // Find chat input using the specific placeholder (textarea or input)
    const chatInput = page.locator('textarea[placeholder="Send a message..."], input[placeholder="Send a message..."]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill('Hello test message');
    
    // Press Enter to send (most chat interfaces use Enter)
    await chatInput.press('Enter');
    
    // Wait for message to appear in the UI
    await page.waitForTimeout(2000);
    
    // Check if message appears in chat
    await expect(page.locator('body')).toContainText('Hello test message', { timeout: 5000 });
    
    console.log('✅ Basic message sending works');
  });

  test('should have file upload functionality', async ({ page }) => {
    // Look for file input (we saw one in debug output)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 5000 });
    
    console.log('✅ File upload functionality detected');
  });

  test('should have model selector', async ({ page }) => {
    // Look for the model button we saw in debug output
    const modelButton = page.locator('button').filter({ hasText: /GPT-4/ });
    await expect(modelButton).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Model selector detected');
  });

  test('should show navigation elements', async ({ page }) => {
    // Look for "New Chat" button we saw in debug output
    const newChatButton = page.locator('button').filter({ hasText: 'New Chat' });
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
    
    // Also check for the Guest button
    const guestButton = page.locator('button').filter({ hasText: 'Guest' });
    await expect(guestButton).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Navigation elements found');
  });
});