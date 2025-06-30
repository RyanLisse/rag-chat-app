// Performance Testing Utilities
import { expect } from 'bun:test';
import type { Page } from '@playwright/test';

export interface PerformanceMetrics {
  responseTime: number;
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  tti: number; // Time to Interactive
  totalBlockingTime: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface PerformanceThresholds {
  maxResponseTime?: number;
  maxTTFB?: number;
  maxFCP?: number;
  maxLCP?: number;
  maxCLS?: number;
  maxFID?: number;
  maxTTI?: number;
  maxTotalBlockingTime?: number;
  maxMemoryUsage?: number;
}

// Default performance thresholds based on Web Vitals
export const defaultThresholds: PerformanceThresholds = {
  maxResponseTime: 3000, // 3 seconds
  maxTTFB: 800, // 800ms
  maxFCP: 1800, // 1.8 seconds
  maxLCP: 2500, // 2.5 seconds
  maxCLS: 0.1, // 0.1 score
  maxFID: 100, // 100ms
  maxTTI: 3800, // 3.8 seconds
  maxTotalBlockingTime: 300, // 300ms
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
};

// Performance measurement class
export class PerformanceTester {
  private page: Page;
  private thresholds: PerformanceThresholds;

  constructor(page: Page, thresholds: PerformanceThresholds = defaultThresholds) {
    this.page = page;
    this.thresholds = thresholds;
  }

  // Measure page load performance
  async measurePageLoad(url: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    await this.page.goto(url, { waitUntil: 'networkidle' });
    
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop()?.startTime || 0;
      
      // Calculate CLS
      let cls = 0;
      const layoutShifts = performance.getEntriesByType('layout-shift') as any[];
      layoutShifts.forEach(shift => {
        if (!shift.hadRecentInput) {
          cls += shift.value;
        }
      });
      
      return {
        ttfb: navigation.responseStart - navigation.requestStart,
        fcp,
        lcp,
        cls,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        // @ts-ignore
        memoryUsage: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        } : undefined,
      };
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      responseTime,
      ttfb: metrics.ttfb,
      fcp: metrics.fcp,
      lcp: metrics.lcp,
      cls: metrics.cls,
      fid: 0, // FID requires user interaction
      tti: metrics.domContentLoaded,
      totalBlockingTime: 0, // Requires more complex calculation
      memoryUsage: metrics.memoryUsage,
    };
  }

  // Measure API endpoint performance
  async measureAPICall(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{
    responseTime: number;
    ttfb: number;
    size: number;
    status: number;
  }> {
    const startTime = performance.now();
    let ttfb = 0;
    
    const response = await fetch(endpoint, {
      ...options,
      // @ts-ignore
      onProgress: () => {
        if (ttfb === 0) {
          ttfb = performance.now() - startTime;
        }
      },
    });
    
    const responseTime = performance.now() - startTime;
    const data = await response.text();
    
    return {
      responseTime,
      ttfb: ttfb || responseTime,
      size: new Blob([data]).size,
      status: response.status,
    };
  }

  // Measure streaming response performance
  async measureStreamingResponse(
    endpoint: string,
    body: any
  ): Promise<{
    firstChunkTime: number;
    totalTime: number;
    chunks: number;
    totalSize: number;
    averageChunkDelay: number;
  }> {
    const startTime = performance.now();
    let firstChunkTime = 0;
    let chunks = 0;
    let totalSize = 0;
    const chunkDelays: number[] = [];
    let lastChunkTime = startTime;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.body) throw new Error('No response body');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const currentTime = performance.now();
      
      if (firstChunkTime === 0) {
        firstChunkTime = currentTime - startTime;
      }
      
      chunks++;
      totalSize += value.length;
      chunkDelays.push(currentTime - lastChunkTime);
      lastChunkTime = currentTime;
    }
    
    const totalTime = performance.now() - startTime;
    const averageChunkDelay = chunkDelays.reduce((a, b) => a + b, 0) / chunkDelays.length;
    
    return {
      firstChunkTime,
      totalTime,
      chunks,
      totalSize,
      averageChunkDelay,
    };
  }

  // Assert performance metrics meet thresholds
  assertMetrics(metrics: PerformanceMetrics) {
    if (this.thresholds.maxResponseTime) {
      expect(metrics.responseTime).toBeLessThanOrEqual(this.thresholds.maxResponseTime);
    }
    
    if (this.thresholds.maxTTFB) {
      expect(metrics.ttfb).toBeLessThanOrEqual(this.thresholds.maxTTFB);
    }
    
    if (this.thresholds.maxFCP) {
      expect(metrics.fcp).toBeLessThanOrEqual(this.thresholds.maxFCP);
    }
    
    if (this.thresholds.maxLCP) {
      expect(metrics.lcp).toBeLessThanOrEqual(this.thresholds.maxLCP);
    }
    
    if (this.thresholds.maxCLS) {
      expect(metrics.cls).toBeLessThanOrEqual(this.thresholds.maxCLS);
    }
    
    if (this.thresholds.maxMemoryUsage && metrics.memoryUsage) {
      expect(metrics.memoryUsage.usedJSHeapSize).toBeLessThanOrEqual(
        this.thresholds.maxMemoryUsage
      );
    }
  }

  // Profile specific user interactions
  async profileInteraction(
    name: string,
    interaction: () => Promise<void>
  ): Promise<{
    duration: number;
    layoutShifts: number;
    longTasks: number;
  }> {
    // Start performance observer
    await this.page.evaluate(() => {
      // @ts-ignore
      window.__performanceMarks = {
        layoutShifts: 0,
        longTasks: 0,
      };
      
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            // @ts-ignore
            window.__performanceMarks.layoutShifts += (entry as any).value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });
      
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Long task threshold
            // @ts-ignore
            window.__performanceMarks.longTasks++;
          }
        }
      }).observe({ entryTypes: ['longtask'] });
    });
    
    const startTime = performance.now();
    await interaction();
    const duration = performance.now() - startTime;
    
    const marks = await this.page.evaluate(() => {
      // @ts-ignore
      return window.__performanceMarks;
    });
    
    return {
      duration,
      layoutShifts: marks.layoutShifts,
      longTasks: marks.longTasks,
    };
  }
}

