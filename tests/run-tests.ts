#!/usr/bin/env bun
// Comprehensive Test Validation Suite
import { $ } from 'bun';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface TestOptions {
  unit?: boolean;
  integration?: boolean;
  e2e?: boolean;
  visual?: boolean;
  performance?: boolean;
  security?: boolean;
  api?: boolean;
  smoke?: boolean;
  coverage?: boolean;
  watch?: boolean;
  updateBaseline?: boolean;
  parallel?: boolean;
  verbose?: boolean;
  bail?: boolean;
  ci?: boolean;
  report?: string;
  timeout?: number;
}

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
  warnings?: string[];
  metrics?: Record<string, any>;
}

interface TestReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  results: TestResult[];
  errors: string[];
  warnings: string[];
}

const parseArgs = (): TestOptions => {
  const args = process.argv.slice(2);
  const options: TestOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
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
      case '--security':
        options.security = true;
        break;
      case '--api':
        options.api = true;
        break;
      case '--smoke':
        options.smoke = true;
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
      case '--parallel':
        options.parallel = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--ci':
        options.ci = true;
        break;
      case '--report':
        options.report = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--all':
        options.unit = true;
        options.integration = true;
        options.e2e = true;
        options.visual = true;
        options.performance = true;
        options.security = true;
        options.api = true;
        options.smoke = true;
        break;
    }
  }
  
  // Default to unit tests if nothing specified
  if (!options.unit && !options.integration && !options.e2e && 
      !options.visual && !options.performance && !options.security && 
      !options.api && !options.smoke) {
    options.unit = true;
  }
  
  return options;
};

const ensureDirectories = () => {
  const dirs = [
    'coverage',
    'test-results',
    'test-results/reports',
    'test-results/artifacts',
    'test-results/screenshots',
    'test-results/traces',
    'tests/visual/baseline',
    'tests/visual/actual',
    'tests/visual/diff',
    'logs/test',
  ];
  
  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
};

