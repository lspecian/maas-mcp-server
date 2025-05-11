import { createRequestLogger } from "./logger.js";

/**
 * Custom error class for aborted operations
 *
 * This error is thrown when an operation is aborted, either manually
 * or due to a timeout. It extends the standard Error class and sets
 * the name property to "AbortedOperationError" for easier identification
 * in error handling code.
 */
export class AbortedOperationError extends Error {
  constructor(message: string = "Operation was aborted") {
    super(message);
    this.name = "AbortedOperationError";
  }
}

/**
 * Type definition for cleanup functions that should be called when an operation is aborted
 *
 * Cleanup functions can be synchronous or asynchronous (returning a Promise).
 * They are used to release resources, cancel network requests, or perform any
 * other necessary cleanup when an operation is aborted.
 */
export type CleanupFunction = () => Promise<void> | void;

/**
 * Interface defining options when creating a derived AbortSignal
 *
 * These options control the behavior of the derived signal, including
 * automatic timeout, custom abort reason, and logging information.
 */
export interface DerivedSignalOptions {
  /**
   * Optional timeout in milliseconds after which the signal will be aborted
   */
  timeout?: number;
  
  /**
   * Optional reason for the abort
   */
  reason?: string;
  
  /**
   * Optional request ID for logging
   */
  requestId?: string;
  
  /**
   * Optional operation name for logging
   */
  operationName?: string;
}

/**
 * Creates a derived AbortSignal that will be aborted if the parent signal is aborted
 *
 * This function creates a new AbortSignal that inherits the abort state from a parent signal.
 * If the parent signal is aborted, the derived signal will also be aborted.
 * Additionally, the derived signal can be configured to abort automatically after a timeout.
 *
 * @param parentSignal - The parent AbortSignal to derive from (optional)
 * @param options - Options for the derived signal
 * @returns A new AbortSignal that will be aborted if the parent signal is aborted
 *
 * @example
 * // Create a derived signal with a 5-second timeout
 * const parentController = new AbortController();
 * const derivedSignal = createDerivedSignal(parentController.signal, {
 *   timeout: 5000,
 *   reason: 'Operation timed out after 5 seconds'
 * });
 *
 * // Use the derived signal for an operation
 * fetch('https://api.example.com/data', { signal: derivedSignal })
 *   .then(response => response.json())
 *   .catch(error => {
 *     if (isAbortError(error)) {
 *       console.log('Operation was aborted:', error.message);
 *     } else {
 *       console.error('Operation failed:', error);
 *     }
 *   });
 */
export function createDerivedSignal(
  parentSignal?: AbortSignal,
  options: DerivedSignalOptions = {}
): AbortSignal {
  const { timeout, reason, requestId, operationName } = options;
  
  // Create a new AbortController
  const controller = new AbortController();
  const derivedSignal = controller.signal;
  
  // Create logger if requestId and operationName are provided
  const logger = requestId && operationName
    ? createRequestLogger(requestId, operationName, {})
    : undefined;
  
  // If parent signal is already aborted, abort the derived signal immediately
  if (parentSignal?.aborted) {
    const abortReason = parentSignal.reason || reason || "Parent signal was already aborted";
    controller.abort(abortReason);
    if (logger) {
      logger.debug({ reason: abortReason }, "Derived signal aborted immediately because parent was already aborted");
    }
    return derivedSignal;
  }
  
  // Set up timeout if specified
  let timeoutId: NodeJS.Timeout | undefined;
  if (timeout && timeout > 0) {
    timeoutId = setTimeout(() => {
      const timeoutReason = reason || `Operation timed out after ${timeout}ms`;
      controller.abort(timeoutReason);
      if (logger) {
        logger.debug({ timeout, reason: timeoutReason }, "Derived signal aborted due to timeout");
      }
    }, timeout);
  }
  
  // Forward abort from parent signal
  if (parentSignal) {
    const abortHandler = () => {
      // Clear timeout if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      const abortReason = parentSignal.reason || reason || "Parent signal was aborted";
      controller.abort(abortReason);
      
      if (logger) {
        logger.debug({ reason: abortReason }, "Derived signal aborted because parent signal was aborted");
      }
    };
    
    // Add abort event listener to parent signal
    parentSignal.addEventListener("abort", abortHandler, { once: true });
    
    // If derived signal is aborted, remove the listener from parent
    derivedSignal.addEventListener("abort", () => {
      parentSignal.removeEventListener("abort", abortHandler);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }, { once: true });
  }
  
  return derivedSignal;
}

