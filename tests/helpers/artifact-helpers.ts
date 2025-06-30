// Helper functions for artifact testing
import { type Page, expect } from '@playwright/test';

export async function waitForArtifactLoad(page: Page, artifactType: string, timeout = 30000) {
  // Wait for artifact container to be visible
  await expect(page.locator('[data-testid="artifact"]')).toBeVisible({ timeout });
  
  // Wait for artifact-specific content based on type
  switch (artifactType) {
    case 'citation':
      await waitForCitationArtifactLoad(page, timeout);
      break;
    case 'text':
      await waitForTextArtifactLoad(page, timeout);
      break;
    case 'code':
      await waitForCodeArtifactLoad(page, timeout);
      break;
    default:
      // Generic wait for artifact content
      await expect(page.locator('[data-testid="artifact"] h1')).toBeVisible({ timeout });
  }
  
  // Wait for any animations to complete
  await page.waitForTimeout(500);
}

async function waitForCitationArtifactLoad(page: Page, timeout: number) {
  // Wait for main content elements
  await expect(page.locator('[role="main"]')).toBeVisible({ timeout });
  await expect(page.locator('[role="article"]')).toBeVisible({ timeout });
  await expect(page.locator('text=Sources & Citations')).toBeVisible({ timeout });
  
  // Wait for citations to load (at least one citation button should be present)
  await expect(page.locator('sup[role="button"]')).toHaveCount(1, { timeout });
  
  // Wait for sources to load
  await expect(page.locator('[role="button"][aria-label*="Open source:"]')).toHaveCount(1, { timeout });
  
  // Ensure streaming is complete
  await expect(page.locator('text=Processing citations...')).not.toBeVisible();
}

async function waitForTextArtifactLoad(page: Page, timeout: number) {
  await expect(page.locator('[data-testid="artifact"] .prose')).toBeVisible({ timeout });
}

async function waitForCodeArtifactLoad(page: Page, timeout: number) {
  await expect(page.locator('[data-testid="artifact"] .code-block')).toBeVisible({ timeout });
}

export async function getArtifactContent(page: Page, artifactType: string) {
  await waitForArtifactLoad(page, artifactType);
  
  switch (artifactType) {
    case 'citation':
      return await getCitationArtifactContent(page);
    case 'text':
      return await page.locator('[data-testid="artifact"] .prose').textContent();
    case 'code':
      return await page.locator('[data-testid="artifact"] .code-block').textContent();
    default:
      return await page.locator('[data-testid="artifact"]').textContent();
  }
}

async function getCitationArtifactContent(page: Page) {
  const title = await page.locator('[role="main"] h1').textContent();
  const content = await page.locator('[role="article"]').textContent();
  const citationCount = await page.locator('sup[role="button"]').count();
  const sourceCount = await page.locator('[role="button"][aria-label*="Open source:"]').count();
  
  return {
    title,
    content,
    citationCount,
    sourceCount,
  };
}

export async function closeArtifact(page: Page) {
  const closeButton = page.locator('[data-testid="artifact"] button[aria-label*="close"]');
  await closeButton.click();
  
  // Wait for artifact to close
  await expect(page.locator('[data-testid="artifact"]')).not.toBeVisible();
}

export async function isArtifactVisible(page: Page): Promise<boolean> {
  try {
    await expect(page.locator('[data-testid="artifact"]')).toBeVisible({ timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

export async function getArtifactMetrics(page: Page) {
  if (!(await isArtifactVisible(page))) {
    throw new Error('Artifact is not visible');
  }
  
  const boundingBox = await page.locator('[data-testid="artifact"]').boundingBox();
  const isVisible = await page.locator('[data-testid="artifact"]').isVisible();
  const title = await page.locator('[data-testid="artifact"] h1').textContent();
  
  return {
    boundingBox,
    isVisible,
    title,
  };
}

export async function waitForArtifactAnimation(page: Page, animationType: 'open' | 'close' = 'open') {
  if (animationType === 'open') {
    // Wait for opening animation to complete
    await expect(page.locator('[data-testid="artifact"]')).toBeVisible();
    await page.waitForTimeout(1000); // Allow for framer-motion animation
  } else {
    // Wait for closing animation to complete
    await expect(page.locator('[data-testid="artifact"]')).not.toBeVisible();
    await page.waitForTimeout(500);
  }
}

export async function verifyArtifactAccessibility(page: Page, artifactType: string) {
  await waitForArtifactLoad(page, artifactType);
  
  // Check basic accessibility requirements
  const violations = [];
  
  // Check for proper heading structure
  const h1Count = await page.locator('h1').count();
  if (h1Count !== 1) {
    violations.push(`Expected 1 h1 element, found ${h1Count}`);
  }
  
  // Check for proper ARIA labels
  const mainElements = await page.locator('[role="main"]').count();
  if (mainElements === 0) {
    violations.push('No main landmark found');
  }
  
  // Check for keyboard accessibility
  const focusableElements = await page.locator('button, [tabindex="0"], input, textarea, select').count();
  if (focusableElements === 0) {
    violations.push('No focusable elements found');
  }
  
  // Artifact-specific accessibility checks
  if (artifactType === 'citation') {
    await verifyCitationAccessibility(page, violations);
  }
  
  return violations;
}

async function verifyCitationAccessibility(page: Page, violations: string[]) {
  // Check citation button accessibility
  const citationButtons = page.locator('sup[role="button"]');
  const citationCount = await citationButtons.count();
  
  for (let i = 0; i < citationCount; i++) {
    const button = citationButtons.nth(i);
    const ariaLabel = await button.getAttribute('aria-label');
    if (!ariaLabel) {
      violations.push(`Citation button ${i + 1} missing aria-label`);
    }
    
    const tabIndex = await button.getAttribute('tabindex');
    if (tabIndex !== '0') {
      violations.push(`Citation button ${i + 1} not keyboard accessible`);
    }
  }
  
  // Check source button accessibility
  const sourceButtons = page.locator('[role="button"][aria-label*="Open source:"]');
  const sourceCount = await sourceButtons.count();
  
  for (let i = 0; i < sourceCount; i++) {
    const button = sourceButtons.nth(i);
    const ariaLabel = await button.getAttribute('aria-label');
    if (!ariaLabel || !ariaLabel.includes('Open source:')) {
      violations.push(`Source button ${i + 1} missing proper aria-label`);
    }
  }
  
  // Check for screen reader descriptions
  const citationDescriptions = page.locator('[id^="citation-desc-"]');
  const citationDescCount = await citationDescriptions.count();
  if (citationDescCount < citationCount) {
    violations.push('Missing screen reader descriptions for citations');
  }
}

export async function measureArtifactPerformance(page: Page, operation: () => Promise<void>) {
  const startTime = Date.now();
  
  // Start performance monitoring
  await page.evaluate(() => {
    (window as any).performanceMarks = [];
    performance.mark('operation-start');
  });
  
  // Execute the operation
  await operation();
  
  // End performance monitoring
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const performanceMetrics = await page.evaluate(() => {
    performance.mark('operation-end');
    const measure = performance.measure('operation-duration', 'operation-start', 'operation-end');
    
    return {
      duration: measure.duration,
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null,
    };
  });
  
  return {
    wallClockTime: duration,
    performanceApiTime: performanceMetrics.duration,
    memoryUsage: performanceMetrics.memory,
  };
}