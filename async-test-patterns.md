# Asynchronous Test Patterns Analysis

This document provides a detailed analysis of the asynchronous test patterns used in the MAAS MCP Server codebase and recommendations for appropriate timeout settings.

## Common Asynchronous Patterns

### 1. AbortSignal and Timeout Handling

The codebase extensively uses AbortSignal for cancellation and timeout handling. Key patterns include:

```typescript
// Pattern: Creating derived signals with timeouts
const derivedSignal = createDerivedSignal(parentSignal, { 
  timeout: 50,
  reason: 'Custom timeout reason'
});

// Pattern: Aborting operations
const abortablePromise = abortable(promise, controller.signal);
setTimeout(() => controller.abort('Test abort'), 50);

// Pattern: Handling abort errors
try {
  await abortablePromise;
} catch (error) {
  // Expected to throw AbortedOperationError
}
```

**Timeout Recommendation**: 1000ms for most abort signal tests, as they typically involve short timeouts for testing purposes.

### 2. API Call Handling

API calls are wrapped with abort signals and often include progress notifications:

```typescript
// Pattern: API calls with abort signals
const result = await maasClient.postMultipart(
  '/boot-resources/',
  formData,
  abortSignal
);

// Pattern: Resource fetching with abort signals
protected async fetchResourceData(params: { resource_id: string }, signal: AbortSignal): Promise<unknown> {
  return this.maasClient.get(`/resources/${params.resource_id}`, undefined, signal);
}
```

**Timeout Recommendation**: 
- 1000ms for simple API calls (GET requests, small data)
- 10000ms for complex API calls (uploads, large data transfers)

### 3. Progress Notification Handling

Progress notifications are used for long-running operations:

```typescript
// Pattern: Sending progress notifications
sendProgressNotification({
  progressToken: 'test-token',
  progress: 0,
  total: 100,
  message: "Starting upload of boot image 'test-image'..."
});

// Pattern: Checking notification content
expect(mockSendNotification.mock.calls.some(call =>
  call[0].method === 'notifications/progress' &&
  call[0].params.progressToken === 'test-token' &&
  call[0].params.progress === 0
)).toBe(true);
```

**Timeout Recommendation**: 5000ms for progress notification tests, as they often involve multiple notification events.

### 4. Cache Operations

Cache operations involve async get/set operations and TTL-based expiration:

```typescript
// Pattern: Cache operations
const cacheKey = cacheManager.generateCacheKey('prefix', uri, params);
await cacheManager.set(cacheKey, data, 'ResourceType', { ttl: 300 });
const cachedData = await cacheManager.get(cacheKey);

// Pattern: Cache invalidation
const count = resourceHandler.invalidateCache();
expect(mockCacheManager.invalidateResource).toHaveBeenCalledWith('ResourceType');
```

**Timeout Recommendation**: 500ms for most cache operations, as they should be quick.

## Test-Specific Timeout Recommendations

### AbortSignalUtils Tests

These tests verify the core abort signal functionality:

```typescript
it('should abort the signal after the specified timeout', async () => {
  const derivedSignal = createDerivedSignal(undefined, { timeout: 50 });
  expect(derivedSignal.aborted).toBe(false);
  await new Promise(resolve => setTimeout(resolve, 60));
  expect(derivedSignal.aborted).toBe(true);
});
```

**Recommendation**: 1000ms timeout, as these tests use small timeouts (50-100ms) internally.

### OperationsRegistry Tests

These tests manage long-running operations:

```typescript
it('should clean up stale operations', () => {
  const registry = new OperationsRegistry({
    maxCompletedAge: 1000, // 1 second
    maxStaleAge: 2000 // 2 seconds
  });
  
  // Register operations
  const time1 = 1000;
  jest.spyOn(Date, 'now').mockReturnValue(time1);
  registry.registerOperation('token1', 'testOperation', { initialStatus: OperationStatus.COMPLETED });
  
  // Advance time beyond maxCompletedAge but below maxStaleAge
  jest.spyOn(Date, 'now').mockReturnValue(time1 + 1500);
  registry.cleanupStaleOperations();
  
  // Completed operation should be cleaned up
  expect(registry.getOperation('token1')).toBeUndefined();
});
```

