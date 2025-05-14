# Test Timeout Configuration Guide

This document provides guidelines for configuring and using timeouts in tests for the MAAS MCP Server codebase.

## Overview

Asynchronous tests require appropriate timeouts to ensure they have enough time to complete while still failing quickly when there are issues. The MAAS MCP Server codebase uses a standardized approach to timeouts with the following features:

- Centralized timeout constants for different operation types
- Environment-aware timeout adjustments (CI vs local development)
- Helper functions for applying timeouts consistently
- Dynamic timeout calculations based on operation complexity
- Default timeouts in Jest configuration

## Timeout Categories

The codebase defines four standard timeout categories:

| Category | Timeout | Use Cases |
|----------|---------|-----------|
| QUICK | 500ms | Simple operations (cache, basic async) |
| MEDIUM | 1000ms | Standard operations (API calls, abort signals) |
| LONG | 5000ms | Complex operations (file uploads, deployments) |
| INTEGRATION | 15000ms | End-to-end tests (server setup/teardown) |

## Using Timeouts in Tests

### 1. Default Timeouts

By default, all tests use a 5000ms (5 second) timeout as configured in `jest.config.cjs`. Integration tests use a 15000ms (15 second) timeout as configured in `src/integration_tests/jest.integration.config.js`.

These defaults mean you don't need to specify timeouts for most tests, but you should be aware of them when writing tests that might take longer than the default.

### 2. Suite-Level Timeouts

To set a timeout for all tests in a suite (describe block), use the `applyTestSuiteTimeout` function or one of its shorthand variants:

```typescript
import { applyMediumTimeout } from '../utils/timeoutHelpers';

describe('My test suite', () => {
  // Apply a medium timeout (1000ms) to all tests in this suite
  applyMediumTimeout();
  
  it('should do something', async () => {
    // Test implementation
  });
});
```

Shorthand functions available:
- `applyQuickTimeout()` - 500ms
- `applyMediumTimeout()` - 1000ms
- `applyLongTimeout()` - 5000ms
- `applyIntegrationTimeout()` - 15000ms

### 3. Test-Specific Timeouts

For individual tests that need specific timeouts, use the `testWithTimeout` function or one of its shorthand variants:

```typescript
import { longTest } from '../utils/timeoutHelpers';

describe('My test suite', () => {
  // Regular test with default timeout
  it('should do something simple', async () => {
    // Test implementation
  });
  
  // Test with a long timeout (5000ms)
  longTest('should handle a complex operation', async () => {
    // Test implementation for a long-running test
  });
});
```

Shorthand functions available:
- `quickTest()` - 500ms
- `mediumTest()` - 1000ms
- `longTest()` - 5000ms
- `integrationTest()` - 15000ms

### 4. Custom Timeouts

If you need a non-standard timeout, you can provide a custom value to any of the helper functions:

```typescript
import { applyTestSuiteTimeout, testWithTimeout } from '../utils/timeoutHelpers';

describe('My test suite', () => {
  // Apply a custom timeout to all tests in this suite
  applyTestSuiteTimeout('medium', 2000); // 2000ms
  
  // Test with a custom timeout
  testWithTimeout(
    'should handle a very complex operation',
    async () => {
      // Test implementation
    },
    'long',
    10000 // 10 seconds
  );
});
```

## Environment-Aware Timeouts

The timeout system automatically adjusts timeouts based on the environment:

- Local development: Standard timeouts
- CI/CD environments: Timeouts are multiplied by 1.5x to account for potentially slower CI environments

This adjustment is handled automatically by the helper functions, so you don't need to specify different timeouts for different environments.

## Best Practices

1. **Use the appropriate timeout category** for the type of operation being tested:
   - Use QUICK for simple operations that don't involve external resources
   - Use MEDIUM for standard operations like API calls or abort signals
   - Use LONG for complex operations like file uploads
   - Use INTEGRATION for end-to-end tests that involve server setup/teardown

2. **Avoid unnecessarily long timeouts** as they can slow down the test suite when tests fail.

3. **Document non-standard timeouts** with comments explaining why a longer timeout is needed.

4. **Consider refactoring tests** that consistently take too long to complete.

5. **Use mocks for external dependencies** to make tests more predictable and faster.

## Dynamic Timeouts

For more complex test scenarios, the codebase provides utilities for calculating dynamic timeouts based on operation complexity and other factors.

### Complexity Levels

The system defines 10 complexity levels:

1. **MINIMAL** - Extremely simple operations
2. **VERY_LOW** - Very simple operations
3. **LOW** - Simple operations
4. **MODERATE** - Slightly complex operations
5. **MEDIUM** - Moderately complex operations
6. **SIGNIFICANT** - Notably complex operations
7. **HIGH** - Complex operations
8. **VERY_HIGH** - Very complex operations
9. **EXTREME** - Extremely complex operations
10. **MAXIMUM** - The most complex operations

### Using Dynamic Timeouts

To use dynamic timeouts, import the utilities from `dynamicTimeouts.ts`:

```typescript
import {
  calculateDynamicTimeout,
  getTimeoutByComplexity,
  setTimeoutByComplexity,
  ComplexityLevel,
  getFileUploadTimeout,
  getApiOperationTimeout
} from '../utils/dynamicTimeouts';

describe('Complex operations', () => {
  it('should handle a complex operation', async () => {
    // Set timeout based on complexity level
    setTimeoutByComplexity(ComplexityLevel.HIGH);
    
    // Test implementation
  });
  
  it('should handle file upload', async () => {
    // Calculate timeout based on file size (5MB)
    const timeout = getFileUploadTimeout(5 * 1024 * 1024, true);
    jest.setTimeout(timeout);
    
    // Test implementation
  });
  
  it('should handle multiple API calls', async () => {
    // Calculate timeout based on number of API calls
    const timeout = getApiOperationTimeout(3, true);
    jest.setTimeout(timeout);
    
    // Test implementation
  });
  
  it('should handle custom operation factors', async () => {
    // Calculate timeout based on custom factors
    const timeout = calculateDynamicTimeout({
      dataSize: 2 * 1024 * 1024, // 2MB
      apiCallCount: 2,
      hasNetworkRequests: true,
      hasProgressNotifications: true
    });
    jest.setTimeout(timeout);
    
    // Test implementation
  });
});
```

