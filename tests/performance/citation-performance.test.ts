// Performance Tests for Citation Artifact
import { test, expect, type Page } from '@playwright/test';
import { generateTestChatSession } from '../helpers/chat-helpers';
import { waitForArtifactLoad } from '../helpers/artifact-helpers';

test.describe('Citation Artifact Performance Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable performance tracking
    await page.coverage.startJSCoverage();
    await page.coverage.startCSSCoverage();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // Stop coverage tracking
    await page.coverage.stopJSCoverage();
    await page.coverage.stopCSSCoverage();
    
    await page.close();
  });

  test('citation artifact load time performance', async () => {
    const startTime = Date.now();
    
    await generateTestChatSession(page, {
      message: 'Performance test: Create research summary with 10 citations',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Check that all citations are rendered
    const citationCount = await page.locator('sup[role="button"]').count();
    expect(citationCount).toBeGreaterThan(0);
    
    console.log(`Citation artifact loaded in ${loadTime}ms with ${citationCount} citations`);
  });

  test('large document performance (100+ citations)', async () => {
    const startTime = Date.now();
    
    await generateTestChatSession(page, {
      message: 'Performance test: Generate comprehensive research document with 100+ citations from multiple sources',
      artifactType: 'citation',
      mockLargeContent: true,
    });

    await waitForArtifactLoad(page, 'citation');
    
    const loadTime = Date.now() - startTime;
    
    // Large document should still load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    const citationCount = await page.locator('sup[role="button"]').count();
    console.log(`Large document loaded in ${loadTime}ms with ${citationCount} citations`);
    
    // Test scrolling performance
    const scrollStartTime = Date.now();
    
    await page.locator('[role="article"]').evaluate(el => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    
    // Wait for scroll animation to complete
    await page.waitForTimeout(1000);
    
    const scrollTime = Date.now() - scrollStartTime;
    expect(scrollTime).toBeLessThan(2000);
    
    console.log(`Scroll performance: ${scrollTime}ms`);
  });

  test('citation interaction performance', async () => {
    await generateTestChatSession(page, {
      message: 'Interaction performance test with multiple citations',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    const citations = page.locator('sup[role="button"]');
    const citationCount = await citations.count();
    
    // Test rapid citation clicking performance
    const interactionStartTime = Date.now();
    
    for (let i = 0; i < Math.min(citationCount, 10); i++) {
      await citations.nth(i).click();
      // Small delay to allow state updates
      await page.waitForTimeout(50);
    }
    
    const interactionTime = Date.now() - interactionStartTime;
    
    // Should handle rapid interactions efficiently
    expect(interactionTime).toBeLessThan(2000);
    
    console.log(`Citation interaction performance: ${interactionTime}ms for ${Math.min(citationCount, 10)} interactions`);
  });

  test('source modal open/close performance', async () => {
    await generateTestChatSession(page, {
      message: 'Modal performance test with detailed sources',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    const sources = page.locator('[role="button"][aria-label*="Open source:"]');
    const sourceCount = await sources.count();
    
    const modalPerformanceResults = [];
    
    // Test modal performance for multiple sources
    for (let i = 0; i < Math.min(sourceCount, 5); i++) {
      const openStartTime = Date.now();
      
      // Open modal
      await sources.nth(i).click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      const openTime = Date.now() - openStartTime;
      
      const closeStartTime = Date.now();
      
      // Close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      const closeTime = Date.now() - closeStartTime;
      
      modalPerformanceResults.push({ open: openTime, close: closeTime });
      
      // Brief pause between tests
      await page.waitForTimeout(100);
    }
    
    const avgOpenTime = modalPerformanceResults.reduce((sum, result) => sum + result.open, 0) / modalPerformanceResults.length;
    const avgCloseTime = modalPerformanceResults.reduce((sum, result) => sum + result.close, 0) / modalPerformanceResults.length;
    
    // Modal should open/close quickly
    expect(avgOpenTime).toBeLessThan(500);
    expect(avgCloseTime).toBeLessThan(300);
    
    console.log(`Modal performance - Avg open: ${avgOpenTime}ms, Avg close: ${avgCloseTime}ms`);
  });

  test('statistics panel toggle performance', async () => {
    await generateTestChatSession(page, {
      message: 'Statistics performance test with complex data',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    const statsButton = page.locator('button[aria-label*="Show statistics"]');
    const toggleResults = [];
    
    // Test multiple toggle operations
    for (let i = 0; i < 10; i++) {
      const showStartTime = Date.now();
      
      // Show statistics
      await statsButton.click();
      await expect(page.locator('text=Total Citations')).toBeVisible();
      
      const showTime = Date.now() - showStartTime;
      
      const hideStartTime = Date.now();
      
      // Hide statistics
      const hideButton = page.locator('button[aria-label*="Hide statistics"]');
      await hideButton.click();
      await expect(page.locator('[role="button"][aria-label*="Open source:"]')).toBeVisible();
      
      const hideTime = Date.now() - hideStartTime;
      
      toggleResults.push({ show: showTime, hide: hideTime });
    }
    
    const avgShowTime = toggleResults.reduce((sum, result) => sum + result.show, 0) / toggleResults.length;
    const avgHideTime = toggleResults.reduce((sum, result) => sum + result.hide, 0) / toggleResults.length;
    
    // Panel toggles should be fast
    expect(avgShowTime).toBeLessThan(300);
    expect(avgHideTime).toBeLessThan(300);
    
    console.log(`Statistics panel performance - Avg show: ${avgShowTime}ms, Avg hide: ${avgHideTime}ms`);
  });

  test('memory usage during extended use', async () => {
    await generateTestChatSession(page, {
      message: 'Memory test with multiple citation artifacts',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null;
    });
    
    // Perform intensive operations
    const citations = page.locator('sup[role="button"]');
    const citationCount = await citations.count();
    
    // Simulate extended usage
    for (let cycle = 0; cycle < 5; cycle++) {
      // Click all citations
      for (let i = 0; i < citationCount; i++) {
        await citations.nth(i).click();
        await page.waitForTimeout(10);
      }
      
      // Open and close modals
      const sources = page.locator('[role="button"][aria-label*="Open source:"]');
      const sourceCount = await sources.count();
      
      for (let i = 0; i < Math.min(sourceCount, 3); i++) {
        await sources.nth(i).click();
        await page.waitForTimeout(50);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(50);
      }
      
      // Toggle statistics
      await page.locator('button[aria-label*="Show statistics"]').click();
      await page.waitForTimeout(50);
      await page.locator('button[aria-label*="Hide statistics"]').click();
      await page.waitForTimeout(50);
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercentage = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      
      console.log(`Memory usage increase: ${memoryIncrease} bytes (${memoryIncreasePercentage.toFixed(2)}%)`);
      
      // Memory increase should be reasonable (less than 50% for extended use)
      expect(memoryIncreasePercentage).toBeLessThan(50);
    }
  });

  test('citation rendering performance with animations', async () => {
    await generateTestChatSession(page, {
      message: 'Animation performance test with hover effects',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    const citations = page.locator('sup[role="button"]');
    const citationCount = await citations.count();
    
    // Test hover performance
    const hoverStartTime = Date.now();
    
    for (let i = 0; i < Math.min(citationCount, 20); i++) {
      await citations.nth(i).hover();
      await page.waitForTimeout(50); // Allow animation
      
      // Move to another element to trigger unhover
      await page.locator('h1').hover();
      await page.waitForTimeout(50);
    }
    
    const hoverTime = Date.now() - hoverStartTime;
    
    // Hover animations should be smooth
    expect(hoverTime).toBeLessThan(3000);
    
    console.log(`Hover animation performance: ${hoverTime}ms for ${Math.min(citationCount, 20)} hovers`);
  });

  test('streaming performance during citation generation', async () => {
    const streamingStartTime = Date.now();
    
    // Start streaming
    await page.fill('textarea[placeholder*="Send a message"]', 'Streaming performance test with real-time citation updates');
    await page.press('textarea[placeholder*="Send a message"]', 'Enter');
    
    // Wait for streaming to start
    await expect(page.locator('text=Processing citations...')).toBeVisible({ timeout: 10000 });
    
    const streamingIndicatorTime = Date.now() - streamingStartTime;
    
    // Streaming should start quickly
    expect(streamingIndicatorTime).toBeLessThan(3000);
    
    // Monitor streaming updates
    let updateCount = 0;
    const updateStartTime = Date.now();
    
    // Wait for artifact to complete
    await waitForArtifactLoad(page, 'citation');
    
    const totalStreamingTime = Date.now() - updateStartTime;
    
    console.log(`Streaming performance: Started in ${streamingIndicatorTime}ms, completed in ${totalStreamingTime}ms`);
    
    // Total streaming should complete within reasonable time
    expect(totalStreamingTime).toBeLessThan(15000);
  });

  test('responsive layout performance', async () => {
    await generateTestChatSession(page, {
      message: 'Responsive performance test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];
    
    const resizeResults = [];
    
    for (const viewport of viewports) {
      const resizeStartTime = Date.now();
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for layout to settle
      await page.waitForTimeout(300);
      
      // Verify layout is functional
      await expect(page.locator('[data-testid="artifact"]')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      
      const resizeTime = Date.now() - resizeStartTime;
      resizeResults.push({ viewport: viewport.name, time: resizeTime });
    }
    
    const avgResizeTime = resizeResults.reduce((sum, result) => sum + result.time, 0) / resizeResults.length;
    
    // Layout should adapt quickly to viewport changes
    expect(avgResizeTime).toBeLessThan(1000);
    
    console.log(`Responsive performance - Avg resize time: ${avgResizeTime}ms`);
    resizeResults.forEach(result => {
      console.log(`${result.viewport}: ${result.time}ms`);
    });
  });

  test('concurrent operations performance', async () => {
    await generateTestChatSession(page, {
      message: 'Concurrent operations performance test',
      artifactType: 'citation',
    });

    await waitForArtifactLoad(page, 'citation');
    
    // Test multiple simultaneous operations
    const concurrentStartTime = Date.now();
    
    await Promise.all([
      // Click multiple citations simultaneously
      page.locator('sup[role="button"]').first().click(),
      page.locator('sup[role="button"]').nth(1).click(),
      
      // Hover over source cards
      page.locator('[role="button"][aria-label*="Open source:"]').first().hover(),
      
      // Toggle statistics
      page.locator('button[aria-label*="Show statistics"]').click(),
      
      // Scroll content
      page.locator('[role="article"]').evaluate(el => {
        el.scrollTop = 100;
      }),
    ]);
    
    const concurrentTime = Date.now() - concurrentStartTime;
    
    // Concurrent operations should complete quickly
    expect(concurrentTime).toBeLessThan(1000);
    
    console.log(`Concurrent operations performance: ${concurrentTime}ms`);
  });
});