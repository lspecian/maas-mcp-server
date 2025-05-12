# Testing Progress Notifications: Best Practices

This document outlines best practices for testing progress notifications in the MAAS MCP Server, focusing on robustness, determinism, and isolation.

## Table of Contents

1. [Introduction](#introduction)
2. [Common Challenges](#common-challenges)
3. [Robust Testing Approach](#robust-testing-approach)
4. [Test Utilities](#test-utilities)
5. [Example Test Patterns](#example-test-patterns)
6. [Troubleshooting](#troubleshooting)

## Introduction

Progress notifications are used to provide real-time updates about long-running operations such as machine deployment, commissioning, or image uploads. Testing these notifications presents several challenges due to their asynchronous nature, time dependencies, and potential for race conditions.

## Common Challenges

Testing progress notifications involves several challenges:

1. **Asynchronous Operations**: Progress notifications are sent asynchronously, making it difficult to predict when they will be received.

2. **Race Conditions**: Tests may fail intermittently due to race conditions between the operation and the notification system.

3. **Time Dependencies**: Rate limiting and polling intervals depend on time, which can make tests non-deterministic.

4. **Resource Cleanup**: Incomplete cleanup between tests can cause state leakage and test interference.

5. **AbortSignal Handling**: Testing cancellation scenarios requires proper handling of AbortSignals.

## Robust Testing Approach

To address these challenges, we've implemented a robust testing approach with the following principles:

### 1. Comprehensive Cleanup

Each test must clean up all resources it uses, including:

- Mocks and their call history
- Rate limit history in the progress notification module
- Operations in the operations registry
- AbortControllers and their signals

Use the `performComprehensiveCleanup()` function from `testCleanupUtils.ts` to ensure thorough cleanup.

### 2. Deterministic Time Control

Use Jest's fake timers to control time-dependent code:

- Replace real timers with fake timers using `setupFakeTimers()`
- Advance time explicitly using `advanceTimersByTime()`
- Restore real timers after tests using `restoreRealTimers()`

This makes time-based operations like rate limiting and polling deterministic.

### 3. Synchronization Points

Use synchronization points to coordinate asynchronous operations:

- Create sync points using `createSyncPoint()`
- Trigger sync points when specific events occur
- Wait for sync points to ensure operations happen in the expected order

This eliminates race conditions and makes tests more reliable.

### 4. Isolated Test Resources

Create isolated resources for each test:

- Use local AbortControllers for each test
- Create fresh mocks for each test
- Avoid shared state between tests

This prevents test interference and makes tests more reliable.

### 5. Explicit Assertions

Make assertions explicit and avoid timing assumptions:

- Verify the exact number of notifications sent
- Check the content of each notification
- Verify the order of notifications
- Use `waitForCondition()` or `waitForMockCalls()` instead of arbitrary timeouts

## Test Utilities

We've created several utilities to support robust testing:

### Test Cleanup Utilities (`testCleanupUtils.ts`)

- `resetAllMocks()`: Resets all Jest mocks and clears their history
- `clearProgressNotificationHistory()`: Clears rate limit history
- `clearOperationsRegistry()`: Unregisters all operations
- `safeAbortController()`: Safely aborts an AbortController
- `cleanupAbortSignalListeners()`: Removes event listeners from an AbortSignal
- `performComprehensiveCleanup()`: Comprehensive cleanup function

### Deterministic Test Utilities (`deterministicTestUtils.ts`)

- Timer control functions: `setupFakeTimers()`, `restoreRealTimers()`, `advanceTimersByTime()`, `runAllTimers()`
- Synchronization functions: `waitForTicks()`, `waitForCondition()`, `waitForMockCalls()`, `createSyncPoint()`
- Mock helpers: `createDelayedMock()`, `createSequentialMock()`, `createControlledMock()`

## Example Test Patterns

### Testing Rate Limiting

```typescript
it('should rate limit notifications based on time interval', async () => {
  // Set initial time
  jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
  
  // First notification should be sent
  await sendProgressNotification(params, mockSendNotification);
  expect(mockSendNotification).toHaveBeenCalledTimes(1);
  
  // Reset mock to clearly see the next call
  mockSendNotification.mockClear();
  
  // Advance time by less than the rate limit
  jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 0, 500));
  
  // Second notification should be rate limited
  await sendProgressNotification(params, mockSendNotification);
  expect(mockSendNotification).not.toHaveBeenCalled();
  
  // Advance time beyond the rate limit
  jest.setSystemTime(new Date(2025, 0, 1, 12, 0, 1, 100));
  
  // Third notification should be sent
  await sendProgressNotification(params, mockSendNotification);
  expect(mockSendNotification).toHaveBeenCalledTimes(1);
});
```

### Testing Abort Handling

```typescript
it('should abort an in-progress operation when signal is aborted', async () => {
  // Create a local abort controller for this test
  const localAbortController = new AbortController();
  
  try {
    // Mock successful initial operation
    mockMaasClient.post.mockResolvedValue({ status_name: 'DEPLOYING' });
    
    // Create sync points for notifications
    const initialNotificationSyncPoint = createSyncPoint();
    const abortNotificationSyncPoint = createSyncPoint();
    
    let notificationCount = 0;
    mockSendNotification.mockImplementation(() => {
      if (notificationCount === 0) {
        notificationCount++;
        initialNotificationSyncPoint.trigger();
      } else {
        abortNotificationSyncPoint.trigger();
      }
      return Promise.resolve();
    });
    
    // Start the operation
    const resultPromise = operationWithProgress(params, {
      signal: localAbortController.signal,
      sendNotification: mockSendNotification
    });
    
    // Wait for the initial notification
    await initialNotificationSyncPoint.wait();
    
    // Advance timers to ensure post request completes
    advanceTimersByTime(100);
    await waitForTicks(2);
    
    // Abort the operation
    localAbortController.abort('User cancelled');
    
    // Wait for the abort notification
    await abortNotificationSyncPoint.wait();
    
    // Verify the result
    const result = await resultPromise;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('aborted');
    
    // Verify notification was sent
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  } finally {
    // Clean up resources specific to this test
    safeAbortController(localAbortController);
  }
});
```

### Testing Long-Running Operations with Status Polling

```typescript
it('should handle successful operation with status polling', async () => {
  // Create a local abort controller for this test
  const localAbortController = new AbortController();
  
  try {
    // Mock successful initial operation
    mockMaasClient.post.mockResolvedValue({ status_name: 'DEPLOYING' });
    
    // Setup sequential responses for status checks
    const statusResponses = [
      { status_name: 'DEPLOYING' },
      { status_name: 'DEPLOYING' },
      { status_name: 'DEPLOYED' }
    ];
    
    mockMaasClient.get.mockImplementation(() => {
      const response = statusResponses[mockMaasClient.get.mock.calls.length - 1] || 
                      statusResponses[statusResponses.length - 1];
      return Promise.resolve(response);
    });

    // Create sync points for notifications
    const notificationSyncPoints = [];
    for (let i = 0; i < 5; i++) {
      notificationSyncPoints.push(createSyncPoint());
    }
    
    let notificationCount = 0;
    mockSendNotification.mockImplementation(() => {
      const syncPoint = notificationSyncPoints[notificationCount];
      if (syncPoint) {
        syncPoint.trigger();
        notificationCount++;
      }
      return Promise.resolve();
    });
    
    // Start the operation
    const resultPromise = operationWithProgress(params, {
      signal: localAbortController.signal,
      sendNotification: mockSendNotification
    });
    
    // Wait for the first notification
    await notificationSyncPoints[0].wait();
    
    // Advance timers to trigger status polling
    advanceTimersByTime(5000);
    await waitForTicks(2);
    
    // Wait for the second notification
    await notificationSyncPoints[1].wait();
    
    // Advance timers again for next status check
    advanceTimersByTime(5000);
    await waitForTicks(2);
    
    // Wait for the third notification
    await notificationSyncPoints[2].wait();
    
    // Advance timers for final status check
    advanceTimersByTime(5000);
    await waitForTicks(2);
    
    // Get the final result
    const result = await resultPromise;
    
    // Verify result
    expect(result.isError).toBe(false);
    expect(result.content[0].type).toBe('resource');
    
    // Verify API calls
    expect(mockMaasClient.post).toHaveBeenCalled();
    expect(mockMaasClient.get).toHaveBeenCalledTimes(3);
    
    // Verify notifications
    expect(mockSendNotification).toHaveBeenCalledTimes(4);
  } finally {
    // Clean up resources specific to this test
    safeAbortController(localAbortController);
  }
});
```

## Troubleshooting

### Common Issues and Solutions

1. **Flaky Tests**:
   - Ensure comprehensive cleanup between tests
   - Use sync points instead of relying on timing
   - Control time explicitly with fake timers

2. **Memory Leaks**:
   - Ensure all AbortControllers are properly aborted
   - Unregister all operations from the registry
   - Remove event listeners from AbortSignals

3. **Unexpected Notifications**:
   - Clear rate limit history between tests
   - Reset mock call history between tests
   - Verify notification parameters carefully

4. **Timeout Errors**:
   - Use `waitForCondition()` with appropriate timeouts
   - Advance timers explicitly instead of waiting
   - Check for infinite loops in polling logic

5. **Test Interference**:
   - Isolate tests with local resources
   - Avoid shared state between tests
   - Run tests in isolation with `--runInBand` if necessary