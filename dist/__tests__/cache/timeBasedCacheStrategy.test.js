"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timeBasedCacheStrategy_js_1 = require("../../mcp_resources/cache/timeBasedCacheStrategy.js");
jest.mock('../../utils/logger.ts', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn().mockReturnThis(),
    },
}));
describe('TimeBasedCacheStrategy', () => {
    const defaultTTL = 300; // 5 minutes in seconds
    const maxSize = 10;
    const cleanupInterval = 60; // 1 minute in seconds
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });
    describe('Core Operations', () => {
        let strategy;
        beforeEach(() => {
            // Constructor only takes maxSize. defaultTTL is used in set, cleanupInterval is internal.
            strategy = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(maxSize);
        });
        it('should set and get a value', async () => {
            await strategy.set('key1', { data: 'value1' }, defaultTTL);
            const entry = await strategy.get('key1');
            expect(entry?.value).toEqual({ data: 'value1' });
        });
        it('should return undefined for a non-existent key', async () => {
            const entry = await strategy.get('nonExistentKey');
            expect(entry).toBeUndefined();
        });
        it('should return undefined for an expired key', async () => {
            await strategy.set('key1', { data: 'value1' }, 1); // 1 second TTL
            jest.advanceTimersByTime(2000); // Advance time by 2 seconds
            const entry = await strategy.get('key1');
            expect(entry).toBeUndefined();
        });
        it('should update expiry on set if key already exists', async () => {
            await strategy.set('key1', { data: 'value1' }, 1); // 1s TTL
            jest.advanceTimersByTime(500); // 0.5s passed
            await strategy.set('key1', { data: 'value1_updated' }, 2); // new 2s TTL
            jest.advanceTimersByTime(1000); // Total 1.5s passed from initial set, 1s from second set
            let entry = await strategy.get('key1');
            expect(entry?.value).toEqual({ data: 'value1_updated' });
            jest.advanceTimersByTime(1500); // Total 3s passed from initial set, 2.5s from second set
            entry = await strategy.get('key1');
            expect(entry).toBeUndefined(); // Should be expired based on the second TTL
        });
        it('should check if a key exists using get', async () => {
            await strategy.set('key1', { data: 'value1' }, defaultTTL);
            expect((await strategy.get('key1')) !== undefined).toBe(true);
            expect((await strategy.get('nonExistentKey')) !== undefined).toBe(false);
        });
        it('should return undefined from get() for an expired key (checking existence)', async () => {
            await strategy.set('key1', { data: 'value1' }, 1); // 1 second TTL
            jest.advanceTimersByTime(2000); // Advance time by 2 seconds
            expect((await strategy.get('key1')) !== undefined).toBe(false);
        });
        it('should delete a key', async () => {
            await strategy.set('key1', { data: 'value1' }, defaultTTL);
            await strategy.delete('key1');
            expect((await strategy.get('key1')) !== undefined).toBe(false);
            const entry = await strategy.get('key1');
            expect(entry).toBeUndefined();
        });
        it('should do nothing when deleting a non-existent key', async () => {
            await strategy.delete('nonExistentKey');
            // No error expected
        });
        it('should clear all keys', async () => {
            await strategy.set('key1', { data: 'value1' }, defaultTTL);
            await strategy.set('key2', { data: 'value2' }, defaultTTL);
            await strategy.clear();
            expect((await strategy.get('key1')) !== undefined).toBe(false);
            expect((await strategy.get('key2')) !== undefined).toBe(false);
            expect(strategy.size()).toBe(0);
        });
    });
    describe('TTL and Expiration', () => {
        let strategy;
        beforeEach(() => {
            strategy = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(maxSize);
        });
        it('should respect item-specific TTL when provided in set()', async () => {
            const itemTTL = 1; // 1 second
            await strategy.set('keyWithItemTTL', { data: 'itemTTLValue' }, itemTTL);
            let entry = await strategy.get('keyWithItemTTL');
            expect(entry?.value).toEqual({ data: 'itemTTLValue' });
            jest.advanceTimersByTime(1500); // Advance past itemTTL
            entry = await strategy.get('keyWithItemTTL');
            expect(entry).toBeUndefined();
        });
        it('should require a TTL for set()', async () => {
            // This test verifies that 'set' requires a TTL.
            // The previous test 'should use defaultTTL if no item-specific TTL is provided'
            // is invalid because the strategy's 'set' method always requires a TTL.
            // CacheManager is responsible for providing a default TTL if needed.
            const strategyForTTLTest = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(maxSize);
            // The following would be a type error if TTL was missing:
            // await strategyForTTLTest.set('keyNeedsTTL', { data: 'value' });
            await strategyForTTLTest.set('keyNeedsTTL', { data: 'value' }, 1); // Provide TTL
            let entry = await strategyForTTLTest.get('keyNeedsTTL');
            expect(entry?.value).toEqual({ data: 'value' });
            jest.advanceTimersByTime(1500); // Advance past TTL
            entry = await strategyForTTLTest.get('keyNeedsTTL');
            expect(entry).toBeUndefined();
        });
    });
    describe('Max Size and Eviction (Oldest Item)', () => {
        // TimeBasedCacheStrategy typically doesn't evict based on size like LRU,
        // but rather relies on TTL. However, if a maxSize is hit and items are non-expired,
        // the problem statement implies "eviction of oldest item when maxSize is reached".
        // This behavior might be specific to this implementation or a misunderstanding of typical time-based.
        // For this test, we'll assume it means if adding a new item exceeds maxSize,
        // the oldest (by insertion time, if not expired) is removed.
        it('should evict the oldest item if maxSize is reached and new item is added', async () => {
            const smallStrategy = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(2); // maxSize = 2
            await smallStrategy.set('key1', { data: 'value1' }, defaultTTL); // oldest
            jest.advanceTimersByTime(10); // Ensure key1 is older by insertion time
            await smallStrategy.set('key2', { data: 'value2' }, defaultTTL);
            expect((await smallStrategy.get('key1')) !== undefined).toBe(true);
            expect((await smallStrategy.get('key2')) !== undefined).toBe(true);
            expect(smallStrategy.size()).toBe(2);
            await smallStrategy.set('key3', { data: 'value3' }, defaultTTL); // This should trigger eviction of key1
            expect((await smallStrategy.get('key1')) !== undefined).toBe(false); // Evicted
            expect((await smallStrategy.get('key2')) !== undefined).toBe(true);
            expect((await smallStrategy.get('key3')) !== undefined).toBe(true);
            expect(smallStrategy.size()).toBe(2);
        });
        it('should not evict if adding an existing key (update)', async () => {
            const smallStrategy = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(1); // maxSize = 1
            await smallStrategy.set('key1', { data: 'value1' }, defaultTTL);
            expect(smallStrategy.size()).toBe(1);
            await smallStrategy.set('key1', { data: 'value1_updated' }, defaultTTL); // Update existing
            expect(smallStrategy.size()).toBe(1);
            const entry = await smallStrategy.get('key1');
            expect(entry?.value).toEqual({ data: 'value1_updated' });
        });
    });
    describe('Periodic Cleanup', () => {
        // The strategy uses an internal CLEANUP_INTERVAL_MS (60000). We test by advancing time.
        it('should periodically remove expired items', async () => {
            const strategyWithCleanup = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(maxSize);
            await strategyWithCleanup.set('key1', { data: 'value1' }, 1); // Expires in 1s
            await strategyWithCleanup.set('key2', { data: 'value2' }, 70); // Expires in 70s (longer than cleanup interval)
            expect(strategyWithCleanup.size()).toBe(2);
            // Advance time enough for key1 to expire AND for one cleanup cycle (60s) to pass
            jest.advanceTimersByTime(61000); // 61 seconds
            // key1 should be gone due to cleanup.
            expect((await strategyWithCleanup.get('key1')) !== undefined).toBe(false); // Check if actually removed
            expect(strategyWithCleanup.cache.has('key1')).toBe(false); // Internal check
            expect((await strategyWithCleanup.get('key2')) !== undefined).toBe(true); // key2 still valid
            expect(strategyWithCleanup.size()).toBe(1);
            // Advance time for key2 to expire and another cleanup cycle
            jest.advanceTimersByTime(70000); // Advance another 70s
            expect((await strategyWithCleanup.get('key2')) !== undefined).toBe(false);
            expect(strategyWithCleanup.cache.has('key2')).toBe(false);
            expect(strategyWithCleanup.size()).toBe(0);
        });
        it('should stop cleanup interval on dispose', () => {
            const strategyToDispose = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(maxSize);
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            strategyToDispose.dispose();
            expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
            // Further checks could involve ensuring the intervalId from the strategy was used.
        });
    });
    describe('Dispose Method', () => {
        it('should clear the cache and stop cleanup on dispose', async () => {
            const strategyToDispose = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(maxSize);
            await strategyToDispose.set('key1', { data: 'value1' }, defaultTTL);
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            strategyToDispose.dispose();
            expect(strategyToDispose.size()).toBe(0);
            expect(clearIntervalSpy).toHaveBeenCalled();
            // After dispose, operations should ideally not work or cache should be empty
            const entry = await strategyToDispose.get('key1');
            expect(entry).toBeUndefined();
        });
    });
});