/**
 * Registry to track cleanup functions for aborted operations
 *
 * This class maintains a mapping between AbortSignals and their associated
 * cleanup functions. When a signal is aborted, all registered cleanup functions
 * for that signal are executed. This helps ensure proper resource cleanup
 * when operations are cancelled.
 *
 * @private
 */
class CleanupRegistry {
  private cleanupFunctions = new Map<AbortSignal, Set<CleanupFunction>>();
  
  /**
   * Registers a cleanup function to be called when the signal is aborted
   * 
   * @param signal - The AbortSignal to watch
   * @param cleanup - The cleanup function to call when the signal is aborted
   */
  register(signal: AbortSignal, cleanup: CleanupFunction): void {
    // If signal is already aborted, call cleanup immediately
    if (signal.aborted) {
      Promise.resolve().then(cleanup).catch(err => {
        console.error("Error in immediate cleanup function:", err);
      });
      return;
    }
    
    // Get or create the set of cleanup functions for this signal
    if (!this.cleanupFunctions.has(signal)) {
      this.cleanupFunctions.set(signal, new Set());
      
      // Add abort listener to the signal
      signal.addEventListener("abort", () => {
        this.runCleanup(signal);
      }, { once: true });
    }
    
    // Add the cleanup function to the set
    this.cleanupFunctions.get(signal)!.add(cleanup);
  }
  
  /**
   * Runs all cleanup functions registered for a signal
   * 
   * @param signal - The AbortSignal that was aborted
   */
  private runCleanup(signal: AbortSignal): void {
    const cleanups = this.cleanupFunctions.get(signal);
    if (!cleanups) return;
    
    // Run all cleanup functions
    for (const cleanup of cleanups) {
      Promise.resolve().then(cleanup).catch(err => {
        console.error("Error in cleanup function:", err);
      });
    }
    
    // Remove the signal from the registry
    this.cleanupFunctions.delete(signal);
  }
  
  /**
   * Unregisters a cleanup function
   * 
   * @param signal - The AbortSignal the cleanup function was registered with
   * @param cleanup - The cleanup function to unregister
   */
  unregister(signal: AbortSignal, cleanup: CleanupFunction): void {
    const cleanups = this.cleanupFunctions.get(signal);
    if (cleanups) {
      cleanups.delete(cleanup);
      if (cleanups.size === 0) {
        this.cleanupFunctions.delete(signal);
      }
    }
  }
}

// Create a singleton instance of the cleanup registry
const cleanupRegistry = new CleanupRegistry();

/**
 * Registers a cleanup function to be called when the signal is aborted
 *
 * This function registers a cleanup function that will be automatically called
 * when the specified AbortSignal is aborted. It returns a function that can be
 * called to unregister the cleanup function if needed.
 *
 * @param signal - The AbortSignal to watch
 * @param cleanup - The cleanup function to call when the signal is aborted
 * @returns A function that can be called to unregister the cleanup function
 *
 * @example
 * // Register a cleanup function for an AbortSignal
 * const controller = new AbortController();
 * const unregister = onAbort(controller.signal, async () => {
 *   // Close database connections, cancel network requests, etc.
 *   await db.close();
 *   console.log('Resources cleaned up after abort');
 * });
 *
 * // Later, if you want to manually unregister the cleanup function
 * unregister();
 */
export function onAbort(signal: AbortSignal, cleanup: CleanupFunction): () => void {
  cleanupRegistry.register(signal, cleanup);
  return () => cleanupRegistry.unregister(signal, cleanup);
}

/**
 * Throws an AbortedOperationError if the signal is aborted
 *
 * This utility function checks if an AbortSignal is aborted and throws
 * an AbortedOperationError if it is. This is useful for quickly checking
 * abort status at critical points in your code.
 *
 * @param signal - The AbortSignal to check
 * @param message - Optional custom error message
 * @throws AbortedOperationError if the signal is aborted
 *
 * @example
 * // Check if operation has been aborted before proceeding with expensive work
 * function processLargeDataset(data, signal) {
 *   // Check at the beginning
 *   throwIfAborted(signal, 'Data processing was aborted before starting');
 *
 *   // Process data in chunks
 *   for (const chunk of data.chunks) {
 *     // Check before each chunk
 *     throwIfAborted(signal, 'Data processing was aborted during execution');
 *     processChunk(chunk);
 *   }
 * }
 */
