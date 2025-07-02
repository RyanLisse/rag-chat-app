// Concurrent User Scenarios E2E Tests
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { getTestURL } from '../helpers/test-config';

test.describe('Concurrent User Scenarios', () => {
  let browser: Browser;
  
  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('multiple users uploading documents simultaneously', async () => {
    const userCount = 5;
    const contexts: BrowserContext[] = [];
    const pages: any[] = [];

    try {
      // Create multiple user contexts
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
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

        contexts.push(context);
        pages.push(stagehandPage);

        await stagehandPage.goto('/');
        await stagehandPage.waitForLoadState('networkidle');
      }

      // All users upload documents simultaneously
      const uploadPromises = pages.map(async (page, index) => {
        const startTime = Date.now();
        
        await page.act(`Upload document for user ${index + 1}`);
        await page.observe('Wait for upload to complete');
        
        const endTime = Date.now();
        return {
          userId: index + 1,
          uploadTime: endTime - startTime,
          success: true
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Verify all uploads succeeded
      expect(uploadResults.every(result => result.success)).toBe(true);

      // Check upload times are reasonable under load
      const averageUploadTime = uploadResults.reduce((sum, result) => sum + result.uploadTime, 0) / uploadResults.length;
      expect(averageUploadTime).toBeLessThan(30000); // 30 seconds average

      // Verify documents are properly isolated per user
      for (let i = 0; i < pages.length; i++) {
        const userDocuments = await pages[i].extract<string[]>({
          instruction: 'List all uploaded documents visible to this user',
          schema: {
            type: 'array',
            items: { type: 'string' }
          }
        });

        // Each user should see their own documents
        expect(userDocuments.length).toBeGreaterThan(0);
      }

    } finally {
      // Cleanup
      for (const page of pages) {
        if (page.stagehand) {
          await page.stagehand.close();
        }
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('concurrent chat sessions with different models', async () => {
    const sessionCount = 3;
    const models = ['GPT-4', 'Claude 3 Opus', 'Claude 3 Sonnet'];
    const contexts: BrowserContext[] = [];
    const pages: any[] = [];

    try {
      // Create multiple sessions
      for (let i = 0; i < sessionCount; i++) {
        const context = await browser.newContext();
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

        contexts.push(context);
        pages.push(stagehandPage);

        await stagehandPage.goto('/');
        await stagehandPage.waitForLoadState('networkidle');

        // Each session uploads a document and selects a different model
        await stagehandPage.act(`Upload document for session ${i + 1}`);
        await ragHelpers.selectModel(stagehandPage, models[i]);
      }

      // All sessions send messages simultaneously
      const chatPromises = pages.map(async (page, index) => {
        const startTime = Date.now();
        
        await ragHelpers.sendChatMessage(
          page,
          `Concurrent test message from session ${index + 1} using ${models[index]}`,
          { waitForResponse: true }
        );
        
        const endTime = Date.now();
        
        // Verify correct model responded
        const responseAnalysis = await page.extract<{
          responseGenerated: boolean;
          modelUsed: string;
          hasCitations: boolean;
        }>({
          instruction: `Verify response was generated, identify the model used, and check for citations`,
          schema: {
            type: 'object',
            properties: {
              responseGenerated: { type: 'boolean' },
              modelUsed: { type: 'string' },
              hasCitations: { type: 'boolean' }
            }
          }
        });

        return {
          sessionId: index + 1,
          expectedModel: models[index],
          actualModel: responseAnalysis.modelUsed,
          responseTime: endTime - startTime,
          responseGenerated: responseAnalysis.responseGenerated,
          hasCitations: responseAnalysis.hasCitations
        };
      });

      const chatResults = await Promise.all(chatPromises);

      // Verify all sessions got responses
      expect(chatResults.every(result => result.responseGenerated)).toBe(true);

      // Verify model isolation
      for (const result of chatResults) {
        expect(result.actualModel).toContain(result.expectedModel);
      }

      // Check response times under concurrent load
      const averageResponseTime = chatResults.reduce((sum, result) => sum + result.responseTime, 0) / chatResults.length;
      expect(averageResponseTime).toBeLessThan(45000); // 45 seconds average

    } finally {
      // Cleanup
      for (const page of pages) {
        if (page.stagehand) {
          await page.stagehand.close();
        }
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('high-frequency query stress test', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
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

      // Upload a document for querying
      await stagehandPage.act('Upload a comprehensive document for stress testing');
      await stagehandPage.observe('Wait for processing');

      // Send rapid queries
      const queryCount = 20;
      const queryPromises = [];

      for (let i = 0; i < queryCount; i++) {
        queryPromises.push(
          ragHelpers.sendChatMessage(
            stagehandPage,
            `Stress test query ${i + 1}: What are the key concepts in the document?`,
            { waitForResponse: true }
          ).then(() => ({
            queryId: i + 1,
            success: true,
            timestamp: Date.now()
          })).catch((error) => ({
            queryId: i + 1,
            success: false,
            error: error.message,
            timestamp: Date.now()
          }))
        );

        // Small delay between queries
        await stagehandPage.waitForTimeout(200);
      }

      const queryResults = await Promise.all(queryPromises);

      // Analyze results
      const successfulQueries = queryResults.filter(result => result.success);
      const failedQueries = queryResults.filter(result => !result.success);

      // Should handle most queries successfully
      expect(successfulQueries.length).toBeGreaterThan(queryCount * 0.8); // 80% success rate minimum

      // Check for rate limiting or queue management
      if (failedQueries.length > 0) {
        console.log('Failed queries:', failedQueries);
        
        // Failures should be due to rate limiting, not system crashes
        const rateLimitFailures = failedQueries.filter(result => 
          result.error?.includes('rate') || 
          result.error?.includes('limit') ||
          result.error?.includes('queue')
        );
        
        expect(rateLimitFailures.length).toBe(failedQueries.length);
      }

      // Verify system remains responsive
      const systemHealth = await stagehandPage.extract<{
        interfaceResponsive: boolean;
        newQueryAccepted: boolean;
        memoryStable: boolean;
      }>({
        instruction: 'Check if interface is responsive, can accept new queries, and memory is stable',
        schema: {
          type: 'object',
          properties: {
            interfaceResponsive: { type: 'boolean' },
            newQueryAccepted: { type: 'boolean' },
            memoryStable: { type: 'boolean' }
          }
        }
      });

      expect(systemHealth.interfaceResponsive).toBe(true);

    } finally {
      if (stagehandPage.stagehand) {
        await stagehandPage.stagehand.close();
      }
      await context.close();
    }
  });

  test('mixed workload simulation', async () => {
    const userCount = 4;
    const contexts: BrowserContext[] = [];
    const pages: any[] = [];

    try {
      // Create different types of users
      const userTypes = ['uploader', 'searcher', 'conversationalist', 'model-switcher'];

      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
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

        contexts.push(context);
        pages.push(stagehandPage);

        await stagehandPage.goto('/');
        await stagehandPage.waitForLoadState('networkidle');
      }

      // Define different user behaviors
      const userBehaviors = [
        // Uploader: focuses on uploading multiple documents
        async (page: any, userIndex: number) => {
          for (let i = 0; i < 3; i++) {
            await page.act(`Upload document ${i + 1} from uploader user`);
            await page.observe('Wait for upload completion');
            await page.waitForTimeout(1000);
          }
          return { userType: 'uploader', documentsUploaded: 3 };
        },

        // Searcher: sends many search queries
        async (page: any, userIndex: number) => {
          await page.act('Upload one document for searching');
          await page.observe('Wait for processing');
          
          const queries = [
            'What is the main topic?',
            'Find specific details',
            'Summarize key points',
            'What are the conclusions?'
          ];
          
          for (const query of queries) {
            await ragHelpers.sendChatMessage(page, query, { waitForResponse: true });
            await page.waitForTimeout(500);
          }
          
          return { userType: 'searcher', queriesSent: queries.length };
        },

        // Conversationalist: engages in long conversation
        async (page: any, userIndex: number) => {
          await page.act('Upload document for conversation');
          await page.observe('Wait for processing');
          
          const conversation = [
            'Tell me about this document',
            'Can you elaborate on that?',
            'What are the implications?',
            'How does this relate to current trends?',
            'Can you provide more examples?'
          ];
          
          for (const message of conversation) {
            await ragHelpers.sendChatMessage(page, message, { waitForResponse: true });
            await page.waitForTimeout(300);
          }
          
          return { userType: 'conversationalist', conversationLength: conversation.length };
        },

        // Model switcher: frequently changes models
        async (page: any, userIndex: number) => {
          await page.act('Upload document for model testing');
          await page.observe('Wait for processing');
          
          const models = ['GPT-4', 'Claude 3 Opus', 'Claude 3 Sonnet'];
          let switches = 0;
          
          for (const model of models) {
            await ragHelpers.selectModel(page, model);
            await ragHelpers.sendChatMessage(page, `Test with ${model}`, { waitForResponse: true });
            switches++;
            await page.waitForTimeout(500);
          }
          
          return { userType: 'model-switcher', modelSwitches: switches };
        }
      ];

      // Execute all user behaviors concurrently
      const behaviorPromises = pages.map((page, index) => 
        userBehaviors[index](page, index)
      );

      const results = await Promise.all(behaviorPromises);

      // Verify all users completed their tasks
      expect(results.length).toBe(userCount);
      expect(results.every(result => result.userType)).toBe(true);

      // Check system stability under mixed load
      const systemStability = await pages[0].extract<{
        allUsersServed: boolean;
        noDataCorruption: boolean;
        performanceAcceptable: boolean;
        isolationMaintained: boolean;
      }>({
        instruction: 'Evaluate if all users were served, no data corruption occurred, performance was acceptable, and user isolation was maintained',
        schema: {
          type: 'object',
          properties: {
            allUsersServed: { type: 'boolean' },
            noDataCorruption: { type: 'boolean' },
            performanceAcceptable: { type: 'boolean' },
            isolationMaintained: { type: 'boolean' }
          }
        }
      });

      expect(systemStability.allUsersServed).toBe(true);
      expect(systemStability.noDataCorruption).toBe(true);
      expect(systemStability.performanceAcceptable).toBe(true);

    } finally {
      // Cleanup
      for (const page of pages) {
        if (page.stagehand) {
          await page.stagehand.close();
        }
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('session isolation and data privacy', async () => {
    const userCount = 3;
    const contexts: BrowserContext[] = [];
    const pages: any[] = [];

    try {
      // Create multiple user sessions
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
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

        contexts.push(context);
        pages.push(stagehandPage);

        await stagehandPage.goto('/');
        await stagehandPage.waitForLoadState('networkidle');
      }

      // Each user uploads a unique document with sensitive information
      const sensitiveData = [
        'Confidential User 1 Document with secret information ABC123',
        'Private User 2 Data containing sensitive details XYZ789',
        'Personal User 3 Content with confidential material DEF456'
      ];

      for (let i = 0; i < pages.length; i++) {
        await pages[i].act(`Upload document with unique content: ${sensitiveData[i]}`);
        await pages[i].observe('Wait for processing');
      }

      // Each user queries about their document
      const queryPromises = pages.map((page, index) => 
        ragHelpers.sendChatMessage(
          page,
          'Tell me about the confidential information in my document',
          { waitForResponse: true }
        )
      );

      await Promise.all(queryPromises);

      // Verify data isolation
      for (let i = 0; i < pages.length; i++) {
        const userResponse = await pages[i].extract<{
          containsOwnData: boolean;
          containsOtherUsersData: boolean;
          responseContent: string;
        }>({
          instruction: 'Check if the response contains this user\'s data and whether it contains other users\' data',
          schema: {
            type: 'object',
            properties: {
              containsOwnData: { type: 'boolean' },
              containsOtherUsersData: { type: 'boolean' },
              responseContent: { type: 'string' }
            }
          }
        });

        // Should contain own data
        expect(userResponse.containsOwnData).toBe(true);
        
        // Should NOT contain other users' data
        expect(userResponse.containsOtherUsersData).toBe(false);

        // Verify no cross-contamination
        for (let j = 0; j < sensitiveData.length; j++) {
          if (i !== j) {
            expect(userResponse.responseContent).not.toContain(sensitiveData[j]);
          }
        }
      }

      // Test document visibility isolation
      for (let i = 0; i < pages.length; i++) {
        const visibleDocuments = await pages[i].extract<string[]>({
          instruction: 'List all documents visible to this user',
          schema: {
            type: 'array',
            items: { type: 'string' }
          }
        });

        // Each user should only see their own documents
        expect(visibleDocuments.length).toBe(1);
      }

    } finally {
      // Cleanup
      for (const page of pages) {
        if (page.stagehand) {
          await page.stagehand.close();
        }
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('system recovery under concurrent load failures', async () => {
    const userCount = 5;
    const contexts: BrowserContext[] = [];
    const pages: any[] = [];

    try {
      // Create multiple user sessions
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
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

        contexts.push(context);
        pages.push(stagehandPage);

        await stagehandPage.goto('/');
        await stagehandPage.waitForLoadState('networkidle');
      }

      // All users upload documents
      const uploadPromises = pages.map(async (page, index) => {
        await page.act(`Upload document for recovery test user ${index + 1}`);
        await page.observe('Wait for processing');
      });

      await Promise.all(uploadPromises);

      // Simulate network interruption for half the users
      const halfwayPoint = Math.floor(userCount / 2);
      
      for (let i = 0; i < halfwayPoint; i++) {
        await contexts[i].setOffline(true);
      }

      // All users attempt to send messages
      const messagePromises = pages.map(async (page, index) => {
        try {
          await ragHelpers.sendChatMessage(
            page,
            `Recovery test message from user ${index + 1}`,
            { waitForResponse: true }
          );
          return { userId: index + 1, success: true, error: null };
        } catch (error) {
          return { userId: index + 1, success: false, error: error.message };
        }
      });

      const messageResults = await Promise.all(messagePromises);

      // Online users should succeed
      for (let i = halfwayPoint; i < userCount; i++) {
        expect(messageResults[i].success).toBe(true);
      }

      // Offline users should fail gracefully
      for (let i = 0; i < halfwayPoint; i++) {
        expect(messageResults[i].success).toBe(false);
      }

      // Restore network for offline users
      for (let i = 0; i < halfwayPoint; i++) {
        await contexts[i].setOffline(false);
        await pages[i].waitForTimeout(2000); // Wait for reconnection
      }

      // Previously offline users should now be able to send messages
      const recoveryPromises = pages.slice(0, halfwayPoint).map(async (page, index) => {
        try {
          await ragHelpers.sendChatMessage(
            page,
            `Recovery successful message from user ${index + 1}`,
            { waitForResponse: true }
          );
          return { userId: index + 1, recovered: true };
        } catch (error) {
          return { userId: index + 1, recovered: false, error: error.message };
        }
      });

      const recoveryResults = await Promise.all(recoveryPromises);

      // All users should recover successfully
      expect(recoveryResults.every(result => result.recovered)).toBe(true);

      // Verify system stability after recovery
      const systemStabilityAfterRecovery = await pages[0].extract<{
        allUsersOperational: boolean;
        dataIntegrityMaintained: boolean;
        performanceRestored: boolean;
      }>({
        instruction: 'Check if all users are operational, data integrity is maintained, and performance is restored',
        schema: {
          type: 'object',
          properties: {
            allUsersOperational: { type: 'boolean' },
            dataIntegrityMaintained: { type: 'boolean' },
            performanceRestored: { type: 'boolean' }
          }
        }
      });

      expect(systemStabilityAfterRecovery.allUsersOperational).toBe(true);
      expect(systemStabilityAfterRecovery.dataIntegrityMaintained).toBe(true);

    } finally {
      // Cleanup
      for (const page of pages) {
        if (page.stagehand) {
          await page.stagehand.close();
        }
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  });
});