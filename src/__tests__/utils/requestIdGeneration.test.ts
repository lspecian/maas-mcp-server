import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../../maas/MaasApiClient.ts";
import { ZodSchema, z } from 'zod';
import { BaseResourceHandler } from "../../mcp_resources/BaseResourceHandler.ts";

// Mock pino before importing logger
jest.mock('pino', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }),
  }));
});

// Mock the logger module
jest.mock('../../utils/logger.ts', () => {
  // Use the actual generateRequestId function for testing
  const originalGenerateRequestId = jest.requireActual('../../utils/logger.ts').generateRequestId;
  
  return {
    __esModule: true,
    default: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      child: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      }),
    },
    generateRequestId: originalGenerateRequestId,
  };
});

// Import after mocking
import * as logger from "../../utils/logger.ts";
import auditLogger from "../../utils/auditLogger.ts";

// Mock the config module
jest.mock('../../config.js', () => ({
  __esModule: true,
  default: {
    logLevel: 'info',
    nodeEnv: 'test',
    auditLogEnabled: true,
    cacheEnabled: true,
  },
}));

// Mock the audit logger
jest.mock('../../utils/auditLogger.js', () => ({
  __esModule: true,
  default: {
    logResourceAccess: jest.fn(),
    logResourceAccessFailure: jest.fn(),
    logCacheOperation: jest.fn(),
  },
}));

// Mock the cache manager
jest.mock('../../mcp_resources/cache/index.js', () => {
  const mockCacheManager = {
    getInstance: jest.fn().mockReturnThis(),
    isEnabled: jest.fn().mockReturnValue(true),
    getResourceTTL: jest.fn().mockReturnValue(300),
    generateCacheKey: jest.fn().mockReturnValue('test-cache-key'),
    get: jest.fn(),
    set: jest.fn(),
    invalidateResource: jest.fn().mockReturnValue(5),
    invalidateResourceById: jest.fn().mockReturnValue(2),
  };

  return {
    __esModule: true,
    CacheManager: {
      getInstance: jest.fn().mockReturnValue(mockCacheManager),
    },
  };
});

// Create a concrete implementation of BaseResourceHandler for testing
class TestResourceHandler extends BaseResourceHandler<any, any> {
  constructor(server: McpServer, maasClient: MaasApiClient) {
    super(
      server,
      maasClient,
      'TestResource',
      {} as ResourceTemplate,
      '/test/:id',
      z.any(),
      z.object({ id: z.string() }),
      '/api/test'
    );
  }

  protected getResourceIdFromParams(params: any): string | undefined {
    return params.id;
  }

  protected async fetchResourceData(params: any, signal: AbortSignal): Promise<unknown> {
    return { id: params.id, name: 'Test Resource' };
  }

  // Override validateParams to avoid URI pattern matching issues in tests
  protected validateParams(uri: string, params: Record<string, string>): any {
    // Simply return the params without validation for testing
    return params;
  }

  // Expose protected methods for testing
  public async testHandleRequest(
    uri: URL,
    variables: Record<string, string | string[]>,
    options: { signal: AbortSignal }
  ) {
    return this.handleRequest(uri, variables, options);
  }
}

