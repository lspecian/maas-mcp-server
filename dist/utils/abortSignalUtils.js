"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { createRequestLogger } = require("./logger");
/**
 * Custom error class for aborted operations
 *
 * This error is thrown when an operation is aborted, either manually
 * or due to a timeout. It extends the standard Error class and sets
 * the name property to "AbortedOperationError" for easier identification
 * in error handling code.
 */
class AbortedOperationError extends Error {
    constructor(message = 'Operation was aborted') {
        super(message);
        this.name = 'AbortedOperationError';
    }
}
/**
 * Check if an error is an AbortError
 *
 * This function checks if the given error is an AbortError, which is
 * thrown when an operation is aborted via an AbortController.
 *
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is an AbortError, false otherwise
 */
function isAbortError(error) {
    return error && error.name === 'AbortError';
}
/**
 * Check if an error is an AbortedOperationError
 *
 * This function checks if the given error is an AbortedOperationError,
 * which is our custom error class for aborted operations.
 *
 * @param {Error} error - The error to check
 * @returns {boolean} True if the error is an AbortedOperationError, false otherwise
 */
function isAbortedOperationError(error) {
    return error && error.name === 'AbortedOperationError';
}
/**
 * Create a derived AbortSignal from a parent signal
 *
 * This function creates a new AbortSignal that will be aborted if the
 * parent signal is aborted. This is useful for creating a hierarchy of
 * abort signals, where aborting a parent signal will abort all derived
 * signals.
 *
 * @param {AbortSignal} parentSignal - The parent signal
 * @returns {AbortSignal} A new AbortSignal that will be aborted if the parent is aborted
 */
function createDerivedSignal(parentSignal) {
    const controller = new AbortController();
    const derivedSignal = controller.signal;
    if (parentSignal.aborted) {
        controller.abort();
        return derivedSignal;
    }
    const abortHandler = () => {
        controller.abort();
    };
    parentSignal.addEventListener('abort', abortHandler);
    // Clean up the event listener when the derived signal is aborted
    derivedSignal.addEventListener('abort', () => {
        parentSignal.removeEventListener('abort', abortHandler);
    });
    return derivedSignal;
}
/**
 * Register a callback to be executed when an AbortSignal is aborted
 *
 * This function registers a callback to be executed when the given
 * AbortSignal is aborted. The callback will be executed only once,
 * and will be removed after execution.
 *
 * @param {AbortSignal} signal - The AbortSignal to listen to
 * @param {Function} callback - The callback to execute when the signal is aborted
 */
function onAbort(signal, callback) {
    if (signal.aborted) {
        callback();
        return;
    }
    const abortHandler = () => {
        signal.removeEventListener('abort', abortHandler);
        callback();
    };
    signal.addEventListener('abort', abortHandler);
}
/**
 * Throw an AbortedOperationError if the signal is aborted
 *
 * This function checks if the given AbortSignal is aborted, and if so,
 * throws an AbortedOperationError. This is useful for checking if an
 * operation should be aborted at specific points in the code.
 *
 * @param {AbortSignal} signal - The AbortSignal to check
 * @param {string} message - Optional message for the error
 * @throws {AbortedOperationError} If the signal is aborted
 */
function throwIfAborted(signal, message) {
    if (signal && signal.aborted) {
        throw new AbortedOperationError(message);
    }
}
/**
 * Handle an AbortError by throwing an AbortedOperationError
 *
 * This function checks if the given error is an AbortError, and if so,
 * throws an AbortedOperationError with the given message. If the error
 * is not an AbortError, it rethrows the original error.
 *
 * @param {Error} error - The error to check
 * @param {string} message - Optional message for the AbortedOperationError
 * @throws {AbortedOperationError} If the error is an AbortError
 * @throws {Error} The original error if it's not an AbortError
 */
function handleAbortError(error, message = 'Operation was aborted') {
    if (isAbortError(error)) {
        throw new AbortedOperationError(message);
    }
    throw error;
}
module.exports = {
    AbortedOperationError,
    isAbortError,
    isAbortedOperationError,
    createDerivedSignal,
    onAbort,
    throwIfAborted,
    handleAbortError
};
