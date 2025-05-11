# MAAS MCP Server Test Utilities Guide

This guide provides comprehensive documentation for the test utilities available in the MAAS MCP Server project. These utilities are designed to make testing easier, more consistent, and more maintainable by providing reusable mock implementations and helper functions.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Mock Factories](#mock-factories)
   - [Mock Audit Logger](#mock-audit-logger)
   - [Mock Cache Manager](#mock-cache-manager)
   - [Mock MAAS API Client](#mock-maas-api-client)
   - [Mock Resource Utils](#mock-resource-utils)
4. [Test Setup Utilities](#test-setup-utilities)
5. [Assertion Utilities](#assertion-utilities)
6. [Mock Data](#mock-data)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

## Introduction

The MAAS MCP Server project includes a comprehensive set of test utilities that help simplify the process of writing tests. These utilities provide mock implementations of key dependencies, helper functions for common test operations, and predefined configurations for common testing scenarios.

All test utilities are available through a unified API in `src/__tests__/mocks/index.ts`, which makes them easy to import and use in your tests.

## Getting Started

To use the test utilities in your tests, import them from the unified API:

```typescript
import { 
  createMockMaasApiClient, 
  mockClientConfigs,
  setupTestDependencies,
  assertResourceAccessLogged
} from '../mocks/index.js';
```

You can also import specific utilities directly from their source files if you prefer:

```typescript
import { createMockMaasApiClient } from '../mocks/mockMaasApiClient.js';
```

## Mock Factories

### Mock Audit Logger

The Mock Audit Logger provides a configurable mock implementation of the AuditLogger used for tracking resource access and modifications.

**Key Features:**
- Configurable behavior (success, errors, etc.)
- Call tracking for verification
- Predefined configurations for common scenarios

**Basic Usage:**

```typescript
import { createMockAuditLogger } from '../mocks/index.js';

// Create a mock audit logger with default configuration
const mockLogger = createMockAuditLogger();

// Use the mock logger in your tests
mockLogger.logResourceAccess('machine', 'abc123', 'fetch', 'req-123');

// Verify the logger was called correctly
expect(mockLogger.logResourceAccess).toHaveBeenCalledWith(
  'machine', 'abc123', 'fetch', 'req-123', 
  expect.anything(), expect.anything(), expect.anything()
);
```

**Configuration Options:**

- `simulateErrors`: Whether to simulate errors during logging
- `trackCalls`: Whether to track call counts
- `customImplementations`: Custom implementations for specific methods

**Predefined Configurations:**

- `mockAuditLoggerConfigs.default()`: Default configuration
- `mockAuditLoggerConfigs.withErrors()`: Configuration that simulates errors
- `mockAuditLoggerConfigs.withoutTracking()`: Configuration without call tracking
- `mockAuditLoggerConfigs.withCustomImplementations()`: Configuration with custom implementations

### Mock Cache Manager

The Mock Cache Manager provides a configurable mock implementation of the CacheManager used for caching resource data.

**Key Features:**
- Configurable cache hits/misses
- Configurable TTLs
- Predefined configurations for common scenarios

**Basic Usage:**

```typescript
import { createMockCacheManager } from '../mocks/index.js';

// Create a mock cache manager with cache hits enabled
const mockCache = createMockCacheManager({ getCacheHit: true });

// Use the mock cache in your tests
const result = mockCache.get('machine:abc123');

// Verify the cache was called correctly
expect(mockCache.get).toHaveBeenCalledWith('machine:abc123');
expect(result).toBeDefined();
```

**Configuration Options:**

- `enabled`: Whether the cache is enabled
- `defaultTTL`: Default TTL for cache entries
- `resourceSpecificTTL`: Resource-specific TTLs
- `getCacheHit`: Whether get() should return a value
- `getCacheValue`: Value to return from get()
- `setCacheSuccess`: Whether set() should return a value
- `simulateErrors`: Whether to simulate errors
- `customKeyGenerator`: Custom key generator function

**Predefined Configurations:**

- `mockCacheManagerConfigs.withHits()`: Configuration with cache hits
- `mockCacheManagerConfigs.withMisses()`: Configuration with cache misses
- `mockCacheManagerConfigs.disabled()`: Configuration with cache disabled
- `mockCacheManagerConfigs.withErrors()`: Configuration with errors
- `mockCacheManagerConfigs.withCustomTTLs()`: Configuration with custom TTLs

### Mock MAAS API Client

The Mock MAAS API Client provides a configurable mock implementation of the MaasApiClient used for communicating with the MAAS API.

**Key Features:**
- Configurable response data
- Simulated network conditions (delays, timeouts)
- Error simulation
- AbortSignal support
- Predefined configurations for common scenarios

**Basic Usage:**

```typescript
import { createMockMaasApiClient } from '../mocks/index.js';

// Create a mock client with default configuration
const mockClient = createMockMaasApiClient();

// Use the mock client in your tests
const result = await mockClient.get('/MAAS/api/2.0/machines/', {});

// Verify the client was called correctly
expect(mockClient.get).toHaveBeenCalledWith('/MAAS/api/2.0/machines/', {});
```

**Configuration Options:**

- `successResponse`: The response to return for successful requests
- `errorResponse`: The error to throw for failed requests
- `statusCode`: HTTP status code to include with the response
- `simulateNetworkDelay`: Milliseconds to delay before resolving/rejecting the request
- `simulateTimeout`: Whether to simulate a network timeout
- `respectAbortSignal`: Whether to respect AbortSignal for request cancellation

**Predefined Configurations:**

- `mockClientConfigs.default()`: Default configuration
- `mockClientConfigs.empty()`: Configuration that returns empty results
- `mockClientConfigs.timeout()`: Configuration that simulates timeouts
- `mockClientConfigs.slow()`: Configuration that simulates slow network
- `mockClientConfigs.notFound()`: Configuration that simulates 404 errors
- `mockClientConfigs.serverError()`: Configuration that simulates 500 errors
- `mockClientConfigs.unauthorized()`: Configuration that simulates 401 errors
- `mockClientConfigs.malformed()`: Configuration that returns malformed responses

### Mock Resource Utils

The Mock Resource Utils provides configurable mock implementations of the ResourceUtils functions used for validating and processing resource data.

**Key Features:**
- Configurable behavior (success, errors, etc.)
- Option to use actual implementations
- Predefined configurations for common scenarios

**Basic Usage:**

```typescript
import { createMockResourceUtils } from '../mocks/index.js';

// Create mock resource utils with default configuration
const mockUtils = createMockResourceUtils();

// Use the mock utils in your tests
const params = mockUtils.extractAndValidateParams(
  'maas://machines/abc123/details',
  'maas://machines/:system_id/details',
  schema,
  'machine'
);

// Verify the utils were called correctly
expect(mockUtils.extractAndValidateParams).toHaveBeenCalledWith(
  'maas://machines/abc123/details',
  'maas://machines/:system_id/details',
  schema,
  'machine'
);
```

**Configuration Options:**

- `useActualImplementations`: Whether to use actual implementations for some functions
- `simulateErrors`: Whether to simulate errors
- `errorMessages`: Custom error messages
- `customImplementations`: Custom implementations

**Predefined Configurations:**

- `mockResourceUtilsConfigs.default()`: Default configuration
- `mockResourceUtilsConfigs.useActual()`: Configuration with all actual implementations
- `mockResourceUtilsConfigs.withErrors()`: Configuration with all simulated errors
- `mockResourceUtilsConfigs.selective()`: Configuration with selective actual implementations

## Test Setup Utilities

The test utilities include several functions for setting up test environments:

### setupTestDependencies

Sets up all test dependencies for resource handler tests, including mock MCP server, MAAS API client, cache manager, and resource utils.

```typescript
import { setupTestDependencies } from '../mocks/index.js';

// Setup all test dependencies
const { 
  mockMcpServer, 
  mockMaasApiClient, 
  mockCacheManager, 
  mockResourceUtils 
} = setupTestDependencies();

// Use the dependencies in your tests
```

### setupMockAuditLogger

Sets up a mock AuditLogger for testing.

```typescript
import { setupMockAuditLogger } from '../mocks/index.js';

// Setup a mock audit logger
const mockLogger = setupMockAuditLogger();

// Use the logger in your tests
```

### setupMockCacheManager

Sets up a mock CacheManager for testing.

```typescript
import { setupMockCacheManager } from '../mocks/index.js';

// Setup a mock cache manager
const mockCache = setupMockCacheManager();

// Use the cache in your tests
```

### setupMockResourceUtils

Sets up mock ResourceUtils functions for testing.

```typescript
import { setupMockResourceUtils } from '../mocks/index.js';

// Setup mock resource utils
const mockUtils = setupMockResourceUtils();

// Use the utils in your tests
```

## Assertion Utilities

The test utilities include several functions for making common assertions:

### assertResourceRegistration

Asserts that a resource handler was registered correctly.

```typescript
import { assertResourceRegistration } from '../mocks/index.js';

// Assert that a resource was registered correctly
assertResourceRegistration(
  mockMcpServer,
  'machine',
  'maas://machines/:system_id/details'
);
```

### assertCacheOperationLogged

Asserts that a cache operation was logged.

```typescript
import { assertCacheOperationLogged } from '../mocks/index.js';

// Assert that a cache operation was logged
assertCacheOperationLogged(
  mockAuditLogger,
  'machine',
  'hit',
  'abc123'
);
```

### assertResourceAccessLogged

Asserts that a resource access was logged.

```typescript
import { assertResourceAccessLogged } from '../mocks/index.js';

// Assert that a resource access was logged
assertResourceAccessLogged(
  mockAuditLogger,
  'machine',
  'abc123',
  'fetch'
);
```

### assertResourceAccessFailureLogged

Asserts that a resource access failure was logged.

```typescript
import { assertResourceAccessFailureLogged } from '../mocks/index.js';

// Assert that a resource access failure was logged
assertResourceAccessFailureLogged(
  mockAuditLogger,
  'machine',
  'abc123',
  'fetch'
);
```

## Mock Data

The test utilities include several mock data objects for use in tests:

### mockMachines

An array of mock machine objects that mimic the structure and properties of real machine objects returned by the MAAS API.

```typescript
import { mockMachines } from '../mocks/index.js';

// Use the mock machines in your tests
const machine = mockMachines[0];
```

### mockMachine

A convenience export of the first machine from the mockMachines array.

```typescript
import { mockMachine } from '../mocks/index.js';

// Use the mock machine in your tests
const { system_id } = mockMachine;
```

### mockEmptyResult

An empty array representing an empty collection response from the MAAS API.

```typescript
import { mockEmptyResult } from '../mocks/index.js';

// Use the mock empty result in your tests
expect(result).toEqual(mockEmptyResult);
```

### mockErrorResponse

A mock error response object representing the structure of error responses from the MAAS API.

```typescript
import { mockErrorResponse } from '../mocks/index.js';

// Use the mock error response in your tests
expect(result).toEqual(mockErrorResponse);
```

## Best Practices

Here are some best practices for using the test utilities:

1. **Use the unified API**: Import utilities from `src/__tests__/mocks/index.ts` to ensure you're using the latest versions.

2. **Use predefined configurations**: Use the predefined configurations when possible to ensure consistent behavior across tests.

3. **Reset mocks between tests**: Use `jest.clearAllMocks()` or the `resetCallCounts` method on mock objects to reset state between tests.

4. **Use assertion utilities**: Use the assertion utilities to make common assertions more concise and readable.

5. **Use setupTestDependencies**: Use the `setupTestDependencies` function to set up all dependencies at once when testing resource handlers.

6. **Check call counts**: Use the `callCounts` property on mock objects to verify that methods were called the expected number of times.

7. **Use custom implementations**: Use custom implementations when you need specific behavior that isn't covered by the predefined configurations.

## Examples

For complete examples of how to use the test utilities, see the example tests in the `src/__tests__/examples` directory:

- `mockMaasApiClient.example.test.ts`: Examples of using the Mock MAAS API Client
- `mockCacheManager.example.test.ts`: Examples of using the Mock Cache Manager
- `mockAuditLogger.example.test.ts`: Examples of using the Mock Audit Logger
- `mockResourceUtils.example.test.ts`: Examples of using the Mock Resource Utils
- `testSetup.example.test.ts`: Examples of using the test setup utilities