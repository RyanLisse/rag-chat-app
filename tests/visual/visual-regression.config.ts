// Visual Regression Testing Configuration
import { devices } from '@playwright/test';
import type { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { PNG as PNGConstructor } from 'pngjs';
import fs from 'fs/promises';
import path from 'path';

export interface VisualRegressionConfig {
  baselineDir: string;
  actualDir: string;
  diffDir: string;
  threshold: number;
  failureThreshold: number;
  viewports: Array<{ name: string; width: number; height: number }>;
}

export const visualConfig: VisualRegressionConfig = {
  baselineDir: 'tests/visual/baseline',
  actualDir: 'tests/visual/actual',
  diffDir: 'tests/visual/diff',
  threshold: 0.1, // 10% difference threshold per pixel
  failureThreshold: 0.01, // 1% of pixels can be different
  viewports: [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 },
  ],
};

// Visual regression test helper
export class VisualRegressionTester {
  private config: VisualRegressionConfig;

  constructor(config: VisualRegressionConfig = visualConfig) {
    this.config = config;
  }

  async ensureDirectories() {
    await fs.mkdir(this.config.baselineDir, { recursive: true });
    await fs.mkdir(this.config.actualDir, { recursive: true });
    await fs.mkdir(this.config.diffDir, { recursive: true });
  }

  async compareScreenshots(
    name: string,
    actual: Buffer,
    options: {
      viewport?: string;
      updateBaseline?: boolean;
    } = {}
  ): Promise<{ match: boolean; diffPercentage: number }> {
    const { viewport = 'desktop', updateBaseline = false } = options;
    const filename = `${name}-${viewport}.png`;
    
    const baselinePath = path.join(this.config.baselineDir, filename);
    const actualPath = path.join(this.config.actualDir, filename);
    const diffPath = path.join(this.config.diffDir, filename);

    // Save actual screenshot
    await fs.writeFile(actualPath, actual);

    // Check if baseline exists
    let baselineExists = false;
    try {
      await fs.access(baselinePath);
      baselineExists = true;
    } catch {}

    if (!baselineExists || updateBaseline) {
      // Create or update baseline
      await fs.writeFile(baselinePath, actual);
      return { match: true, diffPercentage: 0 };
    }

    // Compare images
    const baseline = await fs.readFile(baselinePath);
    const baselineImg = PNGConstructor.sync.read(baseline);
    const actualImg = PNGConstructor.sync.read(actual);

    if (
      baselineImg.width !== actualImg.width ||
      baselineImg.height !== actualImg.height
    ) {
      return {
        match: false,
        diffPercentage: 100, // Complete mismatch
      };
    }

    const { width, height } = baselineImg;
    const diff = new PNGConstructor({ width, height });

    const diffPixels = pixelmatch(
      baselineImg.data,
      actualImg.data,
      diff.data,
      width,
      height,
      { threshold: this.config.threshold }
    );

    const totalPixels = width * height;
    const diffPercentage = (diffPixels / totalPixels) * 100;

    // Save diff image if there are differences
    if (diffPixels > 0) {
      await fs.writeFile(diffPath, PNGConstructor.sync.write(diff));
    }

    return {
      match: diffPercentage <= this.config.failureThreshold * 100,
      diffPercentage,
    };
  }

  async generateReport(results: Array<{
    name: string;
    viewport: string;
    match: boolean;
    diffPercentage: number;
  }>) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.match).length,
        failed: results.filter(r => !r.match).length,
      },
      results,
    };

    await fs.writeFile(
      path.join(this.config.diffDir, 'report.json'),
      JSON.stringify(report, null, 2)
    );

    return report;
  }
}

// Playwright visual regression helpers
export const visualRegressionHelpers = {
  async captureAndCompare(
    page: any,
    name: string,
    options: {
      fullPage?: boolean;
      clip?: { x: number; y: number; width: number; height: number };
      animations?: 'disabled' | 'allow';
      updateBaseline?: boolean;
    } = {}
  ) {
    const {
      fullPage = true,
      clip,
      animations = 'disabled',
      updateBaseline = false,
    } = options;

    const tester = new VisualRegressionTester();
    await tester.ensureDirectories();

    const screenshot = await page.screenshot({
      fullPage,
      clip,
      animations,
    });

    const viewport = `${page.viewportSize().width}x${page.viewportSize().height}`;
    return tester.compareScreenshots(name, screenshot, {
      viewport,
      updateBaseline,
    });
  },

  async captureElement(
    element: any,
    name: string,
    options: { updateBaseline?: boolean } = {}
  ) {
    const screenshot = await element.screenshot();
    const tester = new VisualRegressionTester();
    await tester.ensureDirectories();
    
    return tester.compareScreenshots(name, screenshot, options);
  },

  async waitForStableUI(page: any, options: {
    timeout?: number;
    checkInterval?: number;
  } = {}) {
    const { timeout = 5000, checkInterval = 500 } = options;
    const startTime = Date.now();
    let previousScreenshot: Buffer | null = null;

    while (Date.now() - startTime < timeout) {
      const currentScreenshot = await page.screenshot();
      
      if (previousScreenshot) {
        const prev = PNGConstructor.sync.read(previousScreenshot);
        const curr = PNGConstructor.sync.read(currentScreenshot);
        
        const diffPixels = pixelmatch(
          prev.data,
          curr.data,
          null,
          prev.width,
          prev.height,
          { threshold: 0 }
        );
        
        if (diffPixels === 0) {
          // UI is stable
          return;
        }
      }
      
      previousScreenshot = currentScreenshot;
      await page.waitForTimeout(checkInterval);
    }
    
    throw new Error('UI did not stabilize within timeout');
  },
};

// Critical UI components to test
export const criticalComponents = [
  { name: 'chat-interface', selector: '[data-testid="chat-interface"]' },
  { name: 'message-list', selector: '[data-testid="message-list"]' },
  { name: 'citation-sidebar', selector: '[data-testid="citation-sidebar"]' },
  { name: 'model-selector', selector: '[data-testid="model-selector"]' },
  { name: 'file-upload', selector: '[data-testid="file-upload"]' },
  { name: 'artifact-viewer', selector: '[data-testid="artifact-viewer"]' },
];