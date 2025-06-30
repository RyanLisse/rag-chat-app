# RAG Chat Application Test Suite

Comprehensive testing setup for the RAG Chat application with Playwright, Stagehand, and Bun's native test runner.

## Test Categories

### 1. Unit Tests (`tests/unit/`)
- Fast, isolated tests for individual functions and components
- Uses Bun's native test runner
- Includes mocks for AI models, streaming responses, and vector stores

### 2. Integration Tests (`tests/integration/`)
- Tests interactions between multiple components
- Validates citation flow and vector store operations
- Uses mock implementations to avoid external dependencies

### 3. E2E Tests (`tests/e2e/`)
- Full user journey testing with Playwright
- AI-powered testing with Stagehand for natural language interactions
- Tests complete RAG workflows including file upload and citation display

### 4. Visual Regression Tests (`tests/visual/`)
- Screenshot comparison tests for UI consistency
- Supports baseline updates and diff generation
- Tests across multiple viewports and themes

### 5. Performance Tests (`tests/performance/`)
- Measures page load times, streaming performance, and memory usage
- Load testing capabilities for concurrent users
- Tracks Web Vitals metrics (LCP, FCP, CLS, etc.)

## Running Tests

### Quick Start
```bash
# Run all tests
bun test

# Run specific test categories
bun test:unit          # Unit tests only
bun test:integration   # Integration tests
bun test:e2e          # End-to-end tests
bun test:visual       # Visual regression tests
bun test:performance  # Performance tests

# Coverage reporting
bun test:coverage     # Run unit & integration with coverage

# Development
bun test:watch        # Watch mode for unit tests

# Visual regression baseline
bun test:update-baseline  # Update visual test baselines
```

### Advanced Options
```bash
# Run the test runner directly with options
bun run tests/run-tests.ts --unit --coverage
bun run tests/run-tests.ts --all
bun run tests/run-tests.ts --visual --update-baseline
```

## Test Utilities

### AI Mocking (`tests/utils/ai-mocks.ts`)
```typescript
// Create a mock AI response with streaming
const mocker = new AIResponseMocker({
  provider: 'openai',
  model: 'gpt-4',
  streamDelay: 50,
});

const response = mocker.createStreamingResponse('test prompt');
```

### Streaming Test Helpers (`tests/utils/streaming-test-helpers.ts`)
```typescript
// Test streaming behavior
const chunks = await collectStreamChunks(stream);
assertStreamingBehavior(chunks, {
  minChunks: 5,
  maxChunkDelay: 100,
});
```

### Vector Store Testing (`tests/utils/vector-store-helpers.ts`)
```typescript
// Mock vector store for testing
const vectorStore = new MockVectorStore();
await testVectorStoreUpload(vectorStore, documents);
const results = await vectorStore.search('query');
```

### Citation Validation (`tests/utils/citation-validators.ts`)
```typescript
// Validate citations in responses
await testCitationResponse(response, citations, {
  minCitations: 2,
  requiredSources: ['source1.pdf'],
  minQuality: 0.7,
});
```

## Stagehand Integration

The E2E tests use Stagehand for AI-powered browser automation:

```typescript
// Natural language browser control
await stagehandPage.act('Upload a document about AI');
await stagehandPage.observe('Wait for upload to complete');

// Extract structured data
const citations = await stagehandPage.extract({
  instruction: 'Extract all citations from the response',
  schema: { /* ... */ },
});
```

## Test Data Factories

Use factories to generate test data consistently:

```typescript
import { createUser, createChat, createCitation } from '../factories';

const testUser = createUser({ email: 'test@example.com' });
const testChat = createChat({ userId: testUser.id });
const citations = createCitations(3);
```

## Coverage Goals

- **Target**: 100% coverage for critical paths
- **Current thresholds**: Set in `bunfig.toml`
  - Line: 100%
  - Function: 100%
  - Statement: 100%
  - Branch: 100%

View coverage reports:
```bash
bun test:coverage
# Open coverage/index.html in browser
```

## Visual Regression Testing

### Baseline Management
- Baselines stored in `tests/visual/baseline/`
- Actual screenshots in `tests/visual/actual/`
- Diffs generated in `tests/visual/diff/`

### Updating Baselines
When UI changes are intentional:
```bash
bun test:update-baseline
```

### Configuration
Edit `tests/visual/visual-regression.config.ts` to adjust:
- Difference thresholds
- Failure thresholds
- Viewport sizes

## Performance Testing

### Metrics Tracked
- Response times
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Memory usage
- Streaming performance

### Load Testing
```typescript
const results = await runLoadTest(scenario, {
  concurrent: 10,
  iterations: 100,
  rampUp: 50,
});
```

## CI/CD Integration

The test suite is designed for CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: bun test:ci
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    directory: ./coverage
```

## Debugging Tests

### Playwright Tests
```bash
# Run with UI mode
bunx playwright test --ui

# Debug specific test
bunx playwright test path/to/test.ts --debug
```

### Bun Tests
```bash
# Run with debugging
bun test --inspect

# Filter tests
bun test --test-name-pattern="should handle citations"
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Determinism**: Tests should produce consistent results
3. **Speed**: Prefer unit tests for fast feedback
4. **Clarity**: Use descriptive test names
5. **Coverage**: Aim for high coverage of critical paths
6. **Mocking**: Use mocks to avoid external dependencies
7. **Data**: Use factories for consistent test data

## Troubleshooting

### Common Issues

1. **Port conflicts**: Kill existing processes on test ports
2. **Visual test failures**: Update baselines if changes are intentional
3. **Flaky E2E tests**: Increase timeouts or add wait conditions
4. **Coverage gaps**: Check untested branches with coverage report

### Getting Help

- Check test examples in each category
- Review utility functions for common patterns
- Consult Playwright/Stagehand docs for browser automation
- Use `--help` flag on test runner for options