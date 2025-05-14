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
const uploadImage_js_1 = require("../../mcp_tools/uploadImage.js");
const multipart = __importStar(require("../../transport/multipart.js"));
const abortSignalUtils = __importStar(require("../../utils/abortSignalUtils.js"));
const timeoutHelpers_js_1 = require("../utils/timeoutHelpers.js");
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
describe('uploadImage', () => {
    // Apply a long timeout to all tests in this suite
    (0, timeoutHelpers_js_1.applyLongTimeout)();
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
        (0, uploadImage_js_1.registerUploadImageTool)(mockServer, mockMaasClient);
        // Capture the tool callback
        mockToolCallback = mockServer.tool.mock.calls[0][2];
    });
    (0, timeoutHelpers_js_1.mediumTest)('should register the tool with the MCP server', () => {
        expect(mockServer.tool).toHaveBeenCalledWith('maas_upload_image', expect.any(Object), expect.any(Function));
    });
    (0, timeoutHelpers_js_1.longTest)('should handle successful image upload with base64 content', async () => {
        // Mock successful image upload
        const mockUploadResponse = {
            id: 123,
            name: 'test-image',
            architecture: 'amd64',
            type: 'boot-kernel'
        };
        mockMaasClient.postMultipart.mockResolvedValue(mockUploadResponse);
        // Base64 encoded "test"
        const base64Content = 'dGVzdA==';
        const params = {
            name: 'test-image',
            architecture: 'amd64',
            image_type: 'boot-kernel',
            image_content: base64Content,
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify derived signal was created
        expect(abortSignalUtils.createDerivedSignal).toHaveBeenCalledWith(expect.any(AbortSignal), expect.objectContaining({
            timeout: 300000,
            reason: 'Image upload timed out after 5 minutes',
            operationName: 'maas_upload_image'
        }));
        // Verify that progress notifications were called
        expect(mockSendNotification).toHaveBeenCalled();
        // Check that the start notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 0 &&
            call[0].params.message === "Starting upload of boot image 'test-image'...")).toBe(true);
        // Check that the completion notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 100 &&
            call[0].params.message === 'Boot image uploaded successfully.')).toBe(true);
        // Verify multipart form data creation
        expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.objectContaining({
            fieldName: 'file',
            fileName: 'test-image',
            fileContent: expect.any(Buffer),
            contentType: 'application/x-kernel',
            maxSizeBytes: 104857600, // 100MB
            allowedTypes: expect.arrayContaining([
                'application/octet-stream',
                'application/x-kernel'
            ])
        }), {
            name: 'test-image',
            architecture: 'amd64',
            type: 'boot-kernel'
        });
        // Verify API call
        expect(mockMaasClient.postMultipart).toHaveBeenCalledWith('/boot-resources/', mockFormData, mockDerivedSignal);
        // Verify progress notifications
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 0,
                total: 100,
                message: "Starting upload of boot image 'test-image'..."
            }
        });
        expect(mockSendNotification).toHaveBeenCalledWith({
            method: 'notifications/progress',
            params: {
                progressToken: 'test-token',
                progress: 100,
                total: 100,
                message: 'Boot image uploaded successfully.'
            }
        });
        // Verify cleanup was unregistered
        expect(mockUnregisterCleanup).toHaveBeenCalled();
        // Verify result
        expect(result).toEqual({
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        message: "Boot image 'test-image' uploaded successfully",
                        id: 123
                    })
                }]
        });
    });
    (0, timeoutHelpers_js_1.longTest)('should handle successful image upload with raw content', async () => {
        // Mock successful image upload
        const mockUploadResponse = {
            id: 123,
            name: 'test-image',
            architecture: 'amd64',
            type: 'boot-kernel'
        };
        mockMaasClient.postMultipart.mockResolvedValue(mockUploadResponse);
        // Non-base64 content
        const rawContent = 'This is raw content with special chars: !@#$%^&*()';
        const params = {
            name: 'test-image',
            architecture: 'amd64',
            image_type: 'boot-kernel',
            image_content: rawContent,
            _meta: { progressToken: 'test-token' }
        };
        const result = await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify that progress notifications were called
        expect(mockSendNotification).toHaveBeenCalled();
        // Check that the start notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 0 &&
            call[0].params.message === "Starting upload of boot image 'test-image'...")).toBe(true);
        // Check that the completion notification was sent
        expect(mockSendNotification.mock.calls.some(call => call[0].method === 'notifications/progress' &&
            call[0].params.progressToken === 'test-token' &&
            call[0].params.progress === 100 &&
            call[0].params.message === 'Boot image uploaded successfully.')).toBe(true);
        // Verify multipart form data creation with raw content
        expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.objectContaining({
            fileContent: rawContent
        }), expect.any(Object));
        // Verify result
        expect(result).toEqual({
            content: [{
                    type: 'text',
                    text: expect.any(String)
                }]
        });
    });
    (0, timeoutHelpers_js_1.longTest)('should handle image upload with all optional parameters', async () => {
        // Mock successful image upload
        const mockUploadResponse = { id: 123, name: 'test-image' };
        mockMaasClient.postMultipart.mockResolvedValue(mockUploadResponse);
        const params = {
            name: 'test-image',
            architecture: 'amd64',
            image_type: 'boot-kernel',
            image_content: 'dGVzdA==', // base64 "test"
            filetype: 'tgz',
            subarchitecture: 'generic',
            supported_subarches: 'generic,hwe',
            release: 'jammy',
            label: 'test-label',
            _meta: { progressToken: 'test-token' }
        };
        await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify all fields were included
        expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.any(Object), {
            name: 'test-image',
            architecture: 'amd64',
            type: 'boot-kernel',
            filetype: 'tgz',
            subarchitecture: 'generic',
            supported_subarches: 'generic,hwe',
            release: 'jammy',
            label: 'test-label'
        });
    });
    (0, timeoutHelpers_js_1.longTest)('should handle different image types with correct content types', async () => {
        // Test different image types
        const imageTypes = [
            { type: 'boot-kernel', contentType: 'application/x-kernel' },
            { type: 'boot-initrd', contentType: 'application/x-initrd' },
            { type: 'boot-dtb', contentType: 'application/x-dtb' },
            { type: 'squashfs', contentType: 'application/vnd.squashfs' }
        ];
        for (const { type, contentType } of imageTypes) {
            jest.clearAllMocks();
            mockMaasClient.postMultipart.mockResolvedValue({ id: 123, name: 'test-image' });
            const params = {
                name: `test-image-${type}`,
                architecture: 'amd64',
                image_type: type,
                image_content: 'dGVzdA==',
                _meta: { progressToken: 'test-token' }
            };
            await mockToolCallback(params, {
                signal: new AbortController().signal,
                sendNotification: mockSendNotification
            });
            // Verify correct content type was used
            expect(multipart.createMultipartFormData).toHaveBeenCalledWith(expect.objectContaining({
                contentType: contentType
            }), expect.any(Object));
        }
    });
    (0, timeoutHelpers_js_1.longTest)('should handle aborted image upload', async () => {
        // Create an aborted signal
        const controller = new AbortController();
        controller.abort('User cancelled');
        // Mock abort error
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        mockMaasClient.postMultipart.mockRejectedValue(abortError);
        abortSignalUtils.isAbortError.mockReturnValue(true);
        const params = {
            name: 'test-image',
            architecture: 'amd64',
            image_type: 'boot-kernel',
            image_content: 'dGVzdA==',
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
    (0, timeoutHelpers_js_1.longTest)('should handle validation errors', async () => {
        // Mock validation error
        const validationError = new Error('Invalid parameter');
        mockMaasClient.postMultipart.mockRejectedValue(validationError);
        // Test with missing parameters
        const params = {
            name: 'test-image',
            architecture: '', // Empty architecture
            image_type: 'boot-kernel',
            image_content: 'dGVzdA==',
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
    (0, timeoutHelpers_js_1.longTest)('should handle base64 decoding errors', async () => {
        // Mock base64 decoding error
        const base64Error = new Error('Invalid base64 encoding');
        // Make Buffer.from throw an error for this test
        jest.spyOn(Buffer, 'from').mockImplementationOnce(() => {
            throw base64Error;
        });
        const params = {
            name: 'test-image',
            architecture: 'amd64',
            image_type: 'boot-kernel',
            image_content: 'invalid-base64===',
            _meta: { progressToken: 'test-token' }
        };
        await mockToolCallback(params, {
            signal: new AbortController().signal,
            sendNotification: mockSendNotification
        });
        // Verify that progress notifications were called
        expect(mockSendNotification).toHaveBeenCalled();
    });
    (0, timeoutHelpers_js_1.longTest)('should handle file size errors', async () => {
        // Mock file size error
        const sizeError = new Error('File size exceeds maximum allowed size');
        multipart.createMultipartFormData.mockImplementationOnce(() => {
            throw sizeError;
        });
        const params = {
            name: 'test-image',
            architecture: 'amd64',
            image_type: 'boot-kernel',
            image_content: 'dGVzdA==',
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
});
