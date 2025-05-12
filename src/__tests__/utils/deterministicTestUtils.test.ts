import { jest } from '@jest/globals';
import {
  setupFakeTimers,
  restoreRealTimers,
  advanceTimersByTime,
  waitForTicks,
  waitForCondition,
  waitForMockCalls,
  createSyncPoint,
  createDelayedMock,
  createSequentialMock,
  createControlledMock
} from './deterministicTestUtils';

describe('deterministicTestUtils', () => {
  afterEach(() => {
    // Ensure real timers are restored after each test
    jest.useRealTimers();
  });

  describe('timer utilities', () => {
    it('should setup and restore fake timers', () => {
      const spyOnUseFakeTimers = jest.spyOn(jest, 'useFakeTimers');
      const spyOnUseRealTimers = jest.spyOn(jest, 'useRealTimers');
      
      setupFakeTimers();
      expect(spyOnUseFakeTimers).toHaveBeenCalled();
      
      restoreRealTimers();
      expect(spyOnUseRealTimers).toHaveBeenCalled();
      
      spyOnUseFakeTimers.mockRestore();
      spyOnUseRealTimers.mockRestore();
    });

    it('should advance timers by time', () => {
      setupFakeTimers();
      
      const mockFn = jest.fn();
      setTimeout(mockFn, 1000);
      
      expect(mockFn).not.toHaveBeenCalled();
      
      advanceTimersByTime(500);
      expect(mockFn).not.toHaveBeenCalled();
      
      advanceTimersByTime(500);
      expect(mockFn).toHaveBeenCalled();
      
      restoreRealTimers();
    });
  });

  describe('waitForTicks', () => {
    it('should wait for the specified number of ticks', async () => {
      const operations: string[] = [];
      
      // Start an async operation that will complete after multiple ticks
      Promise.resolve()
        .then(() => operations.push('tick 1'))
        .then(() => operations.push('tick 2'))
        .then(() => operations.push('tick 3'));
      
      // Initially, no operations have completed
      expect(operations).toEqual([]);
      
      // Wait for 1 tick
      await waitForTicks(1);
      expect(operations).toEqual(['tick 1']);
      
      // Wait for 2 more ticks
      await waitForTicks(2);
      expect(operations).toEqual(['tick 1', 'tick 2', 'tick 3']);
    });
  });

  describe('waitForCondition', () => {
    it('should resolve when condition is met', async () => {
      let counter = 0;
      const incrementCounter = () => {
        counter++;
      };
      
      // Setup a timer to increment the counter
      const intervalId = setInterval(incrementCounter, 100);
      
      try {
        // Wait for the counter to reach 3
        await waitForCondition(() => counter >= 3, 1000, 10);
        expect(counter).toBeGreaterThanOrEqual(3);
      } finally {
        clearInterval(intervalId);
      }
    });

    it('should reject if condition is not met within timeout', async () => {
      let counter = 0;
      const incrementCounter = () => {
        counter++;
      };
      
      // Setup a timer to increment the counter (but too slowly)
      const intervalId = setInterval(incrementCounter, 100);
      
      try {
        // This should timeout because counter will only reach 1 within 150ms
        await expect(waitForCondition(() => counter >= 5, 150, 10))
          .rejects.toThrow('Condition not met within 150ms timeout');
      } finally {
        clearInterval(intervalId);
      }
    });
  });

  describe('waitForMockCalls', () => {
    it('should resolve when mock is called the specified number of times', async () => {
      const mockFn = jest.fn();
      
      // Call the mock function after delays
      setTimeout(() => mockFn('first call'), 50);
      setTimeout(() => mockFn('second call'), 100);
      setTimeout(() => mockFn('third call'), 150);
      
      // Wait for 3 calls
      await waitForMockCalls(mockFn, 3, 200);
      
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(mockFn).toHaveBeenNthCalledWith(1, 'first call');
      expect(mockFn).toHaveBeenNthCalledWith(2, 'second call');
      expect(mockFn).toHaveBeenNthCalledWith(3, 'third call');
    });
  });

  describe('createSyncPoint', () => {
    it('should create a synchronization point that can be triggered', async () => {
      const syncPoint = createSyncPoint();
      
      // Start an async operation that waits for the sync point
      const operationPromise = (async () => {
        await syncPoint.wait();
        return 'operation completed';
      })();
      
      // The operation should not complete immediately
      const immediateResult = await Promise.race([
        operationPromise,
        Promise.resolve('not completed')
      ]);
      expect(immediateResult).toBe('not completed');
      
      // Trigger the sync point
      syncPoint.trigger();
      
      // Now the operation should complete
      const result = await operationPromise;
      expect(result).toBe('operation completed');
    });
  });

  describe('createDelayedMock', () => {
    it('should create a mock that resolves after a delay', async () => {
      setupFakeTimers();
      
      const mockFn = createDelayedMock('result', 1000);
      
      const promise = mockFn() as Promise<string>;
      
      // The promise should not resolve immediately
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      
      expect(resolved).toBe(false);
      
      // Advance time
      advanceTimersByTime(1000);
      
      // Need to wait for the promise to resolve
      await Promise.resolve();
      
      expect(resolved).toBe(true);
      expect(await promise).toBe('result');
      
      restoreRealTimers();
    });
  });

  describe('createSequentialMock', () => {
    it('should return sequential results for each call', async () => {
      const results = ['first', 'second', 'third'];
      const mockFn = createSequentialMock(results);
      
      expect(await mockFn()).toBe('first');
      expect(await mockFn()).toBe('second');
      expect(await mockFn()).toBe('third');
      
      // Additional calls should return the last result
      expect(await mockFn()).toBe('third');
    });
  });

  describe('createControlledMock', () => {
    it('should allow manually resolving promises', async () => {
      const { mock, resolvePending, pendingCount } = createControlledMock<string>();
      
      // Start an operation that uses the mock
      const promise = mock();
      
      // The promise should be pending
      expect(pendingCount()).toBe(1);
      
      // Resolve the promise
      resolvePending('result');
      
      // The promise should resolve with the provided value
      expect(await promise).toBe('result');
      
      // No more pending promises
      expect(pendingCount()).toBe(0);
    });

    it('should allow manually rejecting promises', async () => {
      const { mock, rejectPending, pendingCount } = createControlledMock<string>();
      
      // Start an operation that uses the mock
      const promise = mock();
      
      // The promise should be pending
      expect(pendingCount()).toBe(1);
      
      // Reject the promise
      rejectPending(new Error('test error'));
      
      // The promise should reject with the provided error
      await expect(promise).rejects.toThrow('test error');
      
      // No more pending promises
      expect(pendingCount()).toBe(0);
    });
  });
});