describe('Request ID Generation in BaseResourceHandler', () => {
  let mockServer: McpServer;
  let mockMaasClient: MaasApiClient;
  let resourceHandler: TestResourceHandler;
  let generateRequestIdSpy: jest.SpyInstance;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock server and client
    mockServer = {
      resource: jest.fn(),
    } as unknown as McpServer;
    
    mockMaasClient = {
      get: jest.fn().mockResolvedValue({ id: 'test-id', name: 'Test Resource' }),
    } as unknown as MaasApiClient;
    
    // Create resource handler
    resourceHandler = new TestResourceHandler(mockServer, mockMaasClient);
    
    // Spy on generateRequestId
    generateRequestIdSpy = jest.spyOn(logger, 'generateRequestId');
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Uniqueness and Format', () => {
    it('should generate unique request IDs for each request', async () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy
        .mockReturnValueOnce('request-id-1')
        .mockReturnValueOnce('request-id-2')
        .mockReturnValueOnce('request-id-3')
        .mockReturnValueOnce('request-id-4');
      
      // Call methods that generate request IDs
      await resourceHandler.testHandleRequest(
        new URL('http://example.com/test/123'),
        { id: '123' },
        { signal: new AbortController().signal }
      );
      
      resourceHandler.invalidateCache();
      resourceHandler.invalidateCacheById('123');
      resourceHandler.setCacheOptions({ ttl: 600 });
      
      // Verify that generateRequestId was called 4 times with different values
      expect(generateRequestIdSpy).toHaveBeenCalledTimes(4);
      expect(generateRequestIdSpy.mock.results[0].value).toBe('request-id-1');
      expect(generateRequestIdSpy.mock.results[1].value).toBe('request-id-2');
      expect(generateRequestIdSpy.mock.results[2].value).toBe('request-id-3');
      expect(generateRequestIdSpy.mock.results[3].value).toBe('request-id-4');
    });
    
    it('should generate request IDs in the expected format', () => {
      // Reset any mocks
      jest.restoreAllMocks();
      
      // Generate a few request IDs
      const id1 = logger.generateRequestId();
      const id2 = logger.generateRequestId();
      const id3 = logger.generateRequestId();
      
      // Verify the format: timestamp in base36 + random string
      const formatRegex = /^[a-z0-9]+$/;
      expect(id1).toMatch(formatRegex);
      expect(id2).toMatch(formatRegex);
      expect(id3).toMatch(formatRegex);
      
      // Verify uniqueness
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });
  });
  
  describe('Inclusion in Logs', () => {
    it('should include request ID in audit logs for handleRequest', async () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy.mockReturnValue('test-request-id');
      
      // Call handleRequest
      await resourceHandler.testHandleRequest(
        new URL('http://example.com/test/123'),
        { id: '123' },
        { signal: new AbortController().signal }
      );
      
      // Verify that audit logs include the request ID
      // Check that logResourceAccess was called at least once with the request ID
      expect(auditLogger.logResourceAccess).toHaveBeenCalled();
      const calls = (auditLogger.logResourceAccess as jest.Mock).mock.calls;
      
      // Find a call that matches our expected pattern
      const matchingCall = calls.find(call =>
        call[0] === 'TestResource' &&
        call[2] === 'read' &&
        call[3] === 'test-request-id'
      );
      
      expect(matchingCall).toBeTruthy();
      
      // Verify that cache operation logs include the request ID
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith(
        'TestResource',
        'miss',
        'test-request-id',
        '123',
        expect.any(Object)
      );
      
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith(
        'TestResource',
        'set',
        'test-request-id',
        '123',
        expect.any(Object)
      );
    });
    
    it('should include request ID in audit logs for invalidateCache', () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy.mockReturnValue('cache-invalidate-id');
      
      // Call invalidateCache
      resourceHandler.invalidateCache();
      
      // Verify that audit logs include the request ID
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith(
        'TestResource',
        'invalidate_all',
        'cache-invalidate-id',
        undefined,
        { count: 5 }
      );
    });
    
    it('should include request ID in audit logs for invalidateCacheById', () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy.mockReturnValue('cache-invalidate-by-id');
      
      // Call invalidateCacheById
      resourceHandler.invalidateCacheById('123');
      
      // Verify that audit logs include the request ID
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith(
        'TestResource',
        'invalidate_by_id',
        'cache-invalidate-by-id',
        '123',
        { count: 2 }
      );
    });
    
    it('should include request ID in audit logs for setCacheOptions', () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy.mockReturnValue('set-cache-options-id');
      
      // Call setCacheOptions
      resourceHandler.setCacheOptions({ ttl: 600 });
      
      // Verify that audit logs include the request ID
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith(
        'TestResource',
        'update_options',
        'set-cache-options-id',
        undefined,
        expect.objectContaining({
          cacheTTL: 600
        })
      );
    });
  });
  
  describe('Correlation of Request IDs', () => {
    it('should use the same request ID for all logs related to a single request', async () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy.mockReturnValue('correlated-request-id');
      
      // Mock cache miss
      const cacheManager = await import('../../mcp_resources/cache/index.js');
      (cacheManager.CacheManager.getInstance().get as jest.Mock).mockReturnValue(null);
      
      // Call handleRequest
      await resourceHandler.testHandleRequest(
        new URL('http://example.com/test/123'),
        { id: '123' },
        { signal: new AbortController().signal }
      );
      
      // Verify that all audit logs for this request use the same request ID
      const logCalls = (auditLogger.logCacheOperation as jest.Mock).mock.calls;
      
      // Should have at least 2 calls (cache miss and cache set)
      expect(logCalls.length).toBeGreaterThanOrEqual(2);
      
      // All calls should use the same request ID
      logCalls.forEach(call => {
        expect(call[2]).toBe('correlated-request-id');
      });
      
      // Resource access log should also use the same request ID
      const resourceAccessCalls = (auditLogger.logResourceAccess as jest.Mock).mock.calls;
      expect(resourceAccessCalls.length).toBeGreaterThan(0);
      
      // Check that all resource access calls use the same request ID
      resourceAccessCalls.forEach(call => {
        expect(call[3]).toBe('correlated-request-id');
      });
    });
    
    it('should use different request IDs for different operations', async () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy
        .mockReturnValueOnce('request-id-1')  // handleRequest
        .mockReturnValueOnce('request-id-2')  // invalidateCache
        .mockReturnValueOnce('request-id-3'); // invalidateCacheById
      
      // Call different operations
      await resourceHandler.testHandleRequest(
        new URL('http://example.com/test/123'),
        { id: '123' },
        { signal: new AbortController().signal }
      );
      
      resourceHandler.invalidateCache();
      resourceHandler.invalidateCacheById('123');
      
      // Verify that different operations use different request IDs
      const logCalls = (auditLogger.logCacheOperation as jest.Mock).mock.calls;
      
      // Find calls for different operations
      const handleRequestCalls = logCalls.filter(call => 
        call[1] === 'miss' || call[1] === 'set'
      );
      
      const invalidateCacheCalls = logCalls.filter(call => 
        call[1] === 'invalidate_all'
      );
      
      const invalidateCacheByIdCalls = logCalls.filter(call => 
        call[1] === 'invalidate_by_id'
      );
      
      // Verify that each operation uses a consistent request ID
      handleRequestCalls.forEach(call => {
        expect(call[2]).toBe('request-id-1');
      });
      
      invalidateCacheCalls.forEach(call => {
        expect(call[2]).toBe('request-id-2');
      });
      
      invalidateCacheByIdCalls.forEach(call => {
        expect(call[2]).toBe('request-id-3');
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle aborted requests gracefully', async () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy.mockReturnValue('aborted-request-id');
      
      // Create a custom error for testing
      class TestError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'TestError';
        }
      }
      
      // Override fetchResourceData to throw an error
      const originalFetchResourceData = resourceHandler['fetchResourceData'];
      resourceHandler['fetchResourceData'] = jest.fn().mockRejectedValue(new TestError('Test error'));
      
      try {
        // Call handleRequest - this should now fail
        await resourceHandler.testHandleRequest(
          new URL('http://example.com/test/123'),
          { id: '123' },
          { signal: new AbortController().signal }
        );
        
        // If we get here, the test should fail
        fail('Expected handleRequest to throw an error');
      } catch (error) {
        // This is expected
      } finally {
        // Restore the original method
        resourceHandler['fetchResourceData'] = originalFetchResourceData;
      }
      
      // Verify that audit logs include the request ID for the failure
      expect(auditLogger.logResourceAccessFailure).toHaveBeenCalled();
      const calls = (auditLogger.logResourceAccessFailure as jest.Mock).mock.calls;
      
      // Find a call that includes our request ID
      const matchingCall = calls.find(call => call[3] === 'aborted-request-id');
      expect(matchingCall).toBeTruthy();
    });
    
    it('should handle cache operations when caching is disabled', async () => {
      // Create a spy on generateRequestId
      generateRequestIdSpy.mockReturnValue('cache-disabled-id');
      
      // Mock cache disabled
      const cacheManager = await import('../../mcp_resources/cache/index.js');
      (cacheManager.CacheManager.getInstance().isEnabled as jest.Mock).mockReturnValue(false);
      
      // Reset the mock before calling operations
      jest.clearAllMocks();
      
      // Call cache operations
      resourceHandler.invalidateCache();
      resourceHandler.invalidateCacheById('123');
      
      // Verify that no audit logs were created for these cache operations
      expect(auditLogger.logCacheOperation).not.toHaveBeenCalled();
      
      // Note: setCacheOptions will still log even when caching is disabled
      // So we test it separately
      resourceHandler.setCacheOptions({ enabled: false });
      expect(auditLogger.logCacheOperation).toHaveBeenCalledWith(
        'TestResource',
        'update_options',
        'cache-disabled-id',
        undefined,
        expect.objectContaining({
          cacheEnabled: false
        })
      );
    });
  });
});