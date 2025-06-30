import { defineConfig, devices } from '@playwright/test';
import { Stagehand } from '@browserbasehq/stagehand';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import { config } from 'dotenv';

config({
  path: '.env.local',
});

// Initialize Stagehand for AI-powered testing
export const stagehandConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4',
  debug: process.env.DEBUG === 'true',
};

/* Use process.env.PORT by default and fallback to port 3000 */
const PORT = process.env.PORT || 3000;

/**
 * Set webServer.url and use.baseURL with the location
 * of the WebServer respecting the correct set port
 */
const baseURL = `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : 8,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
  },

  /* Configure global timeout for each test */
  timeout: 120 * 1000, // 120 seconds
  expect: {
    timeout: 120 * 1000,
  },

  /* Configure projects */
  projects: [
    {
      name: 'e2e-workflows',
      testMatch: /e2e\/complete-workflow\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'e2e-accessibility',
      testMatch: /e2e\/accessibility\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'e2e-mobile',
      testMatch: /e2e\/mobile-responsive\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'e2e-errors',
      testMatch: /e2e\/error-scenarios\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'e2e-performance',
      testMatch: /e2e\/performance-benchmarks\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        launchOptions: {
          args: ['--enable-precise-memory-info', '--enable-performance-metrics'],
        },
      },
    },
    {
      name: 'e2e-visual',
      testMatch: /e2e\/visual-regression\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        launchOptions: {
          args: ['--force-prefers-reduced-motion'],
        },
      },
    },
    {
      name: 'e2e-monitoring',
      testMatch: /e2e\/monitoring-logging\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'e2e-concurrent',
      testMatch: /e2e\/concurrent-users\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'e2e-reporting',
      testMatch: /e2e\/test-report-generator\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'routes',
      testMatch: /routes\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'visual',
      testMatch: /visual\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Disable animations for consistent screenshots
        launchOptions: {
          args: ['--force-prefers-reduced-motion'],
        },
      },
    },
    {
      name: 'performance',
      testMatch: /performance\/.*.test.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance metrics
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bun dev',
    url: `${baseURL}/api/health`, // Updated to use health check endpoint
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },

  /* Configure test artifacts */
  outputDir: './test-results',

  /* Configure coverage */
  use: {
    ...{
      // Coverage collection
      coverage: {
        enabled: true,
        outputDir: './coverage/e2e',
        exclude: ['**/node_modules/**', '**/.next/**'],
      },
    },
  },
});
