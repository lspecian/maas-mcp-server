"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const listSubnets_js_1 = require("../../mcp_tools/listSubnets.js");
// Mock dependencies
jest.mock('../../maas/MaasApiClient.js');
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('../../utils/logger.ts', () => ({
    createRequestLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    })
}));
describe('listSubnets', () => {
    let mockServer;
    let mockMaasClient;
    let mockSendNotification;
    let mockToolCallback;
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup mock server
        mockServer = {
            tool: jest.fn(),
        };
        // Setup mock MAAS client
        mockMaasClient = {
            get: jest.fn(),
        };
        // Setup mock send notification
        mockSendNotification = jest.fn();
        // Register the tool
        (0, listSubnets_js_1.registerListSubnetsTool)(mockServer, mockMaasClient);
        // Capture the tool callback
        mockToolCallback = mockServer.tool.mock.calls[0][2];
    });
    it('should register the tool with the MCP server', () => {
        expect(mockServer.tool).toHaveBeenCalledWith('maas_list_subnets', expect.any(Object), expect.any(Function));
    });
    it('should handle successful subnet listing with no filters', async () => {
        // Mock successful subnet listing
        const mockSubnetsResponse = [
            { id: 1, name: 'subnet-1', cidr: '192.168.1.0/24', vlan: 1 },
            { id: 2, name: 'subnet-2', cidr: '10.0.0.0/24', vlan: 2 }
        ];
        mockMaasClient.get.mockResolvedValue(mockSubnetsResponse);
        const params = {
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        expect(mockMaasClient.get).toHaveBeenCalledWith('/subnets/', {}, expect.any(AbortSignal));
        // Verify that progress notifications were called
        expect(mockSendNotification).toHaveBeenCalled();
        // Check that the start notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 0 &&
            call[0].params.message === 'Starting subnet list retrieval...')).toBe(true);
        // Check that the completion notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 100 &&
            call[0].params.message === 'Subnet list retrieved successfully.')).toBe(true);
        expect(result).toEqual({
            content: [{ type: 'text', text: JSON.stringify(mockSubnetsResponse) }]
        });
    });
    it('should handle subnet listing with filters', async () => {
        // Mock successful subnet listing
        const mockSubnetsResponse = [
            { id: 1, name: 'subnet-1', cidr: '192.168.1.0/24', vlan: 1 }
        ];
        mockMaasClient.get.mockResolvedValue(mockSubnetsResponse);
        const params = {
            cidr: '192.168.1.0/24',
            vlan: 1,
            limit: 10,
            offset: 0,
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        expect(mockMaasClient.get).toHaveBeenCalledWith('/subnets/', {
            cidr: '192.168.1.0/24',
            vlan: 1,
            limit: 10,
            offset: 0
        }, expect.any(AbortSignal));
        expect(result).toEqual({
            content: [{ type: 'text', text: JSON.stringify(mockSubnetsResponse) }]
        });
    });
    it('should handle subnet listing with all possible filters', async () => {
        // Mock successful subnet listing
        const mockSubnetsResponse = [
            { id: 1, name: 'subnet-1', cidr: '192.168.1.0/24', vlan: 1, fabric: 'fabric-1', space: 'space-1' }
        ];
        mockMaasClient.get.mockResolvedValue(mockSubnetsResponse);
        const params = {
            cidr: '192.168.1.0/24',
            name: 'subnet-1',
            vlan: 1,
            fabric: 'fabric-1',
            space: 'space-1',
            id: 1,
            limit: 10,
            offset: 0,
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        expect(mockMaasClient.get).toHaveBeenCalledWith('/subnets/', {
            cidr: '192.168.1.0/24',
            name: 'subnet-1',
            vlan: 1,
            fabric: 'fabric-1',
            space: 'space-1',
            id: 1,
            limit: 10,
            offset: 0
        }, expect.any(AbortSignal));
        expect(result).toEqual({
            content: [{ type: 'text', text: JSON.stringify(mockSubnetsResponse) }]
        });
    });
    it('should handle subnet listing failure', async () => {
        // Mock failed subnet listing
        const error = new Error('Subnet listing failed');
        mockMaasClient.get.mockRejectedValue(error);
        const params = {
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        expect(mockMaasClient.get).toHaveBeenCalled();
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Error: Subnet listing failed'
            }
        });
        expect(result).toEqual({
            content: [{ type: 'text', text: 'Error listing subnets: Subnet listing failed' }],
            isError: true
        });
    });
    it('should handle aborted subnet listing', async () => {
        // Create an aborted signal
        const controller = new AbortController();
        controller.abort('User cancelled');
        const params = {
            _meta: { progressToken: 'test-token' }
        };
        // Mock get to throw AbortError when signal is aborted
        mockMaasClient.get.mockImplementation(() => {
            throw new DOMException('The operation was aborted', 'AbortError');
        });
        const result = await mockToolCallback(params, {
            signal: controller.signal,
            sendNotification: mockSendNotification
        });
        expect(result).toEqual({
            content: [{ type: 'text', text: 'Error listing subnets: The operation was aborted' }],
            isError: true
        });
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Error: The operation was aborted'
            }
        });
    });
});
