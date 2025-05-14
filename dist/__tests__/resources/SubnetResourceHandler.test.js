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
// Top-level constants for mocking
const MOCK_SUBNET_ID_FOR_URI_MOCK = 'fixed-mock-subnet-id'; // e.g., '10' for subnet ID
const ACTUAL_SUBNET_DETAILS_URI_PATTERN_FOR_MOCK = 'maas://subnet/{subnet_id}/details';
const ACTUAL_SUBNETS_LIST_URI_PATTERN_FOR_MOCK = 'maas://subnets/list';
jest.doMock('../../mcp_resources/schemas/uriPatterns.js', () => {
    const actualPatternsModule = jest.requireActual('../../mcp_resources/schemas/uriPatterns.js');
    return {
        ...actualPatternsModule,
        SUBNET_DETAILS_URI_PATTERN: ACTUAL_SUBNET_DETAILS_URI_PATTERN_FOR_MOCK,
        SUBNETS_LIST_URI_PATTERN: ACTUAL_SUBNETS_LIST_URI_PATTERN_FOR_MOCK,
        extractParamsFromUri: jest.fn((uri, pattern) => {
            if (pattern === ACTUAL_SUBNET_DETAILS_URI_PATTERN_FOR_MOCK && uri.includes(MOCK_SUBNET_ID_FOR_URI_MOCK)) {
                return { subnet_id: MOCK_SUBNET_ID_FOR_URI_MOCK };
            }
            if (pattern === ACTUAL_SUBNETS_LIST_URI_PATTERN_FOR_MOCK) {
                const params = {};
                new URL(uri).searchParams.forEach((value, key) => { params[key] = value; });
                return params;
            }
            return actualPatternsModule.extractParamsFromUri(uri, pattern);
        }),
    };
});
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const SubnetResourceHandler_js_1 = require("../../mcp_resources/handlers/SubnetResourceHandler.js");
const index_js_1 = require("../../mcp_resources/schemas/index.js");
const maas_ts_1 = require("../../types/maas.ts");
const mockMaasApiClient_js_1 = require("../mocks/mockMaasApiClient.js");
const cacheManager_js_1 = require("../../mcp_resources/cache/cacheManager.js");
const auditLogger_js_1 = __importDefault(require("../../utils/auditLogger.js"));
const logger_ts_1 = __importDefault(require("../../utils/logger.ts"));
const resourceUtilsActual = __importStar(require("../../mcp_resources/utils/resourceUtils.js"));
const zod_1 = require("zod");
// Mock dependencies
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
jest.mock('../../mcp_resources/utils/resourceUtils.js');
// Define SubnetsArraySchema locally for tests
const MaasSubnetsArraySchema = zod_1.z.array(index_js_1.MaasSubnetSchema);
// Mock subnet data
const mockSubnet = {
    id: 10, // Example ID
    name: '10.0.0.0/24',
    cidr: '10.0.0.0/24',
    vid: 0,
    vlan: { name: 'untagged', vid: 0, fabric_id: 1, fabric: 'fabric-0', id: 1, mtu: 1500, dhcp_on: true, external_dhcp: null, relay_vlan: null, secondary_rack: null, space: 'default' },
    // Add other subnet-specific fields
};
const mockSubnets = [mockSubnet, { ...mockSubnet, id: 11, name: '192.168.1.0/24', cidr: '192.168.1.0/24' }];
describe('Subnet Resource Handlers', () => {
    let mockMcpServer;
    let mockMaasApiClient;
    let mockCacheManagerInstance;
    const subnetDetailsUri = new URL(`maas://subnet/${MOCK_SUBNET_ID_FOR_URI_MOCK}/details`);
    const subnetsListUri = new URL(ACTUAL_SUBNETS_LIST_URI_PATTERN_FOR_MOCK);
    beforeEach(async () => {
        jest.clearAllMocks();
        await import('../../mcp_resources/schemas/uriPatterns.js');
        const mockedResourceUtils = await import('../../mcp_resources/utils/resourceUtils.js');
        mockedResourceUtils.extractAndValidateParams.mockImplementation(resourceUtilsActual.extractAndValidateParams);
        mockedResourceUtils.validateResourceData.mockImplementation(resourceUtilsActual.validateResourceData);
        const handleFetchErrorMock = mockedResourceUtils.handleResourceFetchError;
        handleFetchErrorMock.mockImplementation(resourceUtilsActual.handleResourceFetchError);
        mockMcpServer = { resource: jest.fn() };
        mockMaasApiClient = (0, mockMaasApiClient_js_1.createMockMaasApiClient)();
        mockCacheManagerInstance = {
            get: jest.fn(), set: jest.fn(),
            generateCacheKey: jest.fn((p, u, params, o) => `${p}-${u}-${JSON.stringify(params)}-${JSON.stringify(o)}`),
            isEnabled: jest.fn(() => true), getResourceTTL: jest.fn(() => 300), invalidateResource: jest.fn(),
        };
        cacheManager_js_1.CacheManager.getInstance.mockReturnValue(mockCacheManagerInstance);
        // Config is already mocked at the top level
    });
    describe('SubnetDetailsResourceHandler', () => {
        let handler;
        let registeredCallback;
        beforeEach(async () => {
            await import('../../mcp_resources/schemas/uriPatterns.js');
            handler = new SubnetResourceHandler_js_1.SubnetDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
            handler.register('maas_subnet_details');
            if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
                // Use unknown as an intermediate type for safer casting
                registeredCallback = mockMcpServer.resource.mock.calls[0][2];
            }
            else {
                throw new Error("SubnetDetails handler not registered.");
            }
        });
        it('should register with correct parameters', async () => {
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            expect(mcp_js_1.ResourceTemplate).toHaveBeenCalledWith(mockedUriPatterns.SUBNET_DETAILS_URI_PATTERN, { list: undefined });
            expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_subnet_details', expect.any(mcp_js_1.ResourceTemplate), expect.any(Function));
        });
        it('should fetch subnet details successfully', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockSubnet);
            const result = await registeredCallback(subnetDetailsUri, { subnet_id: MOCK_SUBNET_ID_FOR_URI_MOCK }, { signal: new AbortController().signal });
            expect(mockMaasApiClient.get).toHaveBeenCalledWith(`/subnets/${MOCK_SUBNET_ID_FOR_URI_MOCK}`, undefined, expect.any(AbortSignal));
            expect(result.contents[0].text).toBe(JSON.stringify(mockSubnet));
            expect(mockCacheManagerInstance.set).toHaveBeenCalled();
            expect(mockCacheManagerInstance.set).toHaveBeenCalled();
            expect(auditLogger_js_1.default.logResourceAccess).toHaveBeenCalledTimes(2);
        });
        // Cache utilization test
        it('should use cache if available for subnet details', async () => {
            mockCacheManagerInstance.get.mockReturnValue(mockSubnet);
            const result = await registeredCallback(subnetDetailsUri, { subnet_id: MOCK_SUBNET_ID_FOR_URI_MOCK }, { signal: new AbortController().signal });
            expect(mockCacheManagerInstance.get).toHaveBeenCalled();
            expect(mockMaasApiClient.get).not.toHaveBeenCalled();
            expect(result.contents[0].text).toBe(JSON.stringify(mockSubnet));
            expect(auditLogger_js_1.default.logCacheOperation).toHaveBeenCalledWith('Subnet', 'hit', expect.any(String), MOCK_SUBNET_ID_FOR_URI_MOCK, expect.any(Object));
        });
        // Error handling test
        it('should handle API error for subnet details', async () => {
            const apiError = new maas_ts_1.MaasApiError('Subnet API Error', 500, 'subnet_error');
            mockMaasApiClient.get.mockRejectedValue(apiError);
            await expect(registeredCallback(subnetDetailsUri, { subnet_id: MOCK_SUBNET_ID_FOR_URI_MOCK }, { signal: new AbortController().signal })).rejects.toThrow(apiError);
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
        // Parameter validation test
        it('should handle parameter validation error for missing subnet_id', async () => {
            const patternsModule = await import('../../mcp_resources/schemas/uriPatterns.js');
            patternsModule.extractParamsFromUri.mockReturnValueOnce({});
            const invalidUri = new URL('maas://subnet//details');
            try {
                await registeredCallback(invalidUri, {}, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (e) {
                expect(e).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(e.message).toMatch(/Invalid parameters for Subnet request/);
            }
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
        // Data validation test
        it('should handle data validation error', async () => {
            const malformedSubnetData = { ...mockSubnet, id: undefined };
            mockMaasApiClient.get.mockResolvedValue(malformedSubnetData);
            try {
                await registeredCallback(subnetDetailsUri, { subnet_id: MOCK_SUBNET_ID_FOR_URI_MOCK }, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (e) {
                expect(e).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(e.message).toMatch(/Subnet data validation failed/);
                expect(e.details?.zodErrors).toBeDefined();
            }
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
    });
    describe('SubnetsListResourceHandler', () => {
        let handler;
        let registeredCallback;
        beforeEach(async () => {
            await import('../../mcp_resources/schemas/uriPatterns.js');
            const initialCallCount = mockMcpServer.resource.mock.calls.length;
            handler = new SubnetResourceHandler_js_1.SubnetsListResourceHandler(mockMcpServer, mockMaasApiClient);
            handler.register('maas_subnets_list');
            const currentCallArgs = mockMcpServer.resource.mock.calls[initialCallCount];
            if (currentCallArgs && currentCallArgs.length > 2) {
                // Use unknown as an intermediate type for safer casting
                registeredCallback = currentCallArgs[2];
            }
            else {
                throw new Error("SubnetsList handler not registered.");
            }
        });
        it('should register with correct parameters', async () => {
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            expect(mockMcpServer.resource).toHaveBeenLastCalledWith('maas_subnets_list', expect.objectContaining({ pattern: mockedUriPatterns.SUBNETS_LIST_URI_PATTERN }), expect.any(Function));
        });
        it('should fetch subnets list successfully', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockSubnets);
            const result = await registeredCallback(subnetsListUri, {}, { signal: new AbortController().signal });
            expect(mockMaasApiClient.get).toHaveBeenCalledWith('/subnets', {}, expect.any(AbortSignal));
            expect(result.contents[0].text).toBe(JSON.stringify(mockSubnets));
            expect(mockCacheManagerInstance.set).toHaveBeenCalled();
        });
        // Cache utilization test
        it('should use cache if available for subnets list', async () => {
            mockCacheManagerInstance.get.mockReturnValue(mockSubnets);
            const result = await registeredCallback(subnetsListUri, {}, { signal: new AbortController().signal });
            expect(mockCacheManagerInstance.get).toHaveBeenCalled();
            expect(mockMaasApiClient.get).not.toHaveBeenCalled();
            expect(result.contents[0].text).toBe(JSON.stringify(mockSubnets));
            expect(auditLogger_js_1.default.logCacheOperation).toHaveBeenCalledWith('Subnets', 'hit', expect.any(String), undefined, expect.any(Object));
        });
        // Query parameter handling test
        it('should fetch subnets list with query parameters', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockSubnets);
            const queryParams = { cidr: '10.0.0.0/24', vlan: '1' };
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            const listUriWithParams = new URL(mockedUriPatterns.SUBNETS_LIST_URI_PATTERN + '?cidr=10.0.0.0/24&vlan=1');
            await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
            expect(mockMaasApiClient.get).toHaveBeenCalledWith('/subnets', expect.objectContaining(queryParams), expect.any(AbortSignal));
        });
        // Error handling test
        it('should handle API error for subnets list', async () => {
            const apiError = new maas_ts_1.MaasApiError('Subnets API Error', 503, 'service_unavailable');
            mockMaasApiClient.get.mockRejectedValue(apiError);
            await expect(registeredCallback(subnetsListUri, {}, { signal: new AbortController().signal })).rejects.toThrow(apiError);
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
        // Data validation test
        it('should handle data validation error for subnets list', async () => {
            const malformedSubnetsData = [{ ...mockSubnet, id: undefined }, { name: 'invalid' }];
            mockMaasApiClient.get.mockResolvedValue(malformedSubnetsData);
            try {
                await registeredCallback(subnetsListUri, {}, { signal: new AbortController().signal });
                fail('Expected an error to be thrown');
            }
            catch (e) {
                expect(e).toBeInstanceOf(maas_ts_1.MaasApiError);
                expect(e.message).toMatch(/Subnets data validation failed/);
                expect(e.details?.zodErrors).toBeDefined();
            }
            expect(auditLogger_js_1.default.logResourceAccessFailure).toHaveBeenCalled();
        });
        // Cache invalidation test
        it('should invalidate cache if filter parameters change', async () => {
            mockMaasApiClient.get.mockResolvedValue(mockSubnets);
            const queryParams = { cidr: 'filter-change-test' };
            const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
            const listUriWithParams = new URL(mockedUriPatterns.SUBNETS_LIST_URI_PATTERN + '?cidr=filter-change-test');
            const invalidateCacheSpy = jest.spyOn(handler, 'invalidateCache');
            await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
            expect(invalidateCacheSpy).toHaveBeenCalled();
            invalidateCacheSpy.mockRestore();
        });
    });
    describe('registerSubnetResources', () => {
        it('should register both subnet details and list handlers', () => {
            mockMcpServer.resource.mockClear();
            (0, SubnetResourceHandler_js_1.registerSubnetResources)(mockMcpServer, mockMaasApiClient);
            expect(mockMcpServer.resource).toHaveBeenCalledTimes(2);
            expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_subnet_details', expect.any(mcp_js_1.ResourceTemplate), expect.any(Function));
            expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_subnets_list', expect.any(mcp_js_1.ResourceTemplate), expect.any(Function));
            expect(logger_ts_1.default.info).toHaveBeenCalledWith('Registered subnet resources with caching:', expect.any(Object));
        });
    });
});
