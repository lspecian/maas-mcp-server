import { CacheManager } from '../../mcp_resources/cache/cacheManager.js';
import { TimeBasedCacheStrategy } from '../../mcp_resources/cache/timeBasedCacheStrategy.js';
import { LRUCacheStrategy } from '../../mcp_resources/cache/lruCacheStrategy.js';
import config from '../../config.js';
import logger from '../../utils/logger.js';

// Mock dependencies
jest.mock('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }
}));

// Initial mock configuration
const mockConfig = {
  cacheEnabled: true,
  cacheStrategy: 'time-based',
  cacheMaxSize: 1000,
  cacheMaxAge: 300,
  cacheResourceSpecificTTL: {},
};

jest.mock('../../config.js', () => ({
  default: mockConfig
}));

describe('Cache Configuration Tests', () => {
  // Save original environment variables
  const originalEnv = { ...process.env };
  
  // Reset environment variables and clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Reset the singleton instance for each test
    (CacheManager as any).instance = null;
  });
  
  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Cache Strategy Selection', () => {
    it('should use time-based strategy by default', () => {
      // Create spies for the strategy classes
      const timeBasedSpy = jest.spyOn(TimeBasedCacheStrategy.prototype as any, 'set');
      const lruSpy = jest.spyOn(LRUCacheStrategy.prototype as any, 'set');
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify time-based strategy was used
      expect(timeBasedSpy).toHaveBeenCalled();
      expect(lruSpy).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Initialized time-based cache strategy', expect.any(Object));
    });

    it('should use LRU strategy when configured', () => {
      // Mock config to use LRU strategy
      (config as any).cacheStrategy = 'lru';
      
      // Create spies for the strategy classes
      const timeBasedSpy = jest.spyOn(TimeBasedCacheStrategy.prototype as any, 'set');
      const lruSpy = jest.spyOn(LRUCacheStrategy.prototype as any, 'set');
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify LRU strategy was used
      expect(lruSpy).toHaveBeenCalled();
      expect(timeBasedSpy).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Initialized LRU cache strategy', expect.any(Object));
    });

    it('should use strategy from environment variable', () => {
      // Set environment variable
      process.env.CACHE_STRATEGY = 'lru';
      
      // Update mock config
      mockConfig.cacheStrategy = process.env.CACHE_STRATEGY || 'time-based';
      
      // Reset the singleton instance to force re-initialization
      (CacheManager as any).instance = null;
      
      // Verify config uses environment variable
      expect(updatedConfig.cacheStrategy).toBe('lru');
      
      // Create spies for the strategy classes
      const timeBasedSpy = jest.spyOn(TimeBasedCacheStrategy.prototype as any, 'set');
      const lruSpy = jest.spyOn(LRUCacheStrategy.prototype as any, 'set');
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify LRU strategy was used
      expect(lruSpy).toHaveBeenCalled();
      expect(timeBasedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Default TTL Configuration', () => {
    it('should use default TTL from config', () => {
      // Set default TTL in config
      (config as any).cacheMaxAge = 300;
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify default TTL
      expect(cacheManager.getDefaultTTL()).toBe(300);
    });

    it('should use TTL from environment variable', () => {
      // Set environment variable
      process.env.CACHE_MAX_AGE = '600';
      
      // Update mock config
      mockConfig.cacheMaxAge = process.env.CACHE_MAX_AGE ? parseInt(process.env.CACHE_MAX_AGE) : 300;
      
      // Reset the singleton instance to force re-initialization
      (CacheManager as any).instance = null;
      
      // Verify config uses environment variable
      expect(updatedConfig.cacheMaxAge).toBe(600);
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify default TTL
      expect(cacheManager.getDefaultTTL()).toBe(600);
    });

    it('should affect cache expiration behavior', async () => {
      // Set a short TTL for testing
      (config as any).cacheMaxAge = 1; // 1 second
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Set a value in the cache
      const key = 'test-key';
      const value = { data: 'test-value' };
      cacheManager.set(key, value);
      
      // Verify value is in cache
      expect(cacheManager.get(key)).toEqual(value);
      
      // Advance time past TTL
      jest.useFakeTimers();
      jest.advanceTimersByTime(1500); // 1.5 seconds
      
      // Verify value is no longer in cache
      expect(cacheManager.get(key)).toBeUndefined();
      
      // Restore real timers
      jest.useRealTimers();
    });
  });

  describe('Max Size Configuration', () => {
    it('should use max size from config', () => {
      // Set max size in config
      (config as any).cacheMaxSize = 500;
      
      // Create spy for the strategy class
      const timeBasedSpy = jest.spyOn(TimeBasedCacheStrategy.prototype as any, 'set');
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify max size was used in initialization
      expect(logger.info).toHaveBeenCalledWith('Initialized time-based cache strategy', expect.objectContaining({
        maxSize: 500
      }));
      expect(logger.info).toHaveBeenCalledWith('Initialized time-based cache strategy', expect.objectContaining({
        maxSize: 500
      }));
    });

    it('should use max size from environment variable', () => {
      // Set environment variable
      process.env.CACHE_MAX_SIZE = '2000';
      
      // Update mock config
      mockConfig.cacheMaxSize = process.env.CACHE_MAX_SIZE ? parseInt(process.env.CACHE_MAX_SIZE) : 1000;
      
      // Reset the singleton instance to force re-initialization
      (CacheManager as any).instance = null;
      
      // Verify config uses environment variable
      expect(updatedConfig.cacheMaxSize).toBe(2000);
      
      // Create spy for the strategy class
      const timeBasedSpy = jest.spyOn(TimeBasedCacheStrategy.prototype as any, 'set');
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify max size was used in initialization
      expect(logger.info).toHaveBeenCalledWith('Initialized time-based cache strategy', expect.objectContaining({
        maxSize: 2000
      }));
    });

    it('should limit cache size and evict items when limit is reached', () => {
      // Set a small max size for testing
      (config as any).cacheMaxSize = 2;
      (config as any).cacheStrategy = 'lru'; // Use LRU for predictable eviction
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Add items to the cache
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      
      // Verify both items are in cache
      expect(cacheManager.get('key1')).toBe('value1');
      expect(cacheManager.get('key2')).toBe('value2');
      
      // Add another item to trigger eviction
      cacheManager.set('key3', 'value3');
      
      // Verify key1 was evicted (LRU)
      expect(cacheManager.get('key1')).toBeUndefined();
      expect(cacheManager.get('key2')).toBe('value2');
      expect(cacheManager.get('key3')).toBe('value3');
    });
  });

  describe('Resource-Specific TTL Configuration', () => {
    it('should use resource-specific TTL when available', () => {
      // Set resource-specific TTL in config
      (config as any).cacheResourceSpecificTTL = {
        'TestResource': 60
      };
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Set a value in the cache with resource name
      const key = 'test-key';
      const value = { data: 'test-value' };
      cacheManager.set(key, value, 'TestResource');
      
      // Verify resource-specific TTL was used
      expect(cacheManager.getResourceTTL('TestResource')).toBe(60);
    });

    it('should use resource-specific TTL from environment variable', () => {
      // Set environment variable
      process.env.CACHE_RESOURCE_SPECIFIC_TTL = '{"TestResource": 120}';
      
      // Update mock config
      mockConfig.cacheResourceSpecificTTL = process.env.CACHE_RESOURCE_SPECIFIC_TTL ?
        JSON.parse(process.env.CACHE_RESOURCE_SPECIFIC_TTL) : {};
      
      // Reset the singleton instance to force re-initialization
      (CacheManager as any).instance = null;
      
      // Verify config uses environment variable
      expect(updatedConfig.cacheResourceSpecificTTL).toEqual({
        'TestResource': 120
      });
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify resource-specific TTL
      expect(cacheManager.getResourceTTL('TestResource')).toBe(120);
    });

    it('should override default TTL with resource-specific TTL', () => {
      // Set default and resource-specific TTL in config
      (config as any).cacheMaxAge = 300;
      (config as any).cacheResourceSpecificTTL = {
        'TestResource': 60
      };
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify TTL precedence
      expect(cacheManager.getDefaultTTL()).toBe(300);
      expect(cacheManager.getResourceTTL('TestResource')).toBe(60);
      expect(cacheManager.getResourceTTL('OtherResource')).toBe(300); // Falls back to default
    });
  });

  describe('Enable/Disable Caching', () => {
    it('should be enabled by default', () => {
      // Set config to default
      (config as any).cacheEnabled = true;
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify cache is enabled
      expect(cacheManager.isEnabled()).toBe(true);
    });

    it('should be disabled when configured', () => {
      // Set config to disable cache
      (config as any).cacheEnabled = false;
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify cache is disabled
      expect(cacheManager.isEnabled()).toBe(false);
    });

    it('should be disabled from environment variable', () => {
      // Set environment variable
      process.env.CACHE_ENABLED = 'false';
      
      // Update mock config
      mockConfig.cacheEnabled = process.env.CACHE_ENABLED === 'false' ? false : true;
      
      // Reset the singleton instance to force re-initialization
      (CacheManager as any).instance = null;
      
      // Verify config uses environment variable
      expect(updatedConfig.cacheEnabled).toBe(false);
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify cache is disabled
      expect(cacheManager.isEnabled()).toBe(false);
    });

    it('should not cache items when disabled', () => {
      // Set config to disable cache
      (config as any).cacheEnabled = false;
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Set a value in the cache
      const key = 'test-key';
      const value = { data: 'test-value' };
      cacheManager.set(key, value);
      
      // Verify value was not cached
      expect(cacheManager.get(key)).toBeUndefined();
    });

    it('should enable caching when re-enabled', () => {
      // Set config to disable cache initially
      (config as any).cacheEnabled = false;
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Verify cache is disabled
      expect(cacheManager.isEnabled()).toBe(false);
      
      // Enable caching
      cacheManager.setEnabled(true);
      
      // Verify cache is enabled
      expect(cacheManager.isEnabled()).toBe(true);
      
      // Set a value in the cache
      const key = 'test-key';
      const value = { data: 'test-value' };
      cacheManager.set(key, value);
      
      // Verify value was cached
      expect(cacheManager.get(key)).toEqual(value);
    });
  });

  describe('Integration with Resource Handlers', () => {
    // This would be better tested in integration tests, but we can add a simple test here
    it('should respect resource-specific TTL when setting cache entries', () => {
      // Set default and resource-specific TTL in config
      (config as any).cacheMaxAge = 300;
      (config as any).cacheResourceSpecificTTL = {
        'TestResource': 60
      };
      
      // Get cache manager instance
      const cacheManager = CacheManager.getInstance();
      
      // Mock strategy.set to verify TTL
      const setSpy = jest.spyOn(cacheManager['strategy'], 'set');
      
      // Set a value in the cache with resource name
      const key = 'test-key';
      const value = { data: 'test-value' };
      cacheManager.set(key, value, 'TestResource');
      
      // Verify resource-specific TTL was used
      expect(setSpy).toHaveBeenCalledWith(key, value, 60, undefined);
    });
  });
});