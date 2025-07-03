import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'node20',
    keepNames: false,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    // Replace deprecated environmentMatchGlobs with projects
    projects: [
      {
        test: {
          include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
          environment: 'happy-dom',
          setupFiles: ['./tests/setup/test-setup.ts'],
        },
      },
      {
        test: {
          include: [
            'tests/unit/**/upload-route.{test,spec}.{ts,tsx}',
            'tests/unit/**/status-route.{test,spec}.{ts,tsx}',
          ],
          environment: 'node',
          setupFiles: ['./tests/setup/test-setup.ts'],
        },
      },
    ],
    setupFiles: ['./tests/setup/test-setup.ts'],
    testTimeout: 3000, // Reduced from 5000ms for faster execution
    hookTimeout: 3000, // Reduced from 5000ms
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules/**',
      '.next/**',
      'tests/e2e/**',
      'tests/routes/**',
      'tests/stagehand/**',
      'tests/visual/**',
      'tests/performance/**',
      'coverage/**',
    ],
    // Performance optimizations
    silent: false,
    hideSkippedTests: true,
    reporters: [['default', { summary: false }]], // Updated reporter config
    passWithNoTests: true,
    isolate: false, // Shared context for speed
    pool: 'threads', // Use threads for maximum parallelism
    poolOptions: {
      threads: {
        maxThreads: 4, // Reduced to prevent thread issues
        minThreads: 1,
        useAtomics: true,
        isolate: false,
      },
    },
    maxConcurrency: 4, // Reduced concurrency for stability
    fileParallelism: true,
    // Coverage optimized for speed
    coverage: {
      enabled: false, // Disabled by default for speed, enable when needed
      provider: 'v8',
      reporter: ['text-summary'], // Faster than full HTML reports
      reportsDirectory: './coverage',
      include: [
        'lib/**/*.ts',
        'lib/**/*.tsx',
        'components/**/*.tsx',
        'app/**/*.ts',
        'app/**/*.tsx',
      ],
      exclude: [
        'node_modules/**',
        '.next/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        'coverage/**',
        'playwright.config.ts',
        'next.config.js',
        'tailwind.config.js',
        'vitest.config.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        lines: 10,
        functions: 10,
        branches: 10,
        statements: 10,
      },
      skipFull: true, // Skip full coverage collection for speed
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/components': resolve(__dirname, './components'),
      '@/lib': resolve(__dirname, './lib'),
      '@/app': resolve(__dirname, './app'),
    },
  },
});
