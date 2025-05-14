"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const timeBasedCacheStrategy_js_1 = require("./timeBasedCacheStrategy.js");
const lruCacheStrategy_js_1 = require("./lruCacheStrategy.js");
const config_js_1 = __importDefault(require("../../config.js"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
/**
 * Manages caching strategies and provides a unified interface for caching operations
 * for MCP resources. This class follows a singleton pattern to ensure a single
 * cache instance throughout the application. It supports different caching strategies
 * like time-based and LRU (Least Recently Used) and allows for resource-specific
 * TTL configurations.
 */
class CacheManager {
    static instance;
    strategy;
    enabled;
    defaultTTL;
    resourceSpecificTTL;
    /**
     * Private constructor to enforce the singleton pattern. Initializes the cache
     * manager based on the application configuration, setting up the chosen
     * caching strategy (e.g., LRU or time-based), default TTL, and
     * resource-specific TTLs.
     */
    constructor() {
        this.enabled = config_js_1.default.cacheEnabled;
        this.defaultTTL = config_js_1.default.cacheMaxAge;
        this.resourceSpecificTTL = config_js_1.default.cacheResourceSpecificTTL;
        // Initialize the appropriate caching strategy
        if (config_js_1.default.cacheStrategy === 'lru') {
            this.strategy = new lruCacheStrategy_js_1.LRUCacheStrategy(config_js_1.default.cacheMaxSize);
            logger_js_1.default.info('Initialized LRU cache strategy', {
                maxSize: config_js_1.default.cacheMaxSize,
                defaultTTL: config_js_1.default.cacheMaxAge
            });
        }
        else {
            this.strategy = new timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy(config_js_1.default.cacheMaxSize);
            logger_js_1.default.info('Initialized time-based cache strategy', {
                maxSize: config_js_1.default.cacheMaxSize,
                defaultTTL: config_js_1.default.cacheMaxAge
            });
        }
    }
    /**
     * Get the singleton instance of CacheManager
     * @returns The CacheManager instance
     */
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    /**
     * Generates a cache key for a given resource request.
     * The key is constructed based on the resource name, URI path, an optional resource identifier
     * (extracted from `params.system_id`, `params.id`, or `params.name`), and query parameters
     * if `options.includeQueryParams` is true.
     * A custom key generator can be provided via `options.keyGenerator`.
     * If `options.includeQueryParamsList` is provided, only those query parameters will be included.
     *
     * @param resourceName The name of the resource (e.g., "maas_machine_details").
     * @param uri The URI of the request.
     * @param params The parameters extracted from the URI or request.
     * @param options Optional cache options, including `keyGenerator`, `includeQueryParams`, and `includeQueryParamsList`.
     * @returns The generated cache key as a string.
     */
    generateCacheKey(resourceName, uri, params, options) {
        // If a custom key generator is provided, use it
        if (options?.keyGenerator) {
            return options.keyGenerator(uri, params);
        }
        // Start with the resource name and path
        let key = `${resourceName}:${uri.pathname}`;
        // Add resource ID if available
        const resourceId = params.system_id || params.id || params.name;
        if (resourceId) {
            key += `:${resourceId}`;
        }
        // Add query parameters if configured
        if (options?.includeQueryParams && uri.search) {
            const searchParams = new URLSearchParams(uri.search);
            // If specific query params are specified, only include those
            if (options.includeQueryParamsList && options.includeQueryParamsList.length > 0) {
                const filteredParams = new URLSearchParams();
                for (const param of options.includeQueryParamsList) {
                    if (searchParams.has(param)) {
                        filteredParams.set(param, searchParams.get(param));
                    }
                }
                key += `:${filteredParams.toString()}`;
            }
            else {
                // Otherwise include all query params
                key += `:${searchParams.toString()}`;
            }
        }
        return key;
    }
    /**
     * Get an item from the cache
     * @param key The cache key
     * @returns The cached value or undefined if not found
     */
    get(key) {
        if (!this.enabled) {
            return undefined;
        }
        const entry = this.strategy.get(key);
        return entry?.value;
    }
    /**
     * Sets an item in the cache with a specified value and Time-To-Live (TTL).
     * Caching is skipped if the manager is disabled or if `options.enabled` is false.
     * The TTL is determined in the following order of precedence:
     * 1. `options.ttl` (if provided)
     * 2. Resource-specific TTL (if `resourceName` is provided and a specific TTL is configured)
     * 3. Default TTL
     *
     * @param key The cache key.
     * @param value The value to cache.
     * @param resourceName Optional name of the resource, used for looking up resource-specific TTL.
     * @param options Optional cache options, including `ttl`, `enabled`, and `cacheControl`.
     * @returns The cache entry that was set, or undefined if caching was skipped.
     */
    set(key, value, resourceName, options) {
        if (!this.enabled || (options && !options.enabled)) {
            return undefined;
        }
        // Determine TTL: options.ttl > resourceSpecificTTL[resourceName] > defaultTTL
        let ttl = this.defaultTTL;
        if (resourceName && this.resourceSpecificTTL[resourceName] !== undefined) {
            ttl = this.resourceSpecificTTL[resourceName];
        }
        if (options?.ttl !== undefined) {
            ttl = options.ttl;
        }
        return this.strategy.set(key, value, ttl, options?.cacheControl);
    }
    /**
     * Delete an item from the cache
     * @param key The cache key
     * @returns True if the item was deleted, false otherwise
     */
    delete(key) {
        if (!this.enabled) {
            return false;
        }
        return this.strategy.delete(key);
    }
    /**
     * Clear all items from the cache
     */
    clear() {
        this.strategy.clear();
    }
    /**
     * Get the number of items in the cache
     */
    size() {
        return this.strategy.size();
    }
    /**
     * Invalidate cache entries based on a pattern
     * @param pattern A string or regex pattern to match against cache keys
     * @returns The number of entries invalidated
     */
    invalidate(pattern) {
        if (!this.enabled) {
            return 0;
        }
        return this.strategy.invalidate(pattern);
    }
    /**
     * Invalidate all cache entries for a specific resource type.
     * This matches keys that start with the `resourceName` followed by a colon.
     * Example: `invalidateResource("maas_machines")` would invalidate "maas_machines:list" and "maas_machines:details:xyz".
     *
     * @param resourceName The name of the resource (e.g., "maas_machines").
     * @returns The number of cache entries invalidated.
     */
    invalidateResource(resourceName) {
        return this.invalidate(new RegExp(`^${resourceName}:`));
    }
    /**
     * Invalidate cache entries for a specific resource instance identified by its ID.
     * This matches keys that start with `resourceName`, followed by any characters (typically the URI path part),
     * then the `resourceId`.
     * Example: `invalidateResourceById("maas_machine", "xyz")` would invalidate "maas_machine:details:xyz"
     * but not "maas_machine:details:abc" or "maas_machines:list".
     *
     * @param resourceName The name of the resource (e.g., "maas_machine").
     * @param resourceId The ID of the specific resource instance.
     * @returns The number of cache entries invalidated.
     */
    invalidateResourceById(resourceName, resourceId) {
        // Matches keys like "resourceName:some/path:resourceId" or "resourceName:resourceId"
        // It allows for variable path segments between resourceName and resourceId
        return this.invalidate(new RegExp(`^${resourceName}:(?:[^:]*:)?${resourceId}(:|$)`));
    }
    /**
     * Check if caching is enabled
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Enable or disable caching
     * @param enabled Whether caching should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        logger_js_1.default.info(`Cache ${enabled ? 'enabled' : 'disabled'}`);
    }
    /**
     * Get the default TTL
     */
    getDefaultTTL() {
        return this.defaultTTL;
    }
    /**
     * Set the default TTL
     * @param ttl The new default TTL in seconds
     */
    setDefaultTTL(ttl) {
        this.defaultTTL = ttl;
        logger_js_1.default.info(`Default cache TTL set to ${ttl} seconds`);
    }
    /**
     * Get the resource-specific TTL for a resource
     * @param resourceName The name of the resource
     */
    getResourceTTL(resourceName) {
        return this.resourceSpecificTTL[resourceName] || this.defaultTTL;
    }
    /**
     * Set a resource-specific TTL
     * @param resourceName The name of the resource
     * @param ttl The TTL in seconds
     */
    setResourceTTL(resourceName, ttl) {
        this.resourceSpecificTTL[resourceName] = ttl;
        logger_js_1.default.info(`Cache TTL for ${resourceName} set to ${ttl} seconds`);
    }
}
exports.CacheManager = CacheManager;
