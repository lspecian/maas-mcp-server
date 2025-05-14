"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the MaasApiClient
jest.mock('../maas/MaasApiClient.js', () => ({
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
// Mock MaasMachineSchema.parse
jest.mock('../mcp_resources/schemas/machineDetailsSchema.js', () => {
    const originalModule = jest.requireActual('../mcp_resources/schemas/machineDetailsSchema.js');
    return {
        ...originalModule,
        MaasMachineSchema: {
            ...originalModule.MaasMachineSchema,
            parse: jest.fn(data => data), // Simple mock that returns data as is
        },
    };
});
const MaasApiClient_js_1 = require("../maas/MaasApiClient.js");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const machineDetailsSchema_js_1 = require("../mcp_resources/schemas/machineDetailsSchema.js");
const machineDetails_js_1 = require("../mcp_resources/machineDetails.js");
describe('Machine Details ResourceTemplate and Registration', () => {
    // Create mock instances
    const mockMaasClient = new MaasApiClient_js_1.MaasApiClient();
    const mockServer = {
        resource: jest.fn()
    };
    let registeredHandler;
    // Setup before tests
    beforeAll(() => {
        // Register the resource and capture the handler
        (0, machineDetails_js_1.registerMachineDetailsResource)(mockServer, mockMaasClient);
        // Extract the handler function that was registered
        registeredHandler = mockServer.resource.mock.calls[0][2];
    });
    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // Sample machine data that matches the schema
    const sampleMachine = {
        system_id: 'abc123',
        hostname: 'test-machine-1',
        domain: { id: 1, name: 'maas' },
        architecture: 'amd64/generic',
        status: 4,
        status_name: 'Ready',
        owner: 'admin',
        owner_data: { key: 'value' },
        ip_addresses: ['192.168.1.100'],
        cpu_count: 4,
        memory: 8192,
        zone: { id: 1, name: 'default' },
        pool: { id: 1, name: 'default' },
        tags: ['tag1', 'tag2']
    };
    test('MACHINE_DETAILS_URI_PATTERN should be correct', () => {
        expect(machineDetails_js_1.MACHINE_DETAILS_URI_PATTERN).toBe('maas://machine/{system_id}/details');
    });
    test('machineDetailsTemplate should be initialized with correct pattern and options', () => {
        expect(mcp_js_1.ResourceTemplate).toHaveBeenCalledWith(machineDetails_js_1.MACHINE_DETAILS_URI_PATTERN, { list: undefined });
    });
    test('should register resource handler correctly', () => {
        // Verify server.resource was called with correct arguments
        expect(mockServer.resource).toHaveBeenCalledWith("maas_machine_details", machineDetails_js_1.machineDetailsTemplate, expect.any(Function));
    });
    test('registered handler should call MAAS API with correct system ID and return formatted data', async () => {
        // Setup mock to return sample data
        mockMaasClient.get.mockResolvedValue(sampleMachine);
        const systemId = 'abc123';
        const mockUri = new URL(`maas://machine/${systemId}/details`);
        const mockParams = { system_id: systemId };
        const result = await registeredHandler(mockUri, mockParams, { signal: undefined });
        expect(mockMaasClient.get).toHaveBeenCalledWith(`/machines/${systemId}`, undefined, undefined);
        expect(machineDetailsSchema_js_1.MaasMachineSchema.parse).toHaveBeenCalledWith(sampleMachine);
        expect(result).toEqual({
            contents: [{
                    uri: mockUri.toString(),
                    text: JSON.stringify(sampleMachine),
                    mimeType: "application/json"
                }]
        });
    });
    test('registered handler should throw if system_id is missing in params', async () => {
        const mockUri = new URL('maas://machine//details');
        const mockParams = { system_id: '' }; // Empty system_id
        await expect(registeredHandler(mockUri, mockParams, { signal: undefined }))
            .rejects.toThrow("System ID is missing in the resource URI.");
    });
    test('registered handler should handle MAAS API errors', async () => {
        // Setup mock to throw an error
        const errorMessage = 'API Error 500';
        mockMaasClient.get.mockRejectedValue(new Error(errorMessage));
        const systemId = 'xyz789';
        const mockUri = new URL(`maas://machine/${systemId}/details`);
        const mockParams = { system_id: systemId };
        await expect(registeredHandler(mockUri, mockParams, { signal: undefined }))
            .rejects.toThrow(`Could not fetch MAAS machine details for ${systemId}. Original error: ${errorMessage}`);
    });
    test('registered handler should support AbortSignal', async () => {
        // Mock get to simulate a delay and check for abort
        mockMaasClient.get.mockImplementation(async (path, params, signal) => {
            return new Promise((resolve, reject) => {
                signal?.addEventListener('abort', () => {
                    reject(new Error('Request aborted'));
                });
                setTimeout(() => resolve(sampleMachine), 100); // Simulate network delay
            });
        });
        const systemId = 'test-abort';
        const mockUri = new URL(`maas://machine/${systemId}/details`);
        const mockParams = { system_id: systemId };
        const controller = new AbortController();
        const signal = controller.signal;
        const handlerPromise = registeredHandler(mockUri, mockParams, { signal });
        controller.abort();
        await expect(handlerPromise).rejects.toThrow();
    });
});
