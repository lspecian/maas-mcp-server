"use strict";
/**
 * Tests for Resource Handler Request Handling
 *
 * This file provides comprehensive tests for request handling in resource handlers,
 * covering various scenarios and edge cases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const BaseResourceHandler_js_1 = require("../../mcp_resources/BaseResourceHandler.js");
const testUtils_js_1 = require("../mocks/testUtils.js");
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
    created: zod_1.z.string(),
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
describe('Resource Handler Request Handling', () => {
    // Declare test dependencies
    let deps;
    // Define test URIs
    const resourceDetailsUri = new URL('maas://resource/test-resource/details');
    const resourcesListUri = new URL('maas://resources/list');
    const resourcesListUriWithParams = new URL('maas://resources/list?filter=active&limit=10');
    beforeEach(() => {
        // Setup all test dependencies with default options
        deps = (0, testUtils_js_1.setupTestDependencies)({
            cacheEnabled: true,
            auditLogEnabled: true,
            cacheHits: false
        });
    });
    describe('Details Resource Handler', () => {
        let detailsHandler;
        let detailsCallback;
        beforeEach(() => {
            // Create handler and register it
            detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            detailsHandler.register('test_resource_details');
            // Extract the registered callback for testing
            detailsCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer);
        });
        it('should fetch resource details successfully', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Execute the handler
            const result = await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Verify API call
            expect(deps.mockMaasApiClient.get).toHaveBeenCalledWith('/resources/test-resource', undefined, expect.any(Object) // AbortSignal
            );
            // Verify result
            expect(result.contents[0].text).toBe(JSON.stringify(mockResource));
            expect(result.contents[0].mimeType).toBe('application/json');
            // Verify caching
            expect(deps.mockCacheManager.set).toHaveBeenCalled();
        });
        it('should use cache if available', async () => {
            // Setup cache hit
            deps.mockCacheManager.get.mockReturnValue(mockResource);
            // Execute the handler
            const result = await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Verify cache usage
            expect(deps.mockCacheManager.get).toHaveBeenCalled();
            expect(deps.mockMaasApiClient.get).not.toHaveBeenCalled();
            // Verify result
            expect(result.contents[0].text).toBe(JSON.stringify(mockResource));
            // Verify cache headers
            expect(result.contents[0].headers['Age']).toBeDefined();
            expect(result.contents[0].headers['Cache-Control']).toBeDefined();
        });
        it('should handle request with abort signal', async () => {
            // Create aborted signal
            const abortController = new AbortController();
            abortController.abort();
            // Execute and verify abort handling
            await expect(detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: abortController.signal })).rejects.toThrow();
        });
        it('should include appropriate headers in response', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Execute the handler
            const result = await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Verify headers
            expect(result.contents[0].headers['Content-Type']).toBe('application/json');
            expect(result.contents[0].headers['Cache-Control']).toBeDefined();
            expect(result.contents[0].headers['ETag']).toBeDefined();
        });
    });
    describe('List Resource Handler', () => {
        let listHandler;
        let listCallback;
        beforeEach(() => {
            // Create handler and register it
            listHandler = new TestResourcesListHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            listHandler.register('test_resources_list');
            // Extract the registered callback for testing
            listCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer);
        });
        it('should fetch resources list successfully', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResources);
            // Execute the handler
            const result = await listCallback(resourcesListUri, {}, { signal: new AbortController().signal });
            // Verify API call
            expect(deps.mockMaasApiClient.get).toHaveBeenCalledWith('/resources', {}, expect.any(Object) // AbortSignal
            );
            // Verify result
            expect(result.contents[0].text).toBe(JSON.stringify(mockResources));
            expect(result.contents[0].mimeType).toBe('application/json');
            // Verify caching
            expect(deps.mockCacheManager.set).toHaveBeenCalled();
        });
        it('should handle query parameters correctly', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResources);
            // Execute the handler with query parameters
            const queryParams = { filter: 'active', limit: '10' };
            await listCallback(resourcesListUriWithParams, queryParams, { signal: new AbortController().signal });
            // Verify API call with query parameters
            expect(deps.mockMaasApiClient.get).toHaveBeenCalledWith('/resources', expect.objectContaining(queryParams), expect.any(Object) // AbortSignal
            );
        });
        it('should use cache if available', async () => {
            // Setup cache hit
            deps.mockCacheManager.get.mockReturnValue(mockResources);
            // Execute the handler
            const result = await listCallback(resourcesListUri, {}, { signal: new AbortController().signal });
            // Verify cache usage
            expect(deps.mockCacheManager.get).toHaveBeenCalled();
            expect(deps.mockMaasApiClient.get).not.toHaveBeenCalled();
            // Verify result
            expect(result.contents[0].text).toBe(JSON.stringify(mockResources));
            // Verify cache headers
            expect(result.contents[0].headers['Age']).toBeDefined();
            expect(result.contents[0].headers['Cache-Control']).toBeDefined();
        });
        it('should invalidate cache when filter parameters change', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResources);
            // Spy on invalidateCache method
            const invalidateCacheSpy = jest.spyOn(listHandler, 'invalidateCache');
            // Execute the handler with query parameters
            await listCallback(resourcesListUriWithParams, { filter: 'active', limit: '10' }, { signal: new AbortController().signal });
            // Verify cache invalidation
            expect(invalidateCacheSpy).toHaveBeenCalled();
            // Restore the spy
            invalidateCacheSpy.mockRestore();
        });
        it('should include appropriate headers in response', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResources);
            // Execute the handler
            const result = await listCallback(resourcesListUri, {}, { signal: new AbortController().signal });
            // Verify headers
            expect(result.contents[0].headers['Content-Type']).toBe('application/json');
            expect(result.contents[0].headers['Cache-Control']).toBeDefined();
            expect(result.contents[0].headers['ETag']).toBeDefined();
        });
    });
    describe('Resource Handler Registration', () => {
        it('should register resource handlers with correct parameters', () => {
            // Create handlers
            const detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            const listHandler = new TestResourcesListHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            // Register handlers
            detailsHandler.register('test_resource_details');
            listHandler.register('test_resources_list');
            // Verify registration
            expect(deps.mockMcpServer.resource).toHaveBeenCalledTimes(2);
            expect(deps.mockMcpServer.resource).toHaveBeenCalledWith('test_resource_details', expect.objectContaining({ pattern: 'maas://resource/{resource_id}/details' }), expect.any(Function));
            expect(deps.mockMcpServer.resource).toHaveBeenCalledWith('test_resources_list', expect.objectContaining({ pattern: 'maas://resources/list' }), expect.any(Function));
        });
    });
    describe('Resource Handler Caching', () => {
        let detailsHandler;
        let detailsCallback;
        beforeEach(() => {
            // Create handler and register it
            detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
            detailsHandler.register('test_resource_details');
            // Extract the registered callback for testing
            detailsCallback = (0, testUtils_js_1.extractRegisteredCallback)(deps.mockMcpServer);
        });
        it('should respect cache enabled setting', async () => {
            // Setup dependencies with cache disabled
            const depsWithCacheDisabled = (0, testUtils_js_1.setupTestDependencies)({
                cacheEnabled: false,
                auditLogEnabled: true,
                cacheHits: false
            });
            // Create handler with cache disabled
            const handlerWithCacheDisabled = new TestResourceDetailsHandler(depsWithCacheDisabled.mockMcpServer, depsWithCacheDisabled.mockMaasApiClient);
            handlerWithCacheDisabled.register('test_resource_details_no_cache');
            // Extract the registered callback
            const callbackWithCacheDisabled = (0, testUtils_js_1.extractRegisteredCallback)(depsWithCacheDisabled.mockMcpServer);
            // Setup successful API response
            depsWithCacheDisabled.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Execute the handler
            await callbackWithCacheDisabled(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Verify cache was not used
            expect(depsWithCacheDisabled.mockCacheManager.get).not.toHaveBeenCalled();
            expect(depsWithCacheDisabled.mockCacheManager.set).not.toHaveBeenCalled();
        });
        it('should allow updating cache options at runtime', async () => {
            // Setup successful API response
            deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
            // Update cache options
            detailsHandler.setCacheOptions({
                ttl: 600,
                cacheControl: {
                    private: true,
                    mustRevalidate: true,
                    immutable: false
                }
            });
            // Execute the handler
            await detailsCallback(resourceDetailsUri, { resource_id: 'test-resource' }, { signal: new AbortController().signal });
            // Verify cache options were used
            expect(deps.mockCacheManager.set).toHaveBeenCalledWith(expect.any(String), expect.anything(), 'TestResource', expect.objectContaining({
                ttl: 600,
                cacheControl: {
                    private: true,
                    mustRevalidate: true,
                    immutable: false
                }
            }));
        });
        it('should invalidate cache entries for a resource type', async () => {
            // Call invalidateCache
            const count = detailsHandler.invalidateCache();
            // Verify cache was invalidated
            expect(deps.mockCacheManager.invalidateResource).toHaveBeenCalledWith('TestResource');
        });
        it('should invalidate cache entries for a specific resource ID', async () => {
            // Call invalidateCacheById
            const count = detailsHandler.invalidateCacheById('test-resource');
            // Verify cache was invalidated
            expect(deps.mockCacheManager.invalidateResource).toHaveBeenCalledWith('TestResource', 'test-resource');
        });
    });
});
