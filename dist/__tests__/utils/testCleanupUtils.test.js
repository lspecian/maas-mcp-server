"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const testCleanupUtils_1 = require("./testCleanupUtils");
// Mock the dependencies
globals_1.jest.mock('../../utils/progressNotification.js', () => ({
    clearRateLimitHistory: globals_1.jest.fn()
}));
globals_1.jest.mock('../../utils/operationsRegistry.js', () => ({
    getAllOperations: globals_1.jest.fn().mockReturnValue([
        { id: 'op1' },
        { id: 'op2' },
        { id: 'op3' }
    ]),
    unregisterOperation: globals_1.jest.fn()
}));
describe('Test Cleanup Utilities', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    it('should reset all mocks', () => {
        // Setup
        const mockFn = globals_1.jest.fn();
        mockFn();
        expect(mockFn).toHaveBeenCalled();
        // Execute
        (0, testCleanupUtils_1.resetAllMocks)();
        // Verify
        expect(mockFn).not.toHaveBeenCalled();
    });
    it('should clear progress notification history', () => {
        // Import the mocked module with type assertion
        const progressNotification = globals_1.jest.requireMock('../../utils/progressNotification.js');
        // Execute
        (0, testCleanupUtils_1.clearProgressNotificationHistory)();
        // Verify
        expect(progressNotification.clearRateLimitHistory).toHaveBeenCalled();
    });
    it('should clear operations registry', () => {
        // Import the mocked module with type assertion
        const operationsRegistry = globals_1.jest.requireMock('../../utils/operationsRegistry.js');
        // Execute
        (0, testCleanupUtils_1.clearOperationsRegistry)();
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
        const abortSpy = globals_1.jest.spyOn(abortController, 'abort');
        // Execute
        (0, testCleanupUtils_1.safeAbortController)(abortController, 'Test reason');
        // Verify
        expect(abortSpy).toHaveBeenCalledWith('Test reason');
    });
    it('should not abort an already aborted controller', () => {
        // Setup
        const abortController = new AbortController();
        abortController.abort();
        const abortSpy = globals_1.jest.spyOn(abortController, 'abort');
        // Execute
        (0, testCleanupUtils_1.safeAbortController)(abortController);
        // Verify
        expect(abortSpy).not.toHaveBeenCalled();
    });
    it('should clean up abort signal listeners', () => {
        // Setup
        const abortController = new AbortController();
        const removeEventListenerSpy = globals_1.jest.spyOn(abortController.signal, 'removeEventListener');
        // Execute
        (0, testCleanupUtils_1.cleanupAbortSignalListeners)(abortController.signal);
        // Verify - this is a best-effort approach since we can't directly verify listener removal
        expect(removeEventListenerSpy).toHaveBeenCalled();
    });
    it('should perform comprehensive cleanup', () => {
        // Setup
        const abortController = new AbortController();
        const abortSpy = globals_1.jest.spyOn(abortController, 'abort');
        // Import the mocked modules with type assertions
        const progressNotification = globals_1.jest.requireMock('../../utils/progressNotification.js');
        const operationsRegistry = globals_1.jest.requireMock('../../utils/operationsRegistry.js');
        // Execute
        (0, testCleanupUtils_1.performComprehensiveCleanup)(abortController);
        // Verify
        expect(progressNotification.clearRateLimitHistory).toHaveBeenCalled();
        expect(operationsRegistry.getAllOperations).toHaveBeenCalled();
        expect(operationsRegistry.unregisterOperation).toHaveBeenCalledTimes(3);
        expect(abortSpy).toHaveBeenCalled();
    });
    it('should handle null abort controller in comprehensive cleanup', () => {
        // Execute - should not throw
        expect(() => (0, testCleanupUtils_1.performComprehensiveCleanup)()).not.toThrow();
    });
});
