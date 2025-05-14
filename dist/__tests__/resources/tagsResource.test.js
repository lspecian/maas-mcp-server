"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the MaasApiClient
jest.mock('../../maas/MaasApiClient.js', () => ({
    __esModule: true,
    MaasApiClient: jest.fn().mockImplementation(() => ({
        get: jest.fn()
    }))
}));
// Mock the SDK's ResourceTemplate
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
    __esModule: true,
    ResourceTemplate: jest.fn().mockImplementation((pattern, options) => ({
        pattern,
        options
    })),
    McpServer: jest.fn()
}));
// Mock the Zod schemas
jest.mock('../../mcp_resources/schemas/tagResourcesSchema.js', () => {
    const originalModule = jest.requireActual('../../mcp_resources/schemas/tagResourcesSchema.js');
    return {
        ...originalModule,
        MaasTagSchema: {
            ...originalModule.MaasTagSchema,
            parse: jest.fn(data => data), // Simple mock that returns data as is
        },
        GetTagParamsSchema: {
            ...originalModule.GetTagParamsSchema,
            parse: jest.fn(data => data),
        },
        GetTagMachinesParamsSchema: {
            ...originalModule.GetTagMachinesParamsSchema,
            parse: jest.fn(data => data),
        }
    };
});
// Mock logger
jest.mock('../../utils/logger.ts', () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));
const MaasApiClient_js_1 = require("../../maas/MaasApiClient.js");
const maas_ts_1 = require("../../types/maas.ts");
const tagResourcesSchema_js_1 = require("../../mcp_resources/schemas/tagResourcesSchema.js");
const tagsResource_js_1 = require("../../mcp_resources/tagsResource.js");
const zod_1 = require("zod");
const logger_ts_1 = __importDefault(require("../../utils/logger.ts"));
// Mock tag data fixtures
const mockTags = [
    {
        name: 'tag1',
        definition: 'xpath definition',
        comment: 'Test tag 1',
        kernel_opts: 'kernel options',
        machine_count: 2
    },
    {
        name: 'tag2',
        definition: '',
        comment: 'Test tag 2',
        kernel_opts: '',
        machine_count: 5
    },
    {
        name: 'tag-with-hyphen',
        definition: null,
        comment: 'Tag with hyphen',
        kernel_opts: null,
        machine_count: 1
    },
    {
        name: 'tag_with_underscore',
        definition: null,
        comment: 'Tag with underscore',
        kernel_opts: null,
        machine_count: 3
    }
];
// Mock machines with tags
const mockMachinesWithTag = [
    {
        system_id: 'abc123',
        hostname: 'test-machine-1',
        tags: ['tag1', 'tag2']
    },
    {
        system_id: 'def456',
        hostname: 'test-machine-2',
        tags: ['tag1']
    }
];
describe('Tags Resource', () => {
    // Create mock instances
    const mockMaasClient = new MaasApiClient_js_1.MaasApiClient();
    const mockServer = {
        resource: jest.fn()
    };
    // Handlers for each resource
    let tagsListHandler;
    let tagDetailsHandler;
    let tagMachinesHandler;
    // Setup before tests
    beforeEach(() => {
        jest.clearAllMocks();
        // Register the resources and capture the handlers
        (0, tagsResource_js_1.registerTagsListResource)(mockServer, mockMaasClient);
        (0, tagsResource_js_1.registerTagDetailsResource)(mockServer, mockMaasClient);
        (0, tagsResource_js_1.registerTagMachinesResource)(mockServer, mockMaasClient);
        // Extract the handler functions that were registered
        tagsListHandler = mockServer.resource.mock.calls[0][2];
        tagDetailsHandler = mockServer.resource.mock.calls[1][2];
        tagMachinesHandler = mockServer.resource.mock.calls[2][2];
    });
    describe('URI Patterns', () => {
        test('TAGS_LIST_URI_PATTERN should be correct', () => {
            expect(tagResourcesSchema_js_1.TAGS_LIST_URI_PATTERN).toBe('maas://tags/list');
        });
        test('TAG_DETAILS_URI_PATTERN should be correct', () => {
            expect(tagResourcesSchema_js_1.TAG_DETAILS_URI_PATTERN).toBe('maas://tag/{tag_name}/details');
        });
        test('TAG_MACHINES_URI_PATTERN should be correct', () => {
            expect(tagResourcesSchema_js_1.TAG_MACHINES_URI_PATTERN).toBe('maas://tag/{tag_name}/machines');
        });
    });
    describe('Resource Templates', () => {
        test('tagsListTemplate should be defined', () => {
            expect(tagsResource_js_1.tagsListTemplate).toBeDefined();
        });
        test('tagDetailsTemplate should be defined', () => {
            expect(tagsResource_js_1.tagDetailsTemplate).toBeDefined();
        });
        test('tagMachinesTemplate should be defined', () => {
            expect(tagsResource_js_1.tagMachinesTemplate).toBeDefined();
        });
    });
    describe('Resource Registration', () => {
        test('should register tags list resource handler correctly', () => {
            expect(mockServer.resource).toHaveBeenCalledWith("maas_tags_list", tagsResource_js_1.tagsListTemplate, expect.any(Function));
        });
        test('should register tag details resource handler correctly', () => {
            expect(mockServer.resource).toHaveBeenCalledWith("maas_tag_details", tagsResource_js_1.tagDetailsTemplate, expect.any(Function));
        });
        test('should register tag machines resource handler correctly', () => {
            expect(mockServer.resource).toHaveBeenCalledWith("maas_tag_machines", tagsResource_js_1.tagMachinesTemplate, expect.any(Function));
        });
    });
    describe('Tags List Resource', () => {
        test('should fetch and return all tags', async () => {
            // Setup mock to return sample data
            mockMaasClient.get.mockResolvedValue(mockTags);
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            const result = await tagsListHandler(mockUri, mockParams, { signal: undefined });
            expect(mockMaasClient.get).toHaveBeenCalledWith('/tags/', undefined, undefined);
            expect(tagResourcesSchema_js_1.MaasTagSchema.parse).toHaveBeenCalledTimes(mockTags.length);
            expect(result).toEqual({
                contents: [{
                        uri: mockUri.toString(),
                        text: JSON.stringify(mockTags),
                        mimeType: "application/json"
                    }]
            });
        });
        test('should handle non-array response from MAAS API', async () => {
            // Setup mock to return non-array data
            mockMaasClient.get.mockResolvedValue({ error: 'Not an array' });
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            await expect(tagsListHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Invalid response format: Expected an array of tags');
        });
        test('should handle validation errors', async () => {
            // Setup mock to return sample data
            mockMaasClient.get.mockResolvedValue(mockTags);
            // Mock schema validation to throw an error
            const zodError = new zod_1.ZodError([{
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['name'],
                    message: 'Expected string, received number'
                }]);
            tagResourcesSchema_js_1.MaasTagSchema.parse.mockImplementationOnce(() => {
                throw zodError;
            });
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            await expect(tagsListHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Tag data validation failed: The MAAS API returned data in an unexpected format');
        });
        test('should handle network connectivity errors', async () => {
            // Setup mock to throw a network error
            const networkError = new Error('Connection refused');
            networkError.cause = { code: 'ECONNREFUSED', errno: -111 };
            mockMaasClient.get.mockRejectedValue(networkError);
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            await expect(tagsListHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Failed to connect to MAAS API: Network connectivity issue');
        });
        test('should handle timeout errors', async () => {
            // Setup mock to throw a timeout error
            const timeoutError = new Error('Timeout');
            timeoutError.cause = { code: 'ETIMEDOUT', errno: -110 };
            mockMaasClient.get.mockRejectedValue(timeoutError);
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            await expect(tagsListHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('MAAS API request timed out while fetching tags list');
        });
        test('should handle request aborted', async () => {
            // Setup mock to throw an abort error
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            mockMaasClient.get.mockRejectedValue(abortError);
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            await expect(tagsListHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Tags list request was aborted by the client');
        });
        test('should handle generic errors', async () => {
            // Setup mock to throw a generic error
            mockMaasClient.get.mockRejectedValue(new Error('Unknown error'));
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            await expect(tagsListHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Could not fetch MAAS tags list: Unknown error');
        });
        test('should support AbortSignal', async () => {
            // Mock get to simulate a delay and check for abort
            mockMaasClient.get.mockImplementation(async (path, params, signal) => {
                return new Promise((resolve, reject) => {
                    signal?.addEventListener('abort', () => {
                        reject(new Error('Request aborted'));
                    });
                    setTimeout(() => resolve(mockTags), 100); // Simulate network delay
                });
            });
            const mockUri = new URL('maas://tags/list');
            const mockParams = {};
            const controller = new AbortController();
            const signal = controller.signal;
            const handlerPromise = tagsListHandler(mockUri, mockParams, { signal });
            controller.abort();
            await expect(handlerPromise).rejects.toThrow();
        });
    });
    describe('Tag Details Resource', () => {
        test('should fetch and return tag details', async () => {
            // Setup mock to return sample data
            mockMaasClient.get.mockResolvedValue(mockTags[0]);
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            const result = await tagDetailsHandler(mockUri, mockParams, { signal: undefined });
            expect(mockMaasClient.get).toHaveBeenCalledWith(`/tags/${tagName}/`, undefined, undefined);
            expect(tagResourcesSchema_js_1.MaasTagSchema.parse).toHaveBeenCalledWith(mockTags[0]);
            expect(result).toEqual({
                contents: [{
                        uri: mockUri.toString(),
                        text: JSON.stringify(mockTags[0]),
                        mimeType: "application/json"
                    }]
            });
        });
        test('should handle missing tag_name parameter', async () => {
            const mockUri = new URL('maas://tag//details');
            const mockParams = { tag_name: '' };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Tag name is missing or empty in the resource URI');
        });
        test('should handle invalid tag_name format', async () => {
            const tagName = 'invalid@tag';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.');
        });
        test('should handle tag not found', async () => {
            // Setup mock to return null (tag not found)
            mockMaasClient.get.mockResolvedValue(null);
            const tagName = 'nonexistent';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Tag '${tagName}' not found`);
        });
        test('should handle 404 error from MAAS API', async () => {
            // Setup mock to throw a 404 error
            const notFoundError = new maas_ts_1.MaasApiError('Not Found', 404, 'not_found');
            mockMaasClient.get.mockRejectedValue(notFoundError);
            const tagName = 'nonexistent';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Tag '${tagName}' not found`);
        });
        test('should handle validation errors', async () => {
            // Setup mock to return sample data
            mockMaasClient.get.mockResolvedValue(mockTags[0]);
            // Mock schema validation to throw an error
            const zodError = new zod_1.ZodError([{
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['name'],
                    message: 'Expected string, received number'
                }]);
            tagResourcesSchema_js_1.MaasTagSchema.parse.mockImplementationOnce(() => {
                throw zodError;
            });
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Tag data validation failed for '${tagName}': The MAAS API returned data in an unexpected format`);
        });
        test('should handle parameter validation errors', async () => {
            // Mock parameter validation to throw an error
            const zodError = new zod_1.ZodError([{
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['tag_name'],
                    message: 'Expected string, received number'
                }]);
            tagResourcesSchema_js_1.GetTagParamsSchema.parse.mockImplementationOnce(() => {
                throw zodError;
            });
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Invalid parameters for tag details request');
        });
        test('should handle network connectivity errors', async () => {
            // Setup mock to throw a network error
            const networkError = new Error('Connection refused');
            networkError.cause = { code: 'ECONNREFUSED', errno: -111 };
            mockMaasClient.get.mockRejectedValue(networkError);
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Failed to connect to MAAS API: Network connectivity issue');
        });
        test('should handle timeout errors', async () => {
            // Setup mock to throw a timeout error
            const timeoutError = new Error('Timeout');
            timeoutError.cause = { code: 'ETIMEDOUT', errno: -110 };
            mockMaasClient.get.mockRejectedValue(timeoutError);
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`MAAS API request timed out while fetching tag details for '${tagName}'`);
        });
        test('should handle request aborted', async () => {
            // Setup mock to throw an abort error
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            mockMaasClient.get.mockRejectedValue(abortError);
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Tag details request for '${tagName}' was aborted by the client`);
        });
        test('should handle generic errors', async () => {
            // Setup mock to throw a generic error
            mockMaasClient.get.mockRejectedValue(new Error('Unknown error'));
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/details`);
            const mockParams = { tag_name: tagName };
            await expect(tagDetailsHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Could not fetch details for MAAS tag '${tagName}': Unknown error`);
        });
    });
    describe('Tag Machines Resource', () => {
        test('should fetch and return machines with a specific tag', async () => {
            // Setup mock to return tag details first, then machines
            mockMaasClient.get
                .mockResolvedValueOnce(mockTags[0]) // First call for tag existence check
                .mockResolvedValueOnce(mockMachinesWithTag); // Second call for machines
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            const result = await tagMachinesHandler(mockUri, mockParams, { signal: undefined });
            // Check that both API calls were made correctly
            expect(mockMaasClient.get).toHaveBeenCalledTimes(2);
            expect(mockMaasClient.get).toHaveBeenNthCalledWith(1, `/tags/${tagName}/`, undefined, undefined);
            expect(mockMaasClient.get).toHaveBeenNthCalledWith(2, '/machines/', { tags: tagName }, undefined);
            expect(result).toEqual({
                contents: [{
                        uri: mockUri.toString(),
                        text: JSON.stringify(mockMachinesWithTag),
                        mimeType: "application/json"
                    }]
            });
        });
        test('should handle missing tag_name parameter', async () => {
            const mockUri = new URL('maas://tag//machines');
            const mockParams = { tag_name: '' };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Tag name is missing or empty in the resource URI');
        });
        test('should handle invalid tag_name format', async () => {
            const tagName = 'invalid@tag';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Tag name contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed.');
        });
        test('should handle tag not found', async () => {
            // Setup mock to throw a 404 error for tag existence check
            const notFoundError = new maas_ts_1.MaasApiError('Not Found', 404, 'not_found');
            mockMaasClient.get.mockRejectedValue(notFoundError);
            const tagName = 'nonexistent';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Tag '${tagName}' not found`);
        });
        test('should handle non-array response from MAAS API', async () => {
            // Setup mock to return tag details first, then non-array machines
            mockMaasClient.get
                .mockResolvedValueOnce(mockTags[0]) // First call for tag existence check
                .mockResolvedValueOnce({ error: 'Not an array' }); // Second call for machines
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Invalid response format: Expected an array of machines');
        });
        test('should handle empty machines array', async () => {
            // Setup mock to return tag details first, then empty machines array
            mockMaasClient.get
                .mockResolvedValueOnce(mockTags[0]) // First call for tag existence check
                .mockResolvedValueOnce([]); // Second call for machines - empty array
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            const result = await tagMachinesHandler(mockUri, mockParams, { signal: undefined });
            expect(result).toEqual({
                contents: [{
                        uri: mockUri.toString(),
                        text: JSON.stringify([]),
                        mimeType: "application/json"
                    }]
            });
        });
        test('should handle parameter validation errors', async () => {
            // Mock parameter validation to throw an error
            const zodError = new zod_1.ZodError([{
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['tag_name'],
                    message: 'Expected string, received number'
                }]);
            tagResourcesSchema_js_1.GetTagMachinesParamsSchema.parse.mockImplementationOnce(() => {
                throw zodError;
            });
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Invalid parameters for tag machines request');
        });
        test('should handle network connectivity errors', async () => {
            // Setup mock to throw a network error
            const networkError = new Error('Connection refused');
            networkError.cause = { code: 'ECONNREFUSED', errno: -111 };
            mockMaasClient.get.mockRejectedValue(networkError);
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow('Failed to connect to MAAS API: Network connectivity issue');
        });
        test('should handle timeout errors', async () => {
            // Setup mock to throw a timeout error
            const timeoutError = new Error('Timeout');
            timeoutError.cause = { code: 'ETIMEDOUT', errno: -110 };
            mockMaasClient.get.mockRejectedValue(timeoutError);
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`MAAS API request timed out while fetching machines with tag '${tagName}'`);
        });
        test('should handle request aborted', async () => {
            // Setup mock to throw an abort error
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            mockMaasClient.get.mockRejectedValue(abortError);
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Machines with tag '${tagName}' request was aborted by the client`);
        });
        test('should handle generic errors', async () => {
            // Setup mock to throw a generic error
            mockMaasClient.get.mockRejectedValue(new Error('Unknown error'));
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            await expect(tagMachinesHandler(mockUri, mockParams, { signal: undefined }))
                .rejects.toThrow(`Could not fetch machines with MAAS tag '${tagName}': Unknown error`);
        });
        test('should continue if tag exists but error occurs during tag check', async () => {
            // Setup mock to throw a non-404 error for tag check, then succeed for machines
            const genericError = new maas_ts_1.MaasApiError('Server Error', 500, 'server_error');
            mockMaasClient.get
                .mockRejectedValueOnce(genericError) // First call for tag existence check fails
                .mockResolvedValueOnce(mockMachinesWithTag); // Second call for machines succeeds
            const tagName = 'tag1';
            const mockUri = new URL(`maas://tag/${tagName}/machines`);
            const mockParams = { tag_name: tagName };
            const result = await tagMachinesHandler(mockUri, mockParams, { signal: undefined });
            // Verify that we logged a warning but continued
            expect(logger_ts_1.default.warn).toHaveBeenCalled();
            expect(result).toEqual({
                contents: [{
                        uri: mockUri.toString(),
                        text: JSON.stringify(mockMachinesWithTag),
                        mimeType: "application/json"
                    }]
            });
        });
    });
});
