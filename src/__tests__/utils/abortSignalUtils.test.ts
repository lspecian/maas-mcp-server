import {
  createDerivedSignal,
  onAbort,
  throwIfAborted,
  isAborted,
  abortable,
  delay,
  combineSignals,
  isAbortError,
  handleAbortError,
  AbortedOperationError
} from '../../utils/abortSignalUtils.js';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  createRequestLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  })
}));

describe('abortSignalUtils', () => {
  // Helper to create a promise that resolves after a delay
  const createDelayedPromise = <T>(value: T, delayMs: number = 50): Promise<T> => {
    return new Promise(resolve => setTimeout(() => resolve(value), delayMs));
  };

  describe('AbortedOperationError', () => {
    it('should create an error with the correct name and message', () => {
      const error = new AbortedOperationError();
      expect(error.name).toBe('AbortedOperationError');
      expect(error.message).toBe('Operation was aborted');
      
      const customError = new AbortedOperationError('Custom message');
      expect(customError.name).toBe('AbortedOperationError');
      expect(customError.message).toBe('Custom message');
    });
  });

  describe('createDerivedSignal', () => {
    it('should create a signal that is aborted when the parent signal is aborted', () => {
      const controller = new AbortController();
      const parentSignal = controller.signal;
      const derivedSignal = createDerivedSignal(parentSignal);
      
      expect(derivedSignal.aborted).toBe(false);
      
      controller.abort();
      
      expect(derivedSignal.aborted).toBe(true);
    });
    
    it('should create an already aborted signal if the parent signal is already aborted', () => {
      const controller = new AbortController();
      controller.abort('Parent aborted');
      
      const derivedSignal = createDerivedSignal(controller.signal);
      
      expect(derivedSignal.aborted).toBe(true);
      expect(derivedSignal.reason).toBe('Parent aborted');
    });
    
    it('should abort the signal after the specified timeout', async () => {
      const derivedSignal = createDerivedSignal(undefined, { timeout: 50 });
      
      expect(derivedSignal.aborted).toBe(false);
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(derivedSignal.aborted).toBe(true);
    });
    
    it('should use the provided reason when aborting due to timeout', async () => {
      const derivedSignal = createDerivedSignal(undefined, { 
        timeout: 50,
        reason: 'Custom timeout reason'
      });
      
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(derivedSignal.aborted).toBe(true);
      expect(derivedSignal.reason).toBe('Custom timeout reason');
    });
    
    it('should clear the timeout if the parent signal is aborted first', async () => {
      const controller = new AbortController();
      const parentSignal = controller.signal;
      
      const derivedSignal = createDerivedSignal(parentSignal, { 
        timeout: 100,
        reason: 'Timeout reason'
      });
      
      // Abort the parent signal before the timeout
      controller.abort('Parent reason');
      
      expect(derivedSignal.aborted).toBe(true);
      expect(derivedSignal.reason).toBe('Parent reason');
      
      // Wait longer than the timeout
      await new Promise(resolve => setTimeout(resolve, 110));
      
      // The reason should still be from the parent abort, not the timeout
      expect(derivedSignal.reason).toBe('Parent reason');
    });
  });

  describe('onAbort', () => {
    it('should call the cleanup function when the signal is aborted', async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      
      const cleanup = jest.fn();
      onAbort(signal, cleanup);
      
      expect(cleanup).not.toHaveBeenCalled();
      
      controller.abort();
      
      // Wait for the next tick to allow the cleanup to be called
      await Promise.resolve();
      
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
    
    it('should call the cleanup function immediately if the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      
      const cleanup = jest.fn();
      onAbort(controller.signal, cleanup);
      
      // Wait for the next tick to allow the cleanup to be called
      await Promise.resolve();
      
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
    
    it('should return a function that unregisters the cleanup', async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      
      const cleanup = jest.fn();
      const unregister = onAbort(signal, cleanup);
      
      // Unregister the cleanup
      unregister();
      
      controller.abort();
      
      // Wait for the next tick
      await Promise.resolve();
      
      expect(cleanup).not.toHaveBeenCalled();
    });
  });

  describe('throwIfAborted', () => {
    it('should throw if the signal is aborted', () => {
      const controller = new AbortController();
      controller.abort('Test abort reason');
      
      expect(() => throwIfAborted(controller.signal)).toThrow(AbortedOperationError);
      expect(() => throwIfAborted(controller.signal)).toThrow('Test abort reason');
    });
    
    it('should use a custom message if provided', () => {
      const controller = new AbortController();
      controller.abort();
      
      expect(() => throwIfAborted(controller.signal, 'Custom message')).toThrow('Custom message');
    });
    
    it('should not throw if the signal is not aborted', () => {
      const controller = new AbortController();
      
      expect(() => throwIfAborted(controller.signal)).not.toThrow();
    });
    
    it('should not throw if no signal is provided', () => {
      expect(() => throwIfAborted()).not.toThrow();
    });
  });

  describe('isAborted', () => {
    it('should return true if the signal is aborted', () => {
      const controller = new AbortController();
      controller.abort();
      
      expect(isAborted(controller.signal)).toBe(true);
    });
    
    it('should return false if the signal is not aborted', () => {
      const controller = new AbortController();
      
      expect(isAborted(controller.signal)).toBe(false);
    });
    
    it('should return false if no signal is provided', () => {
      expect(isAborted()).toBe(false);
    });
  });

  describe('abortable', () => {
    it('should resolve with the promise result if not aborted', async () => {
      const controller = new AbortController();
      const promise = createDelayedPromise('result');
      
      const result = await abortable(promise, controller.signal);
      
      expect(result).toBe('result');
    });
    
    it('should reject with AbortedOperationError if the signal is aborted', async () => {
      const controller = new AbortController();
      const promise = createDelayedPromise('result', 100);
      
      const abortablePromise = abortable(promise, controller.signal);
      
      // Abort after a short delay
      setTimeout(() => controller.abort('Test abort'), 50);
      
      await expect(abortablePromise).rejects.toThrow(AbortedOperationError);
      await expect(abortablePromise).rejects.toThrow('Test abort');
    });
    
    it('should reject immediately if the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort('Already aborted');
      
      const promise = createDelayedPromise('result');
      
      await expect(abortable(promise, controller.signal)).rejects.toThrow('Already aborted');
    });
    
    it('should call the cleanup function if aborted', async () => {
      const controller = new AbortController();
      const promise = createDelayedPromise('result', 100);
      const cleanup = jest.fn();
      
      const abortablePromise = abortable(promise, controller.signal, cleanup);
      
      // Abort after a short delay
      setTimeout(() => controller.abort(), 50);
      
      try {
        await abortablePromise;
      } catch (error) {
        // Expected to throw
      }
      
      // Wait for the next tick
      await Promise.resolve();
      
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
    
    it('should not call the cleanup function if the promise resolves', async () => {
      const controller = new AbortController();
      const promise = createDelayedPromise('result');
      const cleanup = jest.fn();
      
      await abortable(promise, controller.signal, cleanup);
      
      expect(cleanup).not.toHaveBeenCalled();
    });
  });

  describe('delay', () => {
    it('should resolve after the specified delay', async () => {
      const start = Date.now();
      
      await delay(50);
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow for small timing variations
    });
    
    it('should reject if the signal is aborted', async () => {
      const controller = new AbortController();
      const delayPromise = delay(100, controller.signal);
      
      // Abort after a short delay
      setTimeout(() => controller.abort('Test abort'), 50);
      
      await expect(delayPromise).rejects.toThrow(AbortedOperationError);
      await expect(delayPromise).rejects.toThrow('Test abort');
    });
    
    it('should reject immediately if the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort('Already aborted');
      
      await expect(delay(50, controller.signal)).rejects.toThrow('Already aborted');
    });
  });

  describe('combineSignals', () => {
    it('should create a signal that is aborted when any input signal is aborted', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      const combinedSignal = combineSignals([controller1.signal, controller2.signal]);
      
      expect(combinedSignal.aborted).toBe(false);
      
      controller1.abort('Signal 1 aborted');
      
      expect(combinedSignal.aborted).toBe(true);
      expect(combinedSignal.reason).toBe('Signal 1 aborted');
    });
    
    it('should create an already aborted signal if any input signal is already aborted', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      controller1.abort('Already aborted');
      
      const combinedSignal = combineSignals([controller1.signal, controller2.signal]);
      
      expect(combinedSignal.aborted).toBe(true);
      expect(combinedSignal.reason).toBe('Already aborted');
    });
    
    it('should use the provided reason if specified', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      const combinedSignal = combineSignals(
        [controller1.signal, controller2.signal],
        'Custom reason'
      );
      
      controller2.abort();
      
      expect(combinedSignal.aborted).toBe(true);
      expect(combinedSignal.reason).toBe('Custom reason');
    });
    
    it('should return a never-aborting signal if no signals are provided', () => {
      const combinedSignal = combineSignals([]);
      
      expect(combinedSignal.aborted).toBe(false);
    });
    
    it('should return the input signal directly if only one is provided', () => {
      const controller = new AbortController();
      const signal = controller.signal;
      
      const combinedSignal = combineSignals([signal]);
      
      expect(combinedSignal).toBe(signal);
    });
    
    it('should filter out undefined signals', () => {
      const controller = new AbortController();
      
      const combinedSignal = combineSignals([controller.signal, undefined]);
      
      expect(combinedSignal).toBe(controller.signal);
    });
  });

  describe('isAbortError', () => {
    it('should return true for AbortedOperationError', () => {
      const error = new AbortedOperationError();
      
      expect(isAbortError(error)).toBe(true);
    });
    
    it('should return true for DOMException with name AbortError', () => {
      const error = new DOMException('Operation aborted', 'AbortError');
      
      expect(isAbortError(error)).toBe(true);
    });
    
    it('should return true for Error with name AbortError', () => {
      const error = new Error('Operation aborted');
      error.name = 'AbortError';
      
      expect(isAbortError(error)).toBe(true);
    });
    
    it('should return true for Error with message containing "aborted"', () => {
      const error = new Error('The operation was aborted');
      
      expect(isAbortError(error)).toBe(true);
    });
    
    it('should return true for Error with message containing "canceled"', () => {
      const error = new Error('The operation was canceled');
      
      expect(isAbortError(error)).toBe(true);
    });
    
    it('should return false for other errors', () => {
      const error = new Error('Some other error');
      
      expect(isAbortError(error)).toBe(false);
    });
    
    it('should return false for non-Error objects', () => {
      expect(isAbortError('string error')).toBe(false);
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
      expect(isAbortError({ message: 'error object' })).toBe(false);
    });
  });

  describe('handleAbortError', () => {
    it('should convert AbortError to AbortedOperationError', () => {
      const error = new DOMException('Operation aborted', 'AbortError');
      
      const handled = handleAbortError(error);
      
      expect(handled).toBeInstanceOf(AbortedOperationError);
      expect(handled.message).toBe('Operation aborted');
    });
    
    it('should use the custom message if provided', () => {
      const error = new DOMException('Operation aborted', 'AbortError');
      
      const handled = handleAbortError(error, 'Custom abort message');
      
      expect(handled).toBeInstanceOf(AbortedOperationError);
      expect(handled.message).toBe('Custom abort message');
    });
    
    it('should return the original error if not an abort error', () => {
      const error = new Error('Some other error');
      
      const handled = handleAbortError(error);
      
      expect(handled).toBe(error);
    });
    
    it('should convert non-Error objects to Error', () => {
      const handled = handleAbortError('string error');
      
      expect(handled).toBeInstanceOf(Error);
      expect(handled.message).toBe('string error');
    });
  });
});