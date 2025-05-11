/**
 * Mock factory for CacheManager
 * Provides configurable mock implementations of the CacheManager for testing
 */
import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import { CacheEntry, CacheOptions } from '../../mcp_resources/cache/interfaces.js';

/**
 * Mock data for cache entries
 */
export const mockCacheEntry: CacheEntry<any> = {
  value: { id: 'mock-cache-value' },
  key: 'mock-cache-key',
  createdAt: Date.now(),
  expiresAt: Date.now() + 300000
};

/**
 * Configuration options for the mock cache manager
 */
export interface MockCacheManagerOptions {
  // Whether the cache is enabled
  enabled?: boolean;
  // Default TTL for cache entries
  defaultTTL?: number;
  // Resource-specific TTLs
  resourceSpecificTTL?: Record<string, number>;
  // Whether get() should return a value
  getCacheHit?: boolean;
  // Value to return from get()
  getCacheValue?: any;
  // Whether set() should return a value
  setCacheSuccess?: boolean;
  // Whether to simulate errors
  simulateErrors?: boolean;
  // Custom key generator function
  customKeyGenerator?: (uri: URL, params: Record<string, any>) => string;
}

/**
 * Creates a mock CacheManager with configurable behavior
 * 
 * @param options Configuration options for the mock cache manager
 * @returns A mocked CacheManager instance
 */
export function createMockCacheManager(options: MockCacheManagerOptions = {}): jest.Mocked<CacheManager> {
  const {
    enabled = true,
    defaultTTL = 300,
    resourceSpecificTTL = {},
    getCacheHit = false,
    getCacheValue = mockCacheEntry.value,
    setCacheSuccess = true,
    simulateErrors = false,
    customKeyGenerator
  } = options;

  // Create the mock instance
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    size: jest.fn(),
    invalidate: jest.fn(),
    invalidateResource: jest.fn(),
    invalidateResourceById: jest.fn(),
    isEnabled: jest.fn(),
    setEnabled: jest.fn(),
    getDefaultTTL: jest.fn(),
    setDefaultTTL: jest.fn(),
    getResourceTTL: jest.fn(),
    setResourceTTL: jest.fn(),
    generateCacheKey: jest.fn()
  } as unknown as jest.Mocked<CacheManager>;

  // Implement mock methods
  mockCacheManager.get.mockImplementation((key: string) => {
    if (!enabled || simulateErrors) {
      return undefined;
    }
    return getCacheHit ? getCacheValue : undefined;
  });

  mockCacheManager.set.mockImplementation((key: string, value: any, resourceName?: string, options?: CacheOptions) => {
    if (!enabled || !setCacheSuccess || simulateErrors) {
      return undefined;
    }
    const ttl = options?.ttl || (resourceName && resourceSpecificTTL[resourceName]) || defaultTTL;
    return {
      value,
      key,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttl * 1000),
      cacheControl: options?.cacheControl
    };
  });

  mockCacheManager.delete.mockReturnValue(!simulateErrors);
  mockCacheManager.clear.mockImplementation(() => {});
  mockCacheManager.size.mockReturnValue(simulateErrors ? 0 : 10);
  mockCacheManager.invalidate.mockReturnValue(simulateErrors ? 0 : 5);
  mockCacheManager.invalidateResource.mockReturnValue(simulateErrors ? 0 : 3);
  mockCacheManager.invalidateResourceById.mockReturnValue(simulateErrors ? 0 : 1);
  mockCacheManager.isEnabled.mockReturnValue(enabled);
  mockCacheManager.setEnabled.mockImplementation((value: boolean) => {});
  mockCacheManager.getDefaultTTL.mockReturnValue(defaultTTL);
  mockCacheManager.setDefaultTTL.mockImplementation((ttl: number) => {});
  mockCacheManager.getResourceTTL.mockImplementation((resourceName: string) => {
    return resourceSpecificTTL[resourceName] || defaultTTL;
  });
  mockCacheManager.setResourceTTL.mockImplementation((resourceName: string, ttl: number) => {});
  
  mockCacheManager.generateCacheKey.mockImplementation((resourceName: string, uri: URL, params: Record<string, any>, options?: CacheOptions) => {
    if (customKeyGenerator) {
      return customKeyGenerator(uri, params);
    }
    
    // Default implementation similar to the real one
    let key = `${resourceName}:${uri.pathname}`;
    
    // Add resource ID if available
    const resourceId = params.system_id || params.id || params.name;
    if (resourceId) {
      key += `:${resourceId}`;
    }
    
    // Add query parameters if configured
    if (options?.includeQueryParams && uri.search) {
      key += `:${uri.search}`;
    }
    
    return key;
  });

  return mockCacheManager;
}

/**
 * Predefined mock cache manager configurations
 */
export const mockCacheManagerConfigs = {
  // Default configuration with cache hits
  withHits: () => createMockCacheManager({ getCacheHit: true }),
  
  // Configuration with cache misses
  withMisses: () => createMockCacheManager({ getCacheHit: false }),
  
  // Configuration with cache disabled
  disabled: () => createMockCacheManager({ enabled: false }),
  
  // Configuration with errors
  withErrors: () => createMockCacheManager({ simulateErrors: true }),
  
  // Configuration with custom TTLs
  withCustomTTLs: (defaultTTL: number, resourceSpecificTTL: Record<string, number>) => 
    createMockCacheManager({ defaultTTL, resourceSpecificTTL })
};

/**
 * Setup a mock CacheManager instance for testing
 * This is a convenience function that creates a mock and sets it up as the singleton instance
 * 
 * @param options Configuration options for the mock cache manager
 * @returns The mocked CacheManager instance
 */
export function setupMockCacheManager(options: MockCacheManagerOptions = {}): jest.Mocked<CacheManager> {
  const mockInstance = createMockCacheManager(options);
  jest.spyOn(CacheManager, 'getInstance').mockReturnValue(mockInstance);
  return mockInstance;
}