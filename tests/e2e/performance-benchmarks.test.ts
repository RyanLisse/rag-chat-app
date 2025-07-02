// Performance Benchmarks E2E Tests
import { test, expect, ragHelpers } from '../helpers/stagehand-integration';
import { getTestURL } from '../helpers/test-config';

test.describe('Performance Benchmarks', () => {
  let performanceMetrics: Array<{
    testName: string;
    metrics: any;
    timestamp: Date;
  }> = [];

  test.beforeEach(async ({ stagehandPage }) => {
    await stagehandPage.goto('/');
    await stagehandPage.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    // Log performance metrics summary
    console.log('Performance Benchmarks Summary:');
    performanceMetrics.forEach(metric => {
      console.log(`${metric.testName}:`, JSON.stringify(metric.metrics, null, 2));
    });
  });

  test('page load performance', async ({ stagehandPage }) => {
    const startTime = Date.now();
    
    // Clear cache and reload to get accurate metrics
    await stagehandPage.context().clearCookies();
    await stagehandPage.reload();
    
    // Capture performance metrics
    const perfMetrics = await stagehandPage.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        timeToFirstByte: navigation.responseStart - navigation.requestStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: paint.find(p => p.name === 'largest-contentful-paint')?.startTime || 0,
        totalLoadTime: Date.now() - performance.timing.navigationStart
      };
    });

    // Performance thresholds (in milliseconds)
    expect(perfMetrics.timeToFirstByte).toBeLessThan(1000); // < 1s TTFB
    expect(perfMetrics.firstContentfulPaint).toBeLessThan(2000); // < 2s FCP
    expect(perfMetrics.domContentLoaded).toBeLessThan(500); // < 0.5s DOM ready
    expect(perfMetrics.totalLoadTime).toBeLessThan(5000); // < 5s total load

    performanceMetrics.push({
      testName: 'Page Load Performance',
      metrics: perfMetrics,
      timestamp: new Date()
    });
  });

  test('file upload performance', async ({ stagehandPage }) => {
    const fileSizes = [
      { name: 'small', size: 10 * 1024 }, // 10KB
      { name: 'medium', size: 100 * 1024 }, // 100KB
      { name: 'large', size: 1024 * 1024 }, // 1MB
      { name: 'xlarge', size: 5 * 1024 * 1024 } // 5MB
    ];

    const uploadMetrics = [];

    for (const fileSize of fileSizes) {
      const startTime = performance.now();
      
      // Create test file of specific size
      const content = 'A'.repeat(fileSize.size);
      
      // Upload the file
      await stagehandPage.act(`Upload a ${fileSize.name} file of size ${fileSize.size} bytes`);
      
      // Wait for upload completion
      await stagehandPage.observe('Wait for upload to complete and file to be processed');
      
      const endTime = performance.now();
      const uploadTime = endTime - startTime;
      
      // Performance expectations based on file size
      let expectedMaxTime;
      switch (fileSize.name) {
        case 'small': expectedMaxTime = 2000; break; // 2s
        case 'medium': expectedMaxTime = 5000; break; // 5s
        case 'large': expectedMaxTime = 15000; break; // 15s
        case 'xlarge': expectedMaxTime = 30000; break; // 30s
      }

      expect(uploadTime).toBeLessThan(expectedMaxTime);

      uploadMetrics.push({
        fileSize: fileSize.name,
        sizeBytes: fileSize.size,
        uploadTimeMs: uploadTime,
        throughputKbps: (fileSize.size / 1024) / (uploadTime / 1000)
      });
    }

    performanceMetrics.push({
      testName: 'File Upload Performance',
      metrics: { uploads: uploadMetrics },
      timestamp: new Date()
    });
  });

  test('chat response performance', async ({ stagehandPage }) => {
    // Upload a reference document
    await stagehandPage.act('Upload a test document for chat performance');
    await stagehandPage.observe('Wait for processing');

    const responseTypes = [
      { type: 'simple', query: 'What is AI?', expectedMaxTime: 5000 },
      { type: 'complex', query: 'Compare different machine learning algorithms and their use cases', expectedMaxTime: 15000 },
      { type: 'document-search', query: 'Find specific information in the uploaded document', expectedMaxTime: 10000 },
      { type: 'multi-turn', query: 'Based on your previous answer, elaborate on neural networks', expectedMaxTime: 12000 }
    ];

    const responseMetrics = [];

    for (const responseType of responseTypes) {
      const startTime = performance.now();
      
      await ragHelpers.sendChatMessage(
        stagehandPage,
        responseType.query,
        { waitForResponse: true }
      );
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(responseType.expectedMaxTime);

      // Measure time to first token (streaming)
      const streamingMetrics = await stagehandPage.extract<{
        timeToFirstToken: number;
        streamingSmooth: boolean;
        responseLength: number;
      }>({
        instruction: 'Analyze the response time to first token, streaming smoothness, and response length',
        schema: {
          type: 'object',
          properties: {
            timeToFirstToken: { type: 'number' },
            streamingSmooth: { type: 'boolean' },
            responseLength: { type: 'number' }
          }
        }
      });

      responseMetrics.push({
        type: responseType.type,
        query: responseType.query,
        totalResponseTime: responseTime,
        timeToFirstToken: streamingMetrics.timeToFirstToken,
        streamingSmooth: streamingMetrics.streamingSmooth,
        responseLength: streamingMetrics.responseLength,
        wordsPerSecond: streamingMetrics.responseLength / (responseTime / 1000)
      });
    }

    performanceMetrics.push({
      testName: 'Chat Response Performance',
      metrics: { responses: responseMetrics },
      timestamp: new Date()
    });
  });

  test('search and citation performance', async ({ stagehandPage }) => {
    // Upload multiple documents
    const documentCount = 5;
    for (let i = 0; i < documentCount; i++) {
      await stagehandPage.act(`Upload document ${i + 1} for search performance testing`);
      await stagehandPage.observe('Wait for processing');
    }

    const searchQueries = [
      'Find information about machine learning',
      'What are the key concepts mentioned across all documents?',
      'Compare different approaches discussed in the documents',
      'Locate specific technical details about neural networks'
    ];

    const searchMetrics = [];

    for (const query of searchQueries) {
      const startTime = performance.now();
      
      await ragHelpers.sendChatMessage(
        stagehandPage,
        query,
        { waitForResponse: true }
      );
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;

      // Extract citation information
      const citations = await ragHelpers.extractCitations(stagehandPage);
      
      const citationMetrics = await stagehandPage.extract<{
        citationLoadTime: number;
        accuracyScore: number;
        relevanceScore: number;
      }>({
        instruction: 'Evaluate citation load time, accuracy score, and relevance score',
        schema: {
          type: 'object',
          properties: {
            citationLoadTime: { type: 'number' },
            accuracyScore: { type: 'number' },
            relevanceScore: { type: 'number' }
          }
        }
      });

      searchMetrics.push({
        query,
        searchTime,
        citationCount: citations.length,
        citationLoadTime: citationMetrics.citationLoadTime,
        accuracyScore: citationMetrics.accuracyScore,
        relevanceScore: citationMetrics.relevanceScore
      });

      // Search should complete within reasonable time
      expect(searchTime).toBeLessThan(20000); // 20 seconds max
      expect(citations.length).toBeGreaterThan(0); // Should find relevant citations
    }

    performanceMetrics.push({
      testName: 'Search and Citation Performance',
      metrics: { searches: searchMetrics },
      timestamp: new Date()
    });
  });

  test('memory usage and cleanup', async ({ stagehandPage }) => {
    // Baseline memory measurement
    const baselineMemory = await stagehandPage.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    // Generate load by creating many conversations
    const conversationCount = 20;
    for (let i = 0; i < conversationCount; i++) {
      await ragHelpers.sendChatMessage(
        stagehandPage,
        `Memory test message ${i + 1} with substantial content to test memory management`,
        { waitForResponse: true }
      );
      
      // Measure memory every 5 conversations
      if (i % 5 === 0) {
        const currentMemory = await stagehandPage.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory;
          }
          return null;
        });

        if (currentMemory && baselineMemory) {
          const memoryIncrease = currentMemory.usedJSHeapSize - baselineMemory.usedJSHeapSize;
          const memoryIncreasePercent = (memoryIncrease / baselineMemory.usedJSHeapSize) * 100;
          
          console.log(`Memory increase after ${i + 1} messages: ${memoryIncreasePercent.toFixed(2)}%`);
          
          // Memory increase should be reasonable
          expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase
        }
      }
    }

    // Test garbage collection or cleanup mechanisms
    const finalMemory = await stagehandPage.evaluate(() => {
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    performanceMetrics.push({
      testName: 'Memory Usage and Cleanup',
      metrics: {
        baselineMemory,
        finalMemory,
        conversationCount
      },
      timestamp: new Date()
    });
  });

  test('concurrent user simulation performance', async ({ browser }) => {
    const userCount = 5;
    const contexts = [];
    const pages = [];

    // Create multiple browser contexts to simulate concurrent users
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    const startTime = performance.now();

    // All users perform actions simultaneously
    const userActions = pages.map(async (page, index) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Each user uploads a document
      await page.evaluate(() => {
        // Simulate file upload
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          const file = new File(['test content'], `user${index}_doc.txt`, { type: 'text/plain' });
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Each user sends a message
      await page.fill('input[type="text"], textarea', `Message from user ${index + 1}`);
      await page.keyboard.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      return page;
    });

    await Promise.all(userActions);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Cleanup
    for (const context of contexts) {
      await context.close();
    }

    // Performance should scale reasonably with concurrent users
    expect(totalTime).toBeLessThan(30000); // 30 seconds for 5 users

    performanceMetrics.push({
      testName: 'Concurrent User Performance',
      metrics: {
        userCount,
        totalTime,
        averageTimePerUser: totalTime / userCount
      },
      timestamp: new Date()
    });
  });

  test('database and vector store performance', async ({ stagehandPage }) => {
    const vectorStoreMetrics = [];

    // Upload documents of varying sizes and types
    const documents = [
      { type: 'text', size: 'small', content: 'Short document content' },
      { type: 'text', size: 'medium', content: 'A'.repeat(1000) },
      { type: 'text', size: 'large', content: 'A'.repeat(10000) }
    ];

    for (const doc of documents) {
      const startTime = performance.now();
      
      // Upload and process document
      await stagehandPage.act(`Upload a ${doc.size} ${doc.type} document`);
      await stagehandPage.observe('Wait for vector processing to complete');
      
      const processingTime = performance.now() - startTime;
      
      // Test search performance on this document
      const searchStart = performance.now();
      await ragHelpers.sendChatMessage(
        stagehandPage,
        'Search for relevant information in the document',
        { waitForResponse: true }
      );
      const searchTime = performance.now() - searchStart;

      vectorStoreMetrics.push({
        documentSize: doc.size,
        processingTime,
        searchTime,
        processingRate: doc.content.length / (processingTime / 1000) // chars per second
      });

      // Performance expectations
      expect(processingTime).toBeLessThan(30000); // 30s max processing
      expect(searchTime).toBeLessThan(15000); // 15s max search
    }

    performanceMetrics.push({
      testName: 'Vector Store Performance',
      metrics: { vectorStore: vectorStoreMetrics },
      timestamp: new Date()
    });
  });

  test('network efficiency and caching', async ({ stagehandPage }) => {
    // Clear cache first
    await stagehandPage.context().clearCookies();
    
    // Capture network requests
    const networkRequests: Array<{
      url: string;
      method: string;
      size: number;
      time: number;
      cached: boolean;
    }> = [];

    stagehandPage.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        size: 0, // Will be updated on response
        time: Date.now(),
        cached: false
      });
    });

    stagehandPage.on('response', response => {
      const request = networkRequests.find(req => req.url === response.url());
      if (request) {
        request.size = response.headers()['content-length'] ? 
          parseInt(response.headers()['content-length']) : 0;
        request.cached = response.fromCache();
      }
    });

    // Perform typical user workflow
    await stagehandPage.reload();
    await stagehandPage.waitForLoadState('networkidle');
    
    await stagehandPage.act('Upload a document');
    await ragHelpers.sendChatMessage(
      stagehandPage,
      'Test network efficiency',
      { waitForResponse: true }
    );

    // Reload page to test caching
    await stagehandPage.reload();
    await stagehandPage.waitForLoadState('networkidle');

    const networkMetrics = {
      totalRequests: networkRequests.length,
      totalDataTransfer: networkRequests.reduce((sum, req) => sum + req.size, 0),
      cachedRequests: networkRequests.filter(req => req.cached).length,
      cacheHitRatio: networkRequests.filter(req => req.cached).length / networkRequests.length,
      averageRequestSize: networkRequests.reduce((sum, req) => sum + req.size, 0) / networkRequests.length
    };

    // Network efficiency expectations
    expect(networkMetrics.totalDataTransfer).toBeLessThan(10 * 1024 * 1024); // < 10MB total
    expect(networkMetrics.cacheHitRatio).toBeGreaterThan(0.3); // > 30% cache hit ratio

    performanceMetrics.push({
      testName: 'Network Efficiency',
      metrics: networkMetrics,
      timestamp: new Date()
    });
  });
});