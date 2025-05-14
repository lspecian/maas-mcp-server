"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tagManagement_js_1 = require("../../mcp_tools/tagManagement.js");
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
describe('tagManagement', () => {
    let mockServer;
    let mockMaasClient;
    let mockSendNotification;
    let mockCreateTagCallback;
    let mockUpdateTagNodesCallback;
    let mockDeleteTagCallback;
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup mock server
        mockServer = {
            tool: jest.fn(),
        };
        // Setup mock MAAS client
        mockMaasClient = {
            post: jest.fn(),
            delete: jest.fn(),
        };
        // Setup mock send notification
        mockSendNotification = jest.fn();
        // Register the tools
        (0, tagManagement_js_1.registerTagManagementTools)(mockServer, mockMaasClient);
        // Capture the tool callbacks
        // The first call is for maas_create_tag
        mockCreateTagCallback = mockServer.tool.mock.calls[0][3];
        // The second call is for maas_update_tag_nodes
        mockUpdateTagNodesCallback = mockServer.tool.mock.calls[1][3];
        // The third call is for maas_delete_tag
        mockDeleteTagCallback = mockServer.tool.mock.calls[2][3];
    });
    describe('maas_create_tag', () => {
        it('should register the create tag tool with the MCP server', () => {
            expect(mockServer.tool).toHaveBeenCalledWith('maas_create_tag', expect.any(Object), expect.any(Object), expect.any(Function));
        });
        it('should handle successful tag creation', async () => {
            // Mock successful tag creation
            const mockTagResponse = {
                name: 'test-tag',
                comment: 'Test tag comment',
                kernel_opts: 'kernel-options',
                definition: 'tag-definition'
            };
            mockMaasClient.post.mockResolvedValue(mockTagResponse);
            const params = {
                name: 'test-tag',
                comment: 'Test tag comment',
                kernel_opts: 'kernel-options',
                definition: 'tag-definition',
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockCreateTagCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            expect(mockMaasClient.post).toHaveBeenCalledWith('/tags', {
                op: 'new',
                name: 'test-tag',
                comment: 'Test tag comment',
                kernel_opts: 'kernel-options',
                definition: 'tag-definition'
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
        it('should handle tag creation with minimal parameters', async () => {
            // Mock successful tag creation
            const mockTagResponse = { name: 'minimal-tag' };
            mockMaasClient.post.mockResolvedValue(mockTagResponse);
            const params = {
                name: 'minimal-tag',
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockCreateTagCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            expect(mockMaasClient.post).toHaveBeenCalledWith('/tags', { op: 'new', name: 'minimal-tag' }, expect.any(AbortSignal));
            expect(result).toEqual({
                content: [{ type: 'text', text: JSON.stringify(mockTagResponse) }]
            });
        });
        it('should handle tag creation failure', async () => {
            // Mock failed tag creation
            const error = new Error('Tag creation failed');
            mockMaasClient.post.mockRejectedValue(error);
            const params = {
                name: 'test-tag',
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockCreateTagCallback(params, {
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
    });
    describe('maas_update_tag_nodes', () => {
        it('should register the update tag nodes tool with the MCP server', () => {
            expect(mockServer.tool).toHaveBeenCalledWith('maas_update_tag_nodes', expect.any(Object), expect.any(Object), expect.any(Function));
        });
        it('should handle successful tag nodes update with add and remove', async () => {
            // Mock successful tag nodes update
            const mockUpdateResponse = {
                updated: true,
                added_machines: ['machine-1', 'machine-2'],
                removed_machines: ['machine-3']
            };
            mockMaasClient.post.mockResolvedValue(mockUpdateResponse);
            const params = {
                tag_name: 'test-tag',
                add: ['machine-1', 'machine-2'],
                remove: ['machine-3'],
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockUpdateTagNodesCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            expect(mockMaasClient.post).toHaveBeenCalledWith('/tags/test-tag', {
                op: 'update_nodes',
                add: 'machine-1,machine-2',
                remove: 'machine-3'
            }, expect.any(AbortSignal));
            // Verify that progress notifications were called
            expect(mockSendNotification).toHaveBeenCalled();
            // Check that the start notification was sent
            expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
                call[0].params.progressToken === 'test-token' &&
                call[0].params.progress === 0 &&
                call[0].params.message === 'Starting tag node update...')).toBe(true);
            // Check that the completion notification was sent
            expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
                call[0].params.progressToken === 'test-token' &&
                call[0].params.progress === 100 &&
                call[0].params.message === 'Tag nodes updated successfully.')).toBe(true);
            expect(result).toEqual({
                content: [{ type: 'text', text: JSON.stringify(mockUpdateResponse) }]
            });
        });
        it('should handle tag nodes update with only add', async () => {
            // Mock successful tag nodes update
            const mockUpdateResponse = {
                updated: true,
                added_machines: ['machine-1', 'machine-2'],
                removed_machines: []
            };
            mockMaasClient.post.mockResolvedValue(mockUpdateResponse);
            const params = {
                tag_name: 'test-tag',
                add: ['machine-1', 'machine-2'],
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockUpdateTagNodesCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            expect(mockMaasClient.post).toHaveBeenCalledWith('/tags/test-tag', {
                op: 'update_nodes',
                add: 'machine-1,machine-2'
            }, expect.any(AbortSignal));
            expect(result).toEqual({
                content: [{ type: 'text', text: JSON.stringify(mockUpdateResponse) }]
            });
        });
        it('should handle tag nodes update with only remove', async () => {
            // Mock successful tag nodes update
            const mockUpdateResponse = {
                updated: true,
                added_machines: [],
                removed_machines: ['machine-3']
            };
            mockMaasClient.post.mockResolvedValue(mockUpdateResponse);
            const params = {
                tag_name: 'test-tag',
                remove: ['machine-3'],
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockUpdateTagNodesCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            expect(mockMaasClient.post).toHaveBeenCalledWith('/tags/test-tag', {
                op: 'update_nodes',
                remove: 'machine-3'
            }, expect.any(AbortSignal));
            expect(result).toEqual({
                content: [{ type: 'text', text: JSON.stringify(mockUpdateResponse) }]
            });
        });
        it('should handle tag nodes update failure', async () => {
            // Mock failed tag nodes update
            const error = new Error('Tag nodes update failed');
            mockMaasClient.post.mockRejectedValue(error);
            const params = {
                tag_name: 'test-tag',
                add: ['machine-1'],
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockUpdateTagNodesCallback(params, {
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
                    message: 'Error: Tag nodes update failed'
                }
            });
            expect(result).toEqual({
                content: [{ type: 'text', text: 'Error updating tag nodes: Tag nodes update failed' }],
                isError: true
            });
        });
    });
    describe('maas_delete_tag', () => {
        it('should register the delete tag tool with the MCP server', () => {
            expect(mockServer.tool).toHaveBeenCalledWith('maas_delete_tag', expect.any(Object), expect.any(Object), expect.any(Function));
        });
        it('should handle successful tag deletion', async () => {
            // Mock successful tag deletion
            mockMaasClient.delete.mockResolvedValue({});
            const params = {
                tag_name: 'test-tag',
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockDeleteTagCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            expect(mockMaasClient.delete).toHaveBeenCalledWith('/tags/test-tag', undefined, expect.any(AbortSignal));
            // Verify that progress notifications were called
            expect(mockSendNotification).toHaveBeenCalled();
            // Check that the start notification was sent
            expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
                call[0].params.progressToken === 'test-token' &&
                call[0].params.progress === 0 &&
                call[0].params.message === "Starting deletion of tag 'test-tag'...")).toBe(true);
            // Check that the completion notification was sent
            expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
                call[0].params.progressToken === 'test-token' &&
                call[0].params.progress === 100 &&
                call[0].params.message === 'Tag deleted successfully.')).toBe(true);
            expect(result).toEqual({
                content: [{ type: 'text', text: "Tag 'test-tag' deleted successfully." }]
            });
        });
        it('should handle tag deletion failure', async () => {
            // Mock failed tag deletion
            const error = new Error('Tag deletion failed');
            mockMaasClient.delete.mockRejectedValue(error);
            const params = {
                tag_name: 'test-tag',
                _meta: { progressToken: 'test-token' }
            };
            const result = await mockDeleteTagCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            expect(mockMaasClient.delete).toHaveBeenCalled();
            expect(mockSendNotification).toHaveBeenCalledWith({
                method: 'notifications/progress',
                params: {
                    progressToken: 'test-token',
                    progress: 100,
                    total: 100,
                    message: 'Error: Tag deletion failed'
                }
            });
            expect(result).toEqual({
                content: [{ type: 'text', text: 'Error deleting tag: Tag deletion failed' }],
                isError: true
            });
        });
    });
});
