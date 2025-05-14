"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAllMocks = resetAllMocks;
exports.clearProgressNotificationHistory = clearProgressNotificationHistory;
exports.clearOperationsRegistry = clearOperationsRegistry;
exports.safeAbortController = safeAbortController;
exports.cleanupAbortSignalListeners = cleanupAbortSignalListeners;
exports.performComprehensiveCleanup = performComprehensiveCleanup;
/**
 * Utility functions for test cleanup to ensure proper isolation between tests.
 *
 * These utilities address common issues in asynchronous testing:
 * - State leakage between tests
 * - Unhandled promise rejections
 * - Memory leaks from uncleaned resources
 * - Race conditions from lingering operations
 *
 * @module testCleanupUtils
 */
const globals_1 = require("@jest/globals");
// @ts-expect-error - CommonJS module imported as ESM
const progressNotification_js_1 = __importDefault(require("../../utils/progressNotification.js"));
// @ts-expect-error - CommonJS module imported as ESM
const operationsRegistry_js_1 = __importDefault(require("../../utils/operationsRegistry.js"));
const { clearRateLimitHistory } = progressNotification_js_1.default;
const { getAllOperations, unregisterOperation } = operationsRegistry_js_1.default;
/**
 * Reset all Jest mocks and clear their call history.
 *
 * This ensures that mock call counts and arguments from previous tests
 * don't affect the current test. Should be called at the beginning of each test.
 *
 * @example
 * beforeEach(() => {
 *   resetAllMocks();
 * });
 */
function resetAllMocks() {
    globals_1.jest.clearAllMocks();
}
/**
 * Clear the rate limit history in the progress notification module.
 *
 * This prevents rate limiting state from previous tests affecting current tests.
 * Rate limiting is used to prevent too many notifications being sent in quick succession,
 * but in tests we want to control this behavior explicitly.
 *
 * @example
 * beforeEach(() => {
 *   clearProgressNotificationHistory();
 * });
 */
function clearProgressNotificationHistory() {
    clearRateLimitHistory();
}
/**
 * Unregister all operations from the operations registry.
 *
 * The operations registry keeps track of all ongoing operations.
 * If operations are not properly unregistered between tests, they can
 * cause state leakage and interfere with subsequent tests.
 *
 * @example
 * afterEach(() => {
 *   clearOperationsRegistry();
 * });
 */
function clearOperationsRegistry() {
    getAllOperations().forEach((op) => {
        if (op.id)
            unregisterOperation(op.id);
    });
}
/**
 * Safely abort an AbortController if it's not already aborted.
 *
 * This prevents errors from attempting to abort an already aborted controller
 * and ensures that all operations using this controller are properly cancelled.
 *
 * @param controller - The AbortController to abort
 * @param reason - Optional reason for the abort, defaults to 'Test cleanup'
 *
 * @example
 * const controller = new AbortController();
 * // ... use controller in test ...
 * safeAbortController(controller, 'Test finished');
 */
function safeAbortController(controller, reason) {
    if (controller && !controller.signal.aborted) {
        controller.abort(reason || 'Test cleanup');
    }
}
/**
 * Remove event listeners from an AbortSignal to prevent memory leaks.
 *
 * Note: This is a best-effort approach since AbortSignal doesn't provide a direct way
 * to remove all listeners. In real tests, we'll rely on garbage collection after
 * the signal is no longer referenced, but this helps reduce memory pressure.
 *
 * @param signal - The AbortSignal to clean up
 *
 * @example
 * const controller = new AbortController();
 * // ... use controller in test ...
 * cleanupAbortSignalListeners(controller.signal);
 */
function cleanupAbortSignalListeners(signal) {
    // This is a best-effort approach since AbortSignal doesn't expose a way to remove all listeners
    // In real tests, we'll rely on garbage collection after the signal is no longer referenced
    if (signal && typeof signal.removeEventListener === 'function') {
        // Create a dummy handler to avoid errors if there are no listeners
        const dummyHandler = () => { };
        try {
            signal.removeEventListener('abort', dummyHandler);
        }
        catch (error) {
            // Ignore errors during cleanup
        }
    }
}
/**
 * Comprehensive cleanup function that handles all stateful components.
 *
 * This is the recommended cleanup function to use in beforeEach/afterEach hooks
 * as it handles all aspects of cleanup in one call:
 * - Resets all mocks
 * - Clears rate limit history
 * - Clears operations registry
 * - Aborts controllers and cleans up their signals
 *
 * @param controller - Optional AbortController to abort during cleanup
 *
 * @example
 * // In beforeEach to start with a clean state
 * beforeEach(() => {
 *   performComprehensiveCleanup();
 * });
 *
 * // In afterEach to clean up after the test
 * afterEach(() => {
 *   performComprehensiveCleanup(testController);
 * });
 */
function performComprehensiveCleanup(controller) {
    // Reset all mocks
    resetAllMocks();
    // Clear rate limit history
    clearProgressNotificationHistory();
    // Clear operations registry
    clearOperationsRegistry();
    // Abort controller if provided
    if (controller) {
        safeAbortController(controller);
        cleanupAbortSignalListeners(controller.signal);
    }
}
