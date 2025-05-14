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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// AT THE VERY TOP OF THE FILE
const MOCK_SYSTEM_ID_FOR_URI_MOCK = 'fixed-mock-system-id-for-uri-pattern-tests';
// Using actual string values for patterns that the mock will use internally for matching
const ACTUAL_MACHINE_DETAILS_URI_PATTERN_FOR_MOCK = 'maas://machine/{system_id}/details';
const ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK = 'maas://machines/list';
jest.doMock('../../mcp_resources/schemas/uriPatterns.js', () => {
    const actualPatternsModule = jest.requireActual('../../mcp_resources/schemas/uriPatterns.js');
    return {
        ...actualPatternsModule,
        // Ensure the mock uses consistent pattern strings for its logic
        MACHINE_DETAILS_URI_PATTERN: ACTUAL_MACHINE_DETAILS_URI_PATTERN_FOR_MOCK,
        MACHINES_LIST_URI_PATTERN: ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK,
        extractParamsFromUri: jest.fn((uri, pattern) => {
            if (pattern === ACTUAL_MACHINE_DETAILS_URI_PATTERN_FOR_MOCK && uri.includes(MOCK_SYSTEM_ID_FOR_URI_MOCK)) {
                return { system_id: MOCK_SYSTEM_ID_FOR_URI_MOCK };
            }
            if (pattern === ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK) {
                const params = {};
                const searchParams = new URL(uri).searchParams;
                searchParams.forEach((value, key) => {
                    params[key] = value;
                });
                return params;
            }
            return actualPatternsModule.extractParamsFromUri(uri, pattern);
        }),
    };
});
// THEN ALL OTHER IMPORTS
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const MachineResourceHandler_js_1 = require("../../mcp_resources/handlers/MachineResourceHandler.js");
const index_js_1 = require("../../mcp_resources/schemas/index.js");
const maas_ts_1 = require("../../types/maas.ts");
const mockMaasApiClient_js_1 = require("../mocks/mockMaasApiClient.js");
const cacheManager_js_1 = require("../../mcp_resources/cache/cacheManager.js");
const auditLogger_js_1 = __importDefault(require("../../utils/auditLogger.js"));
const logger_ts_1 = __importDefault(require("../../utils/logger.ts"));
const resourceUtilsActual = __importStar(require("../../mcp_resources/utils/resourceUtils.js")); // Import actuals for specific mocks
const zod_1 = require("zod");
// Mock other dependencies (ensure these are basic mocks or controlled)
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
    McpServer: jest.fn(),
    ResourceTemplate: jest.fn().mockImplementation((pattern) => ({
        pattern,
        completeCallback: jest.fn()
    })),
}));
jest.mock('../../maas/MaasApiClient.js');
jest.mock('../../mcp_resources/cache/cacheManager.js');
jest.mock('../../utils/auditLogger.js');
jest.mock('../../utils/logger.ts');
jest.mock('../../config.js', () => ({
    cacheEnabled: true,
    auditLogEnabled: true,
    maasApiUrl: 'https://example.com/MAAS/api/2.0',
    maasApiKey: 'mock-api-key',
    logLevel: 'info',
    nodeEnv: 'test',
}));
// Mock resourceUtils but allow specific functions to use actual implementations
jest.mock('../../mcp_resources/utils/resourceUtils.js');
// Define MaasMachinesArraySchema locally for tests
const MaasMachinesArraySchema = zod_1.z.array(index_js_1.MaasMachineSchema);
describe('Machine Resource Handlers', () => {
    let mockMcpServer;
    let mockMaasApiClient;
    let mockCacheManagerInstance;
    // Use the MOCK_SYSTEM_ID_FOR_URI_MOCK for consistency with the doMock
    const systemIdForDetailsTest = MOCK_SYSTEM_ID_FOR_URI_MOCK;
    // Use the patterns defined for the mock for constructing URIs in tests
    const machineDetailsUri = new URL(`maas://machine/${systemIdForDetailsTest}/details`);
    const machinesListUri = new URL(ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK);
    beforeEach(async () => {
        jest.clearAllMocks();
        // Import the mocked uriPatterns module to get its (potentially overridden) exports
        // This ensures that MACHINE_DETAILS_URI_PATTERN used by the handler constructor is the one from the mock
        const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
        // Setup mocks for resourceUtils to use actual implementations for some functions
        // Import the mocked version of resourceUtils
        const mockedResourceUtils = await import('../../mcp_resources/utils/resourceUtils.js');
        mockedResourceUtils.extractAndValidateParams.mockImplementation(resourceUtilsActual.extractAndValidateParams);
        mockedResourceUtils.validateResourceData.mockImplementation(resourceUtilsActual.validateResourceData);
        // Properly type the mock function
        const handleFetchErrorMock = mockedResourceUtils.handleResourceFetchError;
        handleFetchErrorMock.mockImplementation(resourceUtilsActual.handleResourceFetchError);
        mockMcpServer = {
            resource: jest.fn(),
        };
        mockMaasApiClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)();
        mockCacheManagerInstance = {
            get: jest.fn(),
            set: jest.fn(),
            generateCacheKey: jest.fn((prefix, uri, params, opts) => `${prefix}-${uri.toString()}-${JSON.stringify(params)}-${JSON.stringify(opts)}`),
            isEnabled: jest.fn(() => true),
            getResourceTTL: jest.fn(() => 300),
            invalidateResource: jest.fn(),
        };
        cacheManager_js_1.CacheManager.getInstance.mockReturnValue(mockCacheManagerInstance);
        // Config is already mocked at the top level
    });
    describe('MachineDetailsResourceHandler', () => {
        let handler;
        let registeredCallback;
        beforeEach(async () => {
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            handler = new MachineResourceHandler_js_1.MachineDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
            handler.register('maas_machine_details');
            if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
                // Use unknown as an intermediate type for safer casting
                registeredCallback = mockMcpServer.resource.mock.calls[0][2];
            }
            else {
                throw new Error("MCP resource handler not registered or mock.calls structure is unexpected.");
            }
        });
        it('should register with correct parameters', async () => {
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js'); // get mocked value
            expect(mcp_js_1.ResourceTemplate).toHaveBeenCalledWith(mockedUriPatterns.MACHINE_DETAILS_URI_PATTERN, { list: undefined });
            expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machine_details', expect.any(mcp_js_1.ResourceTemplate), expect.any(Function));
        });
        it('should fetch machine details successfully', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockMaasApiClient_js_1.mockMachine);
            const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
            expect(mockMaasApiClient.get).toHaveBeenCalledWith(`/machines/${systemIdForDetailsTest}`, undefined, expect.any(AbortSignal));
            expect(result.contents[0].text).toBe(JSON.stringify(mockMaasApiClient_js_1.mockMachine));
            expect(mockCacheManagerInstance.set).toHaveBeenCalled();
            expect(auditLogger_js_1.default.logResourceAccess).toHaveBeenCalledTimes(2);
        });
        it('should use cache if available', async () => {
            mockCacheManagerInstance.get.mockReturnValue(mockMaasApiClient_js_1.mockMachine);
            const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
            expect(mockCacheManagerInstance.get).toHaveBeenCalled();
            expect(mockMaasApiClient.get).not.toHaveBeenCalled();
            expect(result.contents[0].text).toBe(JSON.stringify(mockMaasApiClient_js_1.mockMachine));
            expect(auditLogger_js_1.default.logCacheOperation).toHaveBeenCalledWith('Machine', 'hit', expect.any(String), systemIdForDetailsTest, expect.any(Object));
        });
        it('should handle API error', async () => {
            const apiError = new maas_ts_1.MaasApiError('API Down', 503, 'service_unavailable');
            mockMaasApiClient.get.mockRejectedValue(apiError);
            await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal })).rejects.toThrow(apiError);
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
        it('should handle parameter validation error for missing system_id', async () => {
            const patternsModule = await import('../../mcp_resources/schemas/uriPatterns.js');
            patternsModule.extractParamsFromUri.mockReturnValueOnce({});
            const invalidUri = new URL('maas://machine//details');
            try {
                await registeredCallback(invalidUri, {}, { signal: new AbortController().signal });
            }
            catch (e) {
                expect(e).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(e.message).toMatch(/Invalid parameters for Machine request/);
            }
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
        it('should handle data validation error', async () => {
            const malformedMachineData = { ...mockMaasApiClient_js_1.mockMachine, system_id: undefined };
            mockMaasApiClient.get.mockResolvedValue(malformedMachineData);
            try {
                await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
            }
            catch (e) {
                expect(e).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(e.message).toMatch(/Machine data validation failed/);
                expect(e.details?.zodErrors).toBeDefined();
            }
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
    });
    describe('MachinesListResourceHandler', () => {
        let handler;
        let registeredCallback;
        beforeEach(async () => {
            await import('../../mcp_resources/schemas/uriPatterns.js');
            handler = new MachineResourceHandler_js_1.MachinesListResourceHandler(mockMcpServer, mockMaasApiClient);
            handler.register('maas_machines_list');
            if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
                // Use unknown as an intermediate type for safer casting
                registeredCallback = mockMcpServer.resource.mock.calls[0][2];
            }
            else {
                throw new Error("MCP list resource handler not registered or mock.calls structure is unexpected.");
            }
        });
        it('should register with correct parameters', async () => {
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            expect(mcp_js_1.ResourceTemplate).toHaveBeenCalledWith(mockedUriPatterns.MACHINES_LIST_URI_PATTERN, { list: undefined });
            expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machines_list', expect.any(mcp_js_1.ResourceTemplate), expect.any(Function));
        });
        it('should fetch machines list successfully', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockMaasApiClient_js_1.mockMachines);
            const result = await registeredCallback(machinesListUri, {}, { signal: new AbortController().signal });
            expect(mockMaasApiClient.get).toHaveBeenCalledWith('/machines', {}, expect.any(AbortSignal));
            expect(result.contents[0].text).toBe(JSON.stringify(mockMaasApiClient_js_1.mockMachines));
            expect(mockCacheManagerInstance.set).toHaveBeenCalled();
        });
        it('should fetch machines list with query parameters', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockMaasApiClient_js_1.mockMachines);
            const queryParams = { hostname: 'test', status: 'Ready', limit: '10' };
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            const listUriWithParams = new URL(mockedUriPatterns.MACHINES_LIST_URI_PATTERN + '?hostname=test&status=Ready&limit=10');
            await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
            const expectedMaasQueryParams = { hostname: 'test', status: 'Ready', limit: '10' };
            expect(mockMaasApiClient.get).toHaveBeenCalledWith('/machines', expect.objectContaining(expectedMaasQueryParams), expect.any(AbortSignal));
        });
        it('should invalidate cache if filter parameters change (simulated)', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockMaasApiClient_js_1.mockMachines);
            const queryParams = { hostname: 'filter-change-test' };
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            const listUriWithParams = new URL(mockedUriPatterns.MACHINES_LIST_URI_PATTERN + '?hostname=filter-change-test');
            const invalidateCacheSpy = jest.spyOn(handler, 'invalidateCache');
            await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
            expect(invalidateCacheSpy).toHaveBeenCalled();
            invalidateCacheSpy.mockRestore();
        });
    });
    describe('registerMachineResources', () => {
        it('should register both machine details and list handlers', () => {
            (0, MachineResourceHandler_js_1.registerMachineResources)(mockMcpServer, mockMaasApiClient);
            expect(mockMcpServer.resource).toHaveBeenCalledTimes(2);
            expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machine_details', expect.any(mcp_js_1.ResourceTemplate), expect.any(Function));
            expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machines_list', expect.any(mcp_js_1.ResourceTemplate), expect.any(Function));
            expect(logger_ts_1.default.info).toHaveBeenCalledWith('Registered machine resources with caching:', expect.any(Object));
        });
    });
});
