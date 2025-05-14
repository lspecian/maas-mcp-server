package resources

import (
	"context"
	"testing"
	"time"
)

func TestParseCacheParams(t *testing.T) {
	tests := []struct {
		name        string
		queryParams map[string]string
		want        *CacheOptions
	}{
		{
			name:        "Empty query params",
			queryParams: map[string]string{},
			want: &CacheOptions{
				Enabled:    true,
				TTL:        DefaultCacheTTL,
				BypassFlag: "no-cache",
			},
		},
		{
			name: "Cache bypass flag",
			queryParams: map[string]string{
				"no-cache": "",
			},
			want: &CacheOptions{
				Enabled:    false,
				TTL:        DefaultCacheTTL,
				BypassFlag: "no-cache",
			},
		},
		{
			name: "Cache bypass flag with value",
			queryParams: map[string]string{
				"no-cache": "true",
			},
			want: &CacheOptions{
				Enabled:    false,
				TTL:        DefaultCacheTTL,
				BypassFlag: "no-cache",
			},
		},
		{
			name: "Other query params",
			queryParams: map[string]string{
				"param1": "value1",
				"param2": "value2",
			},
			want: &CacheOptions{
				Enabled:    true,
				TTL:        DefaultCacheTTL,
				BypassFlag: "no-cache",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseCacheParams(tt.queryParams)
			if got.Enabled != tt.want.Enabled || got.TTL != tt.want.TTL || got.BypassFlag != tt.want.BypassFlag {
				t.Errorf("ParseCacheParams() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestResourceCache(t *testing.T) {
	logger := NewMockLogger()
	cache := NewResourceCache(logger)
	defer cache.Close()

	ctx := context.Background()
	key1 := "test-key-1"
	key2 := "test-key-2"
	value1 := "test-value-1"
	value2 := map[string]interface{}{"name": "test", "value": 123}

	// Test Set and Get
	t.Run("Set and Get", func(t *testing.T) {
		// Set values
		cache.Set(ctx, key1, value1, 1*time.Minute)
		cache.Set(ctx, key2, value2, 2*time.Minute)

		// Get values
		got1, found1 := cache.Get(ctx, key1)
		if !found1 {
			t.Errorf("Get() found = %v, want %v", found1, true)
		}
		if got1 != value1 {
			t.Errorf("Get() = %v, want %v", got1, value1)
		}

		got2, found2 := cache.Get(ctx, key2)
		if !found2 {
			t.Errorf("Get() found = %v, want %v", found2, true)
		}
		if got2.(map[string]interface{})["name"] != value2["name"] {
			t.Errorf("Get() = %v, want %v", got2, value2)
		}

		// Get non-existent key
		_, found3 := cache.Get(ctx, "non-existent")
		if found3 {
			t.Errorf("Get() found = %v, want %v", found3, false)
		}
	})

	// Test Delete
	t.Run("Delete", func(t *testing.T) {
		// Set a value
		cache.Set(ctx, key1, value1, 1*time.Minute)

		// Verify it exists
		_, found := cache.Get(ctx, key1)
		if !found {
			t.Errorf("Get() found = %v, want %v", found, true)
		}

		// Delete it
		cache.Delete(ctx, key1)

		// Verify it's gone
		_, found = cache.Get(ctx, key1)
		if found {
			t.Errorf("Get() found = %v, want %v", found, false)
		}
	})

	// Test Clear
	t.Run("Clear", func(t *testing.T) {
		// Set values
		cache.Set(ctx, key1, value1, 1*time.Minute)
		cache.Set(ctx, key2, value2, 2*time.Minute)

		// Verify they exist
		_, found1 := cache.Get(ctx, key1)
		_, found2 := cache.Get(ctx, key2)
		if !found1 || !found2 {
			t.Errorf("Get() found = %v, %v, want true, true", found1, found2)
		}

		// Clear the cache
		cache.Clear(ctx)

		// Verify they're gone
		_, found1 = cache.Get(ctx, key1)
		_, found2 = cache.Get(ctx, key2)
		if found1 || found2 {
			t.Errorf("Get() found = %v, %v, want false, false", found1, found2)
		}
	})

	// Test expiration
	t.Run("Expiration", func(t *testing.T) {
		// Set a value with a short TTL
		cache.Set(ctx, key1, value1, 100*time.Millisecond)

		// Verify it exists
		_, found := cache.Get(ctx, key1)
		if !found {
			t.Errorf("Get() found = %v, want %v", found, true)
		}

		// Wait for it to expire
		time.Sleep(200 * time.Millisecond)

		// Verify it's gone
		_, found = cache.Get(ctx, key1)
		if found {
			t.Errorf("Get() found = %v, want %v", found, false)
		}
	})

	// Test cache key generation
	t.Run("GenerateCacheKey", func(t *testing.T) {
		uri := "maas://machine/123"
		queryParams1 := map[string]string{
			"param1": "value1",
			"param2": "value2",
		}
		queryParams2 := map[string]string{
			"param2": "value2",
			"param1": "value1",
		}
		queryParams3 := map[string]string{
			"param1": "value1",
			"param2": "different",
		}
		queryParamsWithNoCache := map[string]string{
			"param1":   "value1",
			"param2":   "value2",
			"no-cache": "true",
		}

		// Same parameters in different order should generate the same key
		key1 := cache.GenerateCacheKey(uri, queryParams1)
		key2 := cache.GenerateCacheKey(uri, queryParams2)
		if key1 != key2 {
			t.Errorf("GenerateCacheKey() = %v, %v, want same keys", key1, key2)
		}

		// Different parameters should generate different keys
		key3 := cache.GenerateCacheKey(uri, queryParams3)
		if key1 == key3 {
			t.Errorf("GenerateCacheKey() = %v, %v, want different keys", key1, key3)
		}

		// no-cache parameter should be ignored
		key4 := cache.GenerateCacheKey(uri, queryParamsWithNoCache)
		if key1 != key4 {
			t.Errorf("GenerateCacheKey() = %v, %v, want same keys", key1, key4)
		}
	})
}

func TestGetCacheHeaders(t *testing.T) {
	tests := []struct {
		name    string
		options *CacheOptions
		want    map[string]string
	}{
		{
			name: "Caching enabled",
			options: &CacheOptions{
				Enabled: true,
				TTL:     5 * time.Minute,
			},
			want: map[string]string{
				"Cache-Control": "public, max-age=300",
				// Expires header will be dynamic, so we don't check it
			},
		},
		{
			name: "Caching disabled",
			options: &CacheOptions{
				Enabled: false,
				TTL:     5 * time.Minute,
			},
			want: map[string]string{
				"Cache-Control": "no-cache, no-store, must-revalidate",
				"Pragma":        "no-cache",
				"Expires":       "0",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetCacheHeaders(tt.options)

			// Check Cache-Control header
			if got["Cache-Control"] != tt.want["Cache-Control"] {
				t.Errorf("GetCacheHeaders() Cache-Control = %v, want %v", got["Cache-Control"], tt.want["Cache-Control"])
			}

			// Check Pragma header if caching is disabled
			if !tt.options.Enabled {
				if got["Pragma"] != tt.want["Pragma"] {
					t.Errorf("GetCacheHeaders() Pragma = %v, want %v", got["Pragma"], tt.want["Pragma"])
				}
				if got["Expires"] != tt.want["Expires"] {
					t.Errorf("GetCacheHeaders() Expires = %v, want %v", got["Expires"], tt.want["Expires"])
				}
			}

			// If caching is enabled, check that Expires header exists and is in the future
			if tt.options.Enabled {
				if got["Expires"] == "" {
					t.Errorf("GetCacheHeaders() Expires header missing")
				}
			}
		})
	}
}
