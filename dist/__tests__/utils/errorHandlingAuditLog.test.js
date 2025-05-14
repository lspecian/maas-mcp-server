"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const resourceUtils_js_1 = require("../../mcp_resources/utils/resourceUtils.js");
const maas_ts_1 = require("../../types/maas.ts");
const logger_ts_1 = require("../../utils/logger.ts");
const auditLogger_js_1 = __importDefault(require("../../utils/auditLogger.js"));
// Mock logger
jest.mock('../../utils/logger.ts', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn().mockReturnValue({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        }),
    },
    generateRequestId: jest.fn().mockReturnValue('test-request-id'),
}));
// Mock the audit logger
jest.mock('../../utils/auditLogger.js', () => ({
    __esModule: true,
    default: {
        logResourceAccess: jest.fn(),
        logResourceAccessFailure: jest.fn(),
        logResourceModification: jest.fn(),
        logResourceModificationFailure: jest.fn(),
        logCacheOperation: jest.fn(),
    },
}));
// Mock extractParamsFromUri from uriPatterns.js
jest.mock('../../mcp_resources/schemas/uriPatterns.js', () => {
    const actualUriPatterns = jest.requireActual('../../mcp_resources/schemas/uriPatterns.js');
    return {
        ...actualUriPatterns,
        extractParamsFromUri: jest.fn(),
    };
});
// Import the mocked function to control it in tests
const uriPatterns_js_1 = require("../../mcp_resources/schemas/uriPatterns.js");
describe('Error Handling with Audit Logging Integration', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Request ID Generation', () => {
        it('should generate a unique request ID for each error handling function call', () => {
            // Set up different request IDs for each call
            logger_ts_1.generateRequestId
                .mockReturnValueOnce('request-id-1')
                .mockReturnValueOnce('request-id-2')
                .mockReturnValueOnce('request-id-3');
            // Trigger error handling in different functions
            try {
                uriPatterns_js_1.extractParamsFromUri.mockImplementation(() => {
                    throw new Error('Test error');
                });
                (0, resourceUtils_js_1.extractAndValidateParams)('test://uri', 'test://pattern', zod_1.z.any(), 'TestResource');
            }
            catch (error) {
                // Expected error
            }
            try {
                (0, resourceUtils_js_1.validateResourceData)({ invalid: 'data' }, zod_1.z.object({ valid: zod_1.z.string() }), 'TestResource');
            }
            catch (error) {
                // Expected error
            }
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(new Error('Test error'), 'TestResource', '123');
            }
            catch (error) {
                // Expected error
            }
            // Verify that generateRequestId was called for each function
            expect(logger_ts_1.generateRequestId).toHaveBeenCalledTimes(3);
            // Verify that each call to logResourceAccessFailure used a different request ID
            const calls = auditLogger_js_1.default.logResourceAccessFailure.mock.calls;
            expect(calls.length).toBe(3);
            expect(calls[0][3]).toBe('request-id-1');
            expect(calls[1][3]).toBe('request-id-2');
            expect(calls[2][3]).toBe('request-id-3');
        });
    });
    describe('ZodError Handling in Parameter Validation', () => {
        it('should log ZodError to audit logger with request ID in extractAndValidateParams', () => {
            // Set up a ZodError scenario
            const mockSchema = zod_1.z.object({
                id: zod_1.z.string().min(1, "ID cannot be empty"),
            });
            uriPatterns_js_1.extractParamsFromUri.mockReturnValue({ id: '' }); // Will fail validation
            try {
                (0, resourceUtils_js_1.extractAndValidateParams)('test://resource', 'test://pattern', mockSchema, 'TestResource');
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', undefined, 'validate_params', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, expect.objectContaining({
                uri: 'test://resource',
                pattern: 'test://pattern'
            }));
            // Verify the error details in the MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe('Invalid parameters for TestResource request');
            expect(maasError.statusCode).toBe(400);
            expect(maasError.maasErrorCode).toBe('invalid_parameters');
            expect(maasError.details).toHaveProperty('zodErrors');
        });
        it('should log ZodError to audit logger with request ID in validateResourceData', () => {
            // Set up a ZodError scenario
            const mockSchema = zod_1.z.object({
                name: zod_1.z.string(),
                value: zod_1.z.number(),
            });
            const invalidData = { name: 'Test', value: 'not-a-number' };
            const resourceId = 'test-id-123';
            try {
                (0, resourceUtils_js_1.validateResourceData)(invalidData, mockSchema, 'TestResource', resourceId);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'validate_data', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, expect.objectContaining({
                data: invalidData
            }));
            // Verify the error details in the MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe(`TestResource data validation failed for '${resourceId}': The MAAS API returned data in an unexpected format`);
            expect(maasError.statusCode).toBe(422);
            expect(maasError.maasErrorCode).toBe('validation_error');
            expect(maasError.details).toHaveProperty('zodErrors');
        });
    });
    describe('MaasApiError Handling', () => {
        it('should log existing MaasApiError to audit logger in extractAndValidateParams', () => {
            // Set up a MaasApiError scenario
            const originalError = new maas_ts_1.MaasApiError('Original MAAS Error', 503, 'maas_down');
            uriPatterns_js_1.extractParamsFromUri.mockImplementation(() => {
                throw originalError;
            });
            try {
                (0, resourceUtils_js_1.extractAndValidateParams)('test://resource', 'test://pattern', zod_1.z.any(), 'TestResource');
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', undefined, 'validate_params', 'test-request-id', originalError, undefined, undefined, expect.objectContaining({
                uri: 'test://resource',
                pattern: 'test://pattern'
            }));
        });
        it('should log MaasApiError with 404 transformation in handleResourceFetchError', () => {
            // Set up a 404 MaasApiError scenario
            const originalError = new maas_ts_1.MaasApiError('Not Found from MAAS', 404, 'maas_not_found');
            const resourceId = 'test-id-123';
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(originalError, 'TestResource', resourceId);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'fetch', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, undefined);
            // Verify the error details in the transformed MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe(`TestResource '${resourceId}' not found`);
            expect(maasError.statusCode).toBe(404);
            expect(maasError.maasErrorCode).toBe('resource_not_found');
        });
    });
    describe('Generic Error Handling', () => {
        it('should transform and log generic errors in extractAndValidateParams', () => {
            // Set up a generic Error scenario
            const originalError = new Error('Some unexpected error');
            uriPatterns_js_1.extractParamsFromUri.mockImplementation(() => {
                throw originalError;
            });
            try {
                (0, resourceUtils_js_1.extractAndValidateParams)('test://resource', 'test://pattern', zod_1.z.any(), 'TestResource');
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', undefined, 'validate_params', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, expect.objectContaining({
                uri: 'test://resource',
                pattern: 'test://pattern',
                originalError: originalError.message
            }));
            // Verify the error details in the transformed MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe(`Error processing TestResource request: ${originalError.message}`);
            expect(maasError.statusCode).toBe(500);
            expect(maasError.maasErrorCode).toBe('unexpected_error');
        });
        it('should log non-ZodErrors in validateResourceData', () => {
            // Set up a custom error scenario
            const customError = new Error('A custom non-zod error');
            const resourceId = 'test-id-123';
            // Create a mock schema that throws a custom error
            const mockFailingSchema = {
                parse: jest.fn().mockImplementation(() => {
                    throw customError;
                }),
            };
            try {
                (0, resourceUtils_js_1.validateResourceData)({}, mockFailingSchema, 'TestResource', resourceId);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'validate_data', 'test-request-id', customError, undefined, undefined, expect.objectContaining({
                data: {}
            }));
        });
        it('should transform and log generic errors in handleResourceFetchError', () => {
            // Set up a generic Error scenario
            const genericError = new Error('Something unexpected went wrong');
            const resourceId = 'test-id-123';
            const context = { operation: 'fetch' };
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(genericError, 'TestResource', resourceId, context);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'fetch', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, expect.objectContaining({
                ...context,
                stack: genericError.stack
            }));
            // Verify the error details in the transformed MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe(`Could not fetch TestResource for ${resourceId}: ${genericError.message}`);
            expect(maasError.statusCode).toBe(500);
            expect(maasError.maasErrorCode).toBe('unexpected_error');
            expect(maasError.details).toEqual({ originalError: genericError.message });
        });
    });
    describe('Network Error Handling', () => {
        it('should transform and log ECONNREFUSED errors', () => {
            // Set up a network error scenario with ECONNREFUSED
            const networkError = new Error('Connection refused by server');
            networkError.cause = { code: 'ECONNREFUSED', errno: -111 };
            const resourceId = 'test-id-123';
            const context = { operation: 'fetch' };
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(networkError, 'TestResource', resourceId, context);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'fetch', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, expect.objectContaining({
                ...context,
                code: 'ECONNREFUSED',
                errno: -111
            }));
            // Verify the error details in the transformed MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe('Failed to connect to MAAS API: Network connectivity issue');
            expect(maasError.statusCode).toBe(503);
            expect(maasError.maasErrorCode).toBe('network_error');
            expect(maasError.details).toEqual({ originalError: networkError.message });
        });
        it('should transform and log ENOTFOUND errors', () => {
            // Set up a network error scenario with ENOTFOUND
            const networkError = new Error('DNS lookup failed for server');
            networkError.cause = { code: 'ENOTFOUND' };
            const resourceId = 'test-id-123';
            const context = { operation: 'fetch' };
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(networkError, 'TestResource', resourceId, context);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'fetch', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, expect.objectContaining({
                ...context,
                code: 'ENOTFOUND'
            }));
            // Verify the error details in the transformed MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe('Failed to connect to MAAS API: Network connectivity issue');
            expect(maasError.statusCode).toBe(503);
            expect(maasError.maasErrorCode).toBe('network_error');
            expect(maasError.details).toEqual({ originalError: networkError.message });
        });
    });
    describe('Timeout Error Handling', () => {
        it('should transform and log ETIMEDOUT errors', () => {
            // Set up a timeout error scenario
            const timeoutError = new Error('MAAS API request timed out');
            timeoutError.cause = { code: 'ETIMEDOUT' };
            const resourceId = 'test-id-123';
            const context = { operation: 'fetch' };
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(timeoutError, 'TestResource', resourceId, context);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'fetch', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, context);
            // Verify the error details in the transformed MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe(`MAAS API request timed out while fetching TestResource for ${resourceId}`);
            expect(maasError.statusCode).toBe(504);
            expect(maasError.maasErrorCode).toBe('request_timeout');
            expect(maasError.details).toEqual({ originalError: timeoutError.message });
        });
    });
    describe('AbortError Handling', () => {
        it('should transform and log AbortError', () => {
            // Set up an AbortError scenario
            const abortError = new Error('Request was aborted by user');
            abortError.name = 'AbortError';
            const resourceId = 'test-id-123';
            const context = { operation: 'fetch' };
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(abortError, 'TestResource', resourceId, context);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'fetch', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, context);
            // Verify the error details in the transformed MaasApiError
            const maasError = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][4];
            expect(maasError).toBeInstanceOf(maas_ts_1.MaasApiError);
            expect(maasError.message).toBe(`TestResource request for ${resourceId} was aborted by the client`);
            expect(maasError.statusCode).toBe(499);
            expect(maasError.maasErrorCode).toBe('request_aborted');
        });
    });
    describe('Error Details Completeness', () => {
        it('should include complete error details in audit logs', () => {
            // Set up a scenario with rich error details
            const originalError = new Error('Rich error details test');
            originalError.stack = 'Mock stack trace for testing';
            originalError.code = 'TEST_ERROR_CODE';
            originalError.details = { additionalInfo: 'test info' };
            const resourceId = 'test-id-123';
            const context = {
                operation: 'fetch',
                additionalContext: 'test context',
                requestParams: { param1: 'value1', param2: 'value2' }
            };
            try {
                (0, resourceUtils_js_1.handleResourceFetchError)(originalError, 'TestResource', resourceId, context);
                fail('Should have thrown an error');
            }
            catch (error) {
                // Expected error
            }
            // Verify audit logger was called with correct parameters
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalledWith('TestResource', resourceId, 'fetch', 'test-request-id', expect.any(maas_ts_1.MaasApiError), undefined, undefined, expect.objectContaining({
                ...context,
                stack: originalError.stack
            }));
            // Verify the context object includes all the provided details
            const contextParam = auditLogger_js_1.default.logResourceAccessFailure.mock.calls[0][7];
            expect(contextParam).toMatchObject({
                operation: 'fetch',
                additionalContext: 'test context',
                requestParams: { param1: 'value1', param2: 'value2' },
                stack: originalError.stack
            });
        });
    });
});
