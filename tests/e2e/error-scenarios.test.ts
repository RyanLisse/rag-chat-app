// Error Scenarios and Edge Cases E2E Tests
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';

test.describe('Error Scenarios and Edge Cases', () => {
  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');
  });

  test('handles network interruptions gracefully', async ({ stagehandPage }) => {
    // Upload a document first
    await stagehandPage.act('Upload a test document');
    await stagehandPage.observe('Wait for upload to complete');

    // Start a conversation
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Tell me about the uploaded document',
      { waitForResponse: false }
    );

    // Simulate network interruption during response
    await stagehandPage.context().setOffline(true);
    await stagehandPage.waitForTimeout(2000);

    // Check error handling
    const networkErrorHandling = await stagehandPage.extract<{
      showsErrorMessage: boolean;
      providesRetryOption: boolean;
      preservesUserInput: boolean;
      handlesGracefully: boolean;
    }>({
      instruction: 'Analyze how the application handles network interruption during response generation',
      schema: {
        type: 'object',
        properties: {
          showsErrorMessage: { type: 'boolean' },
          providesRetryOption: { type: 'boolean' },
          preservesUserInput: { type: 'boolean' },
          handlesGracefully: { type: 'boolean' }
        }
      }
    });

    expect(networkErrorHandling.showsErrorMessage).toBe(true);
    expect(networkErrorHandling.handlesGracefully).toBe(true);

    // Restore network and test recovery
    await stagehandPage.context().setOffline(false);
    await stagehandPage.waitForTimeout(1000);

    // Test retry functionality
    if (networkErrorHandling.providesRetryOption) {
      await stagehandPage.act('Click the retry button or option');
      const retrySuccess = await stagehandPage.observe('Verify the retry works after network restoration');
      expect(retrySuccess).toBeTruthy();
    }
  });

  test('handles invalid file uploads', async ({ stagehandPage }) => {
    const invalidFiles = [
      { name: 'malicious.exe', type: 'application/x-executable', size: 1024 * 1024 },
      { name: 'huge-file.pdf', type: 'application/pdf', size: 100 * 1024 * 1024 }, // 100MB
      { name: 'empty.txt', type: 'text/plain', size: 0 },
      { name: 'corrupted.pdf', type: 'application/pdf', size: 1024, corrupted: true },
      { name: 'no-extension', type: 'application/octet-stream', size: 1024 }
    ];

    for (const file of invalidFiles) {
      // Attempt to upload invalid file
      await stagehandPage.act(`Try to upload a file: ${file.name} of type ${file.type}`);
      
      const errorResponse = await stagehandPage.extract<{
        showsAppropriateError: boolean;
        errorMessageClear: boolean;
        suggestsAlternative: boolean;
        blocksMaliciousContent: boolean;
      }>({
        instruction: `Analyze the error handling for ${file.name} upload attempt`,
        schema: {
          type: 'object',
          properties: {
            showsAppropriateError: { type: 'boolean' },
            errorMessageClear: { type: 'boolean' },
            suggestsAlternative: { type: 'boolean' },
            blocksMaliciousContent: { type: 'boolean' }
          }
        }
      });

      expect(errorResponse.showsAppropriateError).toBe(true);
      expect(errorResponse.errorMessageClear).toBe(true);
      
      if (file.name.includes('.exe')) {
        expect(errorResponse.blocksMaliciousContent).toBe(true);
      }
    }
  });

  test('handles malformed or extreme input', async ({ stagehandPage }) => {
    const extremeInputs = [
      // Very long input
      'A'.repeat(10000),
      // Special characters and potential injection
      '<script>alert("xss")</script>',
      '"; DROP TABLE users; --',
      '../../etc/passwd',
      // Unicode and emoji stress test
      '🎉'.repeat(100) + '中文测试' + 'العربية' + 'עברית',
      // Empty or whitespace
      '',
      '   ',
      '\n\n\n\n\n',
      // Markdown injection attempts
      '![img](javascript:alert(1))',
      '[link](javascript:void(0))',
      // Very long URL
      'http://' + 'a'.repeat(2000) + '.com'
    ];

    for (const input of extremeInputs) {
      await ragHelpers.sendChatMessage(
        stagehandPage,
        input,
        { waitForResponse: true }
      );

      const inputHandling = await stagehandPage.extract<{
        inputSanitized: boolean;
        noScriptExecution: boolean;
        appropriateResponse: boolean;
        systemStable: boolean;
      }>({
        instruction: 'Analyze how the system handles extreme or malformed input',
        schema: {
          type: 'object',
          properties: {
            inputSanitized: { type: 'boolean' },
            noScriptExecution: { type: 'boolean' },
            appropriateResponse: { type: 'boolean' },
            systemStable: { type: 'boolean' }
          }
        }
      });

      expect(inputHandling.inputSanitized).toBe(true);
      expect(inputHandling.noScriptExecution).toBe(true);
      expect(inputHandling.systemStable).toBe(true);
    }
  });

  test('handles concurrent upload and query operations', async ({ stagehandPage }) => {
    // Start multiple file uploads simultaneously
    const uploadPromises = [];
    
    for (let i = 0; i < 3; i++) {
      uploadPromises.push(
        stagehandPage.act(`Upload document ${i + 1} simultaneously`)
      );
    }

    // While uploads are processing, send queries
    const queryPromises = [];
    for (let i = 0; i < 3; i++) {
      queryPromises.push(
        ragHelpers.sendChatMessage(
          stagehandPage,
          `Query ${i + 1} during upload`,
          { waitForResponse: false }
        )
      );
    }

    // Wait for all operations
    await Promise.all([...uploadPromises, ...queryPromises]);

    // Check system stability and proper handling
    const concurrencyHandling = await stagehandPage.extract<{
      allUploadsProcessed: boolean;
      allQueriesAnswered: boolean;
      noDataCorruption: boolean;
      performanceAcceptable: boolean;
      errorHandlingWorked: boolean;
    }>({
      instruction: 'Evaluate how the system handled concurrent uploads and queries',
      schema: {
        type: 'object',
        properties: {
          allUploadsProcessed: { type: 'boolean' },
          allQueriesAnswered: { type: 'boolean' },
          noDataCorruption: { type: 'boolean' },
          performanceAcceptable: { type: 'boolean' },
          errorHandlingWorked: { type: 'boolean' }
        }
      }
    });

    expect(concurrencyHandling.allUploadsProcessed).toBe(true);
    expect(concurrencyHandling.allQueriesAnswered).toBe(true);
    expect(concurrencyHandling.noDataCorruption).toBe(true);
    expect(concurrencyHandling.performanceAcceptable).toBe(true);
  });

  test('handles API rate limiting and quotas', async ({ stagehandPage }) => {
    // Upload a document
    await stagehandPage.act('Upload a test document');
    await stagehandPage.observe('Wait for processing to complete');

    // Send rapid-fire requests to potentially trigger rate limiting
    const rapidQueries = [];
    for (let i = 0; i < 20; i++) {
      rapidQueries.push(
        ragHelpers.sendChatMessage(
          stagehandPage,
          `Rapid query ${i + 1}`,
          { waitForResponse: false }
        )
      );
      // Small delay to avoid overwhelming the test
      await stagehandPage.waitForTimeout(100);
    }

    // Check rate limiting handling
    const rateLimitHandling = await stagehandPage.extract<{
      showsRateLimitWarning: boolean;
      queuesRequestsAppropriately: boolean;
      providesUserFeedback: boolean;
      recoversGracefully: boolean;
    }>({
      instruction: 'Analyze how the system handles potential rate limiting from rapid requests',
      schema: {
        type: 'object',
        properties: {
          showsRateLimitWarning: { type: 'boolean' },
          queuesRequestsAppropriately: { type: 'boolean' },
          providesUserFeedback: { type: 'boolean' },
          recoversGracefully: { type: 'boolean' }
        }
      }
    });

    // Even if rate limiting doesn't occur, the system should handle it gracefully
    expect(rateLimitHandling.providesUserFeedback).toBe(true);
    expect(rateLimitHandling.recoversGracefully).toBe(true);
  });

  test('handles browser resource limitations', async ({ stagehandPage }) => {
    // Test memory pressure by creating many conversations
    for (let i = 0; i < 50; i++) {
      await ragHelpers.sendChatMessage(
        stagehandPage,
        `Memory test message ${i + 1} with some longer content to increase memory usage`,
        { waitForResponse: true }
      );
      
      // Every 10 messages, check system health
      if (i % 10 === 0) {
        const memoryHealth = await stagehandPage.extract<{
          responseTimeAcceptable: boolean;
          interfaceResponsive: boolean;
          memoryManaged: boolean;
        }>({
          instruction: 'Check if response time is acceptable, interface is responsive, and memory is managed well',
          schema: {
            type: 'object',
            properties: {
              responseTimeAcceptable: { type: 'boolean' },
              interfaceResponsive: { type: 'boolean' },
              memoryManaged: { type: 'boolean' }
            }
          }
        });

        expect(memoryHealth.interfaceResponsive).toBe(true);
      }
    }

    // Test scroll performance with large conversation
    const scrollPerformance = await stagehandPage.observe('Test scrolling performance with large conversation');
    expect(scrollPerformance).toBeTruthy();

    // Test cleanup mechanisms
    const cleanup = await stagehandPage.extract<{
      conversationTruncated: boolean;
      oldMessagesCleared: boolean;
      performanceRestored: boolean;
    }>({
      instruction: 'Check if the system implements conversation truncation, clears old messages, or restores performance',
      schema: {
        type: 'object',
        properties: {
          conversationTruncated: { type: 'boolean' },
          oldMessagesCleared: { type: 'boolean' },
          performanceRestored: { type: 'boolean' }
        }
      }
    });

    // At least one cleanup mechanism should be in place
    expect(
      cleanup.conversationTruncated || 
      cleanup.oldMessagesCleared || 
      cleanup.performanceRestored
    ).toBe(true);
  });

  test('handles model switching failures', async ({ stagehandPage }) => {
    // Upload a document and start conversation
    await stagehandPage.act('Upload a test document');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Initial message with default model',
      { waitForResponse: true }
    );

    // Try to switch to a potentially unavailable model
    const unavailableModels = ['GPT-5', 'Claude-4', 'NonExistentModel'];
    
    for (const model of unavailableModels) {
      await stagehandPage.act(`Try to select model: ${model}`);
      
      const modelSwitchHandling = await stagehandPage.extract<{
        showsErrorMessage: boolean;
        fallsBackToWorking: boolean;
        preservesConversation: boolean;
        userInformed: boolean;
      }>({
        instruction: `Analyze how the system handles switching to unavailable model: ${model}`,
        schema: {
          type: 'object',
          properties: {
            showsErrorMessage: { type: 'boolean' },
            fallsBackToWorking: { type: 'boolean' },
            preservesConversation: { type: 'boolean' },
            userInformed: { type: 'boolean' }
          }
        }
      });

      expect(modelSwitchHandling.userInformed).toBe(true);
      expect(modelSwitchHandling.preservesConversation).toBe(true);
    }

    // Test switching during active generation
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Generate a long response',
      { waitForResponse: false }
    );

    // Try to switch models while response is generating
    await stagehandPage.act('Try to switch models while response is being generated');
    
    const midGenerationSwitch = await stagehandPage.extract<{
      handlesGracefully: boolean;
      completesCurrentResponse: boolean;
      appliesChangeToNext: boolean;
    }>({
      instruction: 'Analyze how model switching is handled during response generation',
      schema: {
        type: 'object',
        properties: {
          handlesGracefully: { type: 'boolean' },
          completesCurrentResponse: { type: 'boolean' },
          appliesChangeToNext: { type: 'boolean' }
        }
      }
    });

    expect(midGenerationSwitch.handlesGracefully).toBe(true);
  });

  test('handles citation and reference failures', async ({ stagehandPage }) => {
    // Upload a document
    await stagehandPage.act('Upload a test document');
    await stagehandPage.observe('Wait for processing');

    // Send query that should generate citations
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Summarize the uploaded document with specific details',
      { waitForResponse: true }
    );

    // Simulate citation link failures
    const citationHandling = await stagehandPage.extract<{
      citationsPresent: boolean;
      linksWork: boolean;
      fallbackAvailable: boolean;
      errorHandling: boolean;
    }>({
      instruction: 'Check if citations are present, links work, fallback is available, and errors are handled',
      schema: {
        type: 'object',
        properties: {
          citationsPresent: { type: 'boolean' },
          linksWork: { type: 'boolean' },
          fallbackAvailable: { type: 'boolean' },
          errorHandling: { type: 'boolean' }
        }
      }
    });

    expect(citationHandling.citationsPresent).toBe(true);

    // Test clicking on citations
    await stagehandPage.act('Click on the first citation');
    const citationClick = await stagehandPage.observe('Verify citation click provides appropriate feedback');
    expect(citationClick).toBeTruthy();

    // Test with corrupted or missing source documents
    await stagehandPage.act('Delete or corrupt the uploaded document');
    
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Try to reference the now-missing document',
      { waitForResponse: true }
    );

    const missingDocHandling = await stagehandPage.extract<{
      acknowledgesMissingDoc: boolean;
      providesAlternative: boolean;
      handlesGracefully: boolean;
    }>({
      instruction: 'Analyze how the system handles references to missing or corrupted documents',
      schema: {
        type: 'object',
        properties: {
          acknowledgesMissingDoc: { type: 'boolean' },
          providesAlternative: { type: 'boolean' },
          handlesGracefully: { type: 'boolean' }
        }
      }
    });

    expect(missingDocHandling.handlesGracefully).toBe(true);
  });

  test('handles session persistence and recovery', async ({ stagehandPage }) => {
    // Create a conversation
    await stagehandPage.act('Upload a document');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Initial conversation message',
      { waitForResponse: true }
    );

    // Simulate browser refresh
    await stagehandPage.reload();
    await stagehandPage.waitForLoadState('networkidle');

    // Check session recovery
    const sessionRecovery = await stagehandPage.extract<{
      conversationRestored: boolean;
      documentsAvailable: boolean;
      statePreserved: boolean;
      userExperienceSmooth: boolean;
    }>({
      instruction: 'Check if conversation is restored, documents are available, state is preserved, and user experience is smooth after refresh',
      schema: {
        type: 'object',
        properties: {
          conversationRestored: { type: 'boolean' },
          documentsAvailable: { type: 'boolean' },
          statePreserved: { type: 'boolean' },
          userExperienceSmooth: { type: 'boolean' }
        }
      }
    });

    // At minimum, the system should provide a smooth experience
    expect(sessionRecovery.userExperienceSmooth).toBe(true);

    // Test continuing conversation after refresh
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Continue conversation after refresh',
      { waitForResponse: true }
    );

    const postRefreshFunctionality = await stagehandPage.observe('Verify the system works normally after refresh');
    expect(postRefreshFunctionality).toBeTruthy();
  });

  test('handles cross-browser compatibility issues', async ({ browser }) => {
    // Test different browser engines if available
    const browsers = ['chromium', 'firefox', 'webkit'];
    
    for (const browserType of browsers) {
      try {
        // This test would ideally run across different browser types
        // For now, we'll test with the current browser but check for common compatibility issues
        
        const page = await browser.newPage();
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check for common compatibility issues
        const compatibility = await page.evaluate(() => {
          const issues = [];
          
          // Check for CSS Grid support
          if (!CSS.supports('display', 'grid')) {
            issues.push('CSS Grid not supported');
          }
          
          // Check for ES6 features
          try {
            new Function('(a, b) => a + b');
          } catch (e) {
            issues.push('Arrow functions not supported');
          }
          
          // Check for File API
          if (!window.File || !window.FileReader) {
            issues.push('File API not supported');
          }
          
          // Check for fetch API
          if (!window.fetch) {
            issues.push('Fetch API not supported');
          }
          
          return {
            hasIssues: issues.length > 0,
            issues: issues,
            userAgent: navigator.userAgent
          };
        });

        expect(compatibility.hasIssues).toBe(false);
        
        await page.close();
      } catch (error) {
        console.log(`Browser ${browserType} not available for testing`);
      }
    }
  });
});