### Operation Factors

The dynamic timeout system considers the following factors:

- **Data size** - Larger data requires more processing time
- **API call count** - More API calls require more time
- **Database operation count** - More database operations require more time
- **File I/O** - Operations involving file I/O take longer
- **Network requests** - Operations involving network requests take longer
- **Progress notifications** - Operations with progress notifications take longer
- **Complexity level** - Explicit complexity level (1-10)

## Implementation Details

The timeout system is implemented in the following files:

- `src/__tests__/utils/testTimeouts.ts` - Defines timeout constants and environment-aware adjustments
- `src/__tests__/utils/timeoutHelpers.ts` - Provides helper functions for applying timeouts
- `src/__tests__/utils/dynamicTimeouts.ts` - Provides utilities for calculating dynamic timeouts
- `jest.config.cjs` - Configures the default timeout for all tests
- `src/integration_tests/jest.integration.config.js` - Configures the default timeout for integration tests

## Examples

### AbortSignal Tests

```typescript
import { applyMediumTimeout } from '../utils/timeoutHelpers';

describe('abortSignalUtils', () => {
  // Apply a medium timeout to all tests in this suite
  applyMediumTimeout();
  
  it('should abort the signal after the specified timeout', async () => {
    const derivedSignal = createDerivedSignal(undefined, { timeout: 50 });
    expect(derivedSignal.aborted).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(derivedSignal.aborted).toBe(true);
  });
});
```

### Upload Tests

```typescript
import { applyLongTimeout, longTest } from '../utils/timeoutHelpers';

describe('uploadImage', () => {
  // Apply a long timeout to all tests in this suite
  applyLongTimeout();
  
  it('should handle successful image upload with base64 content', async () => {
    // Test implementation
  });
  
  // Test with an extra-long timeout
  longTest('should handle very large file upload', async () => {
    // Test implementation for a particularly long-running test
  }, 10000); // 10 seconds
});
```

### Integration Tests

```typescript
import { applyIntegrationTimeout } from '../utils/timeoutHelpers';

describe('Integration: Machine Management', () => {
  // Apply an integration timeout to all tests in this suite
  applyIntegrationTimeout();
  
  it('should deploy machines with progress', async () => {
    // Test implementation
  });
});
```

## Implementation Status

The timeout configuration system has been successfully implemented across the codebase. The following types of tests have been updated with appropriate timeout settings:

1. **Utility Tests**
   - `abortSignalUtils.test.ts` - Medium timeouts for abort signal operations
   - `operationsRegistry.test.ts` - Medium timeouts for registry operations, long timeouts for cleanup tests

2. **MCP Tool Tests**
   - `createTag.test.ts` - Medium timeouts for API operations
   - `uploadImage.test.ts` - Long timeouts for file upload operations
   - Other tool tests with appropriate timeout categories

3. **Resource Handler Tests**
   - `resourceHandlerCaching.test.ts` - Medium timeouts for cache operations
   - Other resource handler tests with appropriate timeout categories

4. **Integration Tests**
   - `clientServerCommunication.test.ts` - Integration timeouts for end-to-end tests
   - Other integration test files with appropriate timeout categories

## Additional Examples

### Resource Handler Tests

```typescript
import { applyMediumTimeout, mediumTest } from '../utils/timeoutHelpers';

describe('Resource Handler Caching', () => {
  // Apply a medium timeout to all tests in this suite
  applyMediumTimeout();
  
  // Test with medium timeout
  mediumTest('should cache successful responses', async () => {
    // Test implementation for cache operations
  });
});
```

### MCP Tool Tests

```typescript
import { applyLongTimeout, longTest } from '../utils/timeoutHelpers';

describe('uploadImage', () => {
  // Apply a long timeout to all tests in this suite
  applyLongTimeout();
  
  // Test with long timeout
  longTest('should handle successful image upload with base64 content', async () => {
    // Test implementation for file upload operations
  });
});
```

## Best Practices for Future Test Development

When developing new tests, follow these guidelines for timeout configuration:

1. **Analyze the Operation Type**
   - Determine if the operation is quick, medium, long, or integration-level
   - Consider factors like network requests, file I/O, and complexity

2. **Apply Suite-Level Timeouts**
   - Use `applyQuickTimeout()`, `applyMediumTimeout()`, `applyLongTimeout()`, or `applyIntegrationTimeout()` at the top of each test suite
   - Choose the timeout category that matches most tests in the suite

3. **Override for Specific Tests**
   - Use `quickTest()`, `mediumTest()`, `longTest()`, or `integrationTest()` for tests that need different timeouts than the suite default
   - Provide custom timeout values for exceptional cases

4. **Use Dynamic Timeouts for Complex Operations**
   - For operations with variable complexity, use the dynamic timeout utilities
   - Consider factors like data size, API call count, and explicit complexity level

5. **Document Non-Standard Timeouts**
   - Add comments explaining why a test needs a longer or shorter timeout than expected
   - Include information about the operation's complexity or special requirements

By following these guidelines, you'll ensure that tests have appropriate timeouts, reducing both false failures due to timeouts being too short and unnecessary waiting due to timeouts being too long.