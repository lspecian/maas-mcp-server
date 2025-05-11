import { LRUCacheStrategy } from '../../mcp_resources/cache/lruCacheStrategy.js';
import logger from '../../utils/logger.js'; // Corrected import
import { CacheEntry } from '../../mcp_resources/cache/interfaces.js';

jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

describe('LRUCacheStrategy', () => {
  const defaultTTL = 300; // 5 minutes in seconds
  const maxSize = 3;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Core Operations', () => {
    let strategy: LRUCacheStrategy;

    beforeEach(() => {
      // Constructor only takes maxSize. TTL is provided in set.
      strategy = new LRUCacheStrategy(maxSize);
    });

    it('should set and get a value', () => {
      strategy.set('key1', { data: 'value1' }, defaultTTL); // TTL is required for set
      const item = strategy.get('key1');
      expect(item?.value).toEqual({ data: 'value1' });
    });

    it('should return undefined for a non-existent key', () => {
      const item = strategy.get('nonExistentKey');
      expect(item).toBeUndefined();
    });

    it('should return undefined for an expired key (if TTL is used)', () => {
      strategy.set('key1', { data: 'value1' }, 1); // 1 second TTL
      jest.advanceTimersByTime(2000); // Advance time by 2 seconds
      const item = strategy.get('key1');
      expect(item).toBeUndefined();
    });
    
    it('should update item recency on get', () => {
      strategy.set('key1', { data: 'value1' }, defaultTTL);
      strategy.set('key2', { data: 'value2' }, defaultTTL);
      strategy.set('key3', { data: 'value3' }, defaultTTL); // key1 is LRU

      strategy.get('key1'); // Access key1, making it MRU

      // Add another item to trigger eviction
      strategy.set('key4', { data: 'value4' }, defaultTTL);

      expect(strategy.get('key1')?.value).toEqual({ data: 'value1' }); // key1 should still be there
      expect(strategy.get('key2')).toBeUndefined(); // key2 should be evicted as it became LRU
      expect(strategy.get('key3')?.value).toEqual({ data: 'value3' });
      expect(strategy.get('key4')?.value).toEqual({ data: 'value4' });
    });

    it('should check if a key exists using get', () => {
      strategy.set('key1', { data: 'value1' }, defaultTTL);
      expect(strategy.get('key1') !== undefined).toBe(true);
      expect(strategy.get('nonExistentKey') !== undefined).toBe(false);
    });
    
    it('should delete a key', () => {
      strategy.set('key1', { data: 'value1' }, defaultTTL);
      strategy.delete('key1');
      expect(strategy.get('key1') !== undefined).toBe(false);
      const item = strategy.get('key1');
      expect(item).toBeUndefined();
    });

    it('should do nothing when deleting a non-existent key', () => {
      strategy.delete('nonExistentKey');
      // No error expected
    });

    it('should clear all keys', () => {
      strategy.set('key1', { data: 'value1' }, defaultTTL);
      strategy.set('key2', { data: 'value2' }, defaultTTL);
      strategy.clear();
      expect(strategy.get('key1') !== undefined).toBe(false);
      expect(strategy.get('key2') !== undefined).toBe(false);
      expect((strategy as any).cache.size).toBe(0);
      expect((strategy as any).lruOrder.length).toBe(0);
    });
  });

  describe('LRU Eviction Policy', () => {
    let strategy: LRUCacheStrategy;

    beforeEach(() => {
      strategy = new LRUCacheStrategy(maxSize); // maxSize = 3
    });

    it('should evict the least recently used item when maxSize is reached', () => {
      strategy.set('key1', { data: 'value1' }, defaultTTL); // LRU
      jest.advanceTimersByTime(10);
      strategy.set('key2', { data: 'value2' }, defaultTTL);
      jest.advanceTimersByTime(10);
      strategy.set('key3', { data: 'value3' }, defaultTTL); // MRU
      
      expect(strategy.get('key1')?.value).toEqual({ data: 'value1' });
      expect(strategy.get('key2')?.value).toEqual({ data: 'value2' });
      expect(strategy.get('key3')?.value).toEqual({ data: 'value3' });
      expect((strategy as any).cache.size).toBe(3);

      // Add a new item, should evict key1
      strategy.set('key4', { data: 'value4' }, defaultTTL);
      
      expect(strategy.get('key1')).toBeUndefined(); // key1 evicted
      expect(strategy.get('key2')?.value).toEqual({ data: 'value2' });
      expect(strategy.get('key3')?.value).toEqual({ data: 'value3' });
      expect(strategy.get('key4')?.value).toEqual({ data: 'value4' });
      expect((strategy as any).cache.size).toBe(3);
    });

    it('should update recency on set for an existing key, preventing its eviction if it was LRU', () => {
      strategy.set('key1', { data: 'value1' }, defaultTTL); // LRU initially
      strategy.set('key2', { data: 'value2' }, defaultTTL);
      strategy.set('key3', { data: 'value3' }, defaultTTL);

      // Update key1, making it MRU
      strategy.set('key1', { data: 'value1_updated' }, defaultTTL);

      // Add key4, key2 should be evicted
      strategy.set('key4', { data: 'value4' }, defaultTTL);

      expect(strategy.get('key1')?.value).toEqual({ data: 'value1_updated' });
      expect(strategy.get('key2')).toBeUndefined(); // key2 evicted
      expect(strategy.get('key3')?.value).toEqual({ data: 'value3' });
      expect(strategy.get('key4')?.value).toEqual({ data: 'value4' });
    });
  });

  describe('TTL Interaction with LRU', () => {
    let strategy: LRUCacheStrategy;

    beforeEach(() => {
      strategy = new LRUCacheStrategy(maxSize); // defaultTTL is not part of constructor
    });

    it('should remove an item if it expires, regardless of LRU order', () => {
      strategy.set('key1', { data: 'value1_long_ttl' }, 100); // Long TTL, but will be LRU
      strategy.set('key2', { data: 'value2_short_ttl' }, 1);  // Short TTL, MRU for a moment
      strategy.set('key3', { data: 'value3_medium_ttl' }, 50);

      jest.advanceTimersByTime(2000); // Advance 2 seconds, key2 expires

      // key2 should be gone due to TTL expiry, even if it wasn't the LRU item for eviction by size
      expect(strategy.get('key2')).toBeUndefined();
      expect(strategy.get('key1')?.value).toEqual({ data: 'value1_long_ttl' }); // Still there
      expect(strategy.get('key3')?.value).toEqual({ data: 'value3_medium_ttl' }); // Still there
      expect((strategy as any).cache.size).toBe(2); // key2 removed
      expect((strategy as any).lruOrder.includes('key2')).toBe(false);
    });

    it('get should return undefined for expired item and remove it', () => {
      strategy.set('key1', { data: 'expired_data' }, 1); // 1s TTL
      
      jest.advanceTimersByTime(2000); // >1s passed
      
      const item = strategy.get('key1'); // Attempt to get expired item
      expect(item).toBeUndefined();
      expect((strategy as any).cache.has('key1')).toBe(false);
      expect((strategy as any).lruOrder.includes('key1')).toBe(false);
    });
  });

  describe('Periodic Cleanup of Expired Items (if applicable)', () => {
    // LRUCacheStrategy's current implementation removes expired items on access (get)
    // or when an item needs to be evicted due to size and an expired item is found first.
    // A dedicated periodic cleanup like TimeBasedCacheStrategy is not explicitly in the provided LRU code.
    // If it were, tests similar to TimeBasedCacheStrategy's cleanup would be here.
    // For now, we test that expired items are handled correctly on access or during eviction.

    it('should remove an expired item during set if it would have been LRU candidate', () => {
      const lruStrategy = new LRUCacheStrategy(2); // maxSize 2
      lruStrategy.set('expiredKey', {data: 'data1'}, 1); // Will expire in 1s, LRU
      lruStrategy.set('validKey', {data: 'data2'}, 10);   // Valid, MRU. TTL 10s.

      jest.advanceTimersByTime(2000); // expiredKey is now expired (2s passed)

      // Adding a new key. 'expiredKey' is the LRU candidate.
      // The strategy should ideally remove 'expiredKey' because it's expired,
      // rather than 'validKey' if 'expiredKey' was still considered "Least Recently Used"
      // but also happened to be expired.
      // The current LRU implementation evicts based on lruOrder, then checks expiry on get.
      // Let's test the eviction path:
      lruStrategy.set('newKey', {data: 'data3'}, 10);

      // 'expiredKey' should be gone, either because it was LRU and evicted,
      // or because it was found to be expired during the eviction check (if implemented that way).
      // Given the current code, it's evicted because it's at the head of lruOrder.
      expect(lruStrategy.get('expiredKey')).toBeUndefined();
      expect(lruStrategy.get('validKey')?.value).toEqual({data: 'data2'});
      expect(lruStrategy.get('newKey')?.value).toEqual({data: 'data3'});
      expect((lruStrategy as any).cache.size).toBe(2);
    });
  });

  describe('Dispose Method', () => {
    // LRUCacheStrategy doesn't have explicit resources like timers to dispose of in its current form.
    // If it had a periodic cleanup timer, that would be tested here.
    // For now, dispose might just clear the cache.
    it('should clear the cache on dispose', () => {
      const strategyToDispose = new LRUCacheStrategy(maxSize);
      strategyToDispose.set('key1', { data: 'value1' }, defaultTTL);
      
      strategyToDispose.dispose();
      
      expect((strategyToDispose as any).cache.size).toBe(0);
      expect((strategyToDispose as any).lruOrder.length).toBe(0);
      expect(strategyToDispose.get('key1')).toBeUndefined();
    });
  });
});