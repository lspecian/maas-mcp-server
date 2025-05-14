"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRegisteredCallback = extractRegisteredCallback;
exports.setupResourceUtilsMocks = setupResourceUtilsMocks;
exports.setupTestDependencies = setupTestDependencies;
exports.createMockAbortSignal = createMockAbortSignal;
exports.createMockUrl = createMockUrl;
exports.assertResourceRegistration = assertResourceRegistration;
exports.assertCacheOperationLogged = assertCacheOperationLogged;
exports.assertResourceAccessLogged = assertResourceAccessLogged;
exports.assertResourceAccessFailureLogged = assertResourceAccessFailureLogged;
const mockMaasApiClient_js_1 = require("./mockMaasApiClient.js");
const mockCacheManager_js_1 = require("./mockCacheManager.js");
const mockAuditLogger_js_1 = require("./mockAuditLogger.js");
const mockResourceUtils_js_1 = require("./mockResourceUtils.js");
/**
 * Extract the registered callback function from a mock server
 *
 * @param mockServer The mock MCP server instance
 * @param callIndex The index of the resource.mock.calls array to extract from (default: 0)
 * @returns The registered callback function
 */
function extractRegisteredCallback(mockServer, callIndex = 0) {
    if (mockServer.resource.mock.calls.length <= callIndex) {
        throw new Error(`No resource registered at index ${callIndex}`);
    }
    const call = mockServer.resource.mock.calls[callIndex];
    if (call.length < 3) {
        throw new Error(`Resource call at index ${callIndex} does not have a callback`);
    }
    return call[2];
}
/**
 * Setup resource utils mocks with selective implementation
 *
 * @param options Options for setting up resource utils mocks
 * @returns The mocked resource utils functions
 */
function setupResourceUtilsMocks(options = {}) {
    const mockResourceUtils = (0, mockResourceUtils_js_1.createMockResourceUtils)(options);
    // Import the module to ensure the mock is loaded
    jest.doMock('../../mcp_resources/utils/resourceUtils.js', () => ({
        extractAndValidateParams: mockResourceUtils.extractAndValidateParams,
        validateResourceData: mockResourceUtils.validateResourceData,
        handleResourceFetchError: mockResourceUtils.handleResourceFetchError
    }));
    return mockResourceUtils;
}
/**
 * Setup all test dependencies for resource handler tests
 *
 * @param options Options for setting up test dependencies
 * @returns The test dependencies
 */
function setupTestDependencies(options = {}) {
    const { cacheEnabled = true, auditLogEnabled = true, cacheHits = false, simulateErrors = {
        maasApiClient: false,
        cacheManager: false,
        auditLogger: false,
        resourceUtils: false
    }, resourceUtilsOptions = {} } = options;
    // Clear all mocks
    jest.clearAllMocks();
    // Setup mock MCP server
    const mockMcpServer = {
        resource: jest.fn().mockImplementation((name, template, callback) => {
            return { name, template, callback };
        })
    };
    // Setup mock MAAS API client
    const mockMaasApiClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)({
        errorResponse: simulateErrors.maasApiClient ? new Error('Mock MAAS API error') : undefined
    });
    // Setup mock cache manager
    const mockCacheManager = (0, mockCacheManager_js_1.createMockCacheManager)({
        enabled: cacheEnabled,
        getCacheHit: cacheHits,
        simulateErrors: simulateErrors.cacheManager
    });
    // Setup mock audit logger
    const mockAuditLogger = (0, mockAuditLogger_js_1.createMockAuditLogger)({
        simulateErrors: simulateErrors.auditLogger
    });
    // Setup mock resource utils
    const mockResourceUtils = setupResourceUtilsMocks({
        ...resourceUtilsOptions,
        simulateErrors: {
            ...resourceUtilsOptions.simulateErrors,
            extractAndValidateParams: simulateErrors.resourceUtils || resourceUtilsOptions.simulateErrors?.extractAndValidateParams,
            validateResourceData: simulateErrors.resourceUtils || resourceUtilsOptions.simulateErrors?.validateResourceData,
            handleResourceFetchError: simulateErrors.resourceUtils || resourceUtilsOptions.simulateErrors?.handleResourceFetchError
        }
    });
    // Setup mocks for dependencies
    jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
        McpServer: jest.fn(),
        ResourceTemplate: jest.fn().mockImplementation((pattern) => ({
            pattern,
            completeCallback: jest.fn()
        }))
    }));
    jest.mock('../../maas/MaasApiClient.js', () => mockMaasApiClient);
    jest.mock('../../mcp_resources/cache/cacheManager.js', () => ({
        CacheManager: {
            getInstance: jest.fn().mockReturnValue(mockCacheManager)
        }
    }));
    jest.mock('../../utils/auditLogger.js', () => mockAuditLogger);
    jest.mock('../../utils/logger.ts', () => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }));
    // Setup config mock
    jest.mock('../../config.js', () => ({
        cacheEnabled,
        auditLogEnabled,
        maasApiUrl: 'https://example.com/MAAS/api/2.0',
        maasApiKey: 'mock-api-key',
        logLevel: 'info',
        nodeEnv: 'test',
        cacheMaxAge: 300,
        cacheMaxSize: 1000,
        cacheStrategy: 'lru',
        cacheResourceSpecificTTL: {}
    }));
    return {
        mockMcpServer,
        mockMaasApiClient,
        mockCacheManager,
        mockResourceUtils
    };
}
/**
 * Create a mock AbortSignal for testing
 *
 * @param aborted Whether the signal is already aborted
 * @returns A mock AbortSignal
 */
