# Test Utilities for Robust Asynchronous Testing

This directory contains utilities designed to make asynchronous tests more robust, deterministic, and isolated. These utilities address common issues in testing asynchronous code, particularly for long-running operations with progress notifications.

## Key Utilities

### Test Cleanup Utilities (`testCleanupUtils.ts`)

Provides functions to ensure proper cleanup between tests, preventing state leakage and ensuring test isolation:

- `resetAllMocks()`: Resets all Jest mocks and clears their history
- `clearProgressNotificationHistory()`: Clears rate limit history in the progress notification module
- `clearOperationsRegistry()`: Unregisters all operations from the operations registry
- `safeAbortController()`: Safely aborts an AbortController if it's not already aborted
- `cleanupAbortSignalListeners()`: Removes event listeners from an AbortSignal
- `performComprehensiveCleanup()`: Comprehensive cleanup function that handles all stateful components

### Deterministic Test Utilities (`deterministicTestUtils.ts`)

Provides functions to make asynchronous tests deterministic by controlling time and synchronizing events:

- **Timer Control**:
  - `setupFakeTimers()`: Sets up Jest's fake timers for deterministic time control
  - `restoreRealTimers()`: Restores real timers after testing
  - `advanceTimersByTime()`: Advances timers by a specified amount
  - `runAllTimers()`: Runs all pending timers

- **Synchronization**:
  - `waitForTicks()`: Creates a promise that resolves after a specified number of event loop ticks
  - `waitForCondition()`: Creates a promise that resolves when a specific condition is met
  - `waitForMockCalls()`: Creates a promise that resolves when a mock function has been called a specific number of times
  - `createSyncPoint()`: Creates a synchronization point for coordinating async operations

- **Mock Helpers**:
  - `createDelayedMock()`: Creates a mock implementation that returns a promise resolving after a delay
  - `createSequentialMock()`: Creates a mock implementation that returns sequential results
  - `createControlledMock()`: Creates a controlled mock that allows tests to manually resolve/reject promises

## Best Practices for Robust Tests

1. **Always clean up after tests**:
   ```typescript
   afterEach(() => {
     performComprehensiveCleanup();
   });
   ```

2. **Use fake timers for time-dependent code**:
   ```typescript
   beforeEach(() => {
     setupFakeTimers();
   });
   
   afterEach(() => {
     restoreRealTimers();
   });
   ```

3. **Create local AbortControllers for each test**:
   ```typescript
   it('should handle aborted operation', async () => {
     const localAbortController = new AbortController();
     try {
       // Test code
     } finally {
       safeAbortController(localAbortController);
     }
   });
   ```

4. **Use sync points for deterministic async testing**:
   ```typescript
   const syncPoint = createSyncPoint();
   mockFunction.mockImplementation(() => {
     syncPoint.trigger();
     return Promise.resolve();
   });
   
   // Start async operation
   const resultPromise = asyncOperation();
   
   // Wait for the sync point
   await syncPoint.wait();
   
   // Continue test
   ```

5. **Avoid timing assumptions**:
   - Don't use arbitrary timeouts with `setTimeout`
   - Use `waitForCondition()` or `waitForMockCalls()` instead
   - Control time explicitly with `advanceTimersByTime()`

6. **Isolate tests from each other**:
   - Don't share state between tests
   - Reset mocks and clear history before each test
   - Clean up resources after each test

## Example: Testing Progress Notifications

The `progressNotification.deterministic.test.ts` file demonstrates how to test asynchronous progress notifications in a deterministic way:

- Uses fake timers to control time-based rate limiting
- Creates sync points to coordinate async operations
- Verifies notifications are sent at the right times
- Tests edge cases like aborted operations

## Example: Testing Long-Running Operations

The `deployMachineWithProgress.test.ts` and `commissionMachineWithProgress.test.ts` files demonstrate how to test long-running operations with progress notifications:

- Uses comprehensive cleanup before and after each test
- Creates local AbortControllers for each test
- Uses sync points to coordinate notifications
- Advances timers to trigger status polling
- Verifies API calls and notifications
- Tests success, failure, and abort scenarios