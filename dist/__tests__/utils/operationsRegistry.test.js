"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const operationsRegistry_js_1 = require("../../utils/operationsRegistry.js");
const timeoutHelpers_js_1 = require("../utils/timeoutHelpers.js");
// Mock the logger
jest.mock('../../utils/logger', () => ({
    createRequestLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
    })
}));
describe('operationsRegistry', () => {
    // Apply a medium timeout to all tests in this suite
    (0, timeoutHelpers_js_1.applyMediumTimeout)();
    // Helper to advance time in tests
    const advanceTime = (ms) => {
        const now = Date.now();
        jest.spyOn(Date, 'now').mockImplementation(() => now + ms);
    };
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the registry before each test
        (0, operationsRegistry_js_1.getOperationsRegistry)().clear();
        // Reset Date.now mock
        jest.spyOn(Date, 'now').mockRestore();
    });
    describe('OperationsRegistry class', () => {
        it('should create a new registry with default cleanup config', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            expect(registry.size).toBe(0);
        });
        it('should create a new registry with custom cleanup config', () => {
            const customConfig = {
                cleanupInterval: 30000,
                maxCompletedAge: 1800000,
                maxStaleAge: 43200000
            };
            const registry = new operationsRegistry_js_1.OperationsRegistry(customConfig);
            expect(registry.size).toBe(0);
        });
        it('should register a new operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            const operation = registry.registerOperation('test-token', 'testOperation');
            expect(operation).toEqual(expect.objectContaining({
                progressToken: 'test-token',
                operationType: 'testOperation',
                status: operationsRegistry_js_1.OperationStatus.PENDING,
                progress: 0,
                total: 100
            }));
            expect(registry.size).toBe(1);
        });
        it('should register an operation with custom options', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            const operation = registry.registerOperation('test-token', 'testOperation', {
                initialStatus: operationsRegistry_js_1.OperationStatus.RUNNING,
                initialProgress: 25,
                total: 200,
                message: 'Custom message'
            });
            expect(operation).toEqual(expect.objectContaining({
                progressToken: 'test-token',
                operationType: 'testOperation',
                status: operationsRegistry_js_1.OperationStatus.RUNNING,
                progress: 25,
                total: 200,
                message: 'Custom message'
            }));
        });
        it('should update an existing operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('test-token', 'testOperation');
            const updated = registry.updateOperation('test-token', {
                status: operationsRegistry_js_1.OperationStatus.RUNNING,
                progress: 50,
                message: 'Updated message'
            });
            expect(updated).toEqual(expect.objectContaining({
                progressToken: 'test-token',
                status: operationsRegistry_js_1.OperationStatus.RUNNING,
                progress: 50,
                message: 'Updated message'
            }));
        });
        it('should return undefined when updating a non-existent operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            const updated = registry.updateOperation('non-existent', {
                status: operationsRegistry_js_1.OperationStatus.RUNNING
            });
            expect(updated).toBeUndefined();
        });
        it('should get an operation by token', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('test-token', 'testOperation');
            const operation = registry.getOperation('test-token');
            expect(operation).toEqual(expect.objectContaining({
                progressToken: 'test-token',
                operationType: 'testOperation'
            }));
        });
        it('should return undefined when getting a non-existent operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            const operation = registry.getOperation('non-existent');
            expect(operation).toBeUndefined();
        });
        it('should remove an operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('test-token', 'testOperation');
            const removed = registry.removeOperation('test-token');
            expect(removed).toBe(true);
            expect(registry.size).toBe(0);
        });
        it('should return false when removing a non-existent operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            const removed = registry.removeOperation('non-existent');
            expect(removed).toBe(false);
        });
        it('should abort an operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
            // Create an operation with an abort signal
            const controller = new AbortController();
            registry.registerOperation('test-token', 'testOperation', {
                signal: controller.signal
            });
            const aborted = registry.abortOperation('test-token', 'Test abort reason');
            expect(aborted).toBe(true);
            expect(abortSpy).toHaveBeenCalledWith('Test abort reason');
            const operation = registry.getOperation('test-token');
            expect(operation?.status).toBe(operationsRegistry_js_1.OperationStatus.ABORTED);
            abortSpy.mockRestore();
        });
        it('should return false when aborting a non-existent operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            const aborted = registry.abortOperation('non-existent');
            expect(aborted).toBe(false);
        });
        it('should return false when aborting an already completed operation', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('test-token', 'testOperation');
            registry.updateOperation('test-token', {
                status: operationsRegistry_js_1.OperationStatus.COMPLETED
            });
            const aborted = registry.abortOperation('test-token');
            expect(aborted).toBe(false);
        });
        it('should query operations by status', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('token1', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.PENDING });
            registry.registerOperation('token2', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.RUNNING });
            registry.registerOperation('token3', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.COMPLETED });
            const pendingOps = registry.queryOperations({ status: operationsRegistry_js_1.OperationStatus.PENDING });
            const runningOps = registry.queryOperations({ status: operationsRegistry_js_1.OperationStatus.RUNNING });
            expect(pendingOps.length).toBe(1);
            expect(pendingOps[0].progressToken).toBe('token1');
            expect(runningOps.length).toBe(1);
            expect(runningOps[0].progressToken).toBe('token2');
        });
        it('should query operations by type', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('token1', 'typeA');
            registry.registerOperation('token2', 'typeB');
            registry.registerOperation('token3', 'typeA');
            const typeAOps = registry.queryOperations({ operationType: 'typeA' });
            expect(typeAOps.length).toBe(2);
            expect(typeAOps.map(op => op.progressToken)).toEqual(expect.arrayContaining(['token1', 'token3']));
        });
        it('should query operations by time range', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            // Mock Date.now for the first operation
            const time1 = 1000;
            jest.spyOn(Date, 'now').mockReturnValue(time1);
            registry.registerOperation('token1', 'testOperation');
            // Mock Date.now for the second operation
            const time2 = 2000;
            jest.spyOn(Date, 'now').mockReturnValue(time2);
            registry.registerOperation('token2', 'testOperation');
            // Mock Date.now for the third operation
            const time3 = 3000;
            jest.spyOn(Date, 'now').mockReturnValue(time3);
            registry.registerOperation('token3', 'testOperation');
            // Query operations started after time1
            const afterTime1 = registry.queryOperations({ startedAfter: time1 + 1 });
            expect(afterTime1.length).toBe(2);
            expect(afterTime1.map(op => op.progressToken)).toEqual(expect.arrayContaining(['token2', 'token3']));
            // Query operations started before time3
            const beforeTime3 = registry.queryOperations({ startedBefore: time3 - 1 });
            expect(beforeTime3.length).toBe(2);
            expect(beforeTime3.map(op => op.progressToken)).toEqual(expect.arrayContaining(['token1', 'token2']));
            // Query operations in a time range
            const betweenTime1AndTime3 = registry.queryOperations({
                startedAfter: time1 + 1,
                startedBefore: time3 - 1
            });
            expect(betweenTime1AndTime3.length).toBe(1);
            expect(betweenTime1AndTime3[0].progressToken).toBe('token2');
        });
        it('should apply pagination to query results', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('token1', 'testOperation');
            registry.registerOperation('token2', 'testOperation');
            registry.registerOperation('token3', 'testOperation');
            registry.registerOperation('token4', 'testOperation');
            registry.registerOperation('token5', 'testOperation');
            // Query with offset and limit
            const page1 = registry.queryOperations({ offset: 0, limit: 2 });
            const page2 = registry.queryOperations({ offset: 2, limit: 2 });
            const page3 = registry.queryOperations({ offset: 4, limit: 2 });
            expect(page1.length).toBe(2);
            expect(page2.length).toBe(2);
            expect(page3.length).toBe(1);
        });
        it('should get active operations', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('token1', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.PENDING });
            registry.registerOperation('token2', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.RUNNING });
            registry.registerOperation('token3', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.COMPLETED });
            const activeOps = registry.getActiveOperations();
            expect(activeOps.length).toBe(1);
            expect(activeOps[0].progressToken).toBe('token2');
        });
        it('should get operations by type', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('token1', 'typeA');
            registry.registerOperation('token2', 'typeB');
            registry.registerOperation('token3', 'typeA');
            const typeAOps = registry.getOperationsByType('typeA');
            expect(typeAOps.length).toBe(2);
            expect(typeAOps.map(op => op.progressToken)).toEqual(expect.arrayContaining(['token1', 'token3']));
        });
        (0, timeoutHelpers_js_1.longTest)('should clean up stale operations', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry({
                maxCompletedAge: 1000, // 1 second
                maxStaleAge: 2000 // 2 seconds
            });
            // Register operations
            const time1 = 1000;
            jest.spyOn(Date, 'now').mockReturnValue(time1);
            registry.registerOperation('token1', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.COMPLETED });
            registry.registerOperation('token2', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.RUNNING });
            registry.registerOperation('token3', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.PENDING });
            // Advance time beyond maxCompletedAge but below maxStaleAge
            jest.spyOn(Date, 'now').mockReturnValue(time1 + 1500);
            registry.cleanupStaleOperations();
            // Completed operation should be cleaned up
            expect(registry.getOperation('token1')).toBeUndefined();
            // Other operations should still exist
            expect(registry.getOperation('token2')).toBeDefined();
            expect(registry.getOperation('token3')).toBeDefined();
            // Advance time beyond maxStaleAge
            jest.spyOn(Date, 'now').mockReturnValue(time1 + 3000);
            registry.cleanupStaleOperations();
            // All operations should be cleaned up
            expect(registry.size).toBe(0);
        });
        it('should clear all operations', () => {
            const registry = new operationsRegistry_js_1.OperationsRegistry();
            registry.registerOperation('token1', 'testOperation');
            registry.registerOperation('token2', 'testOperation');
            registry.clear();
            expect(registry.size).toBe(0);
        });
    });
    describe('Singleton functions', () => {
        it('should register an operation using the singleton', () => {
            const operation = (0, operationsRegistry_js_1.registerOperation)('test-token', 'testOperation');
            expect(operation).toEqual(expect.objectContaining({
                progressToken: 'test-token',
                operationType: 'testOperation'
            }));
            expect((0, operationsRegistry_js_1.getOperationsRegistry)().size).toBe(1);
        });
        it('should update an operation using the singleton', () => {
            (0, operationsRegistry_js_1.registerOperation)('test-token', 'testOperation');
            const updated = (0, operationsRegistry_js_1.updateOperation)('test-token', {
                status: operationsRegistry_js_1.OperationStatus.RUNNING,
                progress: 50
            });
            expect(updated).toEqual(expect.objectContaining({
                progressToken: 'test-token',
                status: operationsRegistry_js_1.OperationStatus.RUNNING,
                progress: 50
            }));
        });
        it('should get an operation using the singleton', () => {
            (0, operationsRegistry_js_1.registerOperation)('test-token', 'testOperation');
            const operation = (0, operationsRegistry_js_1.getOperation)('test-token');
            expect(operation).toEqual(expect.objectContaining({
                progressToken: 'test-token',
                operationType: 'testOperation'
            }));
        });
        it('should remove an operation using the singleton', () => {
            (0, operationsRegistry_js_1.registerOperation)('test-token', 'testOperation');
            const removed = (0, operationsRegistry_js_1.removeOperation)('test-token');
            expect(removed).toBe(true);
            expect((0, operationsRegistry_js_1.getOperationsRegistry)().size).toBe(0);
        });
        it('should abort an operation using the singleton', () => {
            const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
            // Create an operation with an abort signal
            const controller = new AbortController();
            (0, operationsRegistry_js_1.registerOperation)('test-token', 'testOperation', {
                signal: controller.signal
            });
            const aborted = (0, operationsRegistry_js_1.abortOperation)('test-token');
            expect(aborted).toBe(true);
            expect(abortSpy).toHaveBeenCalled();
            const operation = (0, operationsRegistry_js_1.getOperation)('test-token');
            expect(operation?.status).toBe(operationsRegistry_js_1.OperationStatus.ABORTED);
            abortSpy.mockRestore();
        });
        it('should query operations using the singleton', () => {
            (0, operationsRegistry_js_1.registerOperation)('token1', 'typeA', { initialStatus: operationsRegistry_js_1.OperationStatus.PENDING });
            (0, operationsRegistry_js_1.registerOperation)('token2', 'typeB', { initialStatus: operationsRegistry_js_1.OperationStatus.RUNNING });
            const pendingOps = (0, operationsRegistry_js_1.queryOperations)({ status: operationsRegistry_js_1.OperationStatus.PENDING });
            const typeAOps = (0, operationsRegistry_js_1.queryOperations)({ operationType: 'typeA' });
            expect(pendingOps.length).toBe(1);
            expect(pendingOps[0].progressToken).toBe('token1');
            expect(typeAOps.length).toBe(1);
            expect(typeAOps[0].progressToken).toBe('token1');
        });
        it('should get active operations using the singleton', () => {
            (0, operationsRegistry_js_1.registerOperation)('token1', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.PENDING });
            (0, operationsRegistry_js_1.registerOperation)('token2', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.RUNNING });
            (0, operationsRegistry_js_1.registerOperation)('token3', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.COMPLETED });
            const activeOps = (0, operationsRegistry_js_1.getActiveOperations)();
            expect(activeOps.length).toBe(1);
            expect(activeOps[0].progressToken).toBe('token2');
        });
        it('should get operations by type using the singleton', () => {
            (0, operationsRegistry_js_1.registerOperation)('token1', 'typeA');
            (0, operationsRegistry_js_1.registerOperation)('token2', 'typeB');
            (0, operationsRegistry_js_1.registerOperation)('token3', 'typeA');
            const typeAOps = (0, operationsRegistry_js_1.getOperationsByType)('typeA');
            expect(typeAOps.length).toBe(2);
            expect(typeAOps.map(op => op.progressToken)).toEqual(expect.arrayContaining(['token1', 'token3']));
        });
        (0, timeoutHelpers_js_1.longTest)('should clean up stale operations using the singleton', () => {
            // Override the default cleanup config for testing
            const registry = (0, operationsRegistry_js_1.getOperationsRegistry)();
            registry.clear();
            // Register operations
            const time1 = 1000;
            jest.spyOn(Date, 'now').mockReturnValue(time1);
            (0, operationsRegistry_js_1.registerOperation)('token1', 'testOperation', { initialStatus: operationsRegistry_js_1.OperationStatus.COMPLETED });
            // Advance time beyond the default maxCompletedAge
            jest.spyOn(Date, 'now').mockReturnValue(time1 + operationsRegistry_js_1.DEFAULT_CLEANUP_CONFIG.maxCompletedAge + 1000);
            (0, operationsRegistry_js_1.cleanupStaleOperations)();
            // Operation should be cleaned up
            expect((0, operationsRegistry_js_1.getOperation)('token1')).toBeUndefined();
        });
    });
    describe('Concurrent access', () => {
        (0, timeoutHelpers_js_1.longTest)('should handle concurrent operations safely', () => {
            // Register multiple operations concurrently
            const operations = Array.from({ length: 10 }, (_, i) => (0, operationsRegistry_js_1.registerOperation)(`token-${i}`, 'concurrentTest'));
            // Update operations concurrently
            const updatePromises = operations.map((op, i) => (0, operationsRegistry_js_1.updateOperation)(`token-${i}`, { progress: i * 10 }));
            // All operations should be updated successfully
            expect(updatePromises.every(Boolean)).toBe(true);
            // Verify all operations exist
            expect((0, operationsRegistry_js_1.getOperationsRegistry)().size).toBe(10);
            // Verify each operation has the correct progress
            operations.forEach((_, i) => {
                const op = (0, operationsRegistry_js_1.getOperation)(`token-${i}`);
                expect(op?.progress).toBe(i * 10);
            });
        });
    });
    describe('Integration with AbortSignal', () => {
        (0, timeoutHelpers_js_1.mediumTest)('should abort the operation when the parent signal is aborted', async () => {
            const controller = new AbortController();
            (0, operationsRegistry_js_1.registerOperation)('test-token', 'testOperation', {
                signal: controller.signal
            });
            // Abort the parent signal
            controller.abort('Parent aborted');
            // Wait for the abort handler to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            // The operation should be aborted
            const operation = (0, operationsRegistry_js_1.getOperation)('test-token');
            expect(operation?.status).toBe(operationsRegistry_js_1.OperationStatus.ABORTED);
        });
        it('should not register if the parent signal is already aborted', () => {
            const controller = new AbortController();
            controller.abort('Already aborted');
            const operation = (0, operationsRegistry_js_1.registerOperation)('test-token', 'testOperation', {
                signal: controller.signal
            });
            // The operation should be registered but marked as aborted
            expect(operation.status).toBe(operationsRegistry_js_1.OperationStatus.ABORTED);
        });
    });
});