export function throwIfAborted(signal?: AbortSignal, message?: string): void {
  if (signal?.aborted) {
    throw new AbortedOperationError(message || signal.reason?.toString() || "Operation was aborted");
  }
}

/**
 * Checks if a signal is aborted
 *
 * This utility function checks if an AbortSignal is aborted without throwing
 * an error. It safely handles undefined signals by returning false.
 *
 * @param signal - The AbortSignal to check
 * @returns True if the signal is aborted, false otherwise
 *
 * @example
 * // Check abort status without throwing
 * function processData(data, signal) {
 *   if (isAborted(signal)) {
 *     console.log('Operation was already aborted, skipping processing');
 *     return;
 *   }
 *
 *   // Proceed with data processing
 *   // ...
 * }
 */
export function isAborted(signal?: AbortSignal): boolean {
  return !!signal?.aborted;
}

/**
 * Wraps a promise to make it abortable
 *
 * This function takes a promise and an AbortSignal and returns a new promise
 * that will reject with an AbortedOperationError if the signal is aborted before
 * the original promise resolves or rejects. It also supports an optional cleanup
 * function that will be called if the operation is aborted.
 *
 * @param promise - The promise to make abortable
 * @param signal - The AbortSignal to watch
 * @param cleanup - Optional cleanup function to call if aborted
 * @returns A promise that will reject with AbortedOperationError if the signal is aborted
 *
 * @example
 * // Make a database query abortable
 * async function fetchUserData(userId, signal) {
 *   const dbQuery = database.query('SELECT * FROM users WHERE id = ?', [userId]);
 *
 *   // Make the query abortable and provide a cleanup function
 *   return abortable(
 *     dbQuery,
 *     signal,
 *     async () => {
 *       // Cancel the database query if possible
 *       await dbQuery.cancel();
 *       console.log('Database query cancelled');
 *     }
 *   );
 * }
 */
export async function abortable<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
  cleanup?: CleanupFunction
): Promise<T> {
  // If no signal or already resolved, just return the promise
  if (!signal) return promise;
  
  // If already aborted, throw immediately
  throwIfAborted(signal);
  
  // Create a promise that rejects when the signal is aborted
  const abortPromise = new Promise<never>((_, reject) => {
    const abortHandler = () => {
      const reason = signal.reason?.toString() || "Operation was aborted";
      reject(new AbortedOperationError(reason));
    };
    
    signal.addEventListener("abort", abortHandler, { once: true });
    
    // Clean up the abort listener when the promise resolves or rejects
    promise.finally(() => {
      signal.removeEventListener("abort", abortHandler);
    }).catch(() => {}); // Catch to prevent unhandled rejection warning
  });
  
  // Register cleanup function if provided
  if (cleanup && signal) {
    onAbort(signal, cleanup);
  }
  
  // Race the original promise against the abort promise
  return Promise.race([promise, abortPromise]);
}

/**
 * Creates a delay promise that respects AbortSignal
 *
 * This function creates a promise that resolves after the specified delay,
 * but will reject with an AbortedOperationError if the provided signal is
 * aborted before the delay completes. This is useful for implementing
 * cancelable timeouts and delays in async operations.
 *
 * @param ms - The delay in milliseconds
 * @param signal - Optional AbortSignal to abort the delay
 * @returns A promise that resolves after the delay or rejects if aborted
 *
 * @example
 * // Implement a cancelable polling function
 * async function pollResource(url, intervalMs, signal) {
 *   while (true) {
 *     const response = await fetch(url, { signal });
 *     const data = await response.json();
 *
 *     if (data.status === 'complete') {
 *       return data;
 *     }
 *
 *     // Wait for the next polling interval, but respect abort signal
 *     await delay(intervalMs, signal);
 *   }
 * }
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already aborted, reject immediately
    if (signal?.aborted) {
      return reject(new AbortedOperationError(signal.reason?.toString() || "Delay was aborted"));
    }
    
    const timeoutId = setTimeout(resolve, ms);
    
    // Set up abort handler
    if (signal) {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new AbortedOperationError(signal.reason?.toString() || "Delay was aborted"));
      };
      
      signal.addEventListener("abort", abortHandler, { once: true });
      
      // Clean up the abort listener when the promise resolves
      setTimeout(() => {
        signal.removeEventListener("abort", abortHandler);
      }, ms);
    }
  });
}

/**
 * Combines multiple AbortSignals into one
 *
 * This function takes an array of AbortSignals and returns a new AbortSignal
 * that will be aborted if any of the input signals are aborted. This is useful
 * when an operation needs to be aborted for multiple different reasons.
 *
 * @param signals - Array of AbortSignals to combine
 * @param reason - Optional reason to use when aborting
 * @returns A new AbortSignal that will be aborted if any of the input signals are aborted
 *
 * @example
 * // Combine user abort signal with timeout signal
 * function fetchWithTimeout(url, timeoutMs, userSignal) {
 *   // Create a timeout signal
 *   const timeoutController = new AbortController();
 *   const timeoutId = setTimeout(() => {
 *     timeoutController.abort('Request timed out');
 *   }, timeoutMs);
 *
 *   // Combine the user's signal with the timeout signal
 *   const combinedSignal = combineSignals(
 *     [userSignal, timeoutController.signal],
 *     'Operation cancelled'
 *   );
 *
 *   // Use the combined signal for the fetch
 *   return fetch(url, { signal: combinedSignal })
 *     .finally(() => clearTimeout(timeoutId));
 * }
 */
