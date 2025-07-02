// Mobile Responsiveness E2E Tests
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { devices } from '@playwright/test';
import { getTestURL } from '../helpers/test-config';

test.describe('Mobile Responsiveness', () => {
  const mobileDevices = [
    { name: 'iPhone 12', ...devices['iPhone 12'] },
    { name: 'iPhone 12 Pro', ...devices['iPhone 12 Pro'] },
    { name: 'Pixel 5', ...devices['Pixel 5'] },
    { name: 'Samsung Galaxy S21', ...devices['Galaxy S21'] },
    { name: 'iPad', ...devices['iPad'] },
    { name: 'iPad Pro', ...devices['iPad Pro'] }
  ];

  for (const device of mobileDevices) {
    test(`${device.name} - interface adapts correctly`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
        permissions: ['clipboard-read', 'clipboard-write']
      });
      const page = await context.newPage();
      
      // Add Stagehand capabilities
      const stagehand = new (await import('@browserbasehq/stagehand')).Stagehand({
        env: 'LOCAL',
        apiKey: process.env.OPENAI_API_KEY || ''
      });
      await stagehand.init();
      
      const stagehandPage = Object.assign(page, {
        stagehand,
        observe: (instruction: string) => stagehand.page.observe(instruction),
        act: (instruction: string) => stagehand.page.act(instruction),
        extract: (options: any) => stagehand.page.extract(options)
      });

      await stagehandPage.goto('/');
      await stagehandPage.waitForLoadState('networkidle');

      // Test mobile layout adaptation
      const mobileLayout = await stagehandPage.extract<{
        hasResponsiveNavigation: boolean;
        chatInputVisible: boolean;
        uploadButtonAccessible: boolean;
        modelSelectorUsable: boolean;
        contentFitsScreen: boolean;
        touchTargetsAppropriate: boolean;
      }>({
        instruction: `Evaluate the mobile layout on ${device.name} for responsive navigation, visible chat input, accessible upload button, usable model selector, content fitting screen, and appropriate touch targets`,
        schema: {
          type: 'object',
          properties: {
            hasResponsiveNavigation: { type: 'boolean' },
            chatInputVisible: { type: 'boolean' },
            uploadButtonAccessible: { type: 'boolean' },
            modelSelectorUsable: { type: 'boolean' },
            contentFitsScreen: { type: 'boolean' },
            touchTargetsAppropriate: { type: 'boolean' }
          }
        }
      });

      expect(mobileLayout.hasResponsiveNavigation).toBe(true);
      expect(mobileLayout.chatInputVisible).toBe(true);
      expect(mobileLayout.uploadButtonAccessible).toBe(true);
      expect(mobileLayout.modelSelectorUsable).toBe(true);
      expect(mobileLayout.contentFitsScreen).toBe(true);
      expect(mobileLayout.touchTargetsAppropriate).toBe(true);

      // Test touch interactions
      await stagehandPage.act('Tap on the file upload button');
      const uploadInteraction = await stagehandPage.observe('Verify the upload interface is touch-friendly');
      expect(uploadInteraction).toBeTruthy();

      // Test mobile typing and sending
      await stagehandPage.act('Tap on the chat input field');
      await stagehandPage.type('input[type="text"], textarea', 'Testing mobile input');
      await stagehandPage.act('Tap the send button');
      
      const mobileChat = await stagehandPage.observe('Verify message was sent and response area is visible');
      expect(mobileChat).toBeTruthy();

      // Test scroll behavior for long conversations
      for (let i = 0; i < 3; i++) {
        await ragHelpers.sendChatMessage(
          stagehandPage,
          `Mobile test message ${i + 1}`,
          { waitForResponse: true }
        );
      }

      const scrollBehavior = await stagehandPage.extract<{
        conversationScrollable: boolean;
        inputStaysVisible: boolean;
        responsesReadable: boolean;
      }>({
        instruction: 'Check if the conversation is scrollable, input stays visible, and responses are readable on mobile',
        schema: {
          type: 'object',
          properties: {
            conversationScrollable: { type: 'boolean' },
            inputStaysVisible: { type: 'boolean' },
            responsesReadable: { type: 'boolean' }
          }
        }
      });

      expect(scrollBehavior.conversationScrollable).toBe(true);
      expect(scrollBehavior.inputStaysVisible).toBe(true);
      expect(scrollBehavior.responsesReadable).toBe(true);

      await context.close();
      await stagehand.close();
    });
  }

  test('portrait and landscape orientation handling', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const page = await context.newPage();
    
    // Add Stagehand capabilities
    const stagehand = new (await import('@browserbasehq/stagehand')).Stagehand({
      env: 'LOCAL',
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    await stagehand.init();
    
    const stagehandPage = Object.assign(page, {
      stagehand,
      observe: (instruction: string) => stagehand.page.observe(instruction),
      act: (instruction: string) => stagehand.page.act(instruction),
      extract: (options: any) => stagehand.page.extract(options)
    });

    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');

    // Test portrait mode
    await stagehandPage.setViewportSize({ width: 390, height: 844 }); // iPhone 12 portrait
    
    const portraitLayout = await stagehandPage.extract<{
      layoutOptimized: boolean;
      allElementsAccessible: boolean;
      readabilityGood: boolean;
    }>({
      instruction: 'Evaluate the layout optimization, element accessibility, and readability in portrait mode',
      schema: {
        type: 'object',
        properties: {
          layoutOptimized: { type: 'boolean' },
          allElementsAccessible: { type: 'boolean' },
          readabilityGood: { type: 'boolean' }
        }
      }
    });

    expect(portraitLayout.layoutOptimized).toBe(true);
    expect(portraitLayout.allElementsAccessible).toBe(true);
    expect(portraitLayout.readabilityGood).toBe(true);

    // Switch to landscape mode
    await stagehandPage.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape
    await stagehandPage.waitForTimeout(1000); // Allow for layout reflow

    const landscapeLayout = await stagehandPage.extract<{
      layoutAdapts: boolean;
      horizontalSpaceUtilized: boolean;
      chatUsable: boolean;
      uploadAccessible: boolean;
    }>({
      instruction: 'Evaluate how the layout adapts to landscape mode, utilizes horizontal space, maintains chat usability, and keeps upload accessible',
      schema: {
        type: 'object',
        properties: {
          layoutAdapts: { type: 'boolean' },
          horizontalSpaceUtilized: { type: 'boolean' },
          chatUsable: { type: 'boolean' },
          uploadAccessible: { type: 'boolean' }
        }
      }
    });

    expect(landscapeLayout.layoutAdapts).toBe(true);
    expect(landscapeLayout.horizontalSpaceUtilized).toBe(true);
    expect(landscapeLayout.chatUsable).toBe(true);
    expect(landscapeLayout.uploadAccessible).toBe(true);

    // Test functionality in landscape
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Testing landscape mode functionality',
      { waitForResponse: true }
    );

    const landscapeFunctionality = await stagehandPage.observe('Verify all features work correctly in landscape mode');
    expect(landscapeFunctionality).toBeTruthy();

    await context.close();
    await stagehand.close();
  });

  test('touch gestures and interactions', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      hasTouch: true
    });
    const page = await context.newPage();
    
    // Add Stagehand capabilities
    const stagehand = new (await import('@browserbasehq/stagehand')).Stagehand({
      env: 'LOCAL',
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    await stagehand.init();
    
    const stagehandPage = Object.assign(page, {
      stagehand,
      observe: (instruction: string) => stagehand.page.observe(instruction),
      act: (instruction: string) => stagehand.page.act(instruction),
      extract: (options: any) => stagehand.page.extract(options)
    });

    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');

    // Upload a document first
    await stagehandPage.act('Upload a test document using touch');
    await stagehandPage.observe('Wait for upload to complete');

    // Send multiple messages to create scrollable content
    for (let i = 0; i < 5; i++) {
      await ragHelpers.sendChatMessage(
        stagehandPage,
        `Touch test message ${i + 1}`,
        { waitForResponse: true }
      );
    }

    // Test scroll gestures
    const initialScrollPosition = await stagehandPage.evaluate(() => window.scrollY);
    
    // Simulate swipe up (scroll down)
    await stagehandPage.touchscreen.tap(200, 400);
    await stagehandPage.evaluate(() => {
      const chatContainer = document.querySelector('[role="log"], .chat-container, main');
      if (chatContainer) {
        chatContainer.scrollTop += 200;
      }
    });

    const scrollWorked = await stagehandPage.observe('Verify that touch scrolling works smoothly');
    expect(scrollWorked).toBeTruthy();

    // Test pinch-to-zoom (if supported)
    const zoomSupport = await stagehandPage.extract<{
      supportsZoom: boolean;
      contentScalesAppropriately: boolean;
      textRemainsReadable: boolean;
    }>({
      instruction: 'Check if the interface supports pinch-to-zoom and scales content appropriately while keeping text readable',
      schema: {
        type: 'object',
        properties: {
          supportsZoom: { type: 'boolean' },
          contentScalesAppropriately: { type: 'boolean' },
          textRemainsReadable: { type: 'boolean' }
        }
      }
    });

    // Note: Pinch-to-zoom support depends on viewport meta tag configuration
    expect(zoomSupport.textRemainsReadable).toBe(true);

    // Test touch target sizes
    const touchTargets = await stagehandPage.extract<{
      buttonsLargeEnough: boolean;
      linksEasyToTap: boolean;
      citationsAccessible: boolean;
      inputFieldsUsable: boolean;
    }>({
      instruction: 'Evaluate if buttons are large enough for touch, links are easy to tap, citations are accessible, and input fields are usable',
      schema: {
        type: 'object',
        properties: {
          buttonsLargeEnough: { type: 'boolean' },
          linksEasyToTap: { type: 'boolean' },
          citationsAccessible: { type: 'boolean' },
          inputFieldsUsable: { type: 'boolean' }
        }
      }
    });

    expect(touchTargets.buttonsLargeEnough).toBe(true);
    expect(touchTargets.linksEasyToTap).toBe(true);
    expect(touchTargets.citationsAccessible).toBe(true);
    expect(touchTargets.inputFieldsUsable).toBe(true);

    await context.close();
    await stagehand.close();
  });

  test('mobile performance and loading', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      // Simulate slower mobile network
      offline: false
    });
    const page = await context.newPage();
    
    // Throttle network to simulate mobile conditions
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100)); // Add latency
      await route.continue();
    });

    // Add Stagehand capabilities
    const stagehand = new (await import('@browserbasehq/stagehand')).Stagehand({
      env: 'LOCAL',
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    await stagehand.init();
    
    const stagehandPage = Object.assign(page, {
      stagehand,
      observe: (instruction: string) => stagehand.page.observe(instruction),
      act: (instruction: string) => stagehand.page.act(instruction),
      extract: (options: any) => stagehand.page.extract(options)
    });

    const startTime = Date.now();
    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Check that page loads reasonably quickly even on mobile
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    // Test mobile loading indicators
    const loadingExperience = await stagehandPage.extract<{
      hasLoadingIndicator: boolean;
      providesProgressFeedback: boolean;
      gracefulDegradation: boolean;
    }>({
      instruction: 'Evaluate if there are loading indicators, progress feedback, and graceful degradation for mobile',
      schema: {
        type: 'object',
        properties: {
          hasLoadingIndicator: { type: 'boolean' },
          providesProgressFeedback: { type: 'boolean' },
          gracefulDegradation: { type: 'boolean' }
        }
      }
    });

    expect(loadingExperience.hasLoadingIndicator).toBe(true);
    expect(loadingExperience.gracefulDegradation).toBe(true);

    // Test file upload on mobile with slow connection
    await stagehandPage.act('Upload a small test file');
    
    const uploadProgress = await stagehandPage.observe('Check if upload progress is shown clearly on mobile');
    expect(uploadProgress).toBeTruthy();

    // Test chat responsiveness under mobile conditions
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Test mobile performance',
      { waitForResponse: true }
    );

    const chatPerformance = await stagehandPage.extract<{
      responseTimeReasonable: boolean;
      streamingSmooth: boolean;
      interfaceResponsive: boolean;
    }>({
      instruction: 'Evaluate if response time is reasonable, streaming is smooth, and interface remains responsive on mobile',
      schema: {
        type: 'object',
        properties: {
          responseTimeReasonable: { type: 'boolean' },
          streamingSmooth: { type: 'boolean' },
          interfaceResponsive: { type: 'boolean' }
        }
      }
    });

    expect(chatPerformance.interfaceResponsive).toBe(true);

    await context.close();
    await stagehand.close();
  });

  test('mobile-specific features and limitations', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Galaxy S21'],
      permissions: ['clipboard-read', 'clipboard-write']
    });
    const page = await context.newPage();
    
    // Add Stagehand capabilities
    const stagehand = new (await import('@browserbasehq/stagehand')).Stagehand({
      env: 'LOCAL',
      apiKey: process.env.OPENAI_API_KEY || ''
    });
    await stagehand.init();
    
    const stagehandPage = Object.assign(page, {
      stagehand,
      observe: (instruction: string) => stagehand.page.observe(instruction),
      act: (instruction: string) => stagehand.page.act(instruction),
      extract: (options: any) => stagehand.page.extract(options)
    });

    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');

    // Test copy/paste functionality
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Generate some text I can copy',
      { waitForResponse: true }
    );

    // Test copy functionality
    await stagehandPage.act('Long press on the assistant response to copy text');
    const copyFunctionality = await stagehandPage.observe('Verify copy functionality works on mobile');
    expect(copyFunctionality).toBeTruthy();

    // Test paste functionality
    await stagehandPage.act('Long press in the chat input to paste text');
    const pasteFunctionality = await stagehandPage.observe('Verify paste functionality works on mobile');
    expect(pasteFunctionality).toBeTruthy();

    // Test mobile keyboard behavior
    await stagehandPage.act('Tap in the chat input field');
    const keyboardHandling = await stagehandPage.extract<{
      keyboardAppears: boolean;
      layoutAdjusts: boolean;
      inputVisible: boolean;
      sendButtonAccessible: boolean;
    }>({
      instruction: 'Check if mobile keyboard appears, layout adjusts appropriately, input stays visible, and send button remains accessible',
      schema: {
        type: 'object',
        properties: {
          keyboardAppears: { type: 'boolean' },
          layoutAdjusts: { type: 'boolean' },
          inputVisible: { type: 'boolean' },
          sendButtonAccessible: { type: 'boolean' }
        }
      }
    });

    expect(keyboardHandling.layoutAdjusts).toBe(true);
    expect(keyboardHandling.inputVisible).toBe(true);
    expect(keyboardHandling.sendButtonAccessible).toBe(true);

    // Test share functionality (if implemented)
    await stagehandPage.act('Look for share functionality in the interface');
    const shareFeature = await stagehandPage.observe('Check if sharing functionality is available and works on mobile');
    // Note: This would depend on actual implementation

    // Test file upload from mobile device
    await stagehandPage.act('Tap the file upload button');
    const mobileUpload = await stagehandPage.extract<{
      showsFileOptions: boolean;
      allowsPhotoAccess: boolean;
      handlesCameraCapture: boolean;
      supportsMultipleFiles: boolean;
    }>({
      instruction: 'Check if mobile upload shows file options, allows photo access, handles camera capture, and supports multiple files',
      schema: {
        type: 'object',
        properties: {
          showsFileOptions: { type: 'boolean' },
          allowsPhotoAccess: { type: 'boolean' },
          handlesCameraCapture: { type: 'boolean' },
          supportsMultipleFiles: { type: 'boolean' }
        }
      }
    });

    expect(mobileUpload.showsFileOptions).toBe(true);

    await context.close();
    await stagehand.close();
  });
});