const logger = {
  info: (msg: string) => console.log(`📋 ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.log(`❌ ${msg}`),
  warn: (msg: string) => console.log(`⚠️  ${msg}`),
  debug: (msg: string, verbose: boolean) => verbose && console.log(`🔍 ${msg}`),
};

const runCommand = async (cmd: string, options: { verbose?: boolean; timeout?: number } = {}): Promise<{ success: boolean; output: string; error?: string }> => {
  try {
    // Use shell execution for complex commands
    const proc = Bun.spawn(['sh', '-c', cmd], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    
    // Set up timeout if needed
    let timeoutId: NodeJS.Timeout | undefined;
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        proc.kill();
      }, options.timeout);
    }
    
    const output = await new Response(proc.stdout).text();
    const error = await new Response(proc.stderr).text();
    
    await proc.exited;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (proc.exitCode !== 0) {
      throw new Error(error || `Command failed with exit code ${proc.exitCode}`);
    }
    
    if (options.verbose) {
      console.log(output);
    }
    return { success: true, output };
  } catch (error: any) {
    return { 
      success: false, 
      output: error.stdout?.toString() || '', 
      error: error.stderr?.toString() || error.message 
    };
  }
};

const parseCoverageReport = (): any => {
  try {
    const coveragePath = join(process.cwd(), 'coverage/coverage-summary.json');
    if (existsSync(coveragePath)) {
      return JSON.parse(readFileSync(coveragePath, 'utf-8'));
    }
  } catch (error) {
    logger.warn('Could not parse coverage report');
  }
  return null;
};

const generateTestReport = (results: TestResult[], options: TestOptions): TestReport => {
  const coverage = parseCoverageReport();
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    totalTests: results.length,
    passed,
    failed,
    skipped: 0,
    duration: totalDuration,
    coverage: coverage?.total || {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    results,
    errors: results.flatMap(r => r.errors || []),
    warnings: results.flatMap(r => r.warnings || []),
  };
};

const saveReport = (report: TestReport, format: string = 'json') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-report-${timestamp}.${format}`;
  const filepath = join(process.cwd(), 'test-results/reports', filename);
  
  if (format === 'json') {
    writeFileSync(filepath, JSON.stringify(report, null, 2));
  } else if (format === 'html') {
    const html = generateHTMLReport(report);
    writeFileSync(filepath, html);
  }
  
  logger.info(`Report saved: ${filepath}`);
  return filepath;
};

const generateHTMLReport = (report: TestReport): string => {
  const successRate = ((report.passed / report.totalTests) * 100).toFixed(1);
  const duration = (report.duration / 1000).toFixed(2);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${report.timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .passed { border-left: 4px solid #4caf50; }
        .failed { border-left: 4px solid #f44336; }
        .coverage { border-left: 4px solid #2196f3; }
        .results { margin-top: 20px; }
        .result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .result.success { background: #e8f5e8; }
        .result.failure { background: #ffeaea; }
        .error { color: #d32f2f; margin-top: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: ${report.environment}</p>
    </div>
    
    <div class="summary">
        <div class="metric passed">
            <h3>${report.passed}</h3>
            <p>Passed (${successRate}%)</p>
        </div>
        <div class="metric failed">
            <h3>${report.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric coverage">
            <h3>${report.coverage.statements}%</h3>
            <p>Coverage</p>
        </div>
        <div class="metric">
            <h3>${duration}s</h3>
            <p>Duration</p>
        </div>
    </div>
    
    <div class="results">
        <h2>Test Results</h2>
        ${report.results.map(result => `
            <div class="result ${result.success ? 'success' : 'failure'}">
                <strong>${result.name}</strong> - ${(result.duration / 1000).toFixed(2)}s
                ${result.errors?.length ? `<div class="error">${result.errors.join('<br>')}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
  `;
};

const runTestSuite = async (name: string, command: string, options: TestOptions): Promise<TestResult> => {
  logger.info(`Running ${name}...`);
  const start = Date.now();
  
  const result = await runCommand(command, { 
    verbose: options.verbose, 
    timeout: options.timeout 
  });
  
  const duration = Date.now() - start;
  
  return {
    name,
    success: result.success,
    duration,
    errors: result.error ? [result.error] : [],
    warnings: [],
  };
};

const runParallelTests = async (testSuites: Array<{ name: string; command: string }>, options: TestOptions): Promise<TestResult[]> => {
  if (!options.parallel) {
    const results: TestResult[] = [];
    for (const suite of testSuites) {
      const result = await runTestSuite(suite.name, suite.command, options);
      results.push(result);
      
      if (options.bail && !result.success) {
        logger.error(`Test suite ${suite.name} failed, stopping due to --bail flag`);
        break;
      }
    }
    return results;
  }
  
  logger.info('Running tests in parallel...');
  const promises = testSuites.map(suite => 
    runTestSuite(suite.name, suite.command, options)
  );
  
  return Promise.all(promises);
};

const runTests = async () => {
  const options = parseArgs();
  ensureDirectories();
  
  console.log('🧪 RAG Chat Test Validation Suite');
  console.log('==================================\n');
  
  if (options.verbose) {
    logger.debug('Test options:', true);
    logger.debug(JSON.stringify(options, null, 2), true);
  }
  
  const testSuites: Array<{ name: string; command: string }> = [];
  
  // Build test suite commands
  if (options.unit) {
    const cmd = options.coverage ? 
      'bun test tests/unit --coverage' : 
      options.watch ? 'bun test tests/unit --watch' : 'bun test tests/unit';
    testSuites.push({ name: '📦 Unit Tests', command: cmd });
  }
  
  if (options.integration) {
    const cmd = options.coverage ? 
      'bun test tests/integration --coverage' : 'bun test tests/integration';
    testSuites.push({ name: '🔗 Integration Tests', command: cmd });
  }
  
  if (options.smoke) {
    testSuites.push({ name: '💨 Smoke Tests', command: 'bun test tests/smoke' });
  }
  
  if (options.e2e) {
    testSuites.push({ name: '🎭 E2E Tests', command: 'bunx playwright test --project=e2e' });
  }
  
  if (options.visual) {
    const env = options.updateBaseline ? 'UPDATE_BASELINE=true ' : '';
    testSuites.push({ name: '👁️  Visual Tests', command: `${env}bunx playwright test --project=visual` });
  }
  
  if (options.performance) {
    testSuites.push({ name: '⚡ Performance Tests', command: 'bunx playwright test --project=performance' });
  }
  
  if (options.api) {
    testSuites.push({ name: '🌐 API Tests', command: 'bun test tests/routes' });
  }
  
  if (options.security) {
    testSuites.push({ name: '🔒 Security Tests', command: 'bun run test:security' });
  }
  
  if (testSuites.length === 0) {
    logger.warn('No test suites selected to run');
    return;
  }
  
  // Handle watch mode
  if (options.watch) {
    logger.info('Running in watch mode...');
    const watchSuite = testSuites.find(s => s.name.includes('Unit'));
    if (watchSuite) {
      await runCommand(watchSuite.command, { verbose: true });
    }
    return;
  }
  
  // Run test suites
  const results = await runParallelTests(testSuites, options);
  
  // Generate comprehensive report
  const report = generateTestReport(results, options);
  
  // Display summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  
  let allPassed = true;
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${status} ${result.name.padEnd(25)} ${duration}s`);
    
    if (result.errors && result.errors.length > 0 && options.verbose) {
      result.errors.forEach(error => {
        console.log(`    🔴 ${error}`);
      });
    }
    
    if (!result.success) allPassed = false;
  });
  
  // Overall statistics
  const totalDuration = (report.duration / 1000).toFixed(2);
  const successRate = ((report.passed / report.totalTests) * 100).toFixed(1);
  
  console.log('\n📈 Overall Statistics');
  console.log('=====================');
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Passed: ${report.passed} (${successRate}%)`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Duration: ${totalDuration}s`);
  
  if (report.coverage.statements > 0) {
    console.log(`Coverage: ${report.coverage.statements}% statements, ${report.coverage.branches}% branches`);
  }
  
  // Save reports
  if (options.report) {
    saveReport(report, options.report);
  } else if (options.ci) {
    saveReport(report, 'json');
    saveReport(report, 'html');
  }
  
  // Additional reports
  if (options.coverage && existsSync('coverage/index.html')) {
    console.log('\n📊 Coverage Report: file://' + join(process.cwd(), 'coverage/index.html'));
  }
  
  if (options.visual && existsSync('tests/visual/diff/report.json')) {
    console.log('\n🖼️  Visual Report: file://' + join(process.cwd(), 'tests/visual/diff/report.json'));
  }
  
  if (existsSync('playwright-report/index.html')) {
    console.log('\n🎭 Playwright Report: file://' + join(process.cwd(), 'playwright-report/index.html'));
  }
  
  // Quality gates
  if (options.ci) {
    const minCoverage = 80;
    const maxFailures = 0;
    
    if (report.coverage.statements < minCoverage) {
      logger.error(`Coverage ${report.coverage.statements}% below minimum ${minCoverage}%`);
      allPassed = false;
    }
    
    if (report.failed > maxFailures) {
      logger.error(`${report.failed} test failures exceed maximum ${maxFailures}`);
      allPassed = false;
    }
  }
  
  // Exit code
  if (allPassed) {
    logger.success('All tests passed!');
  } else {
    logger.error('Some tests failed');
  }
  
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
RAG Chat Test Validation Suite

Usage: bun run tests/run-tests.ts [options]

Test Suites:
  --unit              Run unit tests
  --integration       Run integration tests
  --e2e               Run E2E tests with Playwright
  --visual            Run visual regression tests
  --performance       Run performance tests
  --security          Run security tests
  --api               Run API/route tests
  --smoke             Run smoke tests
  --all               Run all test suites

Execution Options:
  --parallel          Run tests in parallel (default: sequential)
  --watch             Watch mode for unit tests
  --bail              Stop on first failure
  --ci                CI mode with quality gates
  --timeout <ms>      Set test timeout (default: 300000)

Reporting Options:
  --coverage          Generate coverage report
  --report <format>   Save report (json|html)
  --verbose           Verbose output
  --update-baseline   Update visual regression baselines

Quality Gates (CI mode):
  - Minimum 80% code coverage
  - Zero test failures
  - All quality checks pass

Examples:
  bun run tests/run-tests.ts --unit --coverage
  bun run tests/run-tests.ts --all --parallel
  bun run tests/run-tests.ts --ci --report html
  bun run tests/run-tests.ts --visual --update-baseline
  bun run tests/run-tests.ts --e2e --verbose --timeout 600000
`);
  process.exit(0);
}