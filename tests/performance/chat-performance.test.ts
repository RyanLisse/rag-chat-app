// Performance Tests for RAG Chat Application
import { test, expect } from '@playwright/test';
import { 
  PerformanceTester,
  performanceScenarios,
  runLoadTest,
  defaultThresholds 
} from './performance-testing';
import { createTestFile } from '../factories';

test.describe('RAG Chat Performance Tests', () => {
  test('should load initial page within performance budget', async ({ page }) => {
    const metrics = await performanceScenarios.testInitialLoad(page);
    
    // Log metrics for monitoring
    console.log('Page Load Metrics:', {
      responseTime: `${metrics.responseTime}ms`,
      ttfb: `${metrics.ttfb}ms`,
      fcp: `${metrics.fcp}ms`,
      lcp: `${metrics.lcp}ms`,
      cls: metrics.cls,
    });
    
    // Assertions are handled within testInitialLoad
    expect(metrics.responseTime).toBeLessThan(3000);
  });

  test('should handle chat responses efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const result = await performanceScenarios.testChatResponse(page);
    
    console.log('Chat Response Performance:', {
      duration: `${result.duration}ms`,
      layoutShifts: result.layoutShifts,
      longTasks: result.longTasks,
    });
  });

  test('should handle file uploads within time limits', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create a test file
    const testFile = await test.step('Create test file', async () => {
      const file = createTestFile({
        name: 'test-document.pdf',
        content: 'A'.repeat(1024 * 1024), // 1MB file
        type: 'application/pdf',
      });
      
      // Save file temporarily
      const fs = require('fs');
      const path = require('path');
      const tempPath = path.join(__dirname, 'temp-test-file.pdf');
      fs.writeFileSync(tempPath, Buffer.from(await file.arrayBuffer()));
      return tempPath;
    });
    
    const result = await performanceScenarios.testFileUpload(page, testFile);
    
    console.log('File Upload Performance:', {
      duration: `${result.duration}ms`,
    });
    
    // Cleanup
    const fs = require('fs');
    fs.unlinkSync(testFile);
  });

  test('should stream responses efficiently', async ({ page }) => {
    const messages = [
      {
        role: 'user',
        content: 'Explain quantum computing in detail with examples',
      },
    ];
    
    const result = await performanceScenarios.testStreamingPerformance(
      '/api/chat',
      messages
    );
    
    console.log('Streaming Performance:', {
      firstChunkTime: `${result.firstChunkTime}ms`,
      totalTime: `${result.totalTime}ms`,
      chunks: result.chunks,
      averageChunkDelay: `${result.averageChunkDelay}ms`,
      throughput: `${(result.totalSize / result.totalTime * 1000).toFixed(2)} bytes/sec`,
    });
  });

  test('should handle concurrent users (load test)', async ({ page }) => {
    // Skip in CI to avoid overloading
    test.skip(process.env.CI === 'true', 'Skip load test in CI');
    
    const chatScenario = async () => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      // Consume the stream
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
    };
    
    const loadTestResults = await runLoadTest(chatScenario, {
      concurrent: 5,
      iterations: 10,
      rampUp: 100, // 100ms between each concurrent request
    });
    
    console.log('Load Test Results:', {
      totalRequests: loadTestResults.totalRequests,
      successRate: `${(loadTestResults.successfulRequests / loadTestResults.totalRequests * 100).toFixed(2)}%`,
      averageResponseTime: `${loadTestResults.averageResponseTime.toFixed(2)}ms`,
      p95ResponseTime: `${loadTestResults.p95ResponseTime.toFixed(2)}ms`,
      p99ResponseTime: `${loadTestResults.p99ResponseTime.toFixed(2)}ms`,
    });
    
    // Assert acceptable performance under load
    expect(loadTestResults.successfulRequests / loadTestResults.totalRequests).toBeGreaterThan(0.95); // 95% success rate
    expect(loadTestResults.p95ResponseTime).toBeLessThan(5000); // 5s p95
  });

  test('should profile memory usage during extended sessions', async ({ page }) => {
    await page.goto('/');
    
    const tester = new PerformanceTester(page);
    const memorySnapshots = [];
    
    // Simulate extended usage
    for (let i = 0; i < 10; i++) {
      await page.fill('[data-testid="chat-input"]', `Test message ${i}`);
      await page.keyboard.press('Enter');
      await page.waitForSelector(`[data-testid="assistant-message"]:nth-of-type(${i + 1})`);
      
      // Capture memory snapshot
      const metrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          };
        }
        return null;
      });
      
      if (metrics) {
        memorySnapshots.push({
          iteration: i,
          heapUsed: metrics.usedJSHeapSize,
          heapTotal: metrics.totalJSHeapSize,
        });
      }
    }
    
    // Check for memory leaks
    if (memorySnapshots.length > 0) {
      const initialHeap = memorySnapshots[0].heapUsed;
      const finalHeap = memorySnapshots[memorySnapshots.length - 1].heapUsed;
      const heapGrowth = finalHeap - initialHeap;
      const growthPercentage = (heapGrowth / initialHeap) * 100;
      
      console.log('Memory Usage Analysis:', {
        initialHeap: `${(initialHeap / 1024 / 1024).toFixed(2)}MB`,
        finalHeap: `${(finalHeap / 1024 / 1024).toFixed(2)}MB`,
        growth: `${(heapGrowth / 1024 / 1024).toFixed(2)}MB (${growthPercentage.toFixed(2)}%)`,
      });
      
      // Assert reasonable memory growth (less than 50%)
      expect(growthPercentage).toBeLessThan(50);
    }
  });

  test('should maintain performance with large documents', async ({ page }) => {
    await page.goto('/');
    const tester = new PerformanceTester(page);
    
    // Profile large document handling
    const result = await tester.profileInteraction('large-document-upload', async () => {
      // Create a large document (5MB)
      const largeContent = 'Lorem ipsum '.repeat(500000);
      const file = createTestFile({
        name: 'large-document.txt',
        content: largeContent,
        type: 'text/plain',
      });
      
      // Upload and wait for processing
      await page.setInputFiles('[data-testid="file-input"]', file);
      await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 });
    });
    
    console.log('Large Document Performance:', {
      duration: `${result.duration}ms`,
      layoutShifts: result.layoutShifts,
      longTasks: result.longTasks,
    });
    
    // Large documents should still process within reasonable time
    expect(result.duration).toBeLessThan(10000); // 10 seconds
    expect(result.longTasks).toBeLessThan(10); // Minimize blocking
  });
});