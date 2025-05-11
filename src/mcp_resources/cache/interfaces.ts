/**
 * Interfaces for the MCP resource caching system
 */

/**
 * Represents a cached item with its value and metadata
 */
export interface CacheEntry<T> {
  /** The cached data */
  value: T;
  /** When the entry was created */
  createdAt: number;
  /** When the entry expires (in milliseconds since epoch) */
  expiresAt: number;
  /** The key used to store this entry */
  key: string;
  /** Optional cache control headers */
  cacheControl?: {
    /** Max age in seconds */
    maxAge?: number;
    /** Whether the response is private */
    private?: boolean;
    /** Whether the response must be revalidated */
    mustRevalidate?: boolean;
    /** Whether the response is immutable */
    immutable?: boolean;
  };
}

/**
 * Interface for cache strategies
 */
export interface CacheStrategy {
  /**
   * Get an item from the cache
   * @param key The cache key
   * @returns The cached entry or undefined if not found
   */
  get<T>(key: string): CacheEntry<T> | undefined;

  /**
   * Set an item in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Time to live in seconds
   * @param cacheControl Optional cache control directives
   * @returns The cache entry that was set
   */
  set<T>(
    key: string, 
    value: T, 
    ttl: number, 
    cacheControl?: CacheEntry<T>['cacheControl']
  ): CacheEntry<T>;

  /**
   * Delete an item from the cache
   * @param key The cache key
   * @returns True if the item was deleted, false otherwise
   */
  delete(key: string): boolean;

  /**
   * Clear all items from the cache
   */
  clear(): void;

  /**
   * Get the number of items in the cache
   */
  size(): number;

  /**
   * Invalidate cache entries based on a pattern
   * @param pattern A string or regex pattern to match against cache keys
   * @returns The number of entries invalidated
   */
  invalidate(pattern: string | RegExp): number;
}

/**
 * Cache options for resource handlers
 */
export interface CacheOptions {
  /** Whether caching is enabled for this resource */
  enabled: boolean;
  /** Time to live in seconds */
  ttl: number;
  /** Cache key generation function */
  keyGenerator?: (uri: URL, params: Record<string, any>) => string;
  /** Cache control directives */
  cacheControl?: CacheEntry<any>['cacheControl'];
  /** Whether to use query parameters in the cache key */
  includeQueryParams?: boolean;
  /** Specific query parameters to include in the cache key (if includeQueryParams is true) */
  includeQueryParamsList?: string[];
}