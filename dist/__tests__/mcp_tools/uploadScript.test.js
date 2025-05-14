"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const uploadScript_js_1 = require("../../mcp_tools/uploadScript.js");
const multipart = __importStar(require("../../transport/multipart.js"));
const abortSignalUtils = __importStar(require("../../utils/abortSignalUtils.js"));
// Mock dependencies
jest.mock('../../maas/MaasApiClient.js');
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('../../transport/multipart.js');
jest.mock('../../utils/abortSignalUtils.js');
jest.mock('../../utils/logger.ts', () => ({
    createRequestLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }),
    default: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));
// Mock errorHandler
jest.mock('../../utils/errorHandler.js', () => ({
    errorToMcpResult: jest.fn().mockImplementation(error => ({
        content: [{ type: 'text', text: error.message || 'Error' }],
        isError: true
    })),
    handleMaasApiError: jest.fn().mockImplementation(error => error),
    handleValidationError: jest.fn().mockImplementation((message, details) => ({
        message,
        details
    })),
    ErrorType: {
        VALIDATION: 'VALIDATION',
        AUTHENTICATION: 'AUTHENTICATION',
        PERMISSION_DENIED: 'PERMISSION_DENIED',
        RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
        NETWORK_ERROR: 'NETWORK_ERROR',
        OPERATION_ABORTED: 'OPERATION_ABORTED',
        INTERNAL_ERROR: 'INTERNAL_ERROR'
    },
    MaasServerError: jest.fn().mockImplementation((message, type, status) => ({
        message,
        type,
        status
    }))
}));
// Mock errorMessages
jest.mock('../../utils/errorMessages.js', () => ({
    ErrorMessages: {
        missingParameter: jest.fn().mockImplementation(param => `Missing parameter: ${param}`),
        invalidParameter: jest.fn().mockImplementation((param, reason) => `Invalid parameter ${param}: ${reason}`),
        authenticationFailed: jest.fn().mockImplementation(detail => `Authentication failed: ${detail}`),
        permissionDenied: jest.fn().mockImplementation((action, resource, id) => `Permission denied to ${action} ${resource} ${id}`),
        resourceExists: jest.fn().mockImplementation((type, id) => `${type} ${id} already exists`),
        resourceNotFound: jest.fn().mockImplementation((type, id) => `${type} ${id} not found`),
        networkError: jest.fn().mockImplementation(detail => `Network error: ${detail}`)
    }
}));
describe('uploadScript', () => {
    let mockServer;
    let mockMaasClient;
    let mockSendNotification;
    let mockToolCallback;
    let mockFormData;
    let mockDerivedSignal;
    let mockUnregisterCleanup;
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup mock server
        mockServer = {
            tool: jest.fn(),
        };
        // Setup mock MAAS client
        mockMaasClient = {
            postMultipart: jest.fn(),
        };
        // Setup mock send notification
        mockSendNotification = jest.fn();
        // Setup mock form data
        mockFormData = {
            append: jest.fn(),
            getHeaders: jest.fn().mockReturnValue({ 'Content-Type': 'multipart/form-data' })
        };
        // Mock multipart functions
        multipart.createMultipartFormData.mockReturnValue(mockFormData);
        // Mock abort signal utils
        mockDerivedSignal = new AbortController().signal;
        mockUnregisterCleanup = jest.fn();
        abortSignalUtils.createDerivedSignal.mockReturnValue(mockDerivedSignal);
        abortSignalUtils.onAbort.mockReturnValue(mockUnregisterCleanup);
        abortSignalUtils.isAbortError.mockImplementation((error) => {
            return error.name === 'AbortError';
        });
        // Register the tool
        (0, uploadScript_js_1.registerUploadScriptTool)(mockServer, mockMaasClient);
        // Capture the tool callback
        mockToolCallback = mockServer.tool.mock.calls[0][2];
    });
    it('should register the tool with the MCP server', () => {
        expect(mockServer.tool).toHaveBeenCalledWith('maas_upload_script', expect.any(Object), expect.any(Function));
    });
    it('should handle successful script upload with minimal parameters', async () => {
        // Mock successful script upload
        const mockUploadResponse = {
            id: 123,
            name: 'test-script',
            script_type: 'commissioning'
        };
        mockMaasClient.postMultipart.mockResolvedValue(mockUploadResponse);
        const scriptContent = '#!/bin/bash\necho "Hello, World!"';
        const params = {
            name: 'test-script',
            script_type: 'commissioning',
            script_content: scriptContent,
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify derived signal was created
        expect(abortSignalUtils.createDerivedSignal).toHaveBeenCalledWith(expect.any(AbortSignal), expect.objectContaining({
            timeout: 120000, // 2 minutes
            reason: 'Script upload timed out after 2 minutes',
            operationName: 'maas_upload_script'
        }));
        // Verify multipart form data creation
        expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.objectContaining({
            fieldName: 'script',
            fileName: 'test-script.sh',
            fileContent: scriptContent,
            contentType: 'text/x-shellscript',
            maxSizeBytes: 1048576, // 1MB
            allowedTypes: ['text/x-shellscript', 'text/plain']
        }), {
            name: 'test-script',
            script_type: 'commissioning'
        });
        // Verify API call
        expect(mockMaasClient.postMultipart).toHaveBeenCalledWith('/scripts', mockFormData, mockDerivedSignal);
        // Verify progress notifications
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 0,
                total: 100,
                message: "Starting upload of script 'test-script'..."
            }
        });
        // Verify that progress notifications were called
        expect(mockSendNotification).toHaveBeenCalled();
        // Check that the start notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 0 &&
            call[0].params.message === "Starting upload of script 'test-script'...")).toBe(true);
        // Check that the completion notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 100 &&
            call[0].params.message === 'Script uploaded successfully.')).toBe(true);
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Script uploaded successfully.'
            }
        });
        // Verify cleanup was unregistered
        expect(mockUnregisterCleanup).toHaveBeenCalled();
        // Verify result
        expect(result).toEqual({
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        message: "Script 'test-script' uploaded successfully",
                        id: 123
                    })
                }]
        });
    });
    it('should handle script upload with all optional parameters', async () => {
        // Mock successful script upload
        const mockUploadResponse = { id: 123, name: 'test-script' };
        mockMaasClient.postMultipart.mockResolvedValue(mockUploadResponse);
        const scriptContent = '#!/bin/bash\necho "Hello, World!"';
        const params = {
            name: 'test-script',
            description: 'Test script description',
            tags: 'tag1,tag2',
            script_type: 'testing',
            script_content: scriptContent,
            timeout: 300,
            parallel: true,
            hardware_type: 'cpu',
            for_hardware: 'intel',
            _meta: { progressToken: 'test-token' }
        };
        await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify all fields were included
        expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.any(Object), {
            name: 'test-script',
            description: 'Test script description',
            tags: 'tag1,tag2',
            script_type: 'testing',
            timeout: '300',
            parallel: 'true',
            hardware_type: 'cpu',
            for_hardware: 'intel'
        });
    });
    it('should handle script upload with different script types', async () => {
        // Test different script types
        const scriptTypes = ['commissioning', 'testing'];
        for (const type of scriptTypes) {
            jest.clearAllMocks();
            mockMaasClient.postMultipart.mockResolvedValue({ id: 123, name: 'test-script' });
            const params = {
                name: `test-script-${type}`,
                script_type: type,
                script_content: '#!/bin/bash\necho "Hello, World!"',
                _meta: { progressToken: 'test-token' }
            };
            await mockToolCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            // Verify correct script type was used
            expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
                script_type: type
            }));
        }
    });
    it('should handle script upload with different hardware types', async () => {
        // Test different hardware types
        const hardwareTypes = ['node', 'cpu', 'memory', 'storage'];
        for (const type of hardwareTypes) {
            jest.clearAllMocks();
            mockMaasClient.postMultipart.mockResolvedValue({ id: 123, name: 'test-script' });
            const params = {
                name: `test-script-${type}`,
                script_type: 'testing',
                script_content: '#!/bin/bash\necho "Hello, World!"',
                hardware_type: type,
                _meta: { progressToken: 'test-token' }
            };
            await mockToolCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            // Verify correct hardware type was used
            expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
                hardware_type: type
            }));
        }
    });
    it('should handle aborted script upload', async () => {
        // Create an aborted signal
        const controller = new AbortController();
        controller.abort('User cancelled');
        // Mock abort error
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        mockMaasClient.postMultipart.mockRejectedValue(abortError);
        abortSignalUtils.isAbortError.mockReturnValue(true);
        const params = {
            name: 'test-script',
            script_type: 'commissioning',
            script_content: '#!/bin/bash\necho "Hello, World!"',
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: controller.signal,
            sendNotification: mockSendNotification
        });
        // Verify that progress notifications were called
        expect(mockSendNotification).toHaveBeenCalled();
        // Check that the abort notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 100 &&
            call[0].params.message === 'Upload aborted: The operation was aborted')).toBe(true);
        expect(result).toEqual({
            content: [{
                    type: 'text',
                    text: expect.stringContaining('was aborted')
                }],
            isError: true
        });
    });
    it('should handle validation errors', async () => {
        // Mock validation error
        const validationError = new Error('Invalid parameter');
        mockMaasClient.postMultipart.mockRejectedValue(validationError);
        // Test with missing parameters
        const params = {
            name: 'test-script',
            script_type: 'commissioning',
            script_content: '', // Empty script content
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify error handling
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Error: Invalid parameter'
            }
        });
        expect(result).toEqual(expect.objectContaining({
            content: expect.any(Array),
            isError: true
        }));
        // Verify the content contains an error message
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Missing parameter');
    });
    it('should handle file size errors', async () => {
        // Mock file size error
        const sizeError = new Error('File size exceeds maximum allowed size');
        multipart.createMultipartFormData.mockImplementationOnce(() => {
            throw sizeError;
        });
        const params = {
            name: 'test-script',
            script_type: 'commissioning',
            script_content: '#!/bin/bash\necho "Hello, World!"',
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify error handling
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Error: File size exceeds maximum allowed size'
            }
        });
        expect(result).toEqual(expect.objectContaining({
            content: expect.any(Array),
            isError: true
        }));
        // Verify the content contains an error message
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('File size exceeds');
    });
    it('should handle conflict errors when script already exists', async () => {
        // Mock conflict error
        const conflictError = new Error('Script already exists');
        conflictError.status = 409;
        mockMaasClient.postMultipart.mockRejectedValue(conflictError);
        const params = {
            name: 'test-script',
            script_type: 'commissioning',
            script_content: '#!/bin/bash\necho "Hello, World!"',
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify error handling
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Error: Script already exists'
            }
        });
        expect(result).toEqual({
            content: expect.arrayContaining([
                expect.objectContaining({
                    type: 'text',
                    text: expect.stringContaining('already exists')
                })
            ]),
            isError: true
        });
    });
    it('should handle authentication errors', async () => {
        // Mock authentication error
        const authError = new Error('Authentication failed');
        authError.status = 401;
        mockMaasClient.postMultipart.mockRejectedValue(authError);
        const params = {
            name: 'test-script',
            script_type: 'commissioning',
            script_content: '#!/bin/bash\necho "Hello, World!"',
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify error handling
        expect(result).toEqual({
            content: expect.arrayContaining([
                expect.objectContaining({
                    type: 'text',
                    text: expect.stringContaining('Authentication failed')
                })
            ]),
            isError: true
        });
    });
});
