package auth

import (
	"net"
	"sync"
	"time"
)

// RateLimitAlgorithm represents the algorithm used for rate limiting
type RateLimitAlgorithm string

const (
	// RateLimitAlgorithmCounter represents a simple counter-based rate limiting algorithm
	RateLimitAlgorithmCounter RateLimitAlgorithm = "counter"
	// RateLimitAlgorithmTokenBucket represents the token bucket rate limiting algorithm
	RateLimitAlgorithmTokenBucket RateLimitAlgorithm = "token_bucket"
	// RateLimitAlgorithmLeakyBucket represents the leaky bucket rate limiting algorithm
	RateLimitAlgorithmLeakyBucket RateLimitAlgorithm = "leaky_bucket"
)

// EnhancedRateLimiter provides advanced rate limiting capabilities
type EnhancedRateLimiter struct {
	algorithm      RateLimitAlgorithm
	ipLimits       map[string]*TokenBucket // IP -> token bucket
	endpointLimits map[string]*TokenBucket // Endpoint -> token bucket
	clientLimits   map[string]*TokenBucket // Client ID -> token bucket
	globalBucket   *TokenBucket            // Global rate limit bucket
	ipWhitelist    []*net.IPNet            // Whitelisted IP ranges
	mu             sync.RWMutex
}

// TokenBucket implements the token bucket algorithm for rate limiting
type TokenBucket struct {
	tokens       float64       // Current number of tokens in the bucket
	capacity     int           // Maximum number of tokens the bucket can hold
	refillRate   float64       // Rate at which tokens are added to the bucket (tokens per second)
	lastRefill   time.Time     // Last time the bucket was refilled
	windowPeriod time.Duration // Time window for rate limiting (for counter algorithm)
	attempts     []time.Time   // List of attempt timestamps (for counter algorithm)
	maxAttempts  int           // Maximum number of attempts allowed in the window (for counter algorithm)
	mu           sync.Mutex
}

