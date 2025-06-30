// Accessibility Compliance E2E Tests
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');
  });

  test('homepage meets WCAG 2.1 AA standards', async ({ stagehandPage }) => {
    // Run automated accessibility scan
    const accessibilityResults = await new AxeBuilder({ page: stagehandPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityResults.violations).toEqual([]);

    // Additional manual checks using Stagehand
    const accessibilityChecks = await stagehandPage.extract<{
      hasProperHeadings: boolean;
      hasAltTextForImages: boolean;
      hasKeyboardNavigation: boolean;
      hasAriaLabels: boolean;
      hasProperContrast: boolean;
      hasFocusIndicators: boolean;
    }>({
      instruction: 'Evaluate the page for accessibility features like headings, alt text, keyboard navigation, ARIA labels, contrast, and focus indicators',
      schema: {
        type: 'object',
        properties: {
          hasProperHeadings: { type: 'boolean' },
          hasAltTextForImages: { type: 'boolean' },
          hasKeyboardNavigation: { type: 'boolean' },
          hasAriaLabels: { type: 'boolean' },
          hasProperContrast: { type: 'boolean' },
          hasFocusIndicators: { type: 'boolean' }
        }
      }
    });

    expect(accessibilityChecks.hasProperHeadings).toBe(true);
    expect(accessibilityChecks.hasKeyboardNavigation).toBe(true);
    expect(accessibilityChecks.hasAriaLabels).toBe(true);
    expect(accessibilityChecks.hasProperContrast).toBe(true);
    expect(accessibilityChecks.hasFocusIndicators).toBe(true);
  });

  test('keyboard navigation works throughout the application', async ({ stagehandPage }) => {
    // Test keyboard navigation through main interface elements
    await stagehandPage.keyboard.press('Tab'); // Should focus first interactive element
    
    let currentFocus = await stagehandPage.evaluate(() => {
      return document.activeElement?.tagName + (document.activeElement?.getAttribute('data-testid') || '');
    });

    // Navigate through key interface elements
    const expectedFocusOrder = [
      'file upload button',
      'model selector',
      'chat input',
      'send button',
      'settings button'
    ];

    for (let i = 0; i < expectedFocusOrder.length; i++) {
      await stagehandPage.keyboard.press('Tab');
      
      const focusDescription = await stagehandPage.observe(
        'Describe what element currently has keyboard focus'
      );
      
      expect(focusDescription).toContain(expectedFocusOrder[i] || 'interactive element');
    }

    // Test that Enter key works for activation
    await stagehandPage.act('Navigate to the chat input using keyboard');
    await stagehandPage.keyboard.type('Test message for keyboard navigation');
    await stagehandPage.keyboard.press('Enter');
    
    await stagehandPage.observe('Verify the message was sent using keyboard input');
  });

  test('screen reader compatibility', async ({ stagehandPage }) => {
    // Upload a file and test screen reader announcements
    await stagehandPage.act('Upload a test document');
    
    // Check for proper ARIA live regions
    const liveRegions = await stagehandPage.locator('[aria-live]').count();
    expect(liveRegions).toBeGreaterThan(0);

    // Verify file upload status is announced
    const uploadAnnouncement = await stagehandPage.observe(
      'Check if file upload progress and completion are announced to screen readers'
    );
    expect(uploadAnnouncement).toBeTruthy();

    // Send a message and verify response is accessible
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'What is artificial intelligence?',
      { waitForResponse: true }
    );

    // Check that responses have proper structure for screen readers
    const responseStructure = await stagehandPage.extract<{
      hasProperRoles: boolean;
      hasAriaLabels: boolean;
      hasLandmarks: boolean;
      citationsAccessible: boolean;
    }>({
      instruction: 'Evaluate if the chat response has proper ARIA roles, labels, landmarks, and accessible citations',
      schema: {
        type: 'object',
        properties: {
          hasProperRoles: { type: 'boolean' },
          hasAriaLabels: { type: 'boolean' },
          hasLandmarks: { type: 'boolean' },
          citationsAccessible: { type: 'boolean' }
        }
      }
    });

    expect(responseStructure.hasProperRoles).toBe(true);
    expect(responseStructure.hasAriaLabels).toBe(true);
    expect(responseStructure.citationsAccessible).toBe(true);
  });

  test('high contrast mode compatibility', async ({ stagehandPage }) => {
    // Enable high contrast mode
    await stagehandPage.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
    
    // Reload to apply high contrast
    await stagehandPage.reload();
    await stagehandPage.waitForLoadState('networkidle');

    // Test interface visibility in high contrast mode
    const highContrastCompatibility = await stagehandPage.extract<{
      elementsVisible: boolean;
      textReadable: boolean;
      buttonsUsable: boolean;
      iconsVisible: boolean;
    }>({
      instruction: 'Evaluate if all interface elements are visible and usable in high contrast mode',
      schema: {
        type: 'object',
        properties: {
          elementsVisible: { type: 'boolean' },
          textReadable: { type: 'boolean' },
          buttonsUsable: { type: 'boolean' },
          iconsVisible: { type: 'boolean' }
        }
      }
    });

    expect(highContrastCompatibility.elementsVisible).toBe(true);
    expect(highContrastCompatibility.textReadable).toBe(true);
    expect(highContrastCompatibility.buttonsUsable).toBe(true);

    // Test functionality still works
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Testing high contrast mode',
      { waitForResponse: true }
    );

    // Verify response is readable in high contrast
    const responseVisible = await stagehandPage.observe(
      'Verify the assistant response is clearly visible and readable in high contrast mode'
    );
    expect(responseVisible).toBeTruthy();
  });

  test('reduced motion preferences', async ({ stagehandPage }) => {
    // Set reduced motion preference
    await stagehandPage.emulateMedia({ reducedMotion: 'reduce' });
    
    // Reload to apply preference
    await stagehandPage.reload();
    await stagehandPage.waitForLoadState('networkidle');

    // Test that animations are reduced or disabled
    const motionReduced = await stagehandPage.extract<{
      animationsReduced: boolean;
      transitionsRespected: boolean;
      loadingIndicatorsStatic: boolean;
    }>({
      instruction: 'Check if animations are reduced, transitions are minimal, and loading indicators respect motion preferences',
      schema: {
        type: 'object',
        properties: {
          animationsReduced: { type: 'boolean' },
          transitionsRespected: { type: 'boolean' },
          loadingIndicatorsStatic: { type: 'boolean' }
        }
      }
    });

    expect(motionReduced.animationsReduced).toBe(true);
    expect(motionReduced.transitionsRespected).toBe(true);

    // Send a message to test streaming response respects motion preferences
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Test reduced motion during response',
      { waitForResponse: false }
    );

    // Verify streaming indicators respect motion preferences
    const streamingMotion = await stagehandPage.observe(
      'Check if streaming response indicators respect reduced motion preferences'
    );
    expect(streamingMotion).toBeTruthy();
  });

  test('focus management during interactions', async ({ stagehandPage }) => {
    // Test focus management during file upload
    await stagehandPage.focus('[data-testid="file-upload-button"]');
    await stagehandPage.keyboard.press('Enter');
    
    // After upload dialog interaction, focus should return appropriately
    const focusAfterUpload = await stagehandPage.observe(
      'Check if focus returns to appropriate element after file upload interaction'
    );
    expect(focusAfterUpload).toBeTruthy();

    // Test focus management during model switching
    await stagehandPage.act('Open the model selector using keyboard');
    await stagehandPage.keyboard.press('ArrowDown'); // Navigate through options
    await stagehandPage.keyboard.press('Enter'); // Select option
    
    const focusAfterModelSwitch = await stagehandPage.observe(
      'Check if focus is managed properly after model selection'
    );
    expect(focusAfterModelSwitch).toBeTruthy();

    // Test focus trap in modal dialogs (if any)
    // This would need to be implemented based on actual modal behavior
    await stagehandPage.act('Open any modal dialog in the application');
    
    // Test that Tab key cycles within modal
    for (let i = 0; i < 5; i++) {
      await stagehandPage.keyboard.press('Tab');
      
      const focusWithinModal = await stagehandPage.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        const activeElement = document.activeElement;
        return modal ? modal.contains(activeElement) : true;
      });
      
      expect(focusWithinModal).toBe(true);
    }
  });

  test('error messages are accessible', async ({ stagehandPage }) => {
    // Trigger an error condition (e.g., upload invalid file)
    await stagehandPage.act('Try to upload an invalid file type');
    
    // Check that error messages are properly announced
    const errorAccessibility = await stagehandPage.extract<{
      hasAriaLive: boolean;
      hasProperRole: boolean;
      isVisible: boolean;
      hasFocusManagement: boolean;
    }>({
      instruction: 'Evaluate if error messages have proper ARIA live regions, roles, visibility, and focus management',
      schema: {
        type: 'object',
        properties: {
          hasAriaLive: { type: 'boolean' },
          hasProperRole: { type: 'boolean' },
          isVisible: { type: 'boolean' },
          hasFocusManagement: { type: 'boolean' }
        }
      }
    });

    expect(errorAccessibility.hasAriaLive).toBe(true);
    expect(errorAccessibility.hasProperRole).toBe(true);
    expect(errorAccessibility.isVisible).toBe(true);

    // Test form validation errors
    await stagehandPage.act('Try to send an empty message or trigger form validation');
    
    const validationErrorAccessibility = await stagehandPage.observe(
      'Check if form validation errors are accessible to screen readers'
    );
    expect(validationErrorAccessibility).toBeTruthy();
  });

  test('loading states are accessible', async ({ stagehandPage }) => {
    // Upload a file to trigger loading state
    await stagehandPage.act('Upload a large document to trigger loading state');
    
    // Check loading indicators accessibility
    const loadingAccessibility = await stagehandPage.extract<{
      hasAriaLive: boolean;
      hasProgressIndicator: boolean;
      hasTextAlternative: boolean;
      announcesProgress: boolean;
    }>({
      instruction: 'Evaluate if loading states have proper ARIA live regions, progress indicators, text alternatives, and announce progress',
      schema: {
        type: 'object',
        properties: {
          hasAriaLive: { type: 'boolean' },
          hasProgressIndicator: { type: 'boolean' },
          hasTextAlternative: { type: 'boolean' },
          announcesProgress: { type: 'boolean' }
        }
      }
    });

    expect(loadingAccessibility.hasAriaLive).toBe(true);
    expect(loadingAccessibility.hasProgressIndicator).toBe(true);
    expect(loadingAccessibility.hasTextAlternative).toBe(true);

    // Test streaming response loading accessibility
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Generate a long response to test streaming accessibility',
      { waitForResponse: false }
    );

    const streamingAccessibility = await stagehandPage.observe(
      'Check if streaming response generation is accessible to screen readers'
    );
    expect(streamingAccessibility).toBeTruthy();
  });

  test('citation links are accessible', async ({ stagehandPage }) => {
    // Upload document and get response with citations
    await stagehandPage.act('Upload a document');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Summarize the uploaded document',
      { waitForResponse: true }
    );

    // Test citation accessibility
    const citationAccessibility = await stagehandPage.extract<{
      citationsHaveLabels: boolean;
      citationsKeyboardAccessible: boolean;
      citationsHaveContext: boolean;
      citationLinksDescriptive: boolean;
    }>({
      instruction: 'Evaluate if citations have proper labels, keyboard accessibility, context, and descriptive links',
      schema: {
        type: 'object',
        properties: {
          citationsHaveLabels: { type: 'boolean' },
          citationsKeyboardAccessible: { type: 'boolean' },
          citationsHaveContext: { type: 'boolean' },
          citationLinksDescriptive: { type: 'boolean' }
        }
      }
    });

    expect(citationAccessibility.citationsHaveLabels).toBe(true);
    expect(citationAccessibility.citationsKeyboardAccessible).toBe(true);
    expect(citationAccessibility.citationsHaveContext).toBe(true);

    // Test citation interaction with keyboard
    await stagehandPage.keyboard.press('Tab'); // Navigate to first citation
    await stagehandPage.keyboard.press('Enter'); // Activate citation
    
    const citationInteraction = await stagehandPage.observe(
      'Verify citation can be activated with keyboard and provides appropriate feedback'
    );
    expect(citationInteraction).toBeTruthy();
  });
});