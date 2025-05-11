# Caching System Documentation

The MAAS MCP Server implements a flexible and configurable caching system for MCP resources to improve performance, reduce load on the MAAS API, and enhance the user experience.

## Overview

The caching system is designed to:

1. Cache responses from the MAAS API to reduce latency for frequently accessed resources
2. Reduce load on the MAAS API server by serving cached responses when appropriate
3. Provide configurable caching strategies and TTL (Time To Live) values
4. Support cache invalidation to ensure data freshness
5. Include proper cache control headers in responses

## Caching Strategies

The server supports two caching strategies:

### Time-Based Caching

The time-based caching strategy is a simple expiration-based approach:

- Each cached item has a TTL (Time To Live) value
- When the TTL expires, the item is removed from the cache
- If the cache reaches its maximum size, the oldest items are removed first
- Periodic cleanup removes expired items

This strategy is suitable for most use cases and is the default.

### LRU (Least Recently Used) Caching

The LRU caching strategy prioritizes recently accessed resources:

- Items are ordered by access time, with most recently used at the front
- When the cache reaches its maximum size, the least recently used items are removed first
- Each item still has a TTL for expiration
- Accessing an item moves it to the front of the list

This strategy is more efficient for workloads with locality of reference, where certain resources are accessed frequently.

## Configuration

### Environment Variables

The caching system can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_ENABLED` | Enable/disable caching | `true` |
| `CACHE_STRATEGY` | Caching strategy to use ('time-based' or 'lru') | `'time-based'` |
| `CACHE_MAX_SIZE` | Maximum number of items in the cache | `1000` |
| `CACHE_MAX_AGE` | Default TTL in seconds | `300` (5 minutes) |
| `CACHE_RESOURCE_SPECIFIC_TTL` | JSON string with resource-specific TTL overrides | `{}` |

Example `.env` configuration:

```
CACHE_ENABLED=true
CACHE_STRATEGY=lru
CACHE_MAX_SIZE=2000
CACHE_MAX_AGE=600
CACHE_RESOURCE_SPECIFIC_TTL={"Machine": 60, "Machines": 30, "Tags": 600}
```

### Resource-Specific Configuration

Each resource handler can be configured with specific caching options:

```typescript
// Example: Configure caching for a resource handler
const resourceHandler = new MyResourceHandler(
  server,
  maasClient,
  "ResourceName",
  resourceTemplate,
  uriPattern,
  dataSchema,
  paramsSchema,
  apiEndpoint,
  {
    // Cache options
    enabled: true,
    ttl: 120, // 2 minutes
    includeQueryParams: true,
    includeQueryParamsList: ['param1', 'param2'],
    cacheControl: {
      maxAge: 120,
      mustRevalidate: true,
      private: false,
      immutable: false
    }
  }
);
```

## Cache Keys

Cache keys are generated based on:

1. The resource name
2. The URI path
3. The resource ID (if applicable)
4. Query parameters (if configured)

This ensures that different resources and different instances of the same resource are cached separately.

Example cache key: `Machine:/machines/abc123`

For resources with query parameters: `Machines:/machines:hostname=server1&status=ready`

## Cache Control Headers

The server includes standard cache control headers in responses:

- `Cache-Control`: Directives for caching behavior
  - `max-age`: TTL in seconds
  - `private`: If the response is private
  - `must-revalidate`: If the response must be revalidated after expiration
  - `immutable`: If the response is immutable
- `Age`: Approximate age of the cached response in seconds

Example headers:
```
Cache-Control: max-age=60, must-revalidate
Age: 1
```

## Cache Invalidation

The caching system supports several invalidation mechanisms:

### Automatic Invalidation

- Resources are automatically invalidated when their TTL expires
- List resources are invalidated when filter parameters change

### Programmatic Invalidation

Resource handlers provide methods for programmatic invalidation:

```typescript
// Invalidate all cached entries for a resource
resourceHandler.invalidateCache();

// Invalidate a specific resource by ID
resourceHandler.invalidateCacheById('abc123');
```

### Pattern-Based Invalidation

The cache manager supports invalidation based on patterns:

```typescript
// Invalidate all entries matching a pattern
cacheManager.invalidate(new RegExp('^Machine:'));
```

## Implementation Details

The caching system is implemented in the following files:

- `src/mcp_resources/cache/interfaces.ts`: Interfaces for the caching system
- `src/mcp_resources/cache/timeBasedCacheStrategy.ts`: Time-based caching strategy
- `src/mcp_resources/cache/lruCacheStrategy.ts`: LRU caching strategy
- `src/mcp_resources/cache/cacheManager.ts`: Cache manager
- `src/mcp_resources/BaseResourceHandler.ts`: Integration with resource handlers

## Best Practices

1. **Set appropriate TTL values**: Consider how frequently the data changes
   - Frequently changing data: Short TTL (30-60 seconds)
   - Relatively stable data: Longer TTL (5-15 minutes)
   - Static data: Very long TTL (hours or days)

2. **Configure resource-specific TTL values**: Different resources have different update frequencies

3. **Use cache invalidation for write operations**: Invalidate related resources after updates

4. **Monitor cache performance**: Watch for cache hit/miss rates and adjust configuration as needed

5. **Consider memory usage**: Set appropriate cache size limits based on available memory

## Troubleshooting

### Cache Not Working

1. Check if caching is enabled (`CACHE_ENABLED=true`)
2. Verify that the resource handler has caching enabled
3. Check the TTL values (they might be too short)
4. Look for invalidation calls that might be clearing the cache

### High Memory Usage

1. Reduce the `CACHE_MAX_SIZE` value
2. Use the LRU strategy for more efficient memory usage
3. Reduce TTL values for less frequently accessed resources

### Stale Data

1. Decrease TTL values for frequently changing resources
2. Implement proper cache invalidation after write operations
3. Add `must-revalidate` to cache control directives