function createMockAbortSignal(aborted = false) {
    const mockAbortSignal = {
        aborted,
        reason: aborted ? new Error('Mock abort') : undefined,
        onabort: null,
        throwIfAborted: jest.fn(() => {
            if (aborted)
                throw new Error('Mock abort');
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(() => true)
    };
    return mockAbortSignal;
}
/**
 * Create a mock URL for testing
 *
 * @param uri The URI string
 * @param params Optional query parameters to add
 * @returns A URL object
 */
function createMockUrl(uri, params = {}) {
    const url = new URL(uri);
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return url;
}
/**
 * Assert that a resource handler was registered correctly
 *
 * @param mockServer The mock MCP server
 * @param resourceName The expected resource name
 * @param uriPattern The expected URI pattern
 * @param callIndex The index of the resource.mock.calls array to check (default: 0)
 */
function assertResourceRegistration(mockServer, resourceName, uriPattern, callIndex = 0) {
    expect(mockServer.resource).toHaveBeenCalledWith(resourceName, expect.objectContaining({ pattern: uriPattern }), expect.any(Function));
}
/**
 * Assert that a cache operation was logged
 *
 * @param mockAuditLogger The mock audit logger
 * @param resourceType The expected resource type
 * @param action The expected action (e.g., 'hit', 'miss', 'set')
 * @param resourceId The expected resource ID (optional)
 */
function assertCacheOperationLogged(mockAuditLogger, resourceType, action, resourceId) {
    expect(mockAuditLogger.logCacheOperation).toHaveBeenCalledWith(resourceType, action, expect.any(String), resourceId, expect.any(Object));
}
/**
 * Assert that a resource access was logged
 *
 * @param mockAuditLogger The mock audit logger
 * @param resourceType The expected resource type
 * @param resourceId The expected resource ID (optional)
 * @param action The expected action (default: 'fetch')
 */
function assertResourceAccessLogged(mockAuditLogger, resourceType, resourceId, action = 'fetch') {
    expect(mockAuditLogger.logResourceAccess).toHaveBeenCalledWith(resourceType, resourceId, action, expect.any(String), undefined, undefined, expect.any(Object), expect.anything());
}
/**
 * Assert that a resource access failure was logged
 *
 * @param mockAuditLogger The mock audit logger
 * @param resourceType The expected resource type
 * @param resourceId The expected resource ID (optional)
 * @param action The expected action (default: 'fetch')
 */
function assertResourceAccessFailureLogged(mockAuditLogger, resourceType, resourceId, action = 'fetch') {
    expect(mockAuditLogger.logResourceAccessFailure).toHaveBeenCalledWith(resourceType, resourceId, action, expect.any(String), expect.anything(), undefined, undefined, expect.any(Object));
}
