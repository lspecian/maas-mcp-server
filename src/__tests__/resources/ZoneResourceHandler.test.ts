// Top-level constants for mocking
const MOCK_ZONE_ID_FOR_URI_MOCK = 'fixed-mock-zone-id'; // e.g., 'zone1'
const ACTUAL_ZONE_DETAILS_URI_PATTERN_FOR_MOCK = 'maas://zone/{zone_id}/details';
const ACTUAL_ZONES_LIST_URI_PATTERN_FOR_MOCK = 'maas://zones/list';

jest.doMock('../../mcp_resources/schemas/uriPatterns.js', () => {
  const actualPatternsModule = jest.requireActual('../../mcp_resources/schemas/uriPatterns.js');
  return {
    ...actualPatternsModule,
    ZONE_DETAILS_URI_PATTERN: ACTUAL_ZONE_DETAILS_URI_PATTERN_FOR_MOCK,
    ZONES_LIST_URI_PATTERN: ACTUAL_ZONES_LIST_URI_PATTERN_FOR_MOCK,
    extractParamsFromUri: jest.fn((uri: string, pattern: string) => {
      if (pattern === ACTUAL_ZONE_DETAILS_URI_PATTERN_FOR_MOCK && uri.includes(MOCK_ZONE_ID_FOR_URI_MOCK)) {
        return { zone_id: MOCK_ZONE_ID_FOR_URI_MOCK };
      }
      if (pattern === ACTUAL_ZONES_LIST_URI_PATTERN_FOR_MOCK) {
        const params: Record<string, string> = {};
        new URL(uri).searchParams.forEach((value, key) => { params[key] = value; });
        return params;
      }
      return actualPatternsModule.extractParamsFromUri(uri, pattern);
    }),
  };
});

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { ZoneDetailsResourceHandler, ZonesListResourceHandler, registerZoneResources } from '../../mcp_resources/handlers/ZoneResourceHandler.js';
import { MaasZoneSchema, ZoneCollectionQueryParamsSchema, GetZoneParamsSchema } from '../../mcp_resources/schemas/index.js';
import { MaasApiError as ActualMaasApiError } from '../../types/maas.js';
import { createMockMaasApiClient } from '../mocks/mockMaasApiClient.js';
import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import auditLogger from '../../utils/auditLogger.js';
import logger from '../../utils/logger.js';
import config from '../../config.js';
import * as resourceUtilsActual from '../../mcp_resources/utils/resourceUtils.js';
import { z } from 'zod';

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
jest.mock('../../utils/logger.js');
jest.mock('../../config.js', () => ({
  cacheEnabled: true,
  auditLogEnabled: true,
  maasApiUrl: 'https://example.com/MAAS/api/2.0',
  maasApiKey: 'mock-api-key',
  logLevel: 'info',
  nodeEnv: 'test',
}));
jest.mock('../../mcp_resources/utils/resourceUtils.js');

// Define ZonesArraySchema locally for tests
const MaasZonesArraySchema = z.array(MaasZoneSchema);

// Mock zone data
const mockZone = {
  id: 1,
  name: 'default',
  description: 'Default zone',
  // Add other zone-specific fields
};
const mockZones = [mockZone, { ...mockZone, id: 2, name: 'zone-alpha', description: 'Alpha testing zone' }];


type HandlerCallbackType = (uri: URL, variables: Record<string, string | string[]>, options: { signal: AbortSignal }) => Promise<any>;

