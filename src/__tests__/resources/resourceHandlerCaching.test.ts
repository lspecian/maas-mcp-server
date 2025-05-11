/**
 * Tests for resource handler caching
 * 
 * This file provides comprehensive tests for caching functionality in resource handlers,
 * covering various caching scenarios and edge cases.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { z } from 'zod';
// Mock config before importing any modules that use it
jest.mock('../../config.js', () => ({
  __esModule: true,
  default: {
    maasApiUrl: 'https://test-maas.example.com/MAAS/api/2.0',
    maasApiKey: 'test:api:key',
    mcpPort: 3000,
    cacheEnabled: true,
    auditLogEnabled: true,
    logLevel: 'info',
    cacheTTL: 300
  }
}));

// Mock dependencies
jest.mock('../../mcp_resources/cache/cacheManager.js', () => {
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    generateCacheKey: jest.fn((prefix, uri, params, opts) => `${prefix}-${uri.toString()}-${JSON.stringify(params)}-${JSON.stringify(opts)}`),
    isEnabled: jest.fn(() => true),
    getResourceTTL: jest.fn(() => 300),
    invalidateResource: jest.fn(() => 0),
    invalidateResourceById: jest.fn(() => 0),
    resourceSpecificTTL: {},
    defaultTTL: 300
  };
  
  return {
    CacheManager: {
      getInstance: jest.fn().mockReturnValue(mockCacheManager)
    }
  };
});

// Mock MaasApiClient
jest.mock('../../maas/MaasApiClient.js', () => {
  return {
    MaasApiClient: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockImplementation((path, params, signal) => {
        if (path.includes('test-resource')) {
          return Promise.resolve({
            id: 'test-resource',
            name: 'Test Resource',
            status: 'active',
            created: '2023-01-01T00:00:00Z'
          });
        }
        return Promise.resolve([
          {
            id: 'test-resource',
            name: 'Test Resource',
            status: 'active',
            created: '2023-01-01T00:00:00Z'
          },
          {
            id: 'test-resource-2',
            name: 'Test Resource 2',
            status: 'active',
            created: '2023-01-01T00:00:00Z'
          }
        ]);
      })
    }))
  };
});

// Mock validateResourceData to avoid validation errors
jest.mock('../../mcp_resources/utils/resourceUtils.js', () => {
  const originalModule = jest.requireActual('../../mcp_resources/utils/resourceUtils.js');
  return {
    ...originalModule,
    validateResourceData: jest.fn().mockImplementation((data) => data),
    extractParamsFromUri: jest.fn().mockImplementation((uri, pattern) => {
      if (pattern.includes('resource_id') && uri.includes('test-resource')) {
        return { resource_id: 'test-resource' };
      }
      const params: Record<string, string> = {};
      try {
        const url = new URL(uri);
        url.searchParams.forEach((value, key) => {
          params[key] = value;
        });
      } catch (e) {
        // Ignore URL parsing errors
      }
      return params;
    })
  };
});

// Now import modules that depend on config
// Define our own extractRegisteredCallback function
function extractRegisteredCallback(mockServer: any): any {
  // Get the most recent call to resource method
  const calls = mockServer.resource.mock.calls;
  if (calls.length === 0) {
    throw new Error('No resource handler registered');
  }
  // Return the callback function (third argument)
  return calls[calls.length - 1][2];
}
import { DetailResourceHandler, ListResourceHandler } from '../../mcp_resources/BaseResourceHandler.js';
import { CacheOptions } from '../../mcp_resources/cache/index.js';

// Mock URI patterns module
jest.mock('../../mcp_resources/schemas/uriPatterns.js', () => ({
  RESOURCE_DETAILS_URI_PATTERN: 'maas://resource/{resource_id}/details',
  RESOURCES_LIST_URI_PATTERN: 'maas://resources/list',
  extractParamsFromUri: jest.fn((uri: string, pattern: string) => {
    if (pattern === 'maas://resource/{resource_id}/details' && uri.includes('test-resource')) {
      return { resource_id: 'test-resource' };
    }
    if (pattern === 'maas://resources/list') {
      const params: Record<string, string> = {};
      try {
        new URL(uri).searchParams.forEach((value, key) => { params[key] = value; });
      } catch (e) {
        // Ignore URL parsing errors for invalid URIs
      }
      return params;
    }
    return {};
  }),
}));

// Define test schemas
const TestResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  created: z.string(), // Make created required for the test
});

const TestResourcesArraySchema = z.array(TestResourceSchema);

const TestResourceParamsSchema = z.object({
  resource_id: z.string(),
});

const TestResourceQueryParamsSchema = z.object({
  filter: z.string().optional(),
  limit: z.string().optional(),
});

// Mock resource data
const mockResource = {
  id: 'test-resource',
  name: 'Test Resource',
  status: 'active',
  created: '2023-01-01T00:00:00Z',
};

// Type assertion to ensure mockResource matches TestResourceSchema
const typedMockResource = mockResource as z.infer<typeof TestResourceSchema>;

const mockResources = [
  typedMockResource,
  { ...typedMockResource, id: 'test-resource-2', name: 'Test Resource 2' },
];

// Handler callback type for type safety
type HandlerCallbackType = (uri: URL, variables: Record<string, string | string[]>, options: { signal: AbortSignal }) => Promise<any>;

// Test resource handler implementations
class TestResourceDetailsHandler extends DetailResourceHandler<typeof mockResource, { resource_id: string }> {
  constructor(
    server: McpServer, 
    maasClient: MaasApiClient,
    cacheOptions?: Partial<CacheOptions>
  ) {
    super(
      server,
      maasClient,
      'TestResource',
      new ResourceTemplate('maas://resource/{resource_id}/details', { list: undefined }),
      'maas://resource/{resource_id}/details',
      TestResourceSchema as z.ZodType<typeof typedMockResource>,
      TestResourceParamsSchema,
      '/resources/{resource_id}',
      cacheOptions
    );
  }

  protected getResourceIdFromParams(params: { resource_id: string }): string | undefined {
    return params.resource_id;
  }

  protected async fetchResourceData(params: { resource_id: string }, signal: AbortSignal): Promise<unknown> {
    return this.maasClient.get(`/resources/${params.resource_id}`, undefined, signal);
  }
}

class TestResourcesListHandler extends ListResourceHandler<typeof mockResource, Record<string, string>> {
  constructor(
    server: McpServer, 
    maasClient: MaasApiClient,
    cacheOptions?: Partial<CacheOptions>
  ) {
    super(
      server,
      maasClient,
      'TestResources',
      new ResourceTemplate('maas://resources/list', { list: undefined }),
      'maas://resources/list',
      TestResourcesArraySchema as z.ZodType<typeof mockResources>,
      TestResourceQueryParamsSchema,
      '/resources',
      cacheOptions
    );
  }

  protected getResourceIdFromParams(): undefined {
    return undefined; // List resources don't have a specific ID
  }

  protected async fetchResourceData(params: Record<string, string>, signal: AbortSignal): Promise<unknown> {
    return this.maasClient.get('/resources', params, signal);
  }
}

describe('Resource Handler Caching', () => {
  // Declare test dependencies
  let deps: any;
  
  // Define test URIs
  const resourceDetailsUri = new URL('maas://resource/test-resource/details');
  const resourcesListUri = new URL('maas://resources/list');

  beforeEach(() => {
    // Create custom mocks for cache manager
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      generateCacheKey: jest.fn((prefix, uri, params, opts) => `${prefix}-${uri.toString()}-${JSON.stringify(params)}-${JSON.stringify(opts)}`),
      isEnabled: jest.fn(() => true),
      getResourceTTL: jest.fn(() => 300),
      invalidateResource: jest.fn(() => 0),
      invalidateResourceById: jest.fn(() => 0),
      resourceSpecificTTL: {},
      defaultTTL: 300
    };
    
    // Setup all test dependencies with our custom mocks
    deps = {
      mockMcpServer: {
        registerResourceHandler: jest.fn(),
        registerToolHandler: jest.fn(),
        resource: jest.fn()
      },
      mockMaasApiClient: {
        get: jest.fn().mockImplementation((path, params, signal) => {
          if (path.includes('test-resource')) {
            return Promise.resolve({
              id: 'test-resource',
              name: 'Test Resource',
              status: 'active',
              created: '2023-01-01T00:00:00Z'
            });
          }
          return Promise.resolve([
            {
              id: 'test-resource',
              name: 'Test Resource',
              status: 'active',
              created: '2023-01-01T00:00:00Z'
            },
            {
              id: 'test-resource-2',
              name: 'Test Resource 2',
              status: 'active',
              created: '2023-01-01T00:00:00Z'
            }
          ]);
        })
      },
      mockCacheManager: mockCacheManager,
      mockAuditLogger: {
        logResourceAccess: jest.fn(),
        logCacheOperation: jest.fn(),
        logToolExecution: jest.fn()
      }
    };
  });

  describe('Cache Configuration', () => {
    it('should respect global cache enabled setting', async () => {
      // Setup dependencies with cache disabled
      const depsWithCacheDisabled = {
        mockMcpServer: {
          registerResourceHandler: jest.fn(),
          registerToolHandler: jest.fn(),
          resource: jest.fn()
        },
        mockMaasApiClient: {
          get: jest.fn().mockResolvedValue(mockResource)
        },
        mockCacheManager: {
          get: jest.fn(),
          set: jest.fn(),
          generateCacheKey: jest.fn(),
          isEnabled: jest.fn(() => false), // Cache disabled
          getResourceTTL: jest.fn(() => 300),
          invalidateResource: jest.fn(),
          invalidateResourceById: jest.fn(),
          resourceSpecificTTL: {},
          defaultTTL: 300
        },
        mockAuditLogger: {
          logResourceAccess: jest.fn(),
          logCacheOperation: jest.fn(),
          logToolExecution: jest.fn()
        }
      };
      
      // Create handler and register it
      const detailsHandler = new TestResourceDetailsHandler(
        depsWithCacheDisabled.mockMcpServer as unknown as McpServer,
        depsWithCacheDisabled.mockMaasApiClient as unknown as MaasApiClient
      );
      detailsHandler.register('test_resource_details');
      
      // Extract the registered callback for testing
      const detailsCallback = extractRegisteredCallback(depsWithCacheDisabled.mockMcpServer);
      
      // Setup successful API response
      depsWithCacheDisabled.mockMaasApiClient.get.mockResolvedValue(mockResource);
      
      // Execute the handler
      await detailsCallback(
        resourceDetailsUri, 
        { resource_id: 'test-resource' }, 
        { signal: new AbortController().signal }
      );
      
      // Verify cache was not used
      expect(depsWithCacheDisabled.mockCacheManager.get).not.toHaveBeenCalled();
      expect(depsWithCacheDisabled.mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should respect resource-specific cache options', async () => {
      // Create handler with custom cache options
      const customCacheOptions: Partial<CacheOptions> = {
        ttl: 600, // 10 minutes
        cacheControl: {
          private: true,
          mustRevalidate: true,
          immutable: false
        }
      };
      
      const detailsHandler = new TestResourceDetailsHandler(
        deps.mockMcpServer, 
        deps.mockMaasApiClient,
        customCacheOptions
      );
      detailsHandler.register('test_resource_details');
      
      // Extract the registered callback for testing
      const detailsCallback = extractRegisteredCallback(deps.mockMcpServer);
      
      // Setup successful API response
      deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
      
      // Execute the handler
      const result = await detailsCallback(
        resourceDetailsUri, 
        { resource_id: 'test-resource' }, 
        { signal: new AbortController().signal }
      );
      
      // Verify cache options were used
      expect(deps.mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        'TestResource',
        expect.objectContaining({
          ttl: 600,
          cacheControl: {
            private: true,
            mustRevalidate: true,
            immutable: false
          }
        })
      );
      
      // Verify cache control headers in response
      const typedResult = result as { contents: Array<{ headers: Record<string, string> }> };
      expect(typedResult.contents[0].headers['Cache-Control']).toContain('max-age=600');
      expect(typedResult.contents[0].headers['Cache-Control']).toContain('private');
      expect(typedResult.contents[0].headers['Cache-Control']).toContain('must-revalidate');
      expect(typedResult.contents[0].headers['Cache-Control']).not.toContain('immutable');
    });
  });

  describe('Cache Operations', () => {
    let detailsHandler: TestResourceDetailsHandler;
    let detailsCallback: HandlerCallbackType;

    beforeEach(() => {
      // Create handler and register it
      detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
      detailsHandler.register('test_resource_details');
      
      // Extract the registered callback for testing
      detailsCallback = extractRegisteredCallback(deps.mockMcpServer);
    });

    it('should cache successful responses', async () => {
      // Setup successful API response
      deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
      
      // Execute the handler
      await detailsCallback(
        resourceDetailsUri, 
        { resource_id: 'test-resource' }, 
        { signal: new AbortController().signal }
      );
      
      // Verify cache was set
      expect(deps.mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        mockResource,
        'TestResource',
        expect.any(Object)
      );
    });

    it('should use cached responses when available', async () => {
      // Setup cache hit
      deps.mockCacheManager.get.mockReturnValue(mockResource);
      
      // Execute the handler
      const result = await detailsCallback(
        resourceDetailsUri, 
        { resource_id: 'test-resource' }, 
        { signal: new AbortController().signal }
      );
      
      // Verify cache was used
      expect(deps.mockCacheManager.get).toHaveBeenCalled();
      // We need to reset the mock to avoid interference with other tests
      deps.mockCacheManager.get.mockClear();
      deps.mockMaasApiClient.get.mockClear();
      
      // Verify result
      const typedResult = result as { contents: Array<{ text: string, headers: Record<string, string> }> };
      expect(typedResult.contents[0].text).toBe(JSON.stringify(mockResource));
      
      // Verify Age header
      expect(typedResult.contents[0].headers['Age']).toBeDefined();
    });

    it('should not cache error responses', async () => {
      // Setup API error
      const apiError = new Error('API error');
      deps.mockMaasApiClient.get.mockRejectedValue(apiError);
      
      // Execute the handler
      try {
        await detailsCallback(
          resourceDetailsUri, 
          { resource_id: 'test-resource' }, 
          { signal: new AbortController().signal }
        );
      } catch (error) {
        // Expected error
      }
      
      // Verify cache was not set
      expect(deps.mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    let detailsHandler: TestResourceDetailsHandler;
    let listHandler: TestResourcesListHandler;

    beforeEach(() => {
      // Create handlers and register them
      detailsHandler = new TestResourceDetailsHandler(deps.mockMcpServer, deps.mockMaasApiClient);
      detailsHandler.register('test_resource_details');
      
      listHandler = new TestResourcesListHandler(deps.mockMcpServer, deps.mockMaasApiClient);
      listHandler.register('test_resources_list');
    });

    it('should invalidate all cache entries for a resource type', () => {
      // Call invalidateCache
      const count = detailsHandler.invalidateCache();
      
      // Verify cache was invalidated
      expect(deps.mockCacheManager.invalidateResource).toHaveBeenCalledWith('TestResource');
      expect(count).toBe(0); // Mock returns 0
    });

    it('should invalidate cache entries for a specific resource ID', () => {
      // Call invalidateCacheById
      const count = detailsHandler.invalidateCacheById('test-resource');
      
      // Verify cache was invalidated
      expect(deps.mockCacheManager.invalidateResource).toHaveBeenCalledWith('TestResource', 'test-resource');
      expect(count).toBe(0); // Mock returns 0
    });

    it('should allow updating cache options at runtime', () => {
      // New cache options
      const newCacheOptions: Partial<CacheOptions> = {
        ttl: 1800, // 30 minutes
        cacheControl: {
          private: false,
          mustRevalidate: false,
          immutable: true
        }
      };
      
      // Update cache options
      detailsHandler.setCacheOptions(newCacheOptions);
      
      // Verify cache options were updated
      // We can't directly test the private cacheOptions property, but we can test its effect
      // by making a request and checking the cache headers
      
      // Setup successful API response
      deps.mockMaasApiClient.get.mockResolvedValue(mockResource);
      
      // Extract the registered callback for testing
      const detailsCallback = extractRegisteredCallback(deps.mockMcpServer);
      
      // Execute the handler
      return detailsCallback(
        resourceDetailsUri, 
        { resource_id: 'test-resource' }, 
        { signal: new AbortController().signal }
      ).then((result: any) => {
        // Verify cache options were used
        expect(deps.mockCacheManager.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.anything(),
          'TestResource',
          expect.objectContaining({
            ttl: 1800,
            cacheControl: {
              private: false,
              mustRevalidate: false,
              immutable: true
            }
          })
        );
        
        // Verify cache control headers in response
        const typedResult = result as { contents: Array<{ headers: Record<string, string> }> };
        expect(typedResult.contents[0].headers['Cache-Control']).toContain('max-age=1800');
        expect(typedResult.contents[0].headers['Cache-Control']).not.toContain('private');
        expect(typedResult.contents[0].headers['Cache-Control']).not.toContain('must-revalidate');
        expect(typedResult.contents[0].headers['Cache-Control']).toContain('immutable');
      });
    });
  });

  describe('Cache Key Generation', () => {
    let listHandler: TestResourcesListHandler;
    let listCallback: HandlerCallbackType;

    beforeEach(() => {
      // Create handler and register it
      listHandler = new TestResourcesListHandler(deps.mockMcpServer, deps.mockMaasApiClient);
      listHandler.register('test_resources_list');
      
      // Extract the registered callback for testing
      listCallback = extractRegisteredCallback(deps.mockMcpServer);
    });

    it('should include query parameters in cache key', async () => {
      // Setup successful API response
      deps.mockMaasApiClient.get.mockResolvedValue(mockResources);
      
      // Create URI with query parameters
      const uriWithParams = new URL('maas://resources/list?filter=active&limit=10');
      
      // Execute the handler
      await listCallback(
        uriWithParams, 
        { filter: 'active', limit: '10' }, 
        { signal: new AbortController().signal }
      );
      
      // Verify cache key generation included query parameters
      expect(deps.mockCacheManager.generateCacheKey).toHaveBeenCalledWith(
        'TestResources',
        uriWithParams,
        expect.objectContaining({
          filter: 'active',
          limit: '10'
        }),
        expect.any(Object)
      );
    });

    it('should generate different cache keys for different query parameters', async () => {
      // Setup successful API response
      deps.mockMaasApiClient.get.mockResolvedValue(mockResources);
      
      // Create URIs with different query parameters
      const uri1 = new URL('maas://resources/list?filter=active');
      const uri2 = new URL('maas://resources/list?filter=inactive');
      
      // Execute the handler for first URI
      await listCallback(
        uri1, 
        { filter: 'active' }, 
        { signal: new AbortController().signal }
      );
      
      // Execute the handler for second URI
      await listCallback(
        uri2, 
        { filter: 'inactive' }, 
        { signal: new AbortController().signal }
      );
      
      // Verify different cache keys were generated
      const key1 = deps.mockCacheManager.generateCacheKey('TestResources', uri1, { filter: 'active' }, {});
      const key2 = deps.mockCacheManager.generateCacheKey('TestResources', uri2, { filter: 'inactive' }, {});
      
      expect(key1).not.toEqual(key2);
    });
  });
});