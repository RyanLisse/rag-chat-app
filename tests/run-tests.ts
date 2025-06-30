#!/usr/bin/env bun
// Comprehensive Test Runner Script
import { $ } from 'bun';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestOptions {
  unit?: boolean;
  integration?: boolean;
  e2e?: boolean;
  visual?: boolean;
  performance?: boolean;
  coverage?: boolean;
  watch?: boolean;
  updateBaseline?: boolean;
}

const parseArgs = (): TestOptions => {
  const args = process.argv.slice(2);
  const options: TestOptions = {};
  
  args.forEach(arg => {
    switch (arg) {
      case '--unit':
        options.unit = true;
        break;
      case '--integration':
        options.integration = true;
        break;
      case '--e2e':
        options.e2e = true;
        break;
      case '--visual':
        options.visual = true;
        break;
      case '--performance':
        options.performance = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--update-baseline':
        options.updateBaseline = true;
        break;
      case '--all':
        options.unit = true;
        options.integration = true;
        options.e2e = true;
        options.visual = true;
        options.performance = true;
        break;
    }
  });
  
  // Default to unit tests if nothing specified
  if (!options.unit && !options.integration && !options.e2e && 
      !options.visual && !options.performance) {
    options.unit = true;
  }
  
  return options;
};

const ensureDirectories = () => {
  const dirs = [
    'coverage',
    'test-results',
    'tests/visual/baseline',
    'tests/visual/actual',
    'tests/visual/diff',
  ];
  
  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
};

const runTests = async () => {
  const options = parseArgs();
  ensureDirectories();
  
  console.log('🧪 RAG Chat Test Runner');
  console.log('=======================\n');
  
  const results: { name: string; success: boolean; duration: number }[] = [];
  
  // Unit Tests
  if (options.unit) {
    console.log('📦 Running Unit Tests...');
    const start = Date.now();
    
    try {
      if (options.coverage) {
        await $`bun test tests/unit --coverage`.quiet();
      } else if (options.watch) {
        await $`bun test tests/unit --watch`;
      } else {
        await $`bun test tests/unit`.quiet();
      }
      
      results.push({
        name: 'Unit Tests',
        success: true,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Unit Tests',
        success: false,
        duration: Date.now() - start,
      });
    }
  }
  
  // Integration Tests
  if (options.integration) {
    console.log('\n🔗 Running Integration Tests...');
    const start = Date.now();
    
    try {
      if (options.coverage) {
        await $`bun test tests/integration --coverage`.quiet();
      } else {
        await $`bun test tests/integration`.quiet();
      }
      
      results.push({
        name: 'Integration Tests',
        success: true,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Integration Tests',
        success: false,
        duration: Date.now() - start,
      });
    }
  }
  
  // E2E Tests
  if (options.e2e) {
    console.log('\n🎭 Running E2E Tests...');
    const start = Date.now();
    
    try {
      await $`bunx playwright test --project=e2e`.quiet();
      
      results.push({
        name: 'E2E Tests',
        success: true,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'E2E Tests',
        success: false,
        duration: Date.now() - start,
      });
    }
  }
  
  // Visual Regression Tests
  if (options.visual) {
    console.log('\n👁️  Running Visual Regression Tests...');
    const start = Date.now();
    
    try {
      const env = options.updateBaseline ? { UPDATE_BASELINE: 'true' } : {};
      await $`bunx playwright test --project=visual`.env(env).quiet();
      
      results.push({
        name: 'Visual Tests',
        success: true,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Visual Tests',
        success: false,
        duration: Date.now() - start,
      });
    }
  }
  
  // Performance Tests
  if (options.performance) {
    console.log('\n⚡ Running Performance Tests...');
    const start = Date.now();
    
    try {
      await $`bunx playwright test --project=performance`.quiet();
      
      results.push({
        name: 'Performance Tests',
        success: true,
        duration: Date.now() - start,
      });
    } catch (error) {
      results.push({
        name: 'Performance Tests',
        success: false,
        duration: Date.now() - start,
      });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  
  let allPassed = true;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${status} ${result.name.padEnd(20)} ${duration}s`);
    
    if (!result.success) allPassed = false;
  });
  
  // Coverage Report
  if (options.coverage && existsSync('coverage/index.html')) {
    console.log('\n📈 Coverage Report: file://' + join(process.cwd(), 'coverage/index.html'));
  }
  
  // Visual Report
  if (options.visual && existsSync('tests/visual/diff/report.json')) {
    console.log('\n🖼️  Visual Report: file://' + join(process.cwd(), 'tests/visual/diff/report.json'));
  }
  
  // Exit code
  process.exit(allPassed ? 0 : 1);
};

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});

// Usage help
if (process.argv.includes('--help')) {
  console.log(`
RAG Chat Test Runner

Usage: bun run tests/run-tests.ts [options]

Options:
  --unit              Run unit tests
  --integration       Run integration tests
  --e2e               Run E2E tests with Playwright
  --visual            Run visual regression tests
  --performance       Run performance tests
  --all               Run all test suites
  --coverage          Generate coverage report
  --watch             Watch mode for unit tests
  --update-baseline   Update visual regression baselines
  --help              Show this help message

Examples:
  bun run tests/run-tests.ts --unit --coverage
  bun run tests/run-tests.ts --all
  bun run tests/run-tests.ts --visual --update-baseline
`);
  process.exit(0);
}