describe('Zone Resource Handlers', () => {
  let mockMcpServer: jest.Mocked<McpServer>;
  let mockMaasApiClient: jest.Mocked<MaasApiClient>;
  let mockCacheManagerInstance: jest.Mocked<CacheManager>;

  const zoneDetailsUri = new URL(`maas://zone/${MOCK_ZONE_ID_FOR_URI_MOCK}/details`);
  const zonesListUri = new URL(ACTUAL_ZONES_LIST_URI_PATTERN_FOR_MOCK);

  beforeEach(async () => {
    jest.clearAllMocks();
    await import('../../mcp_resources/schemas/uriPatterns.js'); 

    const mockedResourceUtils = await import('../../mcp_resources/utils/resourceUtils.js');
    (mockedResourceUtils.extractAndValidateParams as jest.Mock).mockImplementation(resourceUtilsActual.extractAndValidateParams);
    (mockedResourceUtils.validateResourceData as jest.Mock).mockImplementation(resourceUtilsActual.validateResourceData);
    const handleFetchErrorMock = mockedResourceUtils.handleResourceFetchError as jest.Mock<never, Parameters<typeof resourceUtilsActual.handleResourceFetchError>>;
    handleFetchErrorMock.mockImplementation(resourceUtilsActual.handleResourceFetchError);


    mockMcpServer = { resource: jest.fn() as jest.Mock<void, [string, ResourceTemplate, HandlerCallbackType]> } as unknown as jest.Mocked<McpServer>;
    mockMaasApiClient = createMockMaasApiClient() as jest.Mocked<MaasApiClient>;
    mockCacheManagerInstance = {
      get: jest.fn(), set: jest.fn(),
      generateCacheKey: jest.fn((p, u, params, o) => `${p}-${u}-${JSON.stringify(params)}-${JSON.stringify(o)}`),
      isEnabled: jest.fn(() => true), getResourceTTL: jest.fn(() => 300), invalidateResource: jest.fn(),
    } as unknown as jest.Mocked<CacheManager>;
    (CacheManager.getInstance as jest.Mock).mockReturnValue(mockCacheManagerInstance);
    // Config is already mocked at the top level
  });

  describe('ZoneDetailsResourceHandler', () => {
    let handler: ZoneDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      handler = new ZoneDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
      handler.register('maas_zone_details');
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        // Use unknown as an intermediate type for safer casting
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("ZoneDetails handler not registered.");
      }
    });

    it('should register with correct parameters', async () => {
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      expect(ResourceTemplate).toHaveBeenCalledWith(mockedUriPatterns.ZONE_DETAILS_URI_PATTERN, { list: undefined });
      expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_zone_details', expect.any(ResourceTemplate), expect.any(Function));
    });

    it('should fetch zone details successfully', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockZone);
      const result = await registeredCallback(zoneDetailsUri, { zone_id: MOCK_ZONE_ID_FOR_URI_MOCK }, { signal: new AbortController().signal });
      expect(mockMaasApiClient.get).toHaveBeenCalledWith(`/zones/${MOCK_ZONE_ID_FOR_URI_MOCK}`, undefined, expect.any(AbortSignal));
      expect(result.contents[0].text).toBe(JSON.stringify(mockZone));
      expect(mockCacheManagerInstance.set).toHaveBeenCalled();
      expect(auditLogger.logResourceAccess).toHaveBeenCalledTimes(2);
    });
    
    // Cache utilization test
    it('should use cache if available for zone details', async () => {
      mockCacheManagerInstance.get.mockReturnValue(mockZone);
      const result = await registeredCallback(zoneDetailsUri, { zone_id: MOCK_ZONE_ID_FOR_URI_MOCK }, { signal: new AbortController().signal });
      
      expect(mockCacheManagerInstance.get).toHaveBeenCalled();
      expect(mockMaasApiClient.get).not.toHaveBeenCalled();
      expect(result.contents[0].text).toBe(JSON.stringify(mockZone));
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith('Zone', 'hit', expect.any(String), MOCK_ZONE_ID_FOR_URI_MOCK, expect.any(Object));
    });

    // Error handling test
    it('should handle API error for zone details', async () => {
      const apiError = new ActualMaasApiError('Zone API Error', 500, 'zone_error');
      mockMaasApiClient.get.mockRejectedValue(apiError);
      
      await expect(registeredCallback(zoneDetailsUri, { zone_id: MOCK_ZONE_ID_FOR_URI_MOCK }, { signal: new AbortController().signal })).rejects.toThrow(apiError);
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });
    
    // Parameter validation test
    it('should handle parameter validation error for missing zone_id', async () => {
      const patternsModule = await import('../../mcp_resources/schemas/uriPatterns.js');
      (patternsModule.extractParamsFromUri as jest.Mock).mockReturnValueOnce({});

      const invalidUri = new URL('maas://zone//details');
      try {
        await registeredCallback(invalidUri, {}, { signal: new AbortController().signal });
        fail('Expected an error to be thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ActualMaasApiError);
        expect(e.message).toMatch(/Invalid parameters for Zone request/);
      }
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });

    // Data validation test
    it('should handle data validation error', async () => {
      const malformedZoneData = { ...mockZone, id: undefined };
      mockMaasApiClient.get.mockResolvedValue(malformedZoneData);
      
      try {
        await registeredCallback(zoneDetailsUri, { zone_id: MOCK_ZONE_ID_FOR_URI_MOCK }, { signal: new AbortController().signal });
        fail('Expected an error to be thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ActualMaasApiError);
        expect(e.message).toMatch(/Zone data validation failed/);
        expect(e.details?.zodErrors).toBeDefined();
      }
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });
  });

  describe('ZonesListResourceHandler', () => {
    let handler: ZonesListResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      const initialCallCount = mockMcpServer.resource.mock.calls.length;
      handler = new ZonesListResourceHandler(mockMcpServer, mockMaasApiClient);
      handler.register('maas_zones_list');
      const currentCallArgs = mockMcpServer.resource.mock.calls[initialCallCount];
       if (currentCallArgs && currentCallArgs.length > 2) {
        // Use unknown as an intermediate type for safer casting
        registeredCallback = currentCallArgs[2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("ZonesList handler not registered.");
      }
    });

    it('should register with correct parameters', async () => {
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      expect(mockMcpServer.resource).toHaveBeenLastCalledWith('maas_zones_list', expect.objectContaining({ pattern: mockedUriPatterns.ZONES_LIST_URI_PATTERN }), expect.any(Function));
    });

    it('should fetch zones list successfully', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockZones);
      const result = await registeredCallback(zonesListUri, {}, { signal: new AbortController().signal });
      expect(mockMaasApiClient.get).toHaveBeenCalledWith('/zones', {}, expect.any(AbortSignal));
      expect(result.contents[0].text).toBe(JSON.stringify(mockZones));
      expect(mockCacheManagerInstance.set).toHaveBeenCalled();
    });
    
    // Cache utilization test
    it('should use cache if available for zones list', async () => {
      mockCacheManagerInstance.get.mockReturnValue(mockZones);
      const result = await registeredCallback(zonesListUri, {}, { signal: new AbortController().signal });
      
      expect(mockCacheManagerInstance.get).toHaveBeenCalled();
      expect(mockMaasApiClient.get).not.toHaveBeenCalled();
      expect(result.contents[0].text).toBe(JSON.stringify(mockZones));
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith('Zones', 'hit', expect.any(String), undefined, expect.any(Object));
    });

    // Query parameter handling test
    it('should fetch zones list with query parameters', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockZones);
      const queryParams = { name: 'default' };
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      const listUriWithParams = new URL(mockedUriPatterns.ZONES_LIST_URI_PATTERN + '?name=default');
      
      await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
      
      expect(mockMaasApiClient.get).toHaveBeenCalledWith('/zones', expect.objectContaining(queryParams), expect.any(AbortSignal));
    });
    
    // Error handling test
    it('should handle API error for zones list', async () => {
      const apiError = new ActualMaasApiError('Zones API Error', 503, 'service_unavailable');
      mockMaasApiClient.get.mockRejectedValue(apiError);
      
      await expect(registeredCallback(zonesListUri, {}, { signal: new AbortController().signal })).rejects.toThrow(apiError);
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });
    
    // Data validation test
    it('should handle data validation error for zones list', async () => {
      const malformedZonesData = [{ ...mockZone, id: undefined }, { name: 'invalid' }];
      mockMaasApiClient.get.mockResolvedValue(malformedZonesData);
      
      try {
        await registeredCallback(zonesListUri, {}, { signal: new AbortController().signal });
        fail('Expected an error to be thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ActualMaasApiError);
        expect(e.message).toMatch(/Zones data validation failed/);
        expect(e.details?.zodErrors).toBeDefined();
      }
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
    });
    
    // Cache invalidation test
    it('should invalidate cache if filter parameters change', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockZones);
      const queryParams = { name: 'filter-change-test' };
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      const listUriWithParams = new URL(mockedUriPatterns.ZONES_LIST_URI_PATTERN + '?name=filter-change-test');
      
      const invalidateCacheSpy = jest.spyOn(handler, 'invalidateCache');

      await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
      
      expect(invalidateCacheSpy).toHaveBeenCalled();
      invalidateCacheSpy.mockRestore();
    });
  });

  describe('registerZoneResources', () => {
    it('should register both zone details and list handlers', () => {
      mockMcpServer.resource.mockClear();
      registerZoneResources(mockMcpServer, mockMaasApiClient);
      expect(mockMcpServer.resource).toHaveBeenCalledTimes(2);
      expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_zone_details', expect.any(ResourceTemplate), expect.any(Function));
      expect(mockMcpServer.resource).toHaveBeenCalledWith('maas_zones_list', expect.any(ResourceTemplate), expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('Registered zone resources with caching:', expect.any(Object));
    });
  });
});