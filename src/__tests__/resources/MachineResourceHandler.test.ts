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
    extractParamsFromUri: jest.fn((uri: string, pattern: string) => {
      if (pattern === ACTUAL_MACHINE_DETAILS_URI_PATTERN_FOR_MOCK && uri.includes(MOCK_SYSTEM_ID_FOR_URI_MOCK)) {
        return { system_id: MOCK_SYSTEM_ID_FOR_URI_MOCK };
      }
      if (pattern === ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK) {
        const params: Record<string, string> = {};
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
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { MachineDetailsResourceHandler, MachinesListResourceHandler, registerMachineResources } from '../../mcp_resources/handlers/MachineResourceHandler.js';
import { MaasMachineSchema, GetMachineParamsSchema, MachineCollectionQueryParamsSchema } from '../../mcp_resources/schemas/index.js';
import { MaasApiError as ActualMaasApiError } from '../../types/maas.js';
import { createMockMaasApiClient, mockMachine, mockMachines } from '../mocks/mockMaasApiClient.js';
import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import auditLogger from '../../utils/auditLogger.js';
import logger from '../../utils/logger.js';
import config from '../../config.js';
import * as resourceUtilsActual from '../../mcp_resources/utils/resourceUtils.js'; // Import actuals for specific mocks
import { z } from 'zod';

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
jest.mock('../../utils/logger.js');
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
const MaasMachinesArraySchema = z.array(MaasMachineSchema);

// Type for the handler callback, used for casting
type HandlerCallbackType = (uri: URL, variables: Record<string, string | string[]>, options: { signal: AbortSignal }) => Promise<any>;

describe('Machine Resource Handlers', () => {
  let mockMcpServer: jest.Mocked<McpServer>;
  let mockMaasApiClient: jest.Mocked<MaasApiClient>;
  let mockCacheManagerInstance: jest.Mocked<CacheManager>;

  // Use the MOCK_SYSTEM_ID_FOR_URI_MOCK for consistency with the doMock
  const systemIdForDetailsTest = MOCK_SYSTEM_ID_FOR_URI_MOCK;
  // Use the patterns defined for the mock for constructing URIs in tests
  const machineDetailsUri = new URL(`maas://machine/${systemIdForDetailsTest}/details`);
  const machinesListUri = new URL(ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK);


  beforeEach(async () => { // Make it async for dynamic import
    jest.clearAllMocks();

    // Import the mocked uriPatterns module to get its (potentially overridden) exports
    // This ensures that MACHINE_DETAILS_URI_PATTERN used by the handler constructor is the one from the mock
    const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');

    // Setup mocks for resourceUtils to use actual implementations for some functions
    // Import the mocked version of resourceUtils
    const mockedResourceUtils = await import('../../mcp_resources/utils/resourceUtils.js');
    (mockedResourceUtils.extractAndValidateParams as jest.Mock).mockImplementation(
      resourceUtilsActual.extractAndValidateParams
    );
    (mockedResourceUtils.validateResourceData as jest.Mock).mockImplementation(
      resourceUtilsActual.validateResourceData
    );
    // Properly type the mock function
    const handleFetchErrorMock = mockedResourceUtils.handleResourceFetchError as jest.Mock<ReturnType<typeof resourceUtilsActual.handleResourceFetchError>, Parameters<typeof resourceUtilsActual.handleResourceFetchError>>;
    handleFetchErrorMock.mockImplementation(resourceUtilsActual.handleResourceFetchError);

    mockMcpServer = {
      resource: jest.fn() as jest.Mock<void, [string, ResourceTemplate, HandlerCallbackType]>,
    } as unknown as jest.Mocked<McpServer>;

    mockMaasApiClient = createMockMaasApiClient() as jest.Mocked<MaasApiClient>;

    mockCacheManagerInstance = {
      get: jest.fn(),
      set: jest.fn(),
      generateCacheKey: jest.fn((prefix, uri, params, opts) => `${prefix}-${uri.toString()}-${JSON.stringify(params)}-${JSON.stringify(opts)}`),
      isEnabled: jest.fn(() => true),
      getResourceTTL: jest.fn(() => 300),
      invalidateResource: jest.fn(),
    } as unknown as jest.Mocked<CacheManager>;

    (CacheManager.getInstance as jest.Mock).mockReturnValue(mockCacheManagerInstance);

    // Config is already mocked at the top level
  });

  describe('MachineDetailsResourceHandler', () => {
    let handler: MachineDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      handler = new MachineDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
      handler.register('maas_machine_details');
      
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        // Use unknown as an intermediate type for safer casting
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("MCP resource handler not registered or mock.calls structure is unexpected.");
      }
    });

    it('should register with correct parameters', async () => {
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js'); // get mocked value
      expect(ResourceTemplate).toHaveBeenCalledWith(mockedUriPatterns.MACHINE_DETAILS_URI_PATTERN, { list: undefined });
      expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machine_details', expect.any(ResourceTemplate), expect.any(Function));
    });

    it('should fetch machine details successfully', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockMachine);
      const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
      
      expect(mockMaasApiClient.get).toHaveBeenCalledWith(`/machines/${systemIdForDetailsTest}`, undefined, expect.any(AbortSignal));
      expect(result.contents[0].text).toBe(JSON.stringify(mockMachine));
      expect(mockCacheManagerInstance.set).toHaveBeenCalled();
      expect(auditLogger.logResourceAccess).toHaveBeenCalledTimes(2);
    });

    it('should use cache if available', async () => {
      mockCacheManagerInstance.get.mockReturnValue(mockMachine);
      const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
      
      expect(mockCacheManagerInstance.get).toHaveBeenCalled();
      expect(mockMaasApiClient.get).not.toHaveBeenCalled();
      expect(result.contents[0].text).toBe(JSON.stringify(mockMachine));
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith('Machine', 'hit', expect.any(String), systemIdForDetailsTest, expect.any(Object));
    });

    it('should handle API error', async () => {
      const apiError = new ActualMaasApiError('API Down', 503, 'service_unavailable');
      mockMaasApiClient.get.mockRejectedValue(apiError);
      await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal })).rejects.toThrow(apiError);
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });
    
    it('should handle parameter validation error for missing system_id', async () => {
        const patternsModule = await import('../../mcp_resources/schemas/uriPatterns.js');
        (patternsModule.extractParamsFromUri as jest.Mock).mockReturnValueOnce({});

        const invalidUri = new URL('maas://machine//details');
        try {
            await registeredCallback(invalidUri, {}, { signal: new AbortController().signal });
        } catch (e: any) {
            expect(e).toBeInstanceOf(ActualMaasApiError);
            expect(e.message).toMatch(/Invalid parameters for Machine request/);
        }
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });

    it('should handle data validation error', async () => {
      const malformedMachineData = { ...mockMachine, system_id: undefined };
      mockMaasApiClient.get.mockResolvedValue(malformedMachineData);
      
      try {
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
      } catch (e: any) {
        expect(e).toBeInstanceOf(ActualMaasApiError);
        expect(e.message).toMatch(/Machine data validation failed/);
        expect(e.details?.zodErrors).toBeDefined();
      }
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });
  });

  describe('MachinesListResourceHandler', () => {
    let handler: MachinesListResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      handler = new MachinesListResourceHandler(mockMcpServer, mockMaasApiClient);
      handler.register('maas_machines_list');
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        // Use unknown as an intermediate type for safer casting
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("MCP list resource handler not registered or mock.calls structure is unexpected.");
      }
    });

    it('should register with correct parameters', async () => {
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      expect(ResourceTemplate).toHaveBeenCalledWith(mockedUriPatterns.MACHINES_LIST_URI_PATTERN, { list: undefined });
      expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machines_list', expect.any(ResourceTemplate), expect.any(Function));
    });

    it('should fetch machines list successfully', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockMachines);
      const result = await registeredCallback(machinesListUri, {}, { signal: new AbortController().signal });
      expect(mockMaasApiClient.get).toHaveBeenCalledWith('/machines', {}, expect.any(AbortSignal));
      expect(result.contents[0].text).toBe(JSON.stringify(mockMachines));
      expect(mockCacheManagerInstance.set).toHaveBeenCalled();
    });

    it('should fetch machines list with query parameters', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockMachines);
      const queryParams = { hostname: 'test', status: 'Ready', limit: '10' };
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      const listUriWithParams = new URL(mockedUriPatterns.MACHINES_LIST_URI_PATTERN + '?hostname=test&status=Ready&limit=10');
      
      await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
      
      const expectedMaasQueryParams = { hostname: 'test', status: 'Ready', limit: '10' };
      expect(mockMaasApiClient.get).toHaveBeenCalledWith('/machines', expect.objectContaining(expectedMaasQueryParams), expect.any(AbortSignal));
    });
    
    it('should invalidate cache if filter parameters change (simulated)', async () => {
        mockMaasApiClient.get.mockResolvedValue(mockMachines);
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
      registerMachineResources(mockMcpServer, mockMaasApiClient);
      expect(mockMcpServer.resource).toHaveBeenCalledTimes(2);
      expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machine_details', expect.any(ResourceTemplate), expect.any(Function));
      expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_machines_list', expect.any(ResourceTemplate), expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('Registered machine resources with caching:', expect.any(Object));
    });
  });
});