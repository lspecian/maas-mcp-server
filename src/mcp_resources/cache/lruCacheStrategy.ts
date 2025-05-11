/**
 * LRU (Least Recently Used) cache strategy implementation
 * Caches items with a TTL and removes the least recently used items when the cache is full
 */
import { CacheEntry, CacheStrategy } from './interfaces.js';
import logger from '../../utils/logger.js';

/**
 * Represents a node in the doubly linked list used by the LRU cache.
 * Each node stores a cache key, the corresponding cache entry, and pointers
 * to the previous and next nodes in the list.
 * @template T The type of the cached value.
 */
class LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null = null;
  next: LRUNode<T> | null = null;

  constructor(key: string, entry: CacheEntry<T>) {
    this.key = key;
    this.entry = entry;
  }
}

/**
 * Implements a Least Recently Used (LRU) cache strategy.
 * This strategy maintains a fixed number of cache entries. When the cache is full
 * and a new item is added, the least recently used item is evicted.
 * It uses a Map for O(1) lookups and a doubly linked list to track usage order.
 * Expired entries are periodically removed by a cleanup interval.
 */
export class LRUCacheStrategy implements CacheStrategy {
  private cache: Map<string, LRUNode<any>>; // Stores cache key to LRUNode
  private head: LRUNode<any> | null = null; // Points to the most recently used node
  private tail: LRUNode<any> | null = null; // Points to the least recently used node
  private maxSize: number; // Maximum number of entries in the cache
  private cleanupInterval: NodeJS.Timeout | null = null; // Timer for periodic cleanup
  private readonly CLEANUP_INTERVAL_MS = 60000; // Interval for cleanup task (1 minute)

