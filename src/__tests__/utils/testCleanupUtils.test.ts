import { jest } from '@jest/globals';
import {
  resetAllMocks,
  clearProgressNotificationHistory,
  clearOperationsRegistry,
  safeAbortController,
  cleanupAbortSignalListeners,
  performComprehensiveCleanup
} from './testCleanupUtils';

// Mock the dependencies
jest.mock('../../utils/progressNotification.js', () => ({
  clearRateLimitHistory: jest.fn()
}));

jest.mock('../../utils/operationsRegistry.js', () => ({
  getAllOperations: jest.fn().mockReturnValue([
    { id: 'op1' },
    { id: 'op2' },
    { id: 'op3' }
  ]),
  unregisterOperation: jest.fn()
}));

describe('Test Cleanup Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reset all mocks', () => {
    // Setup
    const mockFn = jest.fn();
    mockFn();
    expect(mockFn).toHaveBeenCalled();

    // Execute
    resetAllMocks();

    // Verify
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('should clear progress notification history', () => {
    // Import the mocked module with type assertion
    const progressNotification = jest.requireMock('../../utils/progressNotification.js') as {
      clearRateLimitHistory: jest.Mock;
    };

    // Execute
    clearProgressNotificationHistory();

    // Verify
    expect(progressNotification.clearRateLimitHistory).toHaveBeenCalled();
  });

  it('should clear operations registry', () => {
    // Import the mocked module with type assertion
    const operationsRegistry = jest.requireMock('../../utils/operationsRegistry.js') as {
      getAllOperations: jest.Mock;
      unregisterOperation: jest.Mock;
    };

    // Execute
    clearOperationsRegistry();

    // Verify
    expect(operationsRegistry.getAllOperations).toHaveBeenCalled();
    expect(operationsRegistry.unregisterOperation).toHaveBeenCalledTimes(3);
    expect(operationsRegistry.unregisterOperation).toHaveBeenCalledWith('op1');
    expect(operationsRegistry.unregisterOperation).toHaveBeenCalledWith('op2');
    expect(operationsRegistry.unregisterOperation).toHaveBeenCalledWith('op3');
  });

  it('should safely abort a controller', () => {
    // Setup
    const abortController = new AbortController();
    const abortSpy = jest.spyOn(abortController, 'abort');

    // Execute
    safeAbortController(abortController, 'Test reason');

    // Verify
    expect(abortSpy).toHaveBeenCalledWith('Test reason');
  });

  it('should not abort an already aborted controller', () => {
    // Setup
    const abortController = new AbortController();
    abortController.abort();
    const abortSpy = jest.spyOn(abortController, 'abort');

    // Execute
    safeAbortController(abortController);

    // Verify
    expect(abortSpy).not.toHaveBeenCalled();
  });

  it('should clean up abort signal listeners', () => {
    // Setup
    const abortController = new AbortController();
    const removeEventListenerSpy = jest.spyOn(abortController.signal, 'removeEventListener');

    // Execute
    cleanupAbortSignalListeners(abortController.signal);

    // Verify - this is a best-effort approach since we can't directly verify listener removal
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });

  it('should perform comprehensive cleanup', () => {
    // Setup
    const abortController = new AbortController();
    const abortSpy = jest.spyOn(abortController, 'abort');
    
    // Import the mocked modules with type assertions
    const progressNotification = jest.requireMock('../../utils/progressNotification.js') as {
      clearRateLimitHistory: jest.Mock;
    };
    const operationsRegistry = jest.requireMock('../../utils/operationsRegistry.js') as {
      getAllOperations: jest.Mock;
      unregisterOperation: jest.Mock;
    };

    // Execute
    performComprehensiveCleanup(abortController);

    // Verify
    expect(progressNotification.clearRateLimitHistory).toHaveBeenCalled();
    expect(operationsRegistry.getAllOperations).toHaveBeenCalled();
    expect(operationsRegistry.unregisterOperation).toHaveBeenCalledTimes(3);
    expect(abortSpy).toHaveBeenCalled();
  });

  it('should handle null abort controller in comprehensive cleanup', () => {
    // Execute - should not throw
    expect(() => performComprehensiveCleanup()).not.toThrow();
  });
});