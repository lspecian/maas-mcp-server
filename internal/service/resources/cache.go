package resources

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// Default cache settings
const (
	DefaultCacheTTL        = 5 * time.Minute
	DefaultCacheMaxEntries = 1000
)

// CacheEntry represents a cached resource
type CacheEntry struct {
	Key       string
	Value     interface{}
	ExpiresAt time.Time
}

// CacheOptions represents caching options
type CacheOptions struct {
	Enabled    bool
	TTL        time.Duration
	BypassFlag string
}

// NewCacheOptions creates a new CacheOptions with default values
func NewCacheOptions() *CacheOptions {
	return &CacheOptions{
		Enabled:    true,
		TTL:        DefaultCacheTTL,
		BypassFlag: "no-cache",
	}
}

// ParseCacheParams parses cache parameters from query parameters
func ParseCacheParams(queryParams map[string]string) *CacheOptions {
	options := NewCacheOptions()

	// Check for cache bypass flag
	if _, hasNoCache := queryParams[options.BypassFlag]; hasNoCache {
		options.Enabled = false
	}

	return options
}

// ResourceCache provides caching functionality for resources
type ResourceCache struct {
	entries     map[string]*CacheEntry
	mu          sync.RWMutex
	maxEntries  int
	defaultTTL  time.Duration
	logger      *logging.Logger
	cleanupDone chan struct{}
}

// NewResourceCache creates a new resource cache
func NewResourceCache(logger *logging.Logger) *ResourceCache {
	cache := &ResourceCache{
		entries:     make(map[string]*CacheEntry),
		maxEntries:  DefaultCacheMaxEntries,
		defaultTTL:  DefaultCacheTTL,
		logger:      logger,
		cleanupDone: make(chan struct{}),
	}

	// Start cleanup goroutine
	go cache.cleanupLoop()

	return cache
}

// Close stops the cleanup goroutine
func (c *ResourceCache) Close() {
	close(c.cleanupDone)
}

// cleanupLoop periodically removes expired entries
func (c *ResourceCache) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.cleanup()
		case <-c.cleanupDone:
			return
		}
	}
}

// cleanup removes expired entries
func (c *ResourceCache) cleanup() {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()

	for key, entry := range c.entries {
		if entry.ExpiresAt.Before(now) {
			delete(c.entries, key)
		}
	}
}

// GenerateCacheKey generates a cache key from a URI and query parameters
func (c *ResourceCache) GenerateCacheKey(uri string, queryParams map[string]string) string {
	// Create a string representation of the query parameters
	paramsStr := ""
	for k, v := range queryParams {
		// Skip cache bypass flag
		if k == "no-cache" {
			continue
		}
		paramsStr += fmt.Sprintf("%s=%s;", k, v)
	}

	// Combine URI and parameters
	keyStr := uri + "|" + paramsStr

	// Generate MD5 hash
	hash := md5.Sum([]byte(keyStr))
	return hex.EncodeToString(hash[:])
}

// Get retrieves a value from the cache
func (c *ResourceCache) Get(ctx context.Context, key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, found := c.entries[key]
	if !found {
		return nil, false
	}

	// Check if entry has expired
	if entry.ExpiresAt.Before(time.Now()) {
		return nil, false
	}

	c.logger.WithContext(ctx).WithField("cache_key", key).Debug("Cache hit")
	return entry.Value, true
}

// Set adds a value to the cache
func (c *ResourceCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Use default TTL if not specified
	if ttl <= 0 {
		ttl = c.defaultTTL
	}

	// Check if we need to evict entries
	if len(c.entries) >= c.maxEntries {
		c.evictOldest()
	}

	c.entries[key] = &CacheEntry{
		Key:       key,
		Value:     value,
		ExpiresAt: time.Now().Add(ttl),
	}

	c.logger.WithContext(ctx).WithFields(map[string]interface{}{
		"cache_key": key,
		"ttl":       ttl.String(),
	}).Debug("Added entry to cache")
}

// evictOldest removes the oldest entry from the cache
func (c *ResourceCache) evictOldest() {
	var oldestKey string
	var oldestTime time.Time

	// Find the oldest entry
	for key, entry := range c.entries {
		if oldestKey == "" || entry.ExpiresAt.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.ExpiresAt
		}
	}

	// Remove the oldest entry
	if oldestKey != "" {
		delete(c.entries, oldestKey)
		c.logger.WithField("cache_key", oldestKey).Debug("Evicted oldest cache entry")
	}
}

// Delete removes an entry from the cache
func (c *ResourceCache) Delete(ctx context.Context, key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.entries, key)
	c.logger.WithContext(ctx).WithField("cache_key", key).Debug("Removed entry from cache")
}

// Clear removes all entries from the cache
func (c *ResourceCache) Clear(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries = make(map[string]*CacheEntry)
	c.logger.WithContext(ctx).Info("Cleared cache")
}

// GetCacheHeaders returns HTTP cache headers based on cache options
func GetCacheHeaders(options *CacheOptions) map[string]string {
	headers := make(map[string]string)

	if !options.Enabled {
		headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
		headers["Pragma"] = "no-cache"
		headers["Expires"] = "0"
	} else {
		maxAge := int(options.TTL.Seconds())
		headers["Cache-Control"] = fmt.Sprintf("public, max-age=%d", maxAge)
		headers["Expires"] = time.Now().Add(options.TTL).Format(time.RFC1123)
	}

	return headers
}
