import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup/test-setup.ts'],
    testTimeout: 10000, // 10 seconds
    hookTimeout: 10000,
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      'node_modules/**',
      '.next/**',
      'tests/e2e/**',
      'tests/visual/**',
      'tests/performance/**',
      'coverage/**',
    ],
    // Ignore test warnings
    silent: false,
    hideSkippedTests: true,
    reporter: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