// Performance test scenarios for RAG chat
export const performanceScenarios = {
  // Test initial page load
  async testInitialLoad(page: Page) {
    const tester = new PerformanceTester(page);
    const metrics = await tester.measurePageLoad('/');
    tester.assertMetrics(metrics);
    return metrics;
  },

  // Test chat response performance
  async testChatResponse(page: Page) {
    const tester = new PerformanceTester(page);
    
    const result = await tester.profileInteraction('send-message', async () => {
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-testid="assistant-message"]');
    });
    
    expect(result.duration).toBeLessThan(3000);
    expect(result.layoutShifts).toBeLessThan(0.1);
    expect(result.longTasks).toBeLessThan(3);
    
    return result;
  },

  // Test file upload performance
  async testFileUpload(page: Page, filePath: string) {
    const tester = new PerformanceTester(page);
    
    const result = await tester.profileInteraction('file-upload', async () => {
      await page.setInputFiles('[data-testid="file-input"]', filePath);
      await page.waitForSelector('[data-testid="upload-complete"]');
    });
    
    expect(result.duration).toBeLessThan(5000);
    return result;
  },

  // Test streaming performance
  async testStreamingPerformance(endpoint: string, messages: any[]) {
    const tester = new PerformanceTester(null as any);
    
    const result = await tester.measureStreamingResponse(endpoint, { messages });
    
    expect(result.firstChunkTime).toBeLessThan(1000);
    expect(result.averageChunkDelay).toBeLessThan(100);
    expect(result.chunks).toBeGreaterThan(5);
    
    return result;
  },
};

// Load testing helper
export async function runLoadTest(
  scenario: () => Promise<any>,
  options: {
    concurrent: number;
    iterations: number;
    rampUp?: number;
  }
): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}> {
  const { concurrent, iterations, rampUp = 0 } = options;
  const results: number[] = [];
  let successfulRequests = 0;
  let failedRequests = 0;
  
  for (let i = 0; i < iterations; i++) {
    const batch = [];
    
    for (let j = 0; j < concurrent; j++) {
      batch.push(
        (async () => {
          const startTime = performance.now();
          try {
            await scenario();
            successfulRequests++;
            return performance.now() - startTime;
          } catch (error) {
            failedRequests++;
            return -1;
          }
        })()
      );
      
      if (rampUp > 0) {
        await new Promise(resolve => setTimeout(resolve, rampUp));
      }
    }
    
    const batchResults = await Promise.all(batch);
    results.push(...batchResults.filter(r => r > 0));
  }
  
  results.sort((a, b) => a - b);
  
  return {
    totalRequests: concurrent * iterations,
    successfulRequests,
    failedRequests,
    averageResponseTime: results.reduce((a, b) => a + b, 0) / results.length,
    p95ResponseTime: results[Math.floor(results.length * 0.95)],
    p99ResponseTime: results[Math.floor(results.length * 0.99)],
  };
}