// NewTokenBucket creates a new token bucket
func NewTokenBucket(capacity int, refillRate float64) *TokenBucket {
	return &TokenBucket{
		tokens:     float64(capacity),
		capacity:   capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// NewCounterBucket creates a new counter-based rate limiter bucket
func NewCounterBucket(maxAttempts int, windowSeconds int) *TokenBucket {
	return &TokenBucket{
		maxAttempts:  maxAttempts,
		attempts:     make([]time.Time, 0, maxAttempts),
		windowPeriod: time.Duration(windowSeconds) * time.Second,
	}
}

// Take attempts to take a token from the bucket
// Returns true if a token was successfully taken, false otherwise
func (b *TokenBucket) Take() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()

	if b.refillRate > 0 {
		// Token bucket algorithm
		// Calculate how many tokens to add based on time elapsed
		elapsed := now.Sub(b.lastRefill).Seconds()
		b.tokens = min(float64(b.capacity), b.tokens+(elapsed*b.refillRate))
		b.lastRefill = now

		// Check if we have enough tokens
		if b.tokens >= 1 {
			b.tokens--
			return true
		}
		return false
	} else {
		// Counter algorithm
		// Filter out attempts outside the window
		windowStart := now.Add(-b.windowPeriod)
		validAttempts := make([]time.Time, 0, len(b.attempts))
		for _, attempt := range b.attempts {
			if attempt.After(windowStart) {
				validAttempts = append(validAttempts, attempt)
			}
		}

		// Check if we've exceeded the limit
		if len(validAttempts) >= b.maxAttempts {
			b.attempts = validAttempts
			return false
		}

		// Add the current attempt and allow it
		b.attempts = append(validAttempts, now)
		return true
	}
}

// Reset resets the bucket to its initial state
func (b *TokenBucket) Reset() {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.refillRate > 0 {
		// Token bucket algorithm
		b.tokens = float64(b.capacity)
		b.lastRefill = time.Now()
	} else {
		// Counter algorithm
		b.attempts = make([]time.Time, 0, b.maxAttempts)
	}
}

// RemainingTokens returns the number of tokens remaining in the bucket
func (b *TokenBucket) RemainingTokens() float64 {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.refillRate > 0 {
		// Token bucket algorithm
		now := time.Now()
		elapsed := now.Sub(b.lastRefill).Seconds()
		return min(float64(b.capacity), b.tokens+(elapsed*b.refillRate))
	} else {
		// Counter algorithm
		now := time.Now()
		windowStart := now.Add(-b.windowPeriod)
		validAttempts := 0
		for _, attempt := range b.attempts {
			if attempt.After(windowStart) {
				validAttempts++
			}
		}
		return float64(b.maxAttempts - validAttempts)
	}
}

// NewEnhancedRateLimiter creates a new enhanced rate limiter
func NewEnhancedRateLimiter(config *EnhancedRateLimitConfig) (*EnhancedRateLimiter, error) {
	limiter := &EnhancedRateLimiter{
		algorithm:      RateLimitAlgorithm(config.Algorithm),
		ipLimits:       make(map[string]*TokenBucket),
		endpointLimits: make(map[string]*TokenBucket),
		clientLimits:   make(map[string]*TokenBucket),
		ipWhitelist:    make([]*net.IPNet, 0),
	}

	// Initialize global rate limit if configured
	if config.GlobalRateLimit > 0 {
		if limiter.algorithm == RateLimitAlgorithmTokenBucket {
			limiter.globalBucket = NewTokenBucket(config.GlobalRateLimit, float64(config.GlobalRateLimit)/60.0) // Refill at rate to allow GlobalRateLimit per minute
		} else {
			limiter.globalBucket = NewCounterBucket(config.GlobalRateLimit, 60) // 60 seconds (1 minute)
		}
	}

	// Parse IP whitelist
	for _, cidr := range config.IPWhitelist {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err != nil {
			// Try as a single IP
			ip := net.ParseIP(cidr)
			if ip == nil {
				return nil, err
			}
			// Convert single IP to CIDR with /32 (IPv4) or /128 (IPv6) mask
			var mask net.IPMask
			if ip.To4() != nil {
				mask = net.CIDRMask(32, 32)
			} else {
				mask = net.CIDRMask(128, 128)
			}
			ipNet = &net.IPNet{
				IP:   ip,
				Mask: mask,
			}
		}
		limiter.ipWhitelist = append(limiter.ipWhitelist, ipNet)
	}

	// Initialize endpoint rate limits
	for endpoint, config := range config.EndpointLimits {
		if limiter.algorithm == RateLimitAlgorithmTokenBucket {
			limiter.endpointLimits[endpoint] = NewTokenBucket(config.MaxRequests, float64(config.MaxRequests)/float64(config.Window))
		} else {
			limiter.endpointLimits[endpoint] = NewCounterBucket(config.MaxRequests, config.Window)
		}
	}

	return limiter, nil
}

// CheckLimit checks if the request is allowed based on rate limits
// Returns true if the request is allowed, false if rate limited
func (r *EnhancedRateLimiter) CheckLimit(ip string, endpoint string, clientID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Check IP whitelist
	if r.isIPWhitelisted(ip) {
		return true
	}

	// Check global rate limit
	if r.globalBucket != nil {
		if !r.globalBucket.Take() {
			return false
		}
	}

	// Check endpoint-specific rate limit
	if bucket, exists := r.endpointLimits[endpoint]; exists {
		if !bucket.Take() {
			return false
		}
	}

	// Check IP-based rate limit
	ipBucket, exists := r.ipLimits[ip]
	if !exists {
		// Create a new bucket for this IP
		if r.algorithm == RateLimitAlgorithmTokenBucket {
			ipBucket = NewTokenBucket(10, 1.0) // Default: 10 tokens, refill 1 per second
		} else {
			ipBucket = NewCounterBucket(10, 60) // Default: 10 attempts per minute
		}
		r.ipLimits[ip] = ipBucket
	}
	if !ipBucket.Take() {
		return false
	}

	// Check client-specific rate limit if client ID is provided
	if clientID != "" {
		clientBucket, exists := r.clientLimits[clientID]
		if !exists {
			// Create a new bucket for this client
			if r.algorithm == RateLimitAlgorithmTokenBucket {
				clientBucket = NewTokenBucket(20, 2.0) // Default: 20 tokens, refill 2 per second
			} else {
				clientBucket = NewCounterBucket(20, 60) // Default: 20 attempts per minute
			}
			r.clientLimits[clientID] = clientBucket
		}
		if !clientBucket.Take() {
			return false
		}
	}

	return true
}

// RecordSuccess records a successful request, which may reset rate limits for the client
func (r *EnhancedRateLimiter) RecordSuccess(ip string, clientID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Reset IP-based rate limit
	if bucket, exists := r.ipLimits[ip]; exists {
		bucket.Reset()
	}

	// Reset client-specific rate limit if client ID is provided
	if clientID != "" {
		if bucket, exists := r.clientLimits[clientID]; exists {
			bucket.Reset()
		}
	}
}

// GetRemainingAttempts returns the number of attempts remaining for the IP
func (r *EnhancedRateLimiter) GetRemainingAttempts(ip string) float64 {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Check IP whitelist
	if r.isIPWhitelisted(ip) {
		return float64(1000) // Arbitrary large number
	}

	bucket, exists := r.ipLimits[ip]
	if !exists {
		// No bucket exists yet, so full capacity is available
		return 10.0 // Default capacity
	}

	return bucket.RemainingTokens()
}

// CleanupOldEntries removes expired entries to prevent memory leaks
func (r *EnhancedRateLimiter) CleanupOldEntries() {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Clean up IP-based rate limits
	for ip, bucket := range r.ipLimits {
		if bucket.RemainingTokens() >= float64(bucket.capacity) {
			delete(r.ipLimits, ip)
		}
	}

	// Clean up client-specific rate limits
	for clientID, bucket := range r.clientLimits {
		if bucket.RemainingTokens() >= float64(bucket.capacity) {
			delete(r.clientLimits, clientID)
		}
	}
}

// isIPWhitelisted checks if an IP is in the whitelist
func (r *EnhancedRateLimiter) isIPWhitelisted(ipStr string) bool {
	if len(r.ipWhitelist) == 0 {
		return false
	}

	ip := net.ParseIP(ipStr)
	if ip == nil {
		return false
	}

	for _, ipNet := range r.ipWhitelist {
		if ipNet.Contains(ip) {
			return true
		}
	}

	return false
}

// AddIPToWhitelist adds an IP or CIDR to the whitelist
func (r *EnhancedRateLimiter) AddIPToWhitelist(cidr string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, ipNet, err := net.ParseCIDR(cidr)
	if err != nil {
		// Try as a single IP
		ip := net.ParseIP(cidr)
		if ip == nil {
			return err
		}
		// Convert single IP to CIDR with /32 (IPv4) or /128 (IPv6) mask
		var mask net.IPMask
		if ip.To4() != nil {
			mask = net.CIDRMask(32, 32)
		} else {
			mask = net.CIDRMask(128, 128)
		}
		ipNet = &net.IPNet{
			IP:   ip,
			Mask: mask,
		}
	}

	r.ipWhitelist = append(r.ipWhitelist, ipNet)
	return nil
}

// RemoveIPFromWhitelist removes an IP or CIDR from the whitelist
func (r *EnhancedRateLimiter) RemoveIPFromWhitelist(cidr string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, ipNetToRemove, err := net.ParseCIDR(cidr)
	if err != nil {
		// Try as a single IP
		ip := net.ParseIP(cidr)
		if ip == nil {
			return err
		}
		// Convert single IP to CIDR with /32 (IPv4) or /128 (IPv6) mask
		var mask net.IPMask
		if ip.To4() != nil {
			mask = net.CIDRMask(32, 32)
		} else {
			mask = net.CIDRMask(128, 128)
		}
		ipNetToRemove = &net.IPNet{
			IP:   ip,
			Mask: mask,
		}
	}

	// Find and remove the matching entry
	for i, ipNet := range r.ipWhitelist {
		if ipNet.String() == ipNetToRemove.String() {
			r.ipWhitelist = append(r.ipWhitelist[:i], r.ipWhitelist[i+1:]...)
			return nil
		}
	}

	return nil
}

// SetEndpointLimit sets the rate limit for a specific endpoint
func (r *EnhancedRateLimiter) SetEndpointLimit(endpoint string, maxRequests int, window int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.algorithm == RateLimitAlgorithmTokenBucket {
		r.endpointLimits[endpoint] = NewTokenBucket(maxRequests, float64(maxRequests)/float64(window))
	} else {
		r.endpointLimits[endpoint] = NewCounterBucket(maxRequests, window)
	}
}

// RemoveEndpointLimit removes the rate limit for a specific endpoint
func (r *EnhancedRateLimiter) RemoveEndpointLimit(endpoint string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.endpointLimits, endpoint)
}

// SetClientLimit sets the rate limit for a specific client
func (r *EnhancedRateLimiter) SetClientLimit(clientID string, maxRequests int, window int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.algorithm == RateLimitAlgorithmTokenBucket {
		r.clientLimits[clientID] = NewTokenBucket(maxRequests, float64(maxRequests)/float64(window))
	} else {
		r.clientLimits[clientID] = NewCounterBucket(maxRequests, window)
	}
}

// RemoveClientLimit removes the rate limit for a specific client
func (r *EnhancedRateLimiter) RemoveClientLimit(clientID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.clientLimits, clientID)
}

// EnhancedRateLimitConfig represents the configuration for enhanced rate limiting
type EnhancedRateLimitConfig struct {
	Algorithm       string
	MaxAttempts     int
	Window          int
	BucketSize      int
	RefillRate      float64
	IPBasedEnabled  bool
	EndpointLimits  map[string]EndpointRateLimit
	GlobalRateLimit int
	IPWhitelist     []string
}

// EndpointRateLimit represents rate limiting configuration for a specific endpoint
type EndpointRateLimit struct {
	MaxRequests int
	Window      int
}

// min returns the minimum of two float64 values
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
