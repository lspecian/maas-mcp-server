/**
 * Utilities for creating deterministic tests, especially for asynchronous operations
 * and event-based notifications.
 *
 * These utilities address common challenges in testing asynchronous code:
 * - Non-deterministic timing
 * - Race conditions
 * - Flaky tests due to timing assumptions
 * - Difficulty coordinating asynchronous operations
 *
 * @module deterministicTestUtils
 */
import { jest } from '@jest/globals';

/**
 * Setup fake timers for a test.
 *
 * This replaces the real timers (setTimeout, setInterval, etc.) with Jest's fake timers,
 * allowing precise control over time in tests. This is essential for testing
 * time-dependent code in a deterministic way.
 *
 * @example
 * beforeEach(() => {
 *   setupFakeTimers();
 * });
 *
 * @see {@link restoreRealTimers} to restore real timers after the test
 * @see {@link advanceTimersByTime} to advance fake timers
 */
export function setupFakeTimers() {
  jest.useFakeTimers();
}

/**
 * Restore real timers after a test.
 *
 * This restores the real timer implementations after using fake timers.
 * Should be called in afterEach to ensure subsequent tests aren't affected.
 *
 * @example
 * afterEach(() => {
 *   restoreRealTimers();
 * });
 *
 * @see {@link setupFakeTimers} to set up fake timers
 */
export function restoreRealTimers() {
  jest.useRealTimers();
}

/**
 * Advance fake timers by a specified amount of milliseconds.
 *
 * This simulates the passage of time without actually waiting,
 * allowing time-dependent code to be tested quickly and deterministically.
 *
 * @param ms - Milliseconds to advance the timers
 *
 * @example
 * // Advance time by 1 second
 * advanceTimersByTime(1000);
 *
 * @see {@link setupFakeTimers} to set up fake timers first
 */
export function advanceTimersByTime(ms: number) {
  jest.advanceTimersByTime(ms);
}

/**
 * Run all pending timers until the queue is empty.
 *
 * This executes all currently scheduled timers, including any new timers
 * that get scheduled during execution. Use with caution as it can lead to
 * infinite loops if timers continuously schedule new timers.
 *
 * @example
 * // Run all pending timers
 * runAllTimers();
 *
 * @see {@link setupFakeTimers} to set up fake timers first
 * @see {@link advanceTimersByTime} for more controlled time advancement
 */
export function runAllTimers() {
  jest.runAllTimers();
}

/**
 * Create a promise that resolves after a specified number of event loop ticks.
 *
 * This is useful for allowing other async operations to complete before continuing
 * with the test. Each "tick" represents one complete cycle of the JavaScript event loop.
 *
 * @param ticks - Number of event loop ticks to wait (default: 1)
 * @returns A promise that resolves after the specified number of ticks
 *
 * @example
 * // Wait for 2 event loop ticks
 * await waitForTicks(2);
 *
 * // Wait for other promises to resolve
 * await someAsyncOperation();
 * await waitForTicks();  // Give other microtasks a chance to run
 * expect(something).toBe(expectedValue);
 */
export function waitForTicks(ticks = 1): Promise<void> {
  let promise = Promise.resolve();
  for (let i = 0; i < ticks; i++) {
    promise = promise.then(() => Promise.resolve());
  }
  return promise;
}

/**
 * Create a promise that resolves when a specific condition is met.
 *
 * This is a powerful utility for waiting for asynchronous conditions without
 * making timing assumptions. It periodically checks the condition and resolves
 * when it returns true, or rejects if the timeout is reached.
 *
 * @param condition - Function that returns true when the condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Interval between condition checks in milliseconds (default: 100)
 * @returns A promise that resolves when the condition is met or rejects on timeout
 *
 * @example
 * // Wait for an element to appear in the DOM
 * await waitForCondition(() => document.querySelector('.my-element') !== null);
 *
 * // Wait with custom timeout and interval
 * await waitForCondition(
 *   () => myAsyncOperation.isComplete(),
 *   10000,  // 10 second timeout
 *   500     // Check every 500ms
 * );
 */
