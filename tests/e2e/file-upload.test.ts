import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload and Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and ensure user is authenticated
    await page.goto('/');
    
    // Check if login is needed and handle authentication
    const loginButton = page.getByText('Sign in');
    if (await loginButton.isVisible()) {
      // Mock authentication or perform login if test authentication is set up
      await page.route('/api/auth/**', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com' } }),
        });
      });
      await loginButton.click();
    }
  });

  test('should upload and process files successfully', async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for file processing

    // Create test files
    const testFiles = [
      {
        name: 'test-document.txt',
        content: 'This is a test document with important information about artificial intelligence.',
      },
      {
        name: 'sample-data.csv',
        content: 'Name,Age,City\\nJohn Doe,30,New York\\nJane Smith,25,Los Angeles',
      },
    ];

    // Create temporary files
    const tempDir = await page.evaluate(() => {
      const dir = `/tmp/test-${Date.now()}`;
      return dir;
    });

    // Mock file upload endpoint to return success
    await page.route('/api/files/upload', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            files: [
              {
                id: 'file-123',
                filename: 'test-document.txt',
                status: 'processing',
              },
              {
                id: 'file-124',
                filename: 'sample-data.csv',
                status: 'processing',
              },
            ],
            vectorStoreId: 'vs-123',
            batchId: 'batch-123',
            message: 'Successfully uploaded 2 file(s). Processing in vector store...',
          }),
        });
      }
    });

    // Mock status endpoint to show processing completion
    let statusCallCount = 0;
    await page.route('/api/files/status', async (route) => {
      if (route.request().method() === 'POST') {
        statusCallCount++;
        const status = statusCallCount < 3 ? 'in_progress' : 'completed';
        const completedCount = statusCallCount < 3 ? 0 : 2;
        const inProgressCount = statusCallCount < 3 ? 2 : 0;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status,
            completedCount,
            inProgressCount,
            failedCount: 0,
          }),
        });
      }
    });

    // Look for file upload component or navigate to upload page
    const uploadArea = page.locator('[data-testid=\"file-upload\"]').or(
      page.locator('text=Drag and drop files here')
    ).or(
      page.locator('input[type=\"file\"]')
    );

    // If upload component is not visible, check if there's an upload button or link
    if (!(await uploadArea.first().isVisible())) {
      const uploadButton = page.getByText('Upload Files').or(
        page.getByText('Upload Documents')
      ).or(
        page.locator('button:has-text(\"Upload\")')
      );
      
      if (await uploadButton.first().isVisible()) {
        await uploadButton.first().click();
      }
    }

    // Create file content as Buffer for upload
    const fileInput = page.locator('input[type=\"file\"]');
    
    if (await fileInput.isVisible()) {
      // Create test files and upload them
      const files = testFiles.map(file => ({
        name: file.name,
        mimeType: file.name.endsWith('.csv') ? 'text/csv' : 'text/plain',
        buffer: Buffer.from(file.content),
      }));

      await fileInput.setInputFiles(files);

      // Wait for upload to start
      await expect(page.locator('text=uploading').or(page.locator('text=processing'))).toBeVisible({
        timeout: 5000,
      });

      // Wait for processing to complete
      await expect(page.locator('text=completed').or(page.locator('text=Successfully'))).toBeVisible({
        timeout: 30000,
      });

      // Verify files are listed
      await expect(page.locator('text=test-document.txt')).toBeVisible();
      await expect(page.locator('text=sample-data.csv')).toBeVisible();

      // Verify upload success message
      await expect(page.locator('text=Successfully uploaded')).toBeVisible();
    } else {
      // If no file input found, test the drag and drop area
      const dropArea = page.locator('[data-testid=\"file-drop-area\"]').or(
        page.locator('text=Drag and drop files here').locator('..')
      );

      if (await dropArea.isVisible()) {
        // Simulate file drop
        await dropArea.dispatchEvent('dragover');
        await dropArea.dispatchEvent('drop', {
          dataTransfer: {
            files: testFiles.map(file => new File([file.content], file.name)),
          },
        });

        // Wait for upload completion
        await expect(page.locator('text=completed')).toBeVisible({ timeout: 30000 });
      } else {
        throw new Error('File upload interface not found');
      }
    }
  });

  test('should handle file upload errors gracefully', async ({ page }) => {
    // Mock upload endpoint to return error
    await page.route('/api/files/upload', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'File type not supported',
          }),
        });
      }
    });

    const fileInput = page.locator('input[type=\"file\"]');
    
    if (await fileInput.isVisible()) {
      // Try to upload an unsupported file type
      await fileInput.setInputFiles([{
        name: 'test.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('fake executable content'),
      }]);

      // Verify error message is displayed
      await expect(page.locator('text=File type not supported')).toBeVisible();
    }
  });

  test('should show progress during file processing', async ({ page }) => {
    // Mock endpoints to show progress
    await page.route('/api/files/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          files: [{ id: 'file-123', filename: 'test.txt', status: 'processing' }],
          vectorStoreId: 'vs-123',
          batchId: 'batch-123',
        }),
      });
    });

    let progressCalls = 0;
    await page.route('/api/files/status', async (route) => {
      progressCalls++;
      const progress = Math.min(progressCalls * 25, 100);
      const status = progress === 100 ? 'completed' : 'in_progress';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status,
          completedCount: status === 'completed' ? 1 : 0,
          inProgressCount: status === 'completed' ? 0 : 1,
          failedCount: 0,
        }),
      });
    });

    const fileInput = page.locator('input[type=\"file\"]');
    
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles([{
        name: 'progress-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Test content for progress tracking'),
      }]);

      // Verify progress indicators are shown
      await expect(page.locator('[role=\"progressbar\"]').or(
        page.locator('text=processing')
      )).toBeVisible();

      // Wait for completion
      await expect(page.locator('text=completed')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should allow file removal before upload', async ({ page }) => {
    const fileInput = page.locator('input[type=\"file\"]');
    
    if (await fileInput.isVisible()) {
      // Add a file
      await fileInput.setInputFiles([{
        name: 'removable-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This file will be removed'),
      }]);

      // Verify file is listed
      await expect(page.locator('text=removable-test.txt')).toBeVisible();

      // Find and click remove button
      const removeButton = page.locator('button[aria-label=\"Remove file\"]').or(
        page.locator('button:has-text(\"×\")').or(
          page.locator('button:has-text(\"Remove\")')
        )
      );

      if (await removeButton.first().isVisible()) {
        await removeButton.first().click();

        // Verify file is removed
        await expect(page.locator('text=removable-test.txt')).not.toBeVisible();
      }
    }
  });
});