export function combineSignals(signals: (AbortSignal | undefined)[], reason?: string): AbortSignal {
  // Filter out undefined signals
  const validSignals = signals.filter((s): s is AbortSignal => !!s);
  
  // If no valid signals, return a signal that will never abort
  if (validSignals.length === 0) {
    return new AbortController().signal;
  }
  
  // If only one signal, return it directly
  if (validSignals.length === 1) {
    return validSignals[0];
  }
  
  // Create a new AbortController
  const controller = new AbortController();
  
  // Check if any signal is already aborted
  const abortedSignal = validSignals.find(s => s.aborted);
  if (abortedSignal) {
    controller.abort(reason || abortedSignal.reason || "One of the combined signals was already aborted");
    return controller.signal;
  }
  
  // Add abort listeners to all signals
  const abortHandlers = validSignals.map(signal => {
    const handler = () => {
      controller.abort(reason || signal.reason || "One of the combined signals was aborted");
      
      // Remove all other abort listeners
      for (let i = 0; i < validSignals.length; i++) {
        if (validSignals[i] !== signal) {
          validSignals[i].removeEventListener("abort", abortHandlers[i]);
        }
      }
    };
    
    signal.addEventListener("abort", handler, { once: true });
    return handler;
  });
  
  return controller.signal;
}

/**
 * Checks if an error is an AbortError
 *
 * This function determines whether an error is related to an aborted operation.
 * It handles various types of abort errors, including:
 * - AbortedOperationError from this module
 * - DOMException with name "AbortError" (from fetch API)
 * - Standard Error with name "AbortError"
 * - Errors with messages containing "aborted" or "canceled"
 *
 * @param error - The error to check
 * @returns True if the error is an AbortError or AbortedOperationError
 *
 * @example
 * // Handle abort errors differently from other errors
 * try {
 *   await fetchData(url, signal);
 * } catch (error) {
 *   if (isAbortError(error)) {
 *     console.log('Operation was cancelled by the user');
 *   } else {
 *     console.error('Operation failed:', error);
 *     throw error; // Re-throw non-abort errors
 *   }
 * }
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof AbortedOperationError) {
    return true;
  }
  
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  
  if (error instanceof Error && (
    error.name === "AbortError" || 
    error.message.includes("aborted") || 
    error.message.includes("canceled")
  )) {
    return true;
  }
  
  return false;
}

/**
 * Handles an error, converting AbortErrors to AbortedOperationError
 *
 * This utility function normalizes abort-related errors by converting them
 * to AbortedOperationError instances. This helps ensure consistent error
 * handling for aborted operations throughout the application.
 *
 * @param error - The error to handle
 * @param message - Optional custom error message for abort errors
 * @returns The original error or a new AbortedOperationError
 *
 * @example
 * // Normalize abort errors in a catch block
 * try {
 *   await fetchWithTimeout(url, 5000, signal);
 * } catch (error) {
 *   // Convert any abort-related error to AbortedOperationError
 *   const normalizedError = handleAbortError(
 *     error,
 *     'The operation was cancelled or timed out'
 *   );
 *
 *   // Now we can check the error type consistently
 *   if (normalizedError instanceof AbortedOperationError) {
 *     // Handle abort case
 *   } else {
 *     // Handle other errors
 *   }
 * }
 */
export function handleAbortError(error: unknown, message?: string): Error {
  if (isAbortError(error)) {
    return new AbortedOperationError(message || (error instanceof Error && error.message === "Operation aborted" ? error.message : "Operation aborted"));
  }
  
  return error instanceof Error ? error : new Error(String(error));
}