**Recommendation**: 2000ms timeout, as these tests involve time-based operations.

### Upload Image Tests

These tests handle file uploads with progress notifications:

```typescript
it('should handle successful image upload with base64 content', async () => {
  // Mock successful image upload
  mockMaasClient.postMultipart.mockResolvedValue(mockUploadResponse);
  
  // Base64 encoded content
  const base64Content = 'dGVzdA==';
  
  const params = {
    name: 'test-image',
    architecture: 'amd64',
    image_type: 'boot-kernel',
    image_content: base64Content,
    _meta: { progressToken: 'test-token' }
  };

  const result = await mockToolCallback(params, {
    signal: new AbortController().signal,
    sendNotification: mockSendNotification
  });
  
  // Verify progress notifications
  expect(mockSendNotification).toHaveBeenCalledWith({
    method: 'notifications/progress',
    params: {
      progressToken: 'test-token',
      progress: 0,
      total: 100,
      message: "Starting upload of boot image 'test-image'..."
    }
  });
});
```

**Recommendation**: 10000ms timeout, as these tests simulate file uploads which can be time-consuming.

### Resource Handler Tests

These tests handle resource fetching and caching:

```typescript
it('should fetch resource details successfully', async () => {
  // Setup successful API response
  deps.mockMaasClient.get.mockResolvedValue(mockResource);
  
  // Execute the handler
  const result = await detailsCallback(
    resourceDetailsUri, 
    { resource_id: 'test-resource' }, 
    { signal: new AbortController().signal }
  );
  
  // Verify API call
  expect(deps.mockMaasClient.get).toHaveBeenCalledWith(
    '/resources/test-resource', 
    undefined, 
    expect.any(Object) // AbortSignal
  );
});
```

**Recommendation**: 1000ms timeout for most resource handler tests.

### Integration Tests

These tests involve multiple components working together:

```typescript
it('should handle tool calls with progress notifications', async () => {
  // Setup test server
  const env = await setupTestServer();
  
  // Make request with progress token
  const response = await env.request.post('/api/tools/maas_deploy_machine')
    .send({
      system_id: 'test-machine',
      _meta: { progressToken: 'test-token' }
    });
  
  // Verify response and notifications
  expect(response.status).toBe(200);
  expect(mockNotificationSender).toHaveBeenCalled();
  
  // Cleanup
  await env.cleanup();
});
```

**Recommendation**: 15000ms timeout, as these tests involve server setup, API calls, and cleanup.

## Implementation Strategy

### 1. Update Jest Configuration

Add default timeouts to the Jest configuration:

```javascript
// jest.config.cjs
module.exports = {
  // ... other config
  testTimeout: 5000, // Default timeout for all tests
};
```

### 2. Category-Based Timeout Constants

Create timeout constants for different categories:

```typescript
// src/__tests__/testUtils.ts
export const TEST_TIMEOUTS = {
  QUICK: 500,    // Quick operations (cache, simple async)
  MEDIUM: 1000,  // Medium operations (basic API calls)
  LONG: 5000,    // Long operations (file uploads)
  INTEGRATION: 15000, // Integration tests
};
```

### 3. Apply Test-Specific Timeouts

Apply timeouts to specific tests:

```typescript
// Example usage
describe('Upload Image Tests', () => {
  // Set timeout for all tests in this suite
  jest.setTimeout(TEST_TIMEOUTS.LONG);
  
  it('should handle successful image upload', async () => {
    // Test implementation
  });
});

// Or for individual tests
it('should handle complex operation', async () => {
  // Set timeout just for this test
  jest.setTimeout(TEST_TIMEOUTS.LONG);
  
  // Test implementation
}, TEST_TIMEOUTS.LONG); // Alternative syntax
```

## Monitoring and Adjustment

After implementing these timeout recommendations:

1. Monitor test runs to identify any remaining timeout issues
2. Adjust timeouts based on actual test performance
3. Consider refactoring tests that consistently take too long
4. Add comments explaining why specific timeouts were chosen for complex tests