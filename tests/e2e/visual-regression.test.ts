// Visual Regression E2E Tests
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { getTestURL } from '../helpers/test-config';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');
    
    // Disable animations for consistent screenshots
    await stagehandPage.addStyleTag({
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

  test('homepage initial state', async ({ stagehandPage }) => {
    // Wait for all content to load
    await stagehandPage.waitForLoadState('networkidle');
    await stagehandPage.waitForTimeout(1000); // Additional wait for any async rendering

    // Take full page screenshot
    await expect(stagehandPage).toHaveScreenshot('homepage-initial.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Take screenshot of key components
    const chatInterface = stagehandPage.locator('[data-testid="chat-interface"], .chat-container, main');
    if (await chatInterface.count() > 0) {
      await expect(chatInterface).toHaveScreenshot('chat-interface-empty.png');
    }

    const uploadArea = stagehandPage.locator('[data-testid="upload-area"], .upload-zone, .file-upload');
    if (await uploadArea.count() > 0) {
      await expect(uploadArea).toHaveScreenshot('upload-area-initial.png');
    }

    const modelSelector = stagehandPage.locator('[data-testid="model-selector"], .model-select, select');
    if (await modelSelector.count() > 0) {
      await expect(modelSelector).toHaveScreenshot('model-selector-initial.png');
    }
  });

  test('file upload states', async ({ stagehandPage }) => {
    // Take screenshot before upload
    await expect(stagehandPage).toHaveScreenshot('before-upload.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Simulate file upload process
    await stagehandPage.act('Start uploading a test document');
    
    // Capture upload in progress state (if visible)
    await stagehandPage.waitForTimeout(500);
    const uploadProgress = stagehandPage.locator('[data-testid="upload-progress"], .upload-progress, .progress-bar');
    if (await uploadProgress.count() > 0 && await uploadProgress.isVisible()) {
      await expect(uploadProgress).toHaveScreenshot('upload-progress.png');
    }

    // Wait for upload completion
    await stagehandPage.observe('Wait for upload to complete');
    await stagehandPage.waitForTimeout(1000);

    // Take screenshot after successful upload
    await expect(stagehandPage).toHaveScreenshot('after-upload-success.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Screenshot of file list/uploaded documents area
    const fileList = stagehandPage.locator('[data-testid="file-list"], .uploaded-files, .document-list');
    if (await fileList.count() > 0) {
      await expect(fileList).toHaveScreenshot('uploaded-files-list.png');
    }
  });

  test('chat conversation states', async ({ stagehandPage }) => {
    // Upload a document first
    await stagehandPage.act('Upload a test document');
    await stagehandPage.observe('Wait for processing');

    // Send first message
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'What is artificial intelligence?',
      { waitForResponse: false }
    );

    // Capture typing indicator or loading state
    await stagehandPage.waitForTimeout(500);
    const typingIndicator = stagehandPage.locator('[data-testid="typing-indicator"], .typing, .loading');
    if (await typingIndicator.count() > 0 && await typingIndicator.isVisible()) {
      await expect(typingIndicator).toHaveScreenshot('typing-indicator.png');
    }

    // Wait for response and capture
    await stagehandPage.observe('Wait for response to complete');
    await stagehandPage.waitForTimeout(1000);

    await expect(stagehandPage).toHaveScreenshot('single-message-conversation.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Send follow-up message
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Can you elaborate on machine learning specifically?',
      { waitForResponse: true }
    );

    await expect(stagehandPage).toHaveScreenshot('multi-message-conversation.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Screenshot individual message bubbles
    const userMessages = stagehandPage.locator('[data-testid="user-message"], .user-message, .message.user');
    const assistantMessages = stagehandPage.locator('[data-testid="assistant-message"], .assistant-message, .message.assistant');

    if (await userMessages.count() > 0) {
      await expect(userMessages.first()).toHaveScreenshot('user-message-bubble.png');
    }

    if (await assistantMessages.count() > 0) {
      await expect(assistantMessages.first()).toHaveScreenshot('assistant-message-bubble.png');
    }
  });

  test('citation display variations', async ({ stagehandPage }) => {
    // Upload document and generate response with citations
    await stagehandPage.act('Upload a document that will generate citations');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Summarize the key points from the uploaded document with specific references',
      { waitForResponse: true }
    );

    // Screenshot response with citations
    const responseWithCitations = stagehandPage.locator('[data-testid="message-with-citations"], .message:has(.citation)');
    if (await responseWithCitations.count() > 0) {
      await expect(responseWithCitations.first()).toHaveScreenshot('message-with-citations.png');
    }

    // Screenshot citation sidebar or panel
    const citationPanel = stagehandPage.locator('[data-testid="citation-panel"], .citation-sidebar, .citations');
    if (await citationPanel.count() > 0) {
      await expect(citationPanel).toHaveScreenshot('citation-panel.png');
    }

    // Screenshot individual citation elements
    const citations = stagehandPage.locator('[data-testid="citation"], .citation, .cite');
    if (await citations.count() > 0) {
      await expect(citations.first()).toHaveScreenshot('individual-citation.png');
    }

    // Test citation hover/focus states
    if (await citations.count() > 0) {
      await citations.first().hover();
      await stagehandPage.waitForTimeout(500);
      
      const citationTooltip = stagehandPage.locator('[data-testid="citation-tooltip"], .tooltip, .popover');
      if (await citationTooltip.count() > 0 && await citationTooltip.isVisible()) {
        await expect(citationTooltip).toHaveScreenshot('citation-tooltip.png');
      }
    }
  });

  test('model selector states', async ({ stagehandPage }) => {
    const modelSelector = stagehandPage.locator('[data-testid="model-selector"], .model-select, select');
    
    if (await modelSelector.count() > 0) {
      // Default state
      await expect(modelSelector).toHaveScreenshot('model-selector-closed.png');

      // Open dropdown
      await modelSelector.click();
      await stagehandPage.waitForTimeout(300);

      const modelDropdown = stagehandPage.locator('[data-testid="model-dropdown"], .select-options, .dropdown-menu');
      if (await modelDropdown.count() > 0 && await modelDropdown.isVisible()) {
        await expect(modelDropdown).toHaveScreenshot('model-selector-opened.png');
      }

      // Hover over an option
      const modelOptions = stagehandPage.locator('[data-testid="model-option"], .select-option, option');
      if (await modelOptions.count() > 0) {
        await modelOptions.first().hover();
        await stagehandPage.waitForTimeout(200);
        await expect(modelDropdown).toHaveScreenshot('model-option-hovered.png');
      }

      // Select a model
      if (await modelOptions.count() > 1) {
        await modelOptions.nth(1).click();
        await stagehandPage.waitForTimeout(300);
        await expect(modelSelector).toHaveScreenshot('model-selector-changed.png');
      }
    }
  });

  test('error states visual consistency', async ({ stagehandPage }) => {
    // Test file upload error
    await stagehandPage.act('Try to upload an invalid file type');
    await stagehandPage.waitForTimeout(1000);

    const uploadError = stagehandPage.locator('[data-testid="upload-error"], .error, .alert-error');
    if (await uploadError.count() > 0 && await uploadError.isVisible()) {
      await expect(uploadError).toHaveScreenshot('upload-error-message.png');
    }

    // Test network error (simulate offline)
    await stagehandPage.context().setOffline(true);
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'This should trigger a network error',
      { waitForResponse: false }
    );
    await stagehandPage.waitForTimeout(2000);

    const networkError = stagehandPage.locator('[data-testid="network-error"], .connection-error, .offline');
    if (await networkError.count() > 0 && await networkError.isVisible()) {
      await expect(networkError).toHaveScreenshot('network-error-state.png');
    }

    // Restore network
    await stagehandPage.context().setOffline(false);
    await stagehandPage.waitForTimeout(1000);

    // Test form validation error
    await stagehandPage.fill('input[type="text"], textarea', '');
    await stagehandPage.keyboard.press('Enter');
    await stagehandPage.waitForTimeout(500);

    const validationError = stagehandPage.locator('[data-testid="validation-error"], .field-error, .input-error');
    if (await validationError.count() > 0 && await validationError.isVisible()) {
      await expect(validationError).toHaveScreenshot('validation-error.png');
    }
  });

  test('responsive design breakpoints', async ({ stagehandPage }) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1024, height: 768 },
      { name: 'large-desktop', width: 1440, height: 900 }
    ];

    // Upload a document and create some conversation for consistent testing
    await stagehandPage.act('Upload a test document');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Generate a response for responsive testing',
      { waitForResponse: true }
    );

    for (const breakpoint of breakpoints) {
      await stagehandPage.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      await stagehandPage.waitForTimeout(500); // Allow for reflow

      await expect(stagehandPage).toHaveScreenshot(`responsive-${breakpoint.name}.png`, {
        fullPage: true,
        animations: 'disabled'
      });

      // Test navigation/menu on smaller screens
      if (breakpoint.width < 768) {
        const mobileMenu = stagehandPage.locator('[data-testid="mobile-menu"], .hamburger, .menu-toggle');
        if (await mobileMenu.count() > 0) {
          await expect(mobileMenu).toHaveScreenshot(`mobile-menu-${breakpoint.name}.png`);
        }
      }
    }
  });

  test('dark mode visual consistency', async ({ stagehandPage }) => {
    // Test light mode first (default)
    await expect(stagehandPage).toHaveScreenshot('light-mode-homepage.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Switch to dark mode
    const themeToggle = stagehandPage.locator('[data-testid="theme-toggle"], .theme-switcher, .dark-mode-toggle');
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await stagehandPage.waitForTimeout(500);

      await expect(stagehandPage).toHaveScreenshot('dark-mode-homepage.png', {
        fullPage: true,
        animations: 'disabled'
      });

      // Upload and chat in dark mode
      await stagehandPage.act('Upload a document in dark mode');
      await ragHelpers.sendChatMessage(
        stagehandPage,
        'Test dark mode appearance',
        { waitForResponse: true }
      );

      await expect(stagehandPage).toHaveScreenshot('dark-mode-conversation.png', {
        fullPage: true,
        animations: 'disabled'
      });
    } else {
      // If no theme toggle, test system dark mode
      await stagehandPage.emulateMedia({ colorScheme: 'dark' });
      await stagehandPage.reload();
      await stagehandPage.waitForLoadState('networkidle');

      await expect(stagehandPage).toHaveScreenshot('system-dark-mode.png', {
        fullPage: true,
        animations: 'disabled'
      });
    }
  });

  test('loading states and skeletons', async ({ stagehandPage }) => {
    // Capture loading states during various operations
    
    // Page loading skeleton
    await stagehandPage.goto('/', { waitUntil: 'domcontentloaded' });
    const loadingSkeleton = stagehandPage.locator('[data-testid="loading-skeleton"], .skeleton, .loading-placeholder');
    if (await loadingSkeleton.count() > 0 && await loadingSkeleton.isVisible()) {
      await expect(loadingSkeleton).toHaveScreenshot('page-loading-skeleton.png');
    }

    await stagehandPage.waitForLoadState('networkidle');

    // Upload loading state
    await stagehandPage.act('Start uploading a large file');
    await stagehandPage.waitForTimeout(200);

    const uploadLoading = stagehandPage.locator('[data-testid="upload-loading"], .upload-spinner, .uploading');
    if (await uploadLoading.count() > 0 && await uploadLoading.isVisible()) {
      await expect(uploadLoading).toHaveScreenshot('upload-loading-state.png');
    }

    // Wait for upload to complete
    await stagehandPage.observe('Wait for upload completion');

    // Chat loading/typing state
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Generate a response to test loading states',
      { waitForResponse: false }
    );

    await stagehandPage.waitForTimeout(300);
    const chatLoading = stagehandPage.locator('[data-testid="chat-loading"], .response-loading, .thinking');
    if (await chatLoading.count() > 0 && await chatLoading.isVisible()) {
      await expect(chatLoading).toHaveScreenshot('chat-loading-state.png');
    }
  });

  test('focus states and accessibility indicators', async ({ stagehandPage }) => {
    // Test keyboard focus states
    await stagehandPage.keyboard.press('Tab');
    await stagehandPage.waitForTimeout(200);

    const focusedElement = stagehandPage.locator(':focus');
    if (await focusedElement.count() > 0) {
      await expect(focusedElement).toHaveScreenshot('first-focus-state.png');
    }

    // Navigate through key interactive elements
    const interactiveElements = [
      'file upload button',
      'model selector',
      'chat input',
      'send button'
    ];

    for (let i = 0; i < interactiveElements.length; i++) {
      await stagehandPage.keyboard.press('Tab');
      await stagehandPage.waitForTimeout(200);
      
      const currentFocus = stagehandPage.locator(':focus');
      if (await currentFocus.count() > 0) {
        await expect(currentFocus).toHaveScreenshot(`focus-state-${i + 1}.png`);
      }
    }

    // Test focus within modals or dropdowns
    const modalTrigger = stagehandPage.locator('[data-testid="modal-trigger"], .modal-open, button');
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      await stagehandPage.waitForTimeout(300);

      const modal = stagehandPage.locator('[data-testid="modal"], .modal, [role="dialog"]');
      if (await modal.count() > 0 && await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('modal-focus-trap.png');
      }
    }
  });
});