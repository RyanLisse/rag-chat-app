import { test, expect } from '@playwright/test';
import { getTestURL } from '../helpers/test-config';

test.describe('RAG Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com' } }),
      });
    });

    // Mock successful file upload and processing
    await page.route('/api/files/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: [
            { id: 'file-ml', filename: 'machine-learning.txt', status: 'completed' },
            { id: 'file-ai', filename: 'ai-overview.pdf', status: 'completed' }
          ],
          vectorStoreId: 'vs-test-123',
          message: 'Files processed successfully'
        })
      });
    });

    await page.goto('/');
  });

  test('should search through uploaded documents and display results', async ({ page }) => {
    test.setTimeout(30000);

    // Mock chat API to return search results with citations
    await page.route('/api/chat', async (route) => {
      const request = await route.request().postDataJSON();
      
      if (request.messages && request.messages.length > 0) {
        const userMessage = request.messages[request.messages.length - 1];
        
        if (userMessage.content.toLowerCase().includes('machine learning')) {
          await route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: `data: {"type":"text","text":"Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed【1】. It involves algorithms that can identify patterns in data and make predictions or classifications based on those patterns【2】."}\n\ndata: {"type":"citations","citations":[{"id":"1","filename":"machine-learning.txt","content":"Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed."},{"id":"2","filename":"ai-overview.pdf","content":"Machine learning algorithms can identify patterns in data and make predictions or classifications based on those patterns."}]}\n\ndata: {"type":"finish"}\n\n`
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: `data: {"type":"text","text":"I don't have specific information about that topic in the uploaded documents."}\n\ndata: {"type":"finish"}\n\n`
          });
        }
      }
    });

    // Wait for chat interface to load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 10000 });

    // Upload test documents first
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles([
        {
          name: 'machine-learning.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.')
        },
        {
          name: 'ai-overview.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('AI overview content about machine learning algorithms and patterns.')
        }
      ]);

      // Wait for upload completion
      await expect(page.locator('text=Files processed successfully').or(
        page.locator('text=completed')
      )).toBeVisible({ timeout: 10000 });
    }

    // Find chat input and send query
    const chatInput = page.locator('textarea').or(
      page.locator('input[type="text"]')
    ).or(
      page.locator('[placeholder*="message"]')
    ).first();

    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('What is machine learning?');
    
    // Send the message
    const sendButton = page.locator('button').filter({ hasText: /send|submit/i }).or(
      page.getByRole('button', { name: /send/i })
    ).first();

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Wait for response with citations
    await expect(page.locator('text=Machine learning is a subset of artificial intelligence')).toBeVisible({ 
      timeout: 15000 
    });

    // Verify citations are displayed
    await expect(page.locator('[data-testid="citation"]').or(
      page.locator('text=【1】').or(page.locator('text=[1]'))
    )).toBeVisible();

    // Verify citation details
    const citationButton = page.locator('[data-testid="citation"]').or(
      page.locator('text=【1】').or(page.locator('text=[1]'))
    ).first();

    if (await citationButton.isVisible()) {
      await citationButton.click();
      
      // Verify citation popup or details
      await expect(page.locator('text=machine-learning.txt').or(
        page.locator('text=Source:')
      )).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle search queries with no relevant documents', async ({ page }) => {
    // Mock chat API to return no results
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: `data: {"type":"text","text":"I don't have any relevant information about quantum computing in the uploaded documents."}\n\ndata: {"type":"finish"}\n\n`
      });
    });

    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Send query about topic not in documents
    const chatInput = page.locator('textarea').or(
      page.locator('input[type="text"]')
    ).first();

    await chatInput.fill('Tell me about quantum computing');
    await chatInput.press('Enter');

    // Verify appropriate response
    await expect(page.locator('text=I don\'t have any relevant information')).toBeVisible({
      timeout: 10000
    });
  });

  test('should display multiple citations correctly', async ({ page }) => {
    // Mock chat API with multiple citations
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: `data: {"type":"text","text":"Artificial intelligence encompasses multiple approaches including machine learning【1】, deep learning【2】, and natural language processing【3】."}\n\ndata: {"type":"citations","citations":[{"id":"1","filename":"ai-basics.txt","content":"Machine learning is a core component of AI"},{"id":"2","filename":"deep-learning.pdf","content":"Deep learning uses neural networks with multiple layers"},{"id":"3","filename":"nlp-guide.md","content":"Natural language processing enables AI to understand human language"}]}\n\ndata: {"type":"finish"}\n\n`
      });
    });

    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    const chatInput = page.locator('textarea').first();
    await chatInput.fill('What are the main approaches in AI?');
    await chatInput.press('Enter');

    // Wait for response
    await expect(page.locator('text=Artificial intelligence encompasses')).toBeVisible({
      timeout: 10000
    });

    // Verify multiple citations
    await expect(page.locator('text=【1】').or(page.locator('text=[1]'))).toBeVisible();
    await expect(page.locator('text=【2】').or(page.locator('text=[2]'))).toBeVisible();
    await expect(page.locator('text=【3】').or(page.locator('text=[3]'))).toBeVisible();

    // Test citation interaction
    const firstCitation = page.locator('text=【1】').or(page.locator('text=[1]')).first();
    if (await firstCitation.isVisible()) {
      await firstCitation.click();
      
      // Verify citation details popup
      await expect(page.locator('text=ai-basics.txt').or(
        page.locator('text=Machine learning is a core component')
      )).toBeVisible({ timeout: 3000 });
    }
  });

  test('should handle search during file processing', async ({ page }) => {
    // Mock file upload as still processing
    await page.route('/api/files/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'in_progress',
          completedCount: 0,
          inProgressCount: 1,
          failedCount: 0
        })
      });
    });

    // Mock chat API to indicate processing
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: `data: {"type":"text","text":"I'm still processing the uploaded documents. Please wait a moment and try again."}\n\ndata: {"type":"finish"}\n\n`
      });
    });

    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // Try to search while processing
    const chatInput = page.locator('textarea').first();
    await chatInput.fill('What is in the documents?');
    await chatInput.press('Enter');

    // Verify processing message
    await expect(page.locator('text=still processing').or(
      page.locator('text=Please wait')
    )).toBeVisible({ timeout: 10000 });
  });

  test('should maintain search context across multiple queries', async ({ page }) => {
    let queryCount = 0;

    await page.route('/api/chat', async (route) => {
      const request = await route.request().postDataJSON();
      queryCount++;

      if (queryCount === 1) {
        // First query about ML
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: `data: {"type":"text","text":"Machine learning uses algorithms to learn from data【1】."}\n\ndata: {"type":"citations","citations":[{"id":"1","filename":"ml-guide.txt","content":"Machine learning algorithms learn from data patterns"}]}\n\ndata: {"type":"finish"}\n\n`
        });
      } else {
        // Follow-up query
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: `data: {"type":"text","text":"Yes, those algorithms include supervised learning, unsupervised learning, and reinforcement learning【1】."}\n\ndata: {"type":"citations","citations":[{"id":"1","filename":"ml-types.txt","content":"The main types of machine learning include supervised, unsupervised, and reinforcement learning"}]}\n\ndata: {"type":"finish"}\n\n`
        });
      }
    });

    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    // First query
    const chatInput = page.locator('textarea').first();
    await chatInput.fill('How does machine learning work?');
    await chatInput.press('Enter');

    await expect(page.locator('text=Machine learning uses algorithms')).toBeVisible({
      timeout: 10000
    });

    // Follow-up query
    await chatInput.fill('What types of algorithms are there?');
    await chatInput.press('Enter');

    await expect(page.locator('text=supervised learning, unsupervised learning')).toBeVisible({
      timeout: 10000
    });

    // Verify both messages are in chat history
    expect(await page.locator('.message').count()).toBeGreaterThan(2);
  });

  test('should handle large search responses gracefully', async ({ page }) => {
    // Mock API with large response
    await page.route('/api/chat', async (route) => {
      const largeText = 'This is a very detailed explanation about artificial intelligence. '.repeat(100);
      
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: `data: {"type":"text","text":"${largeText}【1】"}\n\ndata: {"type":"citations","citations":[{"id":"1","filename":"ai-detailed.txt","content":"Comprehensive AI guide"}]}\n\ndata: {"type":"finish"}\n\n`
      });
    });

    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    const chatInput = page.locator('textarea').first();
    await chatInput.fill('Give me a detailed explanation of AI');
    await chatInput.press('Enter');

    // Verify response loads without breaking UI
    await expect(page.locator('text=This is a very detailed explanation')).toBeVisible({
      timeout: 15000
    });

    // Verify page is still responsive
    await expect(chatInput).toBeEnabled();
  });

  test('should handle search API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Search service temporarily unavailable' })
      });
    });

    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    const chatInput = page.locator('textarea').first();
    await chatInput.fill('Test query that will fail');
    await chatInput.press('Enter');

    // Verify error handling
    await expect(page.locator('text=temporarily unavailable').or(
      page.locator('text=error').or(
        page.locator('text=something went wrong')
      )
    )).toBeVisible({ timeout: 10000 });

    // Verify input is still functional after error
    await expect(chatInput).toBeEnabled();
  });
});