"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockCacheManagerConfigs = exports.mockCacheEntry = void 0;
exports.createMockCacheManager = createMockCacheManager;
exports.setupMockCacheManager = setupMockCacheManager;
/**
 * Mock factory for CacheManager
 * Provides configurable mock implementations of the CacheManager for testing
 */
const cacheManager_js_1 = require("../../mcp_resources/cache/cacheManager.js");
/**
 * Mock data for cache entries
 */
exports.mockCacheEntry = {
    value: { id: 'mock-cache-value' },
    key: 'mock-cache-key',
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000
};
/**
 * Creates a mock CacheManager with configurable behavior
 *
 * @param options Configuration options for the mock cache manager
 * @returns A mocked CacheManager instance
 */
function createMockCacheManager(options = {}) {
    const { enabled = true, defaultTTL = 300, resourceSpecificTTL = {}, getCacheHit = false, getCacheValue = exports.mockCacheEntry.value, setCacheSuccess = true, simulateErrors = false, customKeyGenerator } = options;
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
    };
    // Implement mock methods
    mockCacheManager.get.mockImplementation((key) => {
        if (!enabled || simulateErrors) {
            return undefined;
        }
        return getCacheHit ? getCacheValue : undefined;
    });
    mockCacheManager.set.mockImplementation((key, value, resourceName, options) => {
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
    mockCacheManager.clear.mockImplementation(() => { });
    mockCacheManager.size.mockReturnValue(simulateErrors ? 0 : 10);
    mockCacheManager.invalidate.mockReturnValue(simulateErrors ? 0 : 5);
    mockCacheManager.invalidateResource.mockReturnValue(simulateErrors ? 0 : 3);
    mockCacheManager.invalidateResourceById.mockReturnValue(simulateErrors ? 0 : 1);
    mockCacheManager.isEnabled.mockReturnValue(enabled);
    mockCacheManager.setEnabled.mockImplementation((value) => { });
    mockCacheManager.getDefaultTTL.mockReturnValue(defaultTTL);
    mockCacheManager.setDefaultTTL.mockImplementation((ttl) => { });
    mockCacheManager.getResourceTTL.mockImplementation((resourceName) => {
        return resourceSpecificTTL[resourceName] || defaultTTL;
    });
    mockCacheManager.setResourceTTL.mockImplementation((resourceName, ttl) => { });
    mockCacheManager.generateCacheKey.mockImplementation((resourceName, uri, params, options) => {
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
exports.mockCacheManagerConfigs = {
    // Default configuration with cache hits
    withHits: () => createMockCacheManager({ getCacheHit: true }),
    // Configuration with cache misses
    withMisses: () => createMockCacheManager({ getCacheHit: false }),
    // Configuration with cache disabled
    disabled: () => createMockCacheManager({ enabled: false }),
    // Configuration with errors
    withErrors: () => createMockCacheManager({ simulateErrors: true }),
    // Configuration with custom TTLs
    withCustomTTLs: (defaultTTL, resourceSpecificTTL) => createMockCacheManager({ defaultTTL, resourceSpecificTTL })
};
/**
 * Setup a mock CacheManager instance for testing
 * This is a convenience function that creates a mock and sets it up as the singleton instance
 *
 * @param options Configuration options for the mock cache manager
 * @returns The mocked CacheManager instance
 */
function setupMockCacheManager(options = {}) {
    const mockInstance = createMockCacheManager(options);
    jest.spyOn(cacheManager_js_1.CacheManager, 'getInstance').mockReturnValue(mockInstance);
    return mockInstance;
}