  /**
   * Creates an instance of LRUCacheStrategy.
   * @param maxSize The maximum number of items the cache can hold. Defaults to 1000.
   */
  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.startCleanupInterval();
    logger.debug(`Initialized LRUCacheStrategy with max size ${maxSize}`);
  }

  /**
   * Starts a periodic cleanup task that removes expired entries from the cache.
   * The interval is defined by `CLEANUP_INTERVAL_MS`.
   * Uses `unref()` on the interval timer to allow the Node.js process to exit
   * even if the timer is active, which is useful for background tasks.
   */
  private startCleanupInterval(): void {
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
   * Iterates through the cache entries starting from the least recently used (tail)
   * and removes any entries that have expired based on their `expiresAt` timestamp.
   * @returns The number of entries removed.
   */
  private removeExpiredEntries(): number {
    const now = Date.now();
    let removedCount = 0;
    let current = this.tail; // Start from the tail (least recently used)

    // Iterate backwards from tail to head
    while (current) {
      const next = current.prev; // Save reference to the previous node before potential removal
      
      if (current.entry.expiresAt <= now) {
        this.removeNode(current);
        this.cache.delete(current.key);
        removedCount++;
      }
      
      current = next;
    }

    if (removedCount > 0) {
      logger.debug(`Removed ${removedCount} expired entries from LRU cache`);
    }

    return removedCount;
  }

  /**
   * Adds a given node to the front (head) of the doubly linked list,
   * marking it as the most recently used item.
   * @param node The `LRUNode` to add to the front.
   */
  private addToFront(node: LRUNode<any>): void {
    node.next = this.head; // New node points to the current head
    node.prev = null;

    // Update current head's prev pointer if head exists
    if (this.head) {
      this.head.prev = node;
    }

    // Set node as new head
    this.head = node;

    // If tail is null, this is the first node, so set tail too
    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Removes a given node from the doubly linked list.
   * It correctly updates the `head` and `tail` pointers if the removed node
   * was at either end of the list.
   * @param node The `LRUNode` to remove from the list.
   */
  private removeNode(node: LRUNode<any>): void {
    if (node.prev) {
      node.prev.next = node.next; // Link previous node to next node
    } else {
      this.head = node.next; // Node was head, update head
    }

    if (node.next) {
      node.next.prev = node.prev; // Link next node to previous node
    } else {
      this.tail = node.prev; // Node was tail, update tail
    }
  }

  /**
   * Moves an existing node to the front (head) of the list, marking it as
   * the most recently used item. This involves removing it from its current
   * position and then adding it to the front.
   * @param node The `LRUNode` to move to the front.
   */
  private moveToFront(node: LRUNode<any>): void {
    this.removeNode(node);
    this.addToFront(node);
  }

  /**
   * Removes the least recently used item from the cache. This is the item
   * at the tail of the doubly linked list. It also removes the item from the
   * underlying cache Map.
   */
  private removeLRU(): void {
    if (!this.tail) return; // Cache is empty

    const lruNode = this.tail;
    this.removeNode(lruNode); // Remove from linked list
    this.cache.delete(lruNode.key); // Remove from map
    logger.debug(`Removed least recently used item from cache: ${lruNode.key}`);
  }

  /**
   * Get an item from the cache
   * @param key The cache key
   * @returns The cached entry or undefined if not found or expired
   */
  public get<T>(key: string): CacheEntry<T> | undefined {
    const node = this.cache.get(key) as LRUNode<T> | undefined;
    
    if (!node) {
      return undefined;
    }

    // Check if the entry has expired
    if (node.entry.expiresAt <= Date.now()) {
      this.removeNode(node);
      this.cache.delete(key);
      logger.debug(`LRU cache miss (expired): ${key}`);
      return undefined;
    }

    // Move to front (mark as most recently used)
    this.moveToFront(node);
    
    logger.debug(`LRU cache hit: ${key}`);
    return node.entry;
  }

  /**
   * Set an item in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Time to live in seconds
   * @param cacheControl Optional cache control directives
   * @returns The cache entry that was set
   */
  public set<T>(
    key: string, 
    value: T, 
    ttl: number, 
    cacheControl?: CacheEntry<T>['cacheControl']
  ): CacheEntry<T> {
    // If key already exists, remove the existing node
    if (this.cache.has(key)) {
      const existingNode = this.cache.get(key)!;
      this.removeNode(existingNode);
      this.cache.delete(key);
    }
    // If the cache is at max capacity, remove the least recently used item
    else if (this.cache.size >= this.maxSize) {
      this.removeLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + (ttl * 1000),
      key,
      cacheControl
    };

    // Create a new node and add it to the front
    const node = new LRUNode(key, entry);
    this.addToFront(node);
    this.cache.set(key, node);
    
    logger.debug(`LRU cache set: ${key}, TTL: ${ttl}s`);
    return entry;
  }

  /**
   * Delete an item from the cache
   * @param key The cache key
   * @returns True if the item was deleted, false otherwise
   */
  public delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    const result = this.cache.delete(key);
    
    if (result) {
      logger.debug(`LRU cache delete: ${key}`);
    }
    
    return result;
  }

  /**
   * Clear all items from the cache
   */
  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.head = null;
    this.tail = null;
    logger.debug(`LRU cache cleared, ${size} entries removed`);
  }

  /**
   * Get the number of items in the cache
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Invalidate cache entries based on a pattern
   * @param pattern A string or regex pattern to match against cache keys
   * @returns The number of entries invalidated
   */
  public invalidate(pattern: string | RegExp): number {
    let count = 0;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    const keysToDelete: string[] = [];

    // First, collect all keys to delete
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    // Then delete each key
    for (const key of keysToDelete) {
      const node = this.cache.get(key)!;
      this.removeNode(node);
      this.cache.delete(key);
      count++;
    }

    if (count > 0) {
      logger.debug(`Invalidated ${count} LRU cache entries matching pattern: ${pattern}`);
    }
    
    return count;
  }

  /**
   * Cleans up resources used by the cache strategy, specifically by clearing
   * the interval timer for removing expired entries. This should be called
   * when the cache is no longer needed to prevent resource leaks.
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug('LRUCacheStrategy cleanup interval stopped.');
    }
  }
}