export function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkCondition = () => {
      if (condition()) {
        resolve();
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Condition not met within ${timeout}ms timeout`));
        return;
      }
      
      setTimeout(checkCondition, interval);
    };
    
    checkCondition();
  });
}

/**
 * Create a promise that resolves when a mock function has been called a specific number of times.
 *
 * This is particularly useful for testing callbacks and event handlers where you need
 * to wait for a certain number of calls before proceeding with assertions.
 *
 * @param mockFn - The Jest mock function to watch
 * @param callCount - The expected number of calls to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns A promise that resolves when the mock has been called enough times or rejects on timeout
 *
 * @example
 * // Wait for a callback to be called 3 times
 * const mockCallback = jest.fn();
 * triggerAsyncOperationWithCallback(mockCallback);
 * await waitForMockCalls(mockCallback, 3);
 *
 * // Now we can safely make assertions
 * expect(mockCallback).toHaveBeenCalledWith(expectedArg);
 */
export function waitForMockCalls(
  mockFn: jest.Mock,
  callCount: number,
  timeout = 5000
): Promise<void> {
  return waitForCondition(
    () => mockFn.mock.calls.length >= callCount,
    timeout
  );
}

/**
 * Create a synchronization point that can be used to coordinate async operations.
 *
 * This is one of the most powerful utilities for deterministic async testing. It creates
 * a coordination point that allows precise control over when async operations proceed,
 * eliminating race conditions and timing assumptions.
 *
 * @returns An object with methods to wait for and trigger the sync point
 * @returns.wait - A function that returns a promise resolving when the sync point is triggered
 * @returns.trigger - A function that triggers the sync point, resolving any waiting promises
 *
 * @example
 * // Create a sync point
 * const syncPoint = createSyncPoint();
 *
 * // Make a mock function trigger the sync point when called
 * mockFunction.mockImplementation(() => {
 *   syncPoint.trigger();
 *   return Promise.resolve('result');
 * });
 *
 * // Start an async operation that will call the mock
 * const resultPromise = asyncOperation();
 *
 * // Wait for the sync point to be triggered
 * await syncPoint.wait();
 *
 * // Now we know the mock has been called, even if resultPromise hasn't resolved yet
 * expect(mockFunction).toHaveBeenCalled();
 *
 * // Continue with the test
 * const result = await resultPromise;
 * expect(result).toBe('expected result');
 */
export function createSyncPoint() {
  let resolve: (value: unknown) => void;
  const promise = new Promise(r => { resolve = r; });
  
  return {
    wait: () => promise,
    trigger: () => resolve(true)
  };
}

/**
 * Create a mock implementation that returns a promise resolving after a specified delay.
 *
 * This is useful for simulating asynchronous operations with controlled timing.
 * When used with fake timers, the delay can be precisely controlled.
 *
 * @param result - The value to resolve the promise with
 * @param delay - The delay in milliseconds before resolving (default: 10)
 * @returns A Jest mock function that returns a promise resolving to the result after the delay
 *
 * @example
 * // Create a mock that resolves with 'success' after 100ms
 * const mockAsync = createDelayedMock('success', 100);
 *
 * // Use the mock in a test
 * const promise = mockAsync();
 * expect(mockAsync).toHaveBeenCalled();
 *
 * // With fake timers, we can control when it resolves
 * jest.advanceTimersByTime(100);
 * const result = await promise;
 * expect(result).toBe('success');
 */
export function createDelayedMock<T>(result: T, delay = 10) {
  return jest.fn().mockImplementation(() => {
    return new Promise<T>(resolve => {
      setTimeout(() => resolve(result), delay);
    });
  });
}

/**
 * Create a mock implementation that returns sequential results for each call.
 *
 * This is useful for testing code that makes multiple calls to the same function
 * and expects different results each time. The mock will cycle through the provided
 * results, returning to the last result after reaching the end of the array.
 *
 * @param results - Array of values to return in sequence
 * @returns A Jest mock function that returns promises resolving to each result in sequence
 *
 * @example
 * // Create a mock that returns different values for each call
 * const mockApi = createSequentialMock([
 *   { status: 'pending' },
 *   { status: 'processing' },
 *   { status: 'complete' }
 * ]);
 *
 * // First call returns the first result
 * expect(await mockApi()).toEqual({ status: 'pending' });
 *
 * // Second call returns the second result
 * expect(await mockApi()).toEqual({ status: 'processing' });
 *
 * // Third call returns the third result
 * expect(await mockApi()).toEqual({ status: 'complete' });
 *
 * // Fourth call returns the last result again
 * expect(await mockApi()).toEqual({ status: 'complete' });
 */
export function createSequentialMock<T>(results: T[]) {
  let callCount = 0;
  return jest.fn().mockImplementation(() => {
    const result = results[callCount];
    callCount = Math.min(callCount + 1, results.length - 1);
    return Promise.resolve(result);
  });
}

/**
 * Create a controlled mock that allows tests to manually resolve or reject promises.
 *
 * This provides the most precise control over asynchronous behavior in tests.
 * The mock function returns promises that can be manually resolved or rejected
 * at specific points in the test, allowing for exact control over timing and values.
 *
 * @returns An object containing the mock function and control methods
 * @returns.mock - The Jest mock function that returns a pending promise
 * @returns.resolvePending - Function to resolve the oldest pending promise
 * @returns.rejectPending - Function to reject the oldest pending promise
 * @returns.pendingCount - Function that returns the number of pending promises
 *
 * @example
 * // Create a controlled mock
 * const { mock, resolvePending, rejectPending, pendingCount } = createControlledMock();
 *
 * // Start an operation that uses the mock
 * const operationPromise = operationThatUsesMock(mock);
 *
 * // The operation is now waiting for the mock to resolve
 * expect(pendingCount()).toBe(1);
 *
 * // Resolve the pending promise with a value
 * resolvePending('success');
 *
 * // Now the operation can continue
 * const result = await operationPromise;
 * expect(result).toBe('expected result');
 *
 * // For testing error handling, we can reject instead
 * const errorPromise = operationThatUsesMock(mock);
 * rejectPending(new Error('test error'));
 * await expect(errorPromise).rejects.toThrow('test error');
 */
export function createControlledMock<T>() {
  const pendingPromises: { 
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
  }[] = [];
  
  const mockFn = jest.fn().mockImplementation(() => {
    return new Promise<T>((resolve, reject) => {
      pendingPromises.push({ resolve, reject });
    });
  });
  
  return {
    mock: mockFn,
    resolvePending: (value: T) => {
      const promise = pendingPromises.shift();
      if (promise) {
        promise.resolve(value);
      }
    },
    rejectPending: (reason?: any) => {
      const promise = pendingPromises.shift();
      if (promise) {
        promise.reject(reason);
      }
    },
    pendingCount: () => pendingPromises.length
  };
}