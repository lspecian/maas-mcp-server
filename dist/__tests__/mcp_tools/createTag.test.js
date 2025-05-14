"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createTag_js_1 = require("../../mcp_tools/createTag.js");
const timeoutHelpers_js_1 = require("../utils/timeoutHelpers.js");
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
describe('createTag', () => {
    // Apply a medium timeout to all tests in this suite
    (0, timeoutHelpers_js_1.applyMediumTimeout)();
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
            post: jest.fn(),
        };
        // Setup mock send notification
        mockSendNotification = jest.fn();
        // Register the tool
        (0, createTag_js_1.registerCreateTagTool)(mockServer, mockMaasClient);
        // Capture the tool callback
        mockToolCallback = mockServer.tool.mock.calls[0][2];
    });
    it('should register the tool with the MCP server', () => {
        expect(mockServer.tool).toHaveBeenCalledWith('maas_create_tag', expect.any(Object), expect.any(Function));
    });
    (0, timeoutHelpers_js_1.mediumTest)('should handle successful tag creation', async () => {
        // Mock successful tag creation
        const mockTagResponse = {
            name: 'test-tag',
            comment: 'Test tag comment',
            definition: 'tag-definition',
            kernel_opts: 'kernel-options'
        };
        mockMaasClient.post.mockResolvedValue(mockTagResponse);
        const params = {
            name: 'test-tag',
            comment: 'Test tag comment',
            definition: 'tag-definition',
            kernel_opts: 'kernel-options',
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        expect(mockMaasClient.post).toHaveBeenCalledWith('/tags/', {
            name: 'test-tag',
            comment: 'Test tag comment',
            definition: 'tag-definition',
            kernel_opts: 'kernel-options'
        }, expect.any(AbortSignal));
        // Verify that progress notifications were called
        expect(mockSendNotification).toHaveBeenCalled();
        // Check that the start notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 0 &&
            call[0].params.message === 'Starting tag creation...')).toBe(true);
        // Check that the completion notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 100 &&
            call[0].params.message === 'Tag created successfully.')).toBe(true);
        expect(result).toEqual({
            content: [{ type: 'text', text: JSON.stringify(mockTagResponse) }]
        });
    });
    (0, timeoutHelpers_js_1.mediumTest)('should handle tag creation with minimal parameters', async () => {
        // Mock successful tag creation
        const mockTagResponse = { name: 'minimal-tag' };
        mockMaasClient.post.mockResolvedValue(mockTagResponse);
        const params = {
            name: 'minimal-tag',
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        expect(mockMaasClient.post).toHaveBeenCalledWith('/tags/', { name: 'minimal-tag' }, expect.any(AbortSignal));
        expect(result).toEqual({
            content: [{ type: 'text', text: JSON.stringify(mockTagResponse) }]
        });
    });
    (0, timeoutHelpers_js_1.mediumTest)('should handle tag creation failure', async () => {
        // Mock failed tag creation
        const error = new Error('Tag creation failed');
        mockMaasClient.post.mockRejectedValue(error);
        const params = {
            name: 'test-tag',
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        expect(mockMaasClient.post).toHaveBeenCalled();
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Error: Tag creation failed'
            }
        });
        expect(result).toEqual({
            content: [{ type: 'text', text: 'Error creating tag: Tag creation failed' }],
            isError: true
        });
    });
    (0, timeoutHelpers_js_1.mediumTest)('should handle aborted tag creation', async () => {
        // Create an aborted signal
        const controller = new AbortController();
        controller.abort('User cancelled');
        const params = {
            name: 'test-tag',
            _meta: { progressToken: 'test-token' }
        };
        // Mock post to throw AbortError when signal is aborted
        mockMaasClient.post.mockImplementation(() => {
            throw new DOMException('The operation was aborted', 'AbortError');
        });
        const result = await mockToolCallback(params, {
            signal: controller.signal,
            sendNotification: mockSendNotification
        });
        expect(result).toEqual({
            content: [{ type: 'text', text: 'Error creating tag: The operation was aborted' }],
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
