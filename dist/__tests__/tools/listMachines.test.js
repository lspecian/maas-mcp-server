"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the MaasApiClient
jest.mock('../../maas/MaasApiClient.js', () => ({
    __esModule: true,
    MaasApiClient: jest.fn().mockImplementation(() => ({
        get: jest.fn()
    }))
}));
const { z } = require('zod');
const { MaasApiClient } = require('../../maas/MaasApiClient.js');
const { registerListMachinesTool } = require('../../mcp_tools/listMachines.js');
const { listMachinesSchema } = require('../../mcp_tools/schemas/listMachinesSchema.js');
describe('List Machines MCP Tool', () => {
    // Create mock instances
    const mockMaasClient = new MaasApiClient();
    const mockServer = {
        tool: jest.fn()
    };
    let registeredHandler;
    // Setup before tests
    beforeAll(() => {
        // Register the tool and capture the handler
        registerListMachinesTool(mockServer, mockMaasClient);
        // Extract the handler function that was registered
        registeredHandler = mockServer.tool.mock.calls[0][2];
    });
    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // Sample machine data that matches the schema
    const sampleMachines = [
        {
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
        },
        {
            system_id: 'def456',
            hostname: 'test-machine-2',
            domain: { id: 1, name: 'maas' },
            architecture: 'amd64/generic',
            status: 6,
            status_name: 'Deployed',
            owner: 'user1',
            owner_data: null,
            ip_addresses: ['192.168.1.101'],
            cpu_count: 8,
            memory: 16384,
            zone: { id: 1, name: 'default' },
            pool: { id: 2, name: 'production' },
            tags: ['tag3']
        }
    ];
    test('should register the tool with the correct name and schema', () => {
        // Verify the tool was registered with the correct name and schema
        expect(mockServer.tool).toHaveBeenCalledWith('maas_list_machines', listMachinesSchema.shape, expect.any(Function));
    });
    test('should call MAAS API with correct parameters', async () => {
        // Setup mock to return sample data
        mockMaasClient.get.mockResolvedValue(sampleMachines);
        // Call the handler with parameters
        const params = {
            hostname: 'test',
            status: 'ready',
            tag_names: ['tag1', 'tag2']
        };
        await registeredHandler(params, { signal: undefined });
        // Verify MAAS API was called with correct parameters
        expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {
            hostname: 'test',
            status: 'ready',
            tag_names: 'tag1,tag2'
        }, undefined);
    });
    test('should return machines data in the correct ToolResult format', async () => {
        // Setup mock to return sample data
        mockMaasClient.get.mockResolvedValue(sampleMachines);
        // Call the handler without parameters
        const result = await registeredHandler({}, { signal: undefined });
        // Verify result has the correct ToolResult format
        expect(result).toEqual({
            content: [{ type: "text", text: JSON.stringify(sampleMachines) }]
        });
    });
    test('should handle empty parameters', async () => {
        // Setup mock to return sample data
        mockMaasClient.get.mockResolvedValue(sampleMachines);
        // Call the handler without parameters
        await registeredHandler({}, { signal: undefined });
        // Verify MAAS API was called with empty parameters
        expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {}, undefined);
    });
    test('should handle API errors', async () => {
        // Setup mock to throw an error
        const errorMessage = 'API connection failed';
        mockMaasClient.get.mockRejectedValue(new Error(errorMessage));
        // Call the handler and expect it to return an error result
        const result = await registeredHandler({}, { signal: undefined });
        // Verify the error result has the correct format
        expect(result).toEqual({
            content: [{ type: "text", text: `Error listing machines: ${errorMessage}` }],
            isError: true
        });
    });
    test('should pass AbortSignal to MAAS API client', async () => {
        // Setup mock to return sample data
        mockMaasClient.get.mockResolvedValue(sampleMachines);
        // Create a mock AbortSignal
        const mockSignal = {};
        // Call the handler with the signal
        await registeredHandler({}, { signal: mockSignal });
        // Verify the signal was passed to the MAAS API client
        expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {}, mockSignal);
    });
    test('should handle AbortSignal being triggered', async () => {
        // Mock get to simulate a delay and check for abort
        mockMaasClient.get.mockImplementation(async (path, params, signal) => {
            return new Promise((resolve, reject) => {
                signal?.addEventListener('abort', () => {
                    reject(new Error('Request aborted'));
                });
                setTimeout(() => resolve(sampleMachines), 100); // Simulate network delay
            });
        });
        // Create an AbortController and signal
        const controller = new AbortController();
        const signal = controller.signal;
        // Start the handler call
        const handlerPromise = registeredHandler({}, { signal });
        // Abort the request
        controller.abort();
        // Verify the handler returns an error result
        const result = await handlerPromise;
        expect(result).toEqual({
            content: [{ type: "text", text: expect.stringContaining('Error listing machines: Request aborted') }],
            isError: true
        });
    });
    test('should handle all parameter combinations correctly', async () => {
        // Setup mock to return sample data
        mockMaasClient.get.mockResolvedValue(sampleMachines);
        // Call the handler with all possible parameters
        const params = {
            hostname: 'test',
            mac_address: '00:11:22:33:44:55',
            tag_names: ['tag1', 'tag2'],
            status: 'ready',
            zone: 'default',
            pool: 'production',
            owner: 'admin',
            architecture: 'amd64/generic',
            limit: 10,
            offset: 5
        };
        await registeredHandler(params, { signal: undefined });
        // Verify MAAS API was called with all parameters correctly transformed
        expect(mockMaasClient.get).toHaveBeenCalledWith('/machines', {
            hostname: 'test',
            mac_addresses: '00:11:22:33:44:55',
            tag_names: 'tag1,tag2',
            status: 'ready',
            zone: 'default',
            pool: 'production',
            owner: 'admin',
            architecture: 'amd64/generic',
            limit: 10,
            offset: 5
        }, undefined);
    });
    test('should handle empty result sets correctly', async () => {
        // Setup mock to return empty array
        mockMaasClient.get.mockResolvedValue([]);
        // Call the handler
        const result = await registeredHandler({}, { signal: undefined });
        // Verify result has the correct format with empty array
        expect(result).toEqual({
            content: [{ type: "text", text: "[]" }]
        });
    });
    test('should handle unexpected server response formats', async () => {
        // Setup mock to return invalid data
        const invalidResponse = { error: 'Unexpected format' };
        mockMaasClient.get.mockResolvedValue(invalidResponse);
        // Call the handler
        const result = await registeredHandler({}, { signal: undefined });
        // Verify result contains the unexpected format
        expect(result).toEqual({
            content: [{ type: "text", text: JSON.stringify(invalidResponse) }]
        });
    });
});
