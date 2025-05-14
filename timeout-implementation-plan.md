# Test Timeout Implementation Plan

This document outlines the step-by-step plan for implementing appropriate timeouts for asynchronous tests in the MAAS MCP Server codebase.

## Phase 1: Setup and Configuration

### 1. Create Timeout Constants

Create a new file `src/__tests__/utils/testTimeouts.ts` with timeout constants:

```typescript
/**
 * Standard timeout values for different types of tests
 */
export const TEST_TIMEOUTS = {
  /**
   * For quick operations like simple cache operations or basic async functions
   * Examples: Cache get/set, simple promise resolutions
   */
  QUICK: 500,
  
  /**
   * For medium-length operations like basic API calls or abort signal handling
   * Examples: GET requests, abort signal tests, basic event handling
   */
  MEDIUM: 1000,
  
  /**
   * For long-running operations like file uploads or complex API calls
   * Examples: File uploads, machine deployments, multiple sequential API calls
   */
  LONG: 5000,
  
  /**
   * For integration tests that involve multiple components
   * Examples: End-to-end tests, server setup and teardown, complex workflows
   */
  INTEGRATION: 15000
};
```

### 2. Update Jest Configuration

Update `jest.config.cjs` to include a default timeout:

```javascript
module.exports = {
  // ... existing configuration
  
  // Default timeout for all tests (5 seconds)
  testTimeout: 5000,
  
  // ... rest of configuration
};
```

### 3. Create Integration Test Configuration

Update `src/integration_tests/jest.integration.config.js` with a longer default timeout:

```javascript
const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  
  // Longer default timeout for integration tests (15 seconds)
  testTimeout: 15000,
  
  // ... other integration-specific settings
};
```

## Phase 2: Apply Timeouts to Test Categories

### 1. AbortSignal and Timeout Tests

Update the timeout for abort signal tests:

```typescript
// src/__tests__/utils/abortSignalUtils.test.ts
import { TEST_TIMEOUTS } from '../utils/testTimeouts';

describe('abortSignalUtils', () => {
  // Set timeout for all tests in this suite
  jest.setTimeout(TEST_TIMEOUTS.MEDIUM);
  
  // ... existing tests
});
```

### 2. API Call Tests

Update the timeout for API call tests:

```typescript
// src/__tests__/mcp_tools/uploadImage.test.ts
import { TEST_TIMEOUTS } from '../utils/testTimeouts';

describe('uploadImage', () => {
  // Set timeout for all tests in this suite
  jest.setTimeout(TEST_TIMEOUTS.LONG);
  
  // ... existing tests
});
```

### 3. Progress Notification Tests

Update the timeout for progress notification tests:

```typescript
// src/__tests__/utils/progressNotification.test.ts
import { TEST_TIMEOUTS } from '../utils/testTimeouts';

describe('progressNotification', () => {
  // Set timeout for all tests in this suite
  jest.setTimeout(TEST_TIMEOUTS.MEDIUM);
  
  // ... existing tests
});
```

### 4. Cache Operation Tests

Update the timeout for cache operation tests:

```typescript
// src/__tests__/cache/cacheManager.test.ts
import { TEST_TIMEOUTS } from '../utils/testTimeouts';

describe('CacheManager', () => {
  // Set timeout for all tests in this suite
  jest.setTimeout(TEST_TIMEOUTS.QUICK);
  
  // ... existing tests
});
```

## Phase 3: Apply Timeouts to Specific Tests

For tests that need specific timeouts different from their category:

```typescript
// Example of setting timeout for a specific test
it('should handle a particularly complex operation', async () => {
  // This test needs a longer timeout
  jest.setTimeout(TEST_TIMEOUTS.LONG);
  
  // ... test implementation
});

// Alternative syntax
it('should handle another complex operation', async () => {
  // ... test implementation
}, TEST_TIMEOUTS.LONG);
```

## Phase 4: Monitor and Adjust

### 1. Run Tests and Monitor

Run the test suite and monitor for timeout issues:

```bash
# Run all tests
npm test

# Run specific test categories
npm test -- --testPathPattern=src/__tests__/utils
npm test -- --testPathPattern=src/__tests__/mcp_tools
npm test -- --testPathPattern=src/integration_tests
```

### 2. Identify and Fix Remaining Issues

For any tests that still time out:

1. Identify the specific test and its execution time
2. Determine if the test needs a longer timeout or should be refactored
3. Apply the appropriate fix:
   - Increase timeout for legitimate long-running tests
   - Refactor tests that are unnecessarily slow
   - Mock external dependencies that cause unpredictable delays

### 3. Document Special Cases

For tests with non-standard timeouts, add comments explaining why:

```typescript
// This test simulates a large file upload and needs a longer timeout
it('should handle uploading a very large file', async () => {
  jest.setTimeout(10000); // 10 seconds for large file simulation
  
  // ... test implementation
});
```

## Phase 5: Standardize and Document

### 1. Create Test Best Practices Documentation

Create a document outlining best practices for test timeouts:

```markdown
# Test Timeout Best Practices

## Standard Timeout Categories

- **QUICK (500ms)**: Simple operations (cache, basic async)
- **MEDIUM (1000ms)**: Standard operations (API calls, abort signals)
- **LONG (5000ms)**: Complex operations (file uploads, deployments)
- **INTEGRATION (15000ms)**: End-to-end tests

## When to Use Each Category

- Use QUICK for tests that don't involve external resources
- Use MEDIUM for tests with simple API calls or abort signals
- Use LONG for tests with file uploads or multiple API calls
- Use INTEGRATION for tests that set up servers or complex environments

## How to Apply Timeouts

- Set suite-level timeouts with `jest.setTimeout(TEST_TIMEOUTS.CATEGORY)`
- Set test-specific timeouts with `jest.setTimeout()` inside the test
- Or use the alternative syntax: `it('test name', async () => {}, TEST_TIMEOUTS.CATEGORY)`

## Best Practices

- Don't set unnecessarily long timeouts
- Document why a test needs a non-standard timeout
- Consider refactoring tests that consistently take too long
- Use mocks for external dependencies to make tests more predictable
```

### 2. Update CI Configuration

Update CI configuration to handle test timeouts appropriately:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      # ... existing steps
      
      - name: Run unit tests
        run: npm test
        env:
          # Increase Node.js memory limit for test runner
          NODE_OPTIONS: "--max-old-space-size=4096"
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          # Increase Node.js memory limit for test runner
          NODE_OPTIONS: "--max-old-space-size=4096"
```

## Implementation Priority

Implement the changes in the following order:

1. Create timeout constants and update Jest configuration
2. Apply timeouts to test categories in order of importance:
   - Upload and long-running operation tests (highest priority)
   - AbortSignal and API call tests
   - Progress notification tests
   - Cache operation tests
3. Monitor and adjust timeouts based on test runs
4. Document best practices and update CI configuration

This phased approach ensures that the most critical tests are addressed first while providing a consistent framework for all asynchronous tests.