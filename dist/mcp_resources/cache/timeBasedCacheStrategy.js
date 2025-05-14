"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeBasedCacheStrategy = void 0;
const logger_ts_1 = __importDefault(require("../../utils/logger.ts"));
/**
 * Implements a time-based cache strategy with a maximum size limit.
 * Entries are stored with a Time-To-Live (TTL) and are automatically removed
 * when they expire. If the cache reaches its maximum size, adding a new item
 * will cause the oldest item (based on insertion order for Map) to be evicted.
 * Expired entries are periodically removed by a cleanup interval.
 */
class TimeBasedCacheStrategy {
    cache; // Stores cache key to CacheEntry
    maxSize; // Maximum number of entries in the cache
    cleanupInterval = null; // Timer for periodic cleanup
    CLEANUP_INTERVAL_MS = 60000; // Interval for cleanup task (1 minute)
    /**
     * Creates an instance of TimeBasedCacheStrategy.
     * @param maxSize The maximum number of items the cache can hold. Defaults to 1000.
     */
    constructor(maxSize = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.startCleanupInterval();
        logger_ts_1.default.debug(`Initialized TimeBasedCacheStrategy with max size ${maxSize}`);
    }
    /**
     * Starts a periodic cleanup task that removes expired entries from the cache.
     * The interval is defined by `CLEANUP_INTERVAL_MS`.
     * Uses `unref()` on the interval timer to allow the Node.js process to exit
     * even if the timer is active, which is useful for background tasks.
     */
    startCleanupInterval() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.cleanupInterval = setInterval(() => {
            this.removeExpiredEntries();
        }, this.CLEANUP_INTERVAL_MS);
        // Ensure the interval doesn't prevent the Node.js process from exiting
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    /**
     * Remove expired entries from the cache
     * @returns Number of entries removed
     */
    removeExpiredEntries() {
        const now = Date.now();
        let removedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        if (removedCount > 0) {
            logger_ts_1.default.debug(`Removed ${removedCount} expired entries from cache`);
        }
        return removedCount;
    }
    /**
     * Get an item from the cache
     * @param key The cache key
     * @returns The cached entry or undefined if not found or expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check if the entry has expired
        if (entry.expiresAt <= Date.now()) {
            this.cache.delete(key);
            logger_ts_1.default.debug(`Cache miss (expired): ${key}`);
            return undefined;
        }
        logger_ts_1.default.debug(`Cache hit: ${key}`);
        return entry;
    }
    /**
     * Sets an item in the cache with a specified value and Time-To-Live (TTL).
     * If the cache is at its `maxSize` and a new key is being added, the oldest entry
     * (based on insertion order as `Map` preserves it) is removed to make space.
     * If the key already exists, its value and expiration are updated.
     *
     * @param key The cache key.
     * @param value The value to cache.
     * @param ttl Time to live in seconds for this entry.
     * @param cacheControl Optional cache control directives to store with the entry.
     * @returns The `CacheEntry` object that was stored.
     */
    set(key, value, ttl, cacheControl) {
        // If the cache is full and we are adding a new key, evict the oldest entry.
        // Map iteration order is based on insertion order, so keys().next().value gives the oldest.
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) { // Should always be true if size >= 1
                this.cache.delete(oldestKey);
                logger_ts_1.default.debug(`TimeBasedCache full, removed oldest entry: ${oldestKey} to make space for ${key}`);
            }
        }
        const now = Date.now();
        const entry = {
            value,
            createdAt: now,
            expiresAt: now + (ttl * 1000),
            key,
            cacheControl
        };
        this.cache.set(key, entry);
        logger_ts_1.default.debug(`Cache set: ${key}, TTL: ${ttl}s`);
        return entry;
    }
    /**
     * Delete an item from the cache
     * @param key The cache key
     * @returns True if the item was deleted, false otherwise
     */
    delete(key) {
        const result = this.cache.delete(key);
        if (result) {
            logger_ts_1.default.debug(`Cache delete: ${key}`);
        }
        return result;
    }
    /**
     * Clear all items from the cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger_ts_1.default.debug(`Cache cleared, ${size} entries removed`);
    }
    /**
     * Get the number of items in the cache
     */
    size() {
        return this.cache.size;
    }
    /**
     * Invalidate cache entries based on a pattern
     * @param pattern A string or regex pattern to match against cache keys
     * @returns The number of entries invalidated
     */
    invalidate(pattern) {
        let count = 0;
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        if (count > 0) {
            logger_ts_1.default.debug(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
        }
        return count;
    }
    /**
     * Cleans up resources used by the cache strategy, specifically by clearing
     * the interval timer for removing expired entries. This should be called
     * when the cache is no longer needed to prevent resource leaks.
     */
    dispose() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger_ts_1.default.debug('TimeBasedCacheStrategy cleanup interval stopped.');
        }
    }
}
exports.TimeBasedCacheStrategy = TimeBasedCacheStrategy;
