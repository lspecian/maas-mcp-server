"use strict";
/**
 * Tests for resource handler error handling
 *
 * This file provides comprehensive tests for error handling in resource handlers,
 * covering various error scenarios and edge cases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const maas_ts_1 = require("../../types/maas.ts");
const zod_1 = require("zod");
const BaseResourceHandler_js_1 = require("../../mcp_resources/BaseResourceHandler.js");
// Mock config before importing any modules that use it
jest.mock('../../config.js', () => ({
    __esModule: true,
    default: {
        maasApiUrl: 'https://test-maas.example.com/MAAS/api/2.0',
        maasApiKey: 'test:api:key',
        mcpPort: 3000,
        cacheEnabled: true,
        auditLogEnabled: true,
        logLevel: 'info',
        cacheTTL: 300
    }
}));
// Now import modules that depend on config
const testUtils_js_1 = require("../mocks/testUtils.js");
// Mock CacheManager
jest.mock('../../mcp_resources/cache/cacheManager.js', () => ({
    CacheManager: {
        getInstance: jest.fn().mockReturnValue({
            get: jest.fn(),
            set: jest.fn(),
            generateCacheKey: jest.fn((prefix, uri, params, opts) => `${prefix}-${uri.toString()}-${JSON.stringify(params)}-${JSON.stringify(opts)}`),
            isEnabled: jest.fn(() => true),
            getResourceTTL: jest.fn(() => 300),
            invalidateResource: jest.fn(),
            resourceSpecificTTL: {},
            defaultTTL: 300
        })
    }
}));
// Mock URI patterns module
jest.mock('../../mcp_resources/schemas/uriPatterns.js', () => ({
    RESOURCE_DETAILS_URI_PATTERN: 'maas://resource/{resource_id}/details',
    RESOURCES_LIST_URI_PATTERN: 'maas://resources/list',
    extractParamsFromUri: jest.fn((uri, pattern) => {
        if (pattern === 'maas://resource/{resource_id}/details' && uri.includes('test-resource')) {
            return { resource_id: 'test-resource' };
        }
        if (pattern === 'maas://resources/list') {
            const params = {};
            try {
                new URL(uri).searchParams.forEach((value, key) => { params[key] = value; });
            }
            catch (e) {
                // Ignore URL parsing errors for invalid URIs
            }
            return params;
        }
        return {};
    }),
}));
// Define test schemas
const TestResourceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    status: zod_1.z.string(),
    created: zod_1.z.string(), // Make created required for the test
});
const TestResourcesArraySchema = zod_1.z.array(TestResourceSchema);
const TestResourceParamsSchema = zod_1.z.object({
    resource_id: zod_1.z.string(),
});
const TestResourceQueryParamsSchema = zod_1.z.object({
    filter: zod_1.z.string().optional(),
    limit: zod_1.z.string().optional(),
});
// Mock resource data
const mockResource = {
    id: 'test-resource',
    name: 'Test Resource',
    status: 'active',
    created: '2023-01-01T00:00:00Z',
};
// Type assertion to ensure mockResource matches TestResourceSchema
const typedMockResource = mockResource;
const mockResources = [
    typedMockResource,
    { ...typedMockResource, id: 'test-resource-2', name: 'Test Resource 2' },
];
// Test resource handler implementations
class TestResourceDetailsHandler extends BaseResourceHandler_js_1.DetailResourceHandler {
    constructor(server, maasClient) {
        super(server, maasClient, 'TestResource', new mcp_js_1.ResourceTemplate('maas://resource/{resource_id}/details', { list: undefined }), 'maas://resource/{resource_id}/details', TestResourceSchema, TestResourceParamsSchema, '/resources/{resource_id}');
    }
    getResourceIdFromParams(params) {
        return params.resource_id;
    }
    async fetchResourceData(params, signal) {
        return this.maasClient.get(`/resources/${params.resource_id}`, undefined, signal);
    }
}
class TestResourcesListHandler extends BaseResourceHandler_js_1.ListResourceHandler {
    constructor(server, maasClient) {
        super(server, maasClient, 'TestResources', new mcp_js_1.ResourceTemplate('maas://resources/list', { list: undefined }), 'maas://resources/list', TestResourcesArraySchema, TestResourceQueryParamsSchema, '/resources');
    }
    getResourceIdFromParams() {
        return undefined; // List resources don't have a specific ID
    }
    async fetchResourceData(params, signal) {
        return this.maasClient.get('/resources', params, signal);
    }
}
describe('Resource Handler Error Handling', () => {
    // Declare test dependencies
    let deps;
    // Define test URIs
    const resourceDetailsUri = new URL('maas://resource/test-resource/details');
    const resourcesListUri = new URL('maas://resources/list');
    const invalidUri = new URL('maas://invalid/uri');
    beforeEach(() => {
        // Setup all test dependencies with default options
        deps = (0, testUtils_js_1.setupTestDependencies)({
            cacheEnabled: true,
            auditLogEnabled: true,
            cacheHits: false
        });
    });
    describe('Network Error Handling', () => {
        let detailsHandler;
        let detailsCallback;
        beforeEach(() => {
            // Create handler and register it
            detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            detailsHandler.register('test_resource_details');
            // Extract the registered callback for testing
            detailsCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer);
        });
        it('should handle network connectivity errors', async () => {
            // Setup network error
            const networkError = new Error('Network error');
            networkError.cause = { code: 'ECONNREFUSED', errno: -61 };
            deps.mockMaasApiClient.get.mockRejectedValue(networkError);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(503);
                expect(error.maasErrorCode).toBe('network_error');
            }
        });
        it('should handle timeout errors', async () => {
            // Setup timeout error
            const timeoutError = new Error('Request timed out');
            timeoutError.cause = { code: 'ETIMEDOUT' };
            deps.mockMaasApiClient.get.mockRejectedValue(timeoutError);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(504);
                expect(error.maasErrorCode).toBe('request_timeout');
            }
        });
        it('should handle aborted requests', async () => {
            // Create aborted signal
            const abortController = new AbortController();
            abortController.abort();
            // Setup abort error
            const abortError = new Error('Request aborted');
            abortError.name = 'AbortError';
            deps.mockMaasApiClient.get.mockRejectedValue(abortError);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: abortController.signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(499);
                expect(error.maasErrorCode).toBe('request_aborted');
            }
        });
    });
    describe('API Error Handling', () => {
        let detailsHandler;
        let detailsCallback;
        beforeEach(() => {
            // Create handler and register it
            detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            detailsHandler.register('test_resource_details');
            // Extract the registered callback for testing
            detailsCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer);
        });
        it('should handle 404 Not Found errors', async () => {
            // Setup 404 error
            const notFoundError = new maas_ts_1.MaasApiError('Resource not found', 404, 'not_found');
            deps.mockMaasApiClient.get.mockRejectedValue(notFoundError);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(404);
                expect(error.maasErrorCode).toBe('resource_not_found');
                expect(error.message).toContain('test-resource');
            }
        });
        it('should handle 401 Unauthorized errors', async () => {
            // Setup 401 error
            const unauthorizedError = new maas_ts_1.MaasApiError('Unauthorized', 401, 'unauthorized');
            deps.mockMaasApiClient.get.mockRejectedValue(unauthorizedError);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(401);
                expect(error.maasErrorCode).toBe('unauthorized');
            }
        });
        it('should handle 403 Forbidden errors', async () => {
            // Setup 403 error
            const forbiddenError = new maas_ts_1.MaasApiError('Forbidden', 403, 'forbidden');
            deps.mockMaasApiClient.get.mockRejectedValue(forbiddenError);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(403);
                expect(error.maasErrorCode).toBe('forbidden');
            }
        });
        it('should handle 500 Internal Server errors', async () => {
            // Setup 500 error
            const serverError = new maas_ts_1.MaasApiError('Internal server error', 500, 'server_error');
            deps.mockMaasApiClient.get.mockRejectedValue(serverError);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(500);
                expect(error.maasErrorCode).toBe('server_error');
            }
        });
    });
    describe('Validation Error Handling', () => {
        let detailsHandler;
        let detailsCallback;
        let listHandler;
        let listCallback;
        beforeEach(() => {
            // Create handlers and register them
            detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            detailsHandler.register('test_resource_details');
            listHandler = new TestResourcesListHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            listHandler.register('test_resources_list');
            // Extract the registered callbacks for testing
            detailsCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer, 0);
            listCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer, 1);
        });
        it('should handle parameter validation errors', async () => {
            // Mock extractParamsFromUri to return empty params
            const uriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            uriPatterns.extractParamsFromUri.mockReturnValueOnce({});
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, {}, // Empty params
                { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(400);
                expect(error.maasErrorCode).toBe('invalid_parameters');
            }
        });
        it('should handle response data validation errors', async () => {
            // Setup invalid response data
            const invalidResource = {
                // Missing required fields
                id: 'test-resource',
                // name is missing
                status: undefined, // Invalid type
            };
            deps.mockMaasApiClient.get.mockResolvedValue(invalidResource);
            // Execute and verify error handling
            try {
                await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(422);
                expect(error.maasErrorCode).toBe('validation_error');
                expect(error.details?.zodErrors).toBeDefined();
            }
        });
        it('should handle array response data validation errors', async () => {
            // Setup invalid response data
            const invalidResources = [
                mockResource, // Valid
                { id: 'invalid', status: 'active' }, // Missing name
            ];
            deps.mockMaasApiClient.get.mockResolvedValue(invalidResources);
            // Execute and verify error handling
            try {
                await listCallback(resourcesListUri, {}, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(422);
                expect(error.maasErrorCode).toBe('validation_error');
                expect(error.details?.zodErrors).toBeDefined();
            }
        });
        it('should handle invalid URI format', async () => {
            // Execute and verify error handling
            try {
                await detailsCallback(invalidUri, {}, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (error) {
                expect(error).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(error.statusCode).toBe(400);
            }
        });
    });
    describe('Cache Error Handling', () => {
        let detailsHandler;
        let detailsCallback;
        beforeEach(() => {
            // Create handler and register it
            detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            detailsHandler.register('test_resource_details');
            // Extract the registered callback for testing
            detailsCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer);
        });
        it('should handle cache get errors gracefully', async () => {
            // Setup cache error
            deps.mockCacheManager.get.mockImplementation(() => {
                throw new Error('Cache error');
            });
            // Setup successful API response as fallback
            deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Execute and verify fallback to API
            const result = await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Should fall back to API call
            expect(deps.mockMaasApiClient.get).toHaveBeenCalled();
            expect(result.contents[0].text).toBe(JSON.stringify(mockResource));
        });
        it('should handle cache set errors gracefully', async () => {
            // Setup cache error
            deps.mockCacheManager.set.mockImplementation(() => {
                throw new Error('Cache error');
            });
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Execute and verify API call still succeeds
            const result = await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Should still return successful result
            expect(result.contents[0].text).toBe(JSON.stringify(mockResource));
        });
    });
    describe('Content Negotiation Error Handling', () => {
        let detailsHandler;
        let detailsCallback;
        beforeEach(() => {
            // Create handler and register it
            detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            detailsHandler.register('test_resource_details');
            // Extract the registered callback for testing
            detailsCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer);
        });
        it('should handle XML format request gracefully', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Create URI with XML format
            const xmlUri = new URL('maas://resource/test-resource/details?format=xml');
            // Execute and verify XML response
            const result = await detailsCallback(xmlUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Should return XML content type
            expect(result.contents[0].mimeType).toBe('application/xml');
        });
        it('should fall back to JSON for unsupported formats', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Create URI with unsupported format
            const unsupportedUri = new URL('maas://resource/test-resource/details?format=yaml');
            // Execute and verify fallback to JSON
            const result = await detailsCallback(unsupportedUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Should fall back to JSON
            expect(result.contents[0].mimeType).toBe('application/json');
        });
    });
});
