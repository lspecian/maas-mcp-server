"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const operationHandlerUtils_ts_1 = require("../../utils/operationHandlerUtils.ts");
const operationsRegistry_js_1 = require("../../utils/operationsRegistry.js");
const progressNotification_js_1 = require("../../utils/progressNotification.js");
const abortSignalUtils_js_1 = require("../../utils/abortSignalUtils.js");
// Mock dependencies
jest.mock('../../utils/logger.ts', () => ({
    createRequestLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));
jest.mock('../../utils/progressNotification.js', () => ({
    createProgressSender: jest.fn().mockReturnValue(jest.fn()),
    DEFAULT_RATE_LIMIT_CONFIG: {}
}));
jest.mock('../../utils/operationsRegistry.js', () => ({
    registerOperation: jest.fn().mockReturnValue({
        progressToken: 'test-token',
        operationType: 'test-operation',
        status: 'pending',
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        progress: 0,
        total: 100,
        message: 'Operation started'
    }),
    updateOperation: jest.fn(),
    getOperation: jest.fn(),
    removeOperation: jest.fn(),
    OperationStatus: {
        PENDING: 'pending',
        RUNNING: 'running',
        COMPLETED: 'completed',
        FAILED: 'failed',
        ABORTED: 'aborted'
    }
}));
describe('Operation Handler Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createOperationContext', () => {
        it('should create an operation context with the provided parameters', () => {
            const progressToken = 'test-token';
            const operationName = 'test-operation';
            const sendNotification = jest.fn();
            const signal = new AbortController().signal;
            const context = (0, operationHandlerUtils_ts_1.createOperationContext)(progressToken, operationName, sendNotification, signal);
            expect(context).toBeDefined();
            expect(context?.progressToken).toBe(progressToken);
            expect(context?.operationName).toBe(operationName);
            expect(context?.signal).toBeDefined();
            expect(context?.logger).toBeDefined();
            expect(context?.sendProgress).toBeDefined();
            expect(context?.unregisterCleanup).toBeDefined();
            expect(operationsRegistry_js_1.registerOperation).toHaveBeenCalledWith(progressToken, operationName, expect.objectContaining({
                signal: expect.any(AbortSignal)
            }));
            expect(progressNotification_js_1.createProgressSender).toHaveBeenCalledWith(progressToken, sendNotification, expect.any(String), operationName, expect.anything(), expect.any(AbortSignal));
        });
        it('should return undefined if no progressToken is provided', () => {
            const operationName = 'test-operation';
            const sendNotification = jest.fn();
            const signal = new AbortController().signal;
            const context = (0, operationHandlerUtils_ts_1.createOperationContext)(undefined, operationName, sendNotification, signal);
            expect(context).toBeUndefined();
            expect(operationsRegistry_js_1.registerOperation).not.toHaveBeenCalled();
            expect(progressNotification_js_1.createProgressSender).not.toHaveBeenCalled();
        });
    });
    describe('withOperationHandler', () => {
        it('should wrap a handler function with operation handling', async () => {
            const operationName = 'test-operation';
            const handler = jest.fn().mockResolvedValue({ result: 'success' });
            const params = { _meta: { progressToken: 'test-token' } };
            const extras = {
                signal: new AbortController().signal,
                sendNotification: jest.fn()
            };
            const wrappedHandler = (0, operationHandlerUtils_ts_1.withOperationHandler)(operationName, handler);
            const result = await wrappedHandler(params, extras);
            expect(result).toEqual({ result: 'success' });
            expect(handler).toHaveBeenCalled();
            expect(operationsRegistry_js_1.updateOperation).toHaveBeenCalledWith('test-token', expect.objectContaining({
                status: operationsRegistry_js_1.OperationStatus.RUNNING
            }));
            expect(operationsRegistry_js_1.updateOperation).toHaveBeenCalledWith('test-token', expect.objectContaining({
                status: operationsRegistry_js_1.OperationStatus.COMPLETED
            }));
        });
        it('should handle errors in the handler function', async () => {
            const operationName = 'test-operation';
            const error = new Error('Test error');
            const handler = jest.fn().mockRejectedValue(error);
            const params = { _meta: { progressToken: 'test-token' } };
            const extras = {
                signal: new AbortController().signal,
                sendNotification: jest.fn()
            };
            const wrappedHandler = (0, operationHandlerUtils_ts_1.withOperationHandler)(operationName, handler);
            await expect(wrappedHandler(params, extras)).rejects.toThrow('Test error');
            expect(handler).toHaveBeenCalled();
            expect(operationsRegistry_js_1.updateOperation).toHaveBeenCalledWith('test-token', expect.objectContaining({
                status: operationsRegistry_js_1.OperationStatus.RUNNING
            }));
            expect(operationsRegistry_js_1.updateOperation).toHaveBeenCalledWith('test-token', expect.objectContaining({
                status: operationsRegistry_js_1.OperationStatus.FAILED,
                error: 'Test error'
            }));
        });
        it('should handle abort errors in the handler function', async () => {
            const operationName = 'test-operation';
            const error = new abortSignalUtils_js_1.AbortedOperationError('Operation aborted');
            const handler = jest.fn().mockRejectedValue(error);
            const params = { _meta: { progressToken: 'test-token' } };
            const extras = {
                signal: new AbortController().signal,
                sendNotification: jest.fn()
            };
            const wrappedHandler = (0, operationHandlerUtils_ts_1.withOperationHandler)(operationName, handler);
            await expect(wrappedHandler(params, extras)).rejects.toThrow('Operation aborted');
            expect(handler).toHaveBeenCalled();
            expect(operationsRegistry_js_1.updateOperation).toHaveBeenCalledWith('test-token', expect.objectContaining({
                status: operationsRegistry_js_1.OperationStatus.RUNNING
            }));
            expect(operationsRegistry_js_1.updateOperation).toHaveBeenCalledWith('test-token', expect.objectContaining({
                status: operationsRegistry_js_1.OperationStatus.ABORTED
            }));
        });
    });
    describe('handleOperationError', () => {
        it('should handle abort errors', () => {
            const error = new abortSignalUtils_js_1.AbortedOperationError('Operation aborted');
            const context = {
                progressToken: 'test-token',
                operationName: 'test-operation',
                requestId: 'test-request-id',
                sendProgress: jest.fn(),
                signal: new AbortController().signal,
                logger: {
                    debug: jest.fn(),
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    // Add missing properties to satisfy the Logger interface
                    level: 'info',
                    fatal: jest.fn(),
                    trace: jest.fn(),
                    silent: jest.fn()
                },
                unregisterCleanup: jest.fn(),
                operationDetails: {
                    progressToken: 'test-token',
                    operationType: 'test-operation',
                    status: operationsRegistry_js_1.OperationStatus.RUNNING,
                    startTime: Date.now(),
                    lastUpdateTime: Date.now(),
                    progress: 50,
                    total: 100,
                    message: 'Operation in progress'
                }
            };
            const result = (0, operationHandlerUtils_ts_1.handleOperationError)(error, context);
            expect(result).toBeDefined();
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Operation test-operation was aborted');
        });
        it('should use custom error handlers if provided', () => {
            const error = new Error('Custom error');
            const context = {
                progressToken: 'test-token',
                operationName: 'test-operation',
                requestId: 'test-request-id',
                sendProgress: jest.fn(),
                signal: new AbortController().signal,
                logger: {
                    debug: jest.fn(),
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    // Add missing properties to satisfy the Logger interface
                    level: 'info',
                    fatal: jest.fn(),
                    trace: jest.fn(),
                    silent: jest.fn()
                },
                unregisterCleanup: jest.fn(),
                operationDetails: {
                    progressToken: 'test-token',
                    operationType: 'test-operation',
                    status: operationsRegistry_js_1.OperationStatus.RUNNING,
                    startTime: Date.now(),
                    lastUpdateTime: Date.now(),
                    progress: 50,
                    total: 100,
                    message: 'Operation in progress'
                }
            };
            const customHandler = jest.fn().mockReturnValue({
                isHandled: true,
                result: {
                    content: [{ type: 'text', text: 'Custom error handled' }],
                    isError: true
                }
            });
            const result = (0, operationHandlerUtils_ts_1.handleOperationError)(error, context, [customHandler]);
            expect(customHandler).toHaveBeenCalledWith(error);
            expect(result).toBeDefined();
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toBe('Custom error handled');
        });
        it('should use default error handling if custom handlers do not handle the error', () => {
            const error = new Error('Unhandled error');
            const context = {
                progressToken: 'test-token',
                operationName: 'test-operation',
                requestId: 'test-request-id',
                sendProgress: jest.fn(),
                signal: new AbortController().signal,
                logger: {
                    debug: jest.fn(),
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    // Add missing properties to satisfy the Logger interface
                    level: 'info',
                    fatal: jest.fn(),
                    trace: jest.fn(),
                    silent: jest.fn()
                },
                unregisterCleanup: jest.fn(),
                operationDetails: {
                    progressToken: 'test-token',
                    operationType: 'test-operation',
                    status: operationsRegistry_js_1.OperationStatus.RUNNING,
                    startTime: Date.now(),
                    lastUpdateTime: Date.now(),
                    progress: 50,
                    total: 100,
                    message: 'Operation in progress'
                }
            };
            const customHandler = jest.fn().mockReturnValue({
                isHandled: false
            });
            const result = (0, operationHandlerUtils_ts_1.handleOperationError)(error, context, [customHandler]);
            expect(customHandler).toHaveBeenCalledWith(error);
            expect(result).toBeDefined();
            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Operation test-operation failed');
        });
    });
});
