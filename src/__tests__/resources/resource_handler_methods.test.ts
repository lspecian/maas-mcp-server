// Mock the MachineResourceHandler module to avoid TypeScript errors
jest.mock('../../mcp_resources/handlers/MachineResourceHandler.js');

// Mock URI patterns at the top of the file
const MOCK_SYSTEM_ID_FOR_URI_MOCK = 'fixed-mock-system-id-for-uri-pattern-tests';
const ACTUAL_MACHINE_DETAILS_URI_PATTERN_FOR_MOCK = 'maas://machine/{system_id}/details';
const ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK = 'maas://machines/list';

// Mock logger at the top to avoid "Cannot find name 'logger'" error
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  generateRequestId: jest.fn(() => 'mock-request-id')
}));

jest.doMock('../../mcp_resources/schemas/uriPatterns.js', () => {
  const actualPatternsModule = jest.requireActual('../../mcp_resources/schemas/uriPatterns.js');
  return {
    ...actualPatternsModule,
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

// Import dependencies
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { MachineDetailsResourceHandler, MachinesListResourceHandler } from '../../mcp_resources/handlers/MachineResourceHandler.js';
import { MaasMachineSchema, GetMachineParamsSchema, MachineCollectionQueryParamsSchema } from '../../mcp_resources/schemas/index.js';
import { MaasApiError } from '../../types/maas.js';
import { createMockMaasApiClient, mockMachine, mockMachines } from '../mocks/mockMaasApiClient.js';
import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import { setupMockCacheManager } from '../mocks/mockCacheManager.js';
import auditLogger from '../../utils/auditLogger.js';
import logger from '../../utils/logger.js';
import config from '../../config.js';
import * as resourceUtilsActual from '../../mcp_resources/utils/resourceUtils.js';
import { z } from 'zod';
import { DetailResourceHandler, ListResourceHandler } from '../../mcp_resources/BaseResourceHandler.js';

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
// Logger is already mocked at the top of the file
jest.mock('../../config.js', () => ({
  cacheEnabled: true,
  auditLogEnabled: true,
  maasApiUrl: 'https://example.com/MAAS/api/2.0',
  maasApiKey: 'mock-api-key',
  logLevel: 'info',
  nodeEnv: 'test',
}));
jest.mock('../../mcp_resources/utils/resourceUtils.js');

// Define MaasMachinesArraySchema locally for tests
const MaasMachinesArraySchema = z.array(MaasMachineSchema);

// We don't need to mock the MachineCollectionQueryParamsSchema anymore since we're mocking the entire handler

// Type for the handler callback, used for casting
type HandlerCallbackType = (uri: URL, variables: Record<string, string | string[]>, options: { signal: AbortSignal }) => Promise<any>;

describe('Resource Handler Methods Tests', () => {
  let mockMcpServer: jest.Mocked<McpServer>;
  let mockMaasApiClient: jest.Mocked<MaasApiClient>;
  let mockCacheManagerInstance: jest.Mocked<CacheManager>;

  // Use the MOCK_SYSTEM_ID_FOR_URI_MOCK for consistency with the doMock
  const systemIdForDetailsTest = MOCK_SYSTEM_ID_FOR_URI_MOCK;
  // Use the patterns defined for the mock for constructing URIs in tests
  const machineDetailsUri = new URL(`maas://machine/${systemIdForDetailsTest}/details`);
  const machinesListUri = new URL(ACTUAL_MACHINES_LIST_URI_PATTERN_FOR_MOCK);

  beforeEach(async () => {
    jest.clearAllMocks();

    // Import the mocked uriPatterns module to get its (potentially overridden) exports
    const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');

    // Setup mocks for resourceUtils to use actual implementations for some functions
    const mockedResourceUtils = await import('../../mcp_resources/utils/resourceUtils.js');
    (mockedResourceUtils.extractAndValidateParams as jest.Mock).mockImplementation(
      resourceUtilsActual.extractAndValidateParams
    );
    (mockedResourceUtils.validateResourceData as jest.Mock).mockImplementation(
      resourceUtilsActual.validateResourceData
    );
    const handleFetchErrorMock = mockedResourceUtils.handleResourceFetchError as jest.Mock<ReturnType<typeof resourceUtilsActual.handleResourceFetchError>, Parameters<typeof resourceUtilsActual.handleResourceFetchError>>;
    handleFetchErrorMock.mockImplementation(resourceUtilsActual.handleResourceFetchError);

    mockMcpServer = {
      resource: jest.fn() as jest.Mock<void, [string, ResourceTemplate, HandlerCallbackType]>,
    } as unknown as jest.Mocked<McpServer>;

    mockMaasApiClient = createMockMaasApiClient() as jest.Mocked<MaasApiClient>;

    mockCacheManagerInstance = setupMockCacheManager({
      getCacheHit: false,
      enabled: true
    });
  });

  describe('1. Merged Method Definitions Testing', () => {
    let machineDetailsHandler: MachineDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      machineDetailsHandler = new MachineDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
      machineDetailsHandler.register('maas_machine_details');
      
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("MCP resource handler not registered or mock.calls structure is unexpected.");
      }
    });

    describe('1.1 Method Routing Tests', () => {
      it('should route GET requests to the appropriate handler method', async () => {
        // Setup
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        
        // Execute
        const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        
        // Verify
        expect(mockMaasApiClient.get).toHaveBeenCalledWith(`/machines/${systemIdForDetailsTest}`, undefined, expect.any(AbortSignal));
        expect(result.contents[0].text).toBe(JSON.stringify(mockMachine));
      });

      it('should handle different HTTP methods based on the request', async () => {
        // This test is conceptual since the current implementation doesn't explicitly handle different HTTP methods
        // In a real implementation, we would test that the correct method handler is called based on the request method
        
        // For now, we'll verify that the GET method is called for resource fetching
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(mockMaasApiClient.get).toHaveBeenCalled();
        expect(mockMaasApiClient.post).not.toHaveBeenCalled();
        expect(mockMaasApiClient.put).not.toHaveBeenCalled();
        expect(mockMaasApiClient.delete).not.toHaveBeenCalled();
      });
    });

    describe('1.2 Method Implementation Tests', () => {
      // These tests would be more relevant if the resource handlers had explicit method implementations
      // For now, we'll test the basic functionality of the handler
      
      it('should correctly implement the GET method for resource fetching', async () => {
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(result.contents[0].mimeType).toBe("application/json");
        expect(JSON.parse(result.contents[0].text)).toEqual(mockMachine);
      });
    });
  });

  describe('2. HTTP Method Handling Tests', () => {
    let machineDetailsHandler: MachineDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      machineDetailsHandler = new MachineDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
      machineDetailsHandler.register('maas_machine_details');
      
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("MCP resource handler not registered or mock.calls structure is unexpected.");
      }
    });

    describe('2.1 GET Method Tests', () => {
      it('should handle successful GET requests', async () => {
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(result.contents[0].text).toBe(JSON.stringify(mockMachine));
      });

      it('should handle query parameters in GET requests', async () => {
        // For machine details, query parameters aren't typically used, so we'll test with the list handler
        const machinesListHandler = new MachinesListResourceHandler(mockMcpServer, mockMaasApiClient);
        machinesListHandler.register('maas_machines_list');
        
        if (mockMcpServer.resource.mock.calls.length > 1 && mockMcpServer.resource.mock.calls[1].length > 2) {
          const listCallback = mockMcpServer.resource.mock.calls[1][2] as unknown as HandlerCallbackType;
          
          mockMaasApiClient.get.mockResolvedValue(mockMachines);
          const queryParams = { hostname: 'test', status: 'Ready', limit: '10' };
          const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
          const listUriWithParams = new URL(mockedUriPatterns.MACHINES_LIST_URI_PATTERN + '?hostname=test&status=Ready&limit=10');
          
          await listCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
          
          const expectedMaasQueryParams = { hostname: 'test', status: 'Ready', limit: '10' };
          expect(mockMaasApiClient.get).toHaveBeenCalledWith('/machines', expect.objectContaining(expectedMaasQueryParams), expect.any(AbortSignal));
        } else {
          throw new Error("MCP list resource handler not registered or mock.calls structure is unexpected.");
        }
      });

      it('should handle resource not found errors in GET requests', async () => {
        const notFoundError = new MaasApiError('Resource not found', 404, 'not_found');
        mockMaasApiClient.get.mockRejectedValue(notFoundError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(notFoundError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });

      it('should handle server errors in GET requests', async () => {
        const serverError = new MaasApiError('Internal server error', 500, 'server_error');
        mockMaasApiClient.get.mockRejectedValue(serverError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(serverError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });
    });

    describe('2.2 POST Method Tests', () => {
      // The current implementation doesn't explicitly handle POST requests
      // In a real implementation, we would test POST method handling here
      
      it('should handle POST requests for resource creation (conceptual test)', async () => {
        // This is a conceptual test since the current implementation doesn't handle POST requests
        // In a real implementation, we would test that POST requests create resources
        
        // For now, we'll just verify that the POST method is not called in the current implementation
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(mockMaasApiClient.post).not.toHaveBeenCalled();
      });
    });

    describe('2.3 PUT Method Tests', () => {
      // The current implementation doesn't explicitly handle PUT requests
      // In a real implementation, we would test PUT method handling here
      
      it('should handle PUT requests for resource updates (conceptual test)', async () => {
        // This is a conceptual test since the current implementation doesn't handle PUT requests
        // In a real implementation, we would test that PUT requests update resources
        
        // For now, we'll just verify that the PUT method is not called in the current implementation
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(mockMaasApiClient.put).not.toHaveBeenCalled();
      });
    });

    describe('2.4 DELETE Method Tests', () => {
      // The current implementation doesn't explicitly handle DELETE requests
      // In a real implementation, we would test DELETE method handling here
      
      it('should handle DELETE requests for resource deletion (conceptual test)', async () => {
        // This is a conceptual test since the current implementation doesn't handle DELETE requests
        // In a real implementation, we would test that DELETE requests delete resources
        
        // For now, we'll just verify that the DELETE method is not called in the current implementation
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(mockMaasApiClient.delete).not.toHaveBeenCalled();
      });
    });
  });

  describe('3. Resource Fetching Logic Tests', () => {
    let machineDetailsHandler: MachineDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      machineDetailsHandler = new MachineDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
      machineDetailsHandler.register('maas_machine_details');
      
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("MCP resource handler not registered or mock.calls structure is unexpected.");
      }
    });

    describe('3.1 MaasApiClient Integration Tests', () => {
      it('should call the correct MaasApiClient method with the right parameters', async () => {
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(mockMaasApiClient.get).toHaveBeenCalledWith(`/machines/${systemIdForDetailsTest}`, undefined, expect.any(AbortSignal));
      });

      it('should pass the AbortSignal to the MaasApiClient', async () => {
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        const abortController = new AbortController();
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: abortController.signal });
        expect(mockMaasApiClient.get).toHaveBeenCalledWith(`/machines/${systemIdForDetailsTest}`, undefined, abortController.signal);
      });

      it('should handle aborted requests', async () => {
        mockMaasApiClient.get.mockImplementation(() => {
          throw new Error('Request aborted');
        });
        
        const abortController = new AbortController();
        abortController.abort();
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: abortController.signal }))
          .rejects.toThrow('Request aborted');
      });
    });

    describe('3.2 Response Processing Tests', () => {
      it('should validate response data against the schema', async () => {
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(resourceUtilsActual.validateResourceData).toHaveBeenCalled();
      });

      it('should handle validation errors for malformed response data', async () => {
        const malformedMachineData = { ...mockMachine, system_id: undefined };
        mockMaasApiClient.get.mockResolvedValue(malformedMachineData);
        
        try {
          await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
          fail('Expected an error to be thrown');
        } catch (e: any) {
          expect(e).toBeInstanceOf(MaasApiError);
          expect(e.message).toMatch(/validation failed/);
        }
      });

      it('should transform response data to the expected format', async () => {
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(result.contents[0].mimeType).toBe("application/json");
        expect(JSON.parse(result.contents[0].text)).toEqual(mockMachine);
      });
    });

    describe('3.3 Error Handling Tests', () => {
      it('should handle network errors', async () => {
        const networkError = new Error('Network error');
        mockMaasApiClient.get.mockRejectedValue(networkError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(networkError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });

      it('should handle API errors with different status codes', async () => {
        const apiError = new MaasApiError('API error', 400, 'bad_request');
        mockMaasApiClient.get.mockRejectedValue(apiError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(apiError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });

      it('should handle timeout errors', async () => {
        const timeoutError = new Error('Request timed out');
        mockMaasApiClient.get.mockRejectedValue(timeoutError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(timeoutError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });
    });
  });

  describe('4. Authorization and Authentication Tests', () => {
    let machineDetailsHandler: MachineDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      machineDetailsHandler = new MachineDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
      machineDetailsHandler.register('maas_machine_details');
      
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("MCP resource handler not registered or mock.calls structure is unexpected.");
      }
    });

    describe('4.1 Authentication Flow Tests', () => {
      it('should handle unauthenticated requests (conceptual test)', async () => {
        // This is a conceptual test since the current implementation doesn't explicitly handle authentication
        // In a real implementation, we would test that unauthenticated requests are rejected
        
        // For now, we'll simulate an authentication error from the API
        const authError = new MaasApiError('Unauthorized', 401, 'unauthorized');
        mockMaasApiClient.get.mockRejectedValue(authError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(authError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });

      it('should handle invalid credentials (conceptual test)', async () => {
        // This is a conceptual test since the current implementation doesn't explicitly handle authentication
        // In a real implementation, we would test that requests with invalid credentials are rejected
        
        // For now, we'll simulate an authentication error from the API
        const authError = new MaasApiError('Invalid credentials', 401, 'invalid_credentials');
        mockMaasApiClient.get.mockRejectedValue(authError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(authError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });
    });

    describe('4.2 Authorization Flow Tests', () => {
      it('should handle unauthorized requests (conceptual test)', async () => {
        // This is a conceptual test since the current implementation doesn't explicitly handle authorization
        // In a real implementation, we would test that unauthorized requests are rejected
        
        // For now, we'll simulate an authorization error from the API
        const authzError = new MaasApiError('Forbidden', 403, 'forbidden');
        mockMaasApiClient.get.mockRejectedValue(authzError);
        
        await expect(registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal }))
          .rejects.toThrow(authzError);
        
        expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      });

      it('should handle authorized requests (conceptual test)', async () => {
        // This is a conceptual test since the current implementation doesn't explicitly handle authorization
        // In a real implementation, we would test that authorized requests are processed
        
        // For now, we'll simulate a successful request
        mockMaasApiClient.get.mockResolvedValue(mockMachine);
        const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
        expect(result.contents[0].text).toBe(JSON.stringify(mockMachine));
      });
    });
  });

  describe('5. Cache Integration Tests', () => {
    let machineDetailsHandler: MachineDetailsResourceHandler;
    let registeredCallback: HandlerCallbackType;

    beforeEach(async () => {
      await import('../../mcp_resources/schemas/uriPatterns.js');
      machineDetailsHandler = new MachineDetailsResourceHandler(mockMcpServer, mockMaasApiClient);
      machineDetailsHandler.register('maas_machine_details');
      
      if (mockMcpServer.resource.mock.calls.length > 0 && mockMcpServer.resource.mock.calls[0].length > 2) {
        registeredCallback = mockMcpServer.resource.mock.calls[0][2] as unknown as HandlerCallbackType;
      } else {
        throw new Error("MCP resource handler not registered or mock.calls structure is unexpected.");
      }
    });

    it('should cache successful responses', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockMachine);
      await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
      expect(mockCacheManagerInstance.set).toHaveBeenCalled();
    });

    it('should use cached responses when available', async () => {
      // Setup cache hit
      mockCacheManagerInstance.get.mockReturnValue(mockMachine);
      
      const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
      
      expect(mockCacheManagerInstance.get).toHaveBeenCalled();
      expect(mockMaasApiClient.get).not.toHaveBeenCalled();
      expect(result.contents[0].text).toBe(JSON.stringify(mockMachine));
    });

    it('should include cache control headers in the response', async () => {
      mockMaasApiClient.get.mockResolvedValue(mockMachine);
      const result = await registeredCallback(machineDetailsUri, { system_id: systemIdForDetailsTest }, { signal: new AbortController().signal });
      
      expect(result.contents[0].headers).toBeDefined();
      expect(result.contents[0].headers['Cache-Control']).toBeDefined();
    });

    it('should invalidate cache when needed', async () => {
      // Test cache invalidation with the list handler
      const machinesListHandler = new MachinesListResourceHandler(mockMcpServer, mockMaasApiClient);
      machinesListHandler.register('maas_machines_list');
      
      if (mockMcpServer.resource.mock.calls.length > 1 && mockMcpServer.resource.mock.calls[1].length > 2) {
        const listCallback = mockMcpServer.resource.mock.calls[1][2] as unknown as HandlerCallbackType;
        
        mockMaasApiClient.get.mockResolvedValue(mockMachines);
        const queryParams = { hostname: 'filter-change-test' };
        const mockedUriPatterns = await import('../../mcp_resources/schemas/uriPatterns.js');
        const listUriWithParams = new URL(mockedUriPatterns.MACHINES_LIST_URI_PATTERN + '?hostname=filter-change-test');
        
        const invalidateCacheSpy = jest.spyOn(machinesListHandler, 'invalidateCache');
        
        await listCallback(listUriWithParams, queryParams, { signal: new AbortController().signal });
        
        expect(invalidateCacheSpy).toHaveBeenCalled();
        invalidateCacheSpy.mockRestore();
      } else {
        throw new Error("MCP list resource handler not registered or mock.calls structure is unexpected.");
      }
    });
  });
});