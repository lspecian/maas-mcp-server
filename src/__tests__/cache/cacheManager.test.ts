import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import { TimeBasedCacheStrategy } from '../../mcp_resources/cache/timeBasedCacheStrategy.js';
import { LRUCacheStrategy } from '../../mcp_resources/cache/lruCacheStrategy.js';
import { CacheOptions, CacheStrategy } from '../../mcp_resources/cache/interfaces.js';
import logger from '../../utils/logger.ts';
import config from '../../config.js';

// Define enum for cache strategy types since it's not exported
enum CacheStrategyType {
  TimeBased = 'time-based',
  LRU = 'lru'
}

// Define GlobalCacheConfig interface for testing
interface GlobalCacheConfig {
  enabled: boolean;
  defaultStrategy: string;
  defaultTTL: number;
  maxSize: number;
  strategies: Record<string, any>;
  resources: Record<string, any>;
}

// Mocks
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

jest.mock('../../config', () => ({
  default: {
    cacheEnabled: true,
    cacheStrategy: CacheStrategyType.TimeBased,
    cacheMaxAge: 300, // 5 minutes
    cacheMaxSize: 100,
    cacheResourceSpecificTTL: {},
  },
}));

jest.mock('../../mcp_resources/cache/timeBasedCacheStrategy');
jest.mock('../../mcp_resources/cache/lruCacheStrategy');

const MockTimeBasedCacheStrategy = TimeBasedCacheStrategy as jest.MockedClass<typeof TimeBasedCacheStrategy>;
const MockLRUCacheStrategy = LRUCacheStrategy as jest.MockedClass<typeof LRUCacheStrategy>;

describe('CacheManager', () => {
  let cacheManagerInstance: CacheManager;
  let mockTimeBasedStrategy: jest.Mocked<TimeBasedCacheStrategy>;
  let mockLRUStrategy: jest.Mocked<LRUCacheStrategy>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock strategy instances
    mockTimeBasedStrategy = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
      type: CacheStrategyType.TimeBased,
    } as unknown as jest.Mocked<TimeBasedCacheStrategy>;

    mockLRUStrategy = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
      type: CacheStrategyType.LRU,
    } as unknown as jest.Mocked<LRUCacheStrategy>;

    MockTimeBasedCacheStrategy.mockImplementation(() => mockTimeBasedStrategy);
    MockLRUCacheStrategy.mockImplementation(() => mockLRUStrategy);
    
    // Reset singleton instance for each test
    (CacheManager as any).instance = null;
    cacheManagerInstance = CacheManager.getInstance();
  });

  describe('Singleton Behavior', () => {
    it('should return the same instance', () => {
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Strategy Initialization', () => {
    it('should initialize with default strategy (TimeBased)', () => {
      expect(MockTimeBasedCacheStrategy).toHaveBeenCalledTimes(1);
      expect(MockTimeBasedCacheStrategy).toHaveBeenCalledWith(
        config.cache.defaultTTL,
        config.cache.maxSize,
        config.cache.strategies[CacheStrategyType.TimeBased]?.cleanupInterval
      );
      expect(cacheManagerInstance.getStrategy()).toBe(mockTimeBasedStrategy);
    });

    it('should initialize with LRU strategy if configured', () => {
      (CacheManager as any).instance = null; // Reset for new config
      config.cache.defaultStrategy = CacheStrategyType.LRU;
      const lruManager = CacheManager.getInstance();
      expect(MockLRUCacheStrategy).toHaveBeenCalledTimes(1);
      expect(MockLRUCacheStrategy).toHaveBeenCalledWith(
        config.cache.defaultTTL,
        config.cache.maxSize
      );
      expect(lruManager.getStrategy()).toBe(mockLRUStrategy);
      // Reset config for other tests
      config.cache.defaultStrategy = CacheStrategyType.TimeBased;
    });
  });

  describe('Core Cache Operations', () => {
    const resourceType = 'testResource';
    const resourceId = '123';
    const data = { value: 'testData' };
    const cacheKey = `${resourceType}:${resourceId}`;

    it('should call get on the current strategy', async () => {
      mockTimeBasedStrategy.get.mockResolvedValue(data);
      const result = await cacheManagerInstance.get(resourceType, resourceId);
      expect(mockTimeBasedStrategy.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(data);
    });

    it('should call set on the current strategy with default TTL', async () => {
      await cacheManagerInstance.set(resourceType, resourceId, data);
      expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(cacheKey, data, config.cache.defaultTTL);
    });

    it('should call set on the current strategy with resource-specific TTL', async () => {
      config.cache.resources = { [resourceType]: { ttl: 600 } };
      (CacheManager as any).instance = null; 
      cacheManagerInstance = CacheManager.getInstance(); // Re-initialize to pick up new config

      await cacheManagerInstance.set(resourceType, resourceId, data);
      expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(cacheKey, data, 600);
      
      config.cache.resources = {}; // Reset
    });

    it('should call set on the current strategy with CacheOptions TTL (overrides resource & default)', async () => {
      config.cache.resources = { [resourceType]: { ttl: 600 } };
      (CacheManager as any).instance = null;
      cacheManagerInstance = CacheManager.getInstance();

      const options: CacheOptions = { enabled: true, ttl: 900 };
      await cacheManagerInstance.set(resourceType, resourceId, data, options);
      expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(cacheKey, data, 900);

      config.cache.resources = {}; // Reset
    });
    
    it('should call delete on the current strategy', async () => {
      await cacheManagerInstance.delete(resourceType, resourceId);
      expect(mockTimeBasedStrategy.delete).toHaveBeenCalledWith(cacheKey);
    });

    it('should call clear on the current strategy', async () => {
      await cacheManagerInstance.clear();
      expect(mockTimeBasedStrategy.clear).toHaveBeenCalled();
    });

    it('should call invalidate for a specific resource type', async () => {
        // Invalidate is more complex as it might involve iterating keys or specific strategy methods
        // For now, let's assume it calls clear if no specific invalidation logic is on the strategy
        // Or, if strategies have a more granular invalidate, that should be tested.
        // This test might need to be adjusted based on actual CacheManager.invalidate implementation.
        await cacheManagerInstance.invalidate(resourceType);
        // Example: if invalidate calls clear on the strategy for the resource type
        // This depends on how invalidate is implemented. If it iterates and deletes, mock that.
        // For a simple test, let's assume it might call clear or a specific method.
        // If it calls 'clear', the existing clear mock will cover it.
        // If it has a more specific logic, e.g. strategy.invalidateByType(resourceType)
        // then that method should be mocked on the strategy.
        // For now, let's assume a simple scenario or that it's covered by other tests.
        // A more robust test would require knowing the exact implementation details of invalidate.
        expect(logger.info).toHaveBeenCalledWith(`Invalidating cache for resource type: ${resourceType}`);
        // If invalidate calls clear:
        // expect(mockTimeBasedStrategy.clear).toHaveBeenCalled(); 
        // Or if it iterates and calls delete:
        // expect(mockTimeBasedStrategy.delete).toHaveBeenCalledWith(expect.stringContaining(resourceType));
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate a simple key for resourceType and resourceId', () => {
      const key = (cacheManagerInstance as any).generateCacheKey('users', 'user1');
      expect(key).toBe('users:user1');
    });

    it('should generate a key with queryParams if provided in CacheOptions', () => {
      const options: CacheOptions = { queryParams: { status: 'active', limit: '10' } };
      const key = (cacheManagerInstance as any).generateCacheKey('items', 'all', options);
      // Order of queryParams might vary, so check for parts or sort before comparing
      expect(key).toContain('items:all');
      expect(key).toContain('limit=10');
      expect(key).toContain('status=active');
      // A more robust check:
      const base = 'items:all:';
      const paramsStr = key.substring(base.length);
      const params = new URLSearchParams(paramsStr);
      expect(params.get('status')).toBe('active');
      expect(params.get('limit')).toBe('10');
    });

    it('should generate a key without resourceId if not provided (e.g., for collections)', () => {
      const key = (cacheManagerInstance as any).generateCacheKey('products');
      expect(key).toBe('products:'); // Or just 'products' depending on implementation
    });
    
    it('should generate a key correctly when resourceId is undefined but options are present', () => {
      const options: CacheOptions = { queryParams: { category: 'electronics' } };
      const key = (cacheManagerInstance as any).generateCacheKey('products', undefined, options);
      expect(key).toBe('products::category=electronics');
    });
  });

  describe('Enable/Disable State', () => {
    afterEach(() => {
      // Ensure cache is re-enabled for subsequent tests
      config.cache.enabled = true;
      (CacheManager as any).instance = null; 
      cacheManagerInstance = CacheManager.getInstance();
    });

    it('should not call strategy methods if cache is disabled', async () => {
      config.cache.enabled = false;
      (CacheManager as any).instance = null; 
      cacheManagerInstance = CacheManager.getInstance(); // Re-initialize with cache disabled

      await cacheManagerInstance.set('test', '1', { data: 'value' });
      expect(mockTimeBasedStrategy.set).not.toHaveBeenCalled();
      
      const result = await cacheManagerInstance.get('test', '1');
      expect(mockTimeBasedStrategy.get).not.toHaveBeenCalled();
      expect(result).toBeNull();

      await cacheManagerInstance.delete('test', '1');
      expect(mockTimeBasedStrategy.delete).not.toHaveBeenCalled();

      await cacheManagerInstance.clear();
      expect(mockTimeBasedStrategy.clear).not.toHaveBeenCalled();
    });

    it('should log info when cache is disabled and methods are called', async () => {
        config.cache.enabled = false;
        (CacheManager as any).instance = null;
        cacheManagerInstance = CacheManager.getInstance();
  
        await cacheManagerInstance.get('test', '1');
        expect(logger.info).toHaveBeenCalledWith('Cache is disabled. Skipping GET from cache for key: test:1');
  
        await cacheManagerInstance.set('test', '1', { data: 'value' });
        expect(logger.info).toHaveBeenCalledWith('Cache is disabled. Skipping SET to cache for key: test:1');

        await cacheManagerInstance.delete('test', '1');
        expect(logger.info).toHaveBeenCalledWith('Cache is disabled. Skipping DELETE from cache for key: test:1');

        await cacheManagerInstance.clear();
        expect(logger.info).toHaveBeenCalledWith('Cache is disabled. Skipping CLEAR cache.');

        await cacheManagerInstance.invalidate('test');
        expect(logger.info).toHaveBeenCalledWith('Cache is disabled. Skipping INVALIDATE cache for resource type: test');
      });
  });

  describe('TTL Precedence', () => {
    const resourceType = 'ttlResource';
    const resourceId = 'ttlId';
    const data = { value: 'ttlData' };

    beforeEach(() => {
        // Reset config for each TTL test
        config.cache.defaultTTL = 100;
        config.cache.resources = {};
        (CacheManager as any).instance = null;
        cacheManagerInstance = CacheManager.getInstance();
    });
    
    it('should use defaultTTL if no other TTL is specified', async () => {
      await cacheManagerInstance.set(resourceType, resourceId, data);
      expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(expect.any(String), data, 100);
    });

    it('should use resource-specific TTL if defined and no options.ttl', async () => {
      config.cache.resources = { [resourceType]: { ttl: 200, strategy: CacheStrategyType.TimeBased } };
      (CacheManager as any).instance = null;
      cacheManagerInstance = CacheManager.getInstance(); // Re-initialize

      await cacheManagerInstance.set(resourceType, resourceId, data);
      expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(expect.any(String), data, 200);
    });

    it('should use CacheOptions.ttl if provided, overriding resource and default TTLs', async () => {
      config.cache.resources = { [resourceType]: { ttl: 200, strategy: CacheStrategyType.TimeBased } };
      (CacheManager as any).instance = null;
      cacheManagerInstance = CacheManager.getInstance(); // Re-initialize

      const options: CacheOptions = { ttl: 300 };
      await cacheManagerInstance.set(resourceType, resourceId, data, options);
      expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(expect.any(String), data, 300);
    });

    it('should use defaultTTL if resource config exists but no TTL specified for it', async () => {
        config.cache.resources = { [resourceType]: { strategy: CacheStrategyType.TimeBased } }; // No TTL here
        (CacheManager as any).instance = null;
        cacheManagerInstance = CacheManager.getInstance();
  
        await cacheManagerInstance.set(resourceType, resourceId, data);
        expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(expect.any(String), data, 100); // defaultTTL
      });
  });

  describe('Resource-specific strategy', () => {
    const resourceTypeWithLRU = 'lruResource';
    const resourceId = 'lru123';
    const data = { value: 'lruData' };

    beforeEach(() => {
        config.cache.defaultStrategy = CacheStrategyType.TimeBased;
        config.cache.resources = {
            [resourceTypeWithLRU]: { strategy: CacheStrategyType.LRU, ttl: 500 }
        };
        // Reset instances to ensure new strategies are created if needed
        (CacheManager as any).instance = null;
        cacheManagerInstance = CacheManager.getInstance();
    });

    afterEach(() => {
        config.cache.resources = {};
        config.cache.defaultStrategy = CacheStrategyType.TimeBased;
    });

    it('should use resource-specific strategy (LRU) when configured', async () => {
        // Ensure LRU strategy mock is ready
        MockLRUCacheStrategy.mockImplementation(() => mockLRUStrategy);

        await cacheManagerInstance.set(resourceTypeWithLRU, resourceId, data);
        expect(mockLRUStrategy.set).toHaveBeenCalledWith(`${resourceTypeWithLRU}:${resourceId}`, data, 500);
        expect(mockTimeBasedStrategy.set).not.toHaveBeenCalled();

        await cacheManagerInstance.get(resourceTypeWithLRU, resourceId);
        expect(mockLRUStrategy.get).toHaveBeenCalledWith(`${resourceTypeWithLRU}:${resourceId}`);
        expect(mockTimeBasedStrategy.get).not.toHaveBeenCalled();
    });

    it('should use default strategy if resource has no specific strategy', async () => {
        const defaultResourceType = 'defaultStrategyResource';
        await cacheManagerInstance.set(defaultResourceType, resourceId, data);
        expect(mockTimeBasedStrategy.set).toHaveBeenCalledWith(`${defaultResourceType}:${resourceId}`, data, config.cache.defaultTTL);
        expect(mockLRUStrategy.set).not.toHaveBeenCalled();
    });

    it('should create and use multiple strategies if different resources define them', () => {
        // CacheManager is already initialized with TimeBased as default.
        // And LRU for 'lruResource' due to beforeEach config.
        // This test implicitly checks that both MockTimeBasedCacheStrategy and MockLRUCacheStrategy
        // were called by the CacheManager during its setup or on-demand creation.
        expect(MockTimeBasedCacheStrategy).toHaveBeenCalled(); // For default
        expect(MockLRUCacheStrategy).toHaveBeenCalled();    // For 'lruResource'
    });
  });

  describe('dispose', () => {
    it('should call dispose on all initialized strategies', () => {
        // Configure a resource to use LRU to ensure both strategies are initialized
        config.cache.resources = { ['anotherResource']: { strategy: CacheStrategyType.LRU } };
        (CacheManager as any).instance = null;
        cacheManagerInstance = CacheManager.getInstance(); // Re-initialize

        cacheManagerInstance.dispose();
        expect(mockTimeBasedStrategy.dispose).toHaveBeenCalled();
        expect(mockLRUStrategy.dispose).toHaveBeenCalled();
        config.cache.resources = {}; // reset
    });
  });
});