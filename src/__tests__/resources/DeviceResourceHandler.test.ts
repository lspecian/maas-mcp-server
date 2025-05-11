/**
 * Tests for DeviceResourceHandler
 * 
 * This file demonstrates the standardized test structure for resource handlers
 * using the centralized mock factories and shared test utilities.
 */

// Top-level constants for mocking
const MOCK_DEVICE_SYSTEM_ID = 'fixed-mock-device-id';
const DEVICE_DETAILS_URI_PATTERN = 'maas://device/{system_id}/details';
const DEVICES_LIST_URI_PATTERN = 'maas://devices/list';

// Import dependencies
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { DeviceDetailsResourceHandler, DevicesListResourceHandler, registerDeviceResources } from '../../mcp_resources/handlers/DeviceResourceHandler.js';
import { MaasDeviceSchema, DeviceCollectionQueryParamsSchema } from '../../mcp_resources/schemas/index.js';
import { MaasApiError } from '../../types/maas.js';
import { z } from 'zod';

// Import mock factories and test utilities
import { setupTestDependencies, extractRegisteredCallback, assertResourceRegistration, 
         assertCacheOperationLogged, assertResourceAccessLogged, assertResourceAccessFailureLogged,
         createMockUrl, TestDependencies } from '../mocks/testUtils.js';
import { mockClientConfigs } from '../mocks/mockMaasApiClient.js';

// Mock URI patterns module
jest.doMock('../../mcp_resources/schemas/uriPatterns.js', () => {
  const actualPatternsModule = jest.requireActual('../../mcp_resources/schemas/uriPatterns.js');
  return {
    ...actualPatternsModule,
    DEVICE_DETAILS_URI_PATTERN,
    DEVICES_LIST_URI_PATTERN,
    extractParamsFromUri: jest.fn((uri: string, pattern: string) => {
      if (pattern === DEVICE_DETAILS_URI_PATTERN && uri.includes(MOCK_DEVICE_SYSTEM_ID)) {
        return { system_id: MOCK_DEVICE_SYSTEM_ID };
      }
      if (pattern === DEVICES_LIST_URI_PATTERN) {
        const params: Record<string, string> = {};
        new URL(uri).searchParams.forEach((value, key) => { params[key] = value; });
        return params;
      }
      return actualPatternsModule.extractParamsFromUri(uri, pattern);
    }),
  };
});

// Define DevicesArraySchema for tests
const MaasDevicesArraySchema = z.array(MaasDeviceSchema);

// Mock device data
const mockDevice = {
  system_id: MOCK_DEVICE_SYSTEM_ID,
  hostname: 'test-device-1',
  domain: { id: 1, name: 'maas' },
  architecture: 'amd64/generic',
  status: 4,
  status_name: 'Ready',
  owner: 'admin',
  owner_data: { key: 'value' },
  ip_addresses: ['192.168.1.100'],
  mac_addresses: ['00:11:22:33:44:55'],
  zone: { id: 1, name: 'default' }
};

const mockDevices = [
  mockDevice, 
  { ...mockDevice, system_id: 'dev-789', hostname: 'test-device-2', mac_addresses: ['66:77:88:99:AA:BB'] }
];

// Handler callback type for type safety
type HandlerCallbackType = (uri: URL, variables: Record<string, string | string[]>, options: { signal: AbortSignal }) => Promise<any>;

describe('Device Resource Handlers', () => {
  // Declare test dependencies
  let deps: TestDependencies;
  
  // Define test URIs
  const deviceDetailsUri = createMockUrl(`maas://device/${MOCK_DEVICE_SYSTEM_ID}/details`);
  const devicesListUri = createMockUrl(DEVICES_LIST_URI_PATTERN);

  beforeEach(async () => {
    // Setup all test dependencies with default options
    deps = setupTestDependencies({
      cacheEnabled: true,
      auditLogEnabled: true,
      cacheHits: false
    });
    
    // Ensure URI patterns mock is loaded
    await import('../../mcp_resources/schemas/uriPatterns.js');
  });

  describe('DeviceDetailsResourceHandler', () => {
    let handler: DeviceDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      // Create handler and register it
      handler = new DeviceDetailsResourceHandler(deps.mockMcpServer, deps.mockMaasApiClient);
      handler.register('maas_device_details');
      
      // Extract the registered callback for testing
      registeredCallback = extractRegisteredCallback(deps.mockMcpServer);
    });

    it('should register with correct parameters', async () => {
      // Verify registration with correct parameters
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      assertResourceRegistration(
        deps.mockMcpServer,
        'maas_device_details',
        mockedUriPatterns.DEVICE_DETAILS_URI_PATTERN
      );
    });

    it('should fetch device details successfully', async () => {
      // Setup mock response
      deps.mockMaasApiClient.get.mockResolvedValue(mockDevice);
      
      // Execute the handler
      const result = await registeredCallback(
        deviceDetailsUri, 
        { system_id: MOCK_DEVICE_SYSTEM_ID }, 
        { signal: new AbortController().signal }
      );
      
      // Verify API call
      expect(deps.mockMaasApiClient.get).toHaveBeenCalledWith(
        `/devices/${MOCK_DEVICE_SYSTEM_ID}`, 
        undefined, 
        expect.any(Object) // AbortSignal
      );
      
      // Verify result
      expect(result.contents[0].text).toBe(JSON.stringify(mockDevice));
      
      // Verify caching
      expect(deps.mockCacheManager.set).toHaveBeenCalled();
      
      // Verify audit logging
      assertResourceAccessLogged(deps.mockMaasApiClient, 'Device', MOCK_DEVICE_SYSTEM_ID);
    });

    it('should use cache if available for device details', async () => {
      // Setup cache hit
      deps.mockCacheManager.get.mockReturnValue(mockDevice);
      
      // Execute the handler
      const result = await registeredCallback(
        deviceDetailsUri, 
        { system_id: MOCK_DEVICE_SYSTEM_ID }, 
        { signal: new AbortController().signal }
      );
      
      // Verify cache usage
      expect(deps.mockCacheManager.get).toHaveBeenCalled();
      expect(deps.mockMaasApiClient.get).not.toHaveBeenCalled();
      
      // Verify result
      expect(result.contents[0].text).toBe(JSON.stringify(mockDevice));
      
      // Verify audit logging
      assertCacheOperationLogged(deps.mockMaasApiClient, 'Device', 'hit', MOCK_DEVICE_SYSTEM_ID);
    });

    it('should handle API error for device details', async () => {
      // Setup API error
      const apiError = new MaasApiError('Device API Error', 500, 'device_error');
      deps.mockMaasApiClient.get.mockRejectedValue(apiError);
      
      // Execute and verify error handling
      await expect(registeredCallback(
        deviceDetailsUri, 
        { system_id: MOCK_DEVICE_SYSTEM_ID }, 
        { signal: new AbortController().signal }
      )).rejects.toThrow(apiError);
      
      // Verify audit logging
      assertResourceAccessFailureLogged(deps.mockMaasApiClient, 'Device', MOCK_DEVICE_SYSTEM_ID);
    });
    
    it('should handle parameter validation error for missing system_id', async () => {
      // Setup parameter validation error
      const patternsModule = await import('../../mcp_resources/schemas/uriPatterns.js');
      (patternsModule.extractParamsFromUri as jest.Mock).mockReturnValueOnce({});
      
      // Create invalid URI
      const invalidUri = createMockUrl('maas://device//details');
      
      // Execute and verify error handling
      await expect(registeredCallback(
        invalidUri, 
        {}, 
        { signal: new AbortController().signal }
      )).rejects.toThrow(/Invalid parameters for Device request/);
      
      // Verify audit logging
      assertResourceAccessFailureLogged(deps.mockMaasApiClient, 'Device');
    });

    it('should handle data validation error', async () => {
      // Setup data validation error
      const malformedDeviceData = { ...mockDevice, system_id: undefined };
      deps.mockMaasApiClient.get.mockResolvedValue(malformedDeviceData);
      
      // Execute and verify error handling
      await expect(registeredCallback(
        deviceDetailsUri, 
        { system_id: MOCK_DEVICE_SYSTEM_ID }, 
        { signal: new AbortController().signal }
      )).rejects.toThrow(/Device data validation failed/);
      
      // Verify audit logging
      assertResourceAccessFailureLogged(deps.mockMaasApiClient, 'Device', MOCK_DEVICE_SYSTEM_ID);
    });
    
    it('should handle abort signal', async () => {
      // Create aborted signal
      const abortController = new AbortController();
      abortController.abort();
      
      // Execute and verify abort handling
      await expect(registeredCallback(
        deviceDetailsUri, 
        { system_id: MOCK_DEVICE_SYSTEM_ID }, 
        { signal: abortController.signal }
      )).rejects.toThrow(/aborted/i);
    });
  });

  describe('DevicesListResourceHandler', () => {
    let handler: DevicesListResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      // Create handler and register it
      handler = new DevicesListResourceHandler(deps.mockMcpServer, deps.mockMaasApiClient);
      handler.register('maas_devices_list');
      
      // Extract the registered callback for testing
      // Use index 1 since DeviceDetailsResourceHandler was registered first
      registeredCallback = extractRegisteredCallback(deps.mockMcpServer, 1);
    });

    it('should register with correct parameters', async () => {
      // Verify registration with correct parameters
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      assertResourceRegistration(
        deps.mockMcpServer,
        'maas_devices_list',
        mockedUriPatterns.DEVICES_LIST_URI_PATTERN,
        1 // Index 1 since DeviceDetailsResourceHandler was registered first
      );
    });

    it('should fetch devices list successfully', async () => {
      // Setup mock response
      deps.mockMaasApiClient.get.mockResolvedValue(mockDevices);
      
      // Execute the handler
      const result = await registeredCallback(devicesListUri, {}, { signal: new AbortController().signal });
      
      // Verify API call
      expect(deps.mockMaasApiClient.get).toHaveBeenCalledWith(
        '/devices', 
        {}, 
        expect.any(Object) // AbortSignal
      );
      
      // Verify result
      expect(result.contents[0].text).toBe(JSON.stringify(mockDevices));
      
      // Verify caching
      expect(deps.mockCacheManager.set).toHaveBeenCalled();
      
      // Verify audit logging
      assertResourceAccessLogged(deps.mockMaasApiClient, 'Devices');
    });

    it('should use cache if available for devices list', async () => {
      // Setup cache hit
      deps.mockCacheManager.get.mockReturnValue(mockDevices);
      
      // Execute the handler
      const result = await registeredCallback(devicesListUri, {}, { signal: new AbortController().signal });
      
      // Verify cache usage
      expect(deps.mockCacheManager.get).toHaveBeenCalled();
      expect(deps.mockMaasApiClient.get).not.toHaveBeenCalled();
      
      // Verify result
      expect(result.contents[0].text).toBe(JSON.stringify(mockDevices));
      
      // Verify audit logging
      assertCacheOperationLogged(deps.mockMaasApiClient, 'Devices', 'hit');
    });

    it('should fetch devices list with query parameters', async () => {
      // Setup mock response
      deps.mockMaasApiClient.get.mockResolvedValue(mockDevices);
      
      // Setup query parameters
      const queryParams = { hostname: 'test-device', mac_address: '00:11:22:33:44:55' };
      const listUriWithParams = createMockUrl(DEVICES_LIST_URI_PATTERN, queryParams);
      
      // Execute the handler
      await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
      
      // Verify API call with query parameters
      expect(deps.mockMaasApiClient.get).toHaveBeenCalledWith(
        '/devices', 
        expect.objectContaining(queryParams), 
        expect.any(Object) // AbortSignal
      );
    });
    
    it('should handle API error for devices list', async () => {
      // Setup API error
      const apiError = new MaasApiError('Devices API Error', 503, 'service_unavailable');
      deps.mockMaasApiClient.get.mockRejectedValue(apiError);
      
      // Execute and verify error handling
      await expect(registeredCallback(
        devicesListUri, 
        {}, 
        { signal: new AbortController().signal }
      )).rejects.toThrow(apiError);
      
      // Verify audit logging
      assertResourceAccessFailureLogged(deps.mockMaasApiClient, 'Devices');
    });
    
    it('should handle data validation error for devices list', async () => {
      // Setup data validation error
      const malformedDevicesData = [{ ...mockDevice, system_id: undefined }, { name: 'invalid' }];
      deps.mockMaasApiClient.get.mockResolvedValue(malformedDevicesData);
      
      // Execute and verify error handling
      await expect(registeredCallback(
        devicesListUri, 
        {}, 
        { signal: new AbortController().signal }
      )).rejects.toThrow(/Devices data validation failed/);
      
      // Verify audit logging
      assertResourceAccessFailureLogged(deps.mockMaasApiClient, 'Devices');
    });
    
    it('should invalidate cache if filter parameters change', async () => {
      // Setup mock response
      deps.mockMaasApiClient.get.mockResolvedValue(mockDevices);
      
      // Setup query parameters
      const queryParams = { hostname: 'filter-change-test' };
      const listUriWithParams = createMockUrl(DEVICES_LIST_URI_PATTERN, queryParams);
      
      // Spy on invalidateCache method
      const invalidateCacheSpy = jest.spyOn(handler, 'invalidateCache');
      
      // Execute the handler
      await registeredCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
      
      // Verify cache invalidation
      expect(invalidateCacheSpy).toHaveBeenCalled();
      
      // Restore the spy
      invalidateCacheSpy.mockRestore();
    });
  });

  describe('registerDeviceResources', () => {
    it('should register both device details and list handlers', async () => {
      // Clear previous calls
      deps.mockMcpServer.resource.mockClear();
      
      // Register device resources
      registerDeviceResources(deps.mockMcpServer, deps.mockMaasApiClient);
      
      // Get URI patterns
      const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
      
      // Verify both handlers were registered
      expect(deps.mockMcpServer.resource).toHaveBeenCalledTimes(2);
      expect(deps.mockMcpServer.resource).toHaveBeenCalledWith(
        'maas_device_details',
        expect.objectContaining({ pattern: mockedUriPatterns.DEVICE_DETAILS_URI_PATTERN }),
        expect.any(Function)
      );
      expect(deps.mockMcpServer.resource).toHaveBeenCalledWith(
        'maas_devices_list',
        expect.objectContaining({ pattern: mockedUriPatterns.DEVICES_LIST_URI_PATTERN }),
        expect.any(Function)
      );
    });
  });
});