package auth

import (
	"sync"
	"time"
)

// RateLimiter manages rate limiting for authentication attempts
type RateLimiter struct {
	attempts     map[string][]time.Time // IP -> list of attempt timestamps
	maxAttempts  int                    // Maximum number of attempts allowed in the window
	windowPeriod time.Duration          // Time window for rate limiting
	mu           sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxAttempts int, windowSeconds int) *RateLimiter {
	return &RateLimiter{
		attempts:     make(map[string][]time.Time),
		maxAttempts:  maxAttempts,
		windowPeriod: time.Duration(windowSeconds) * time.Second,
	}
}

// CheckLimit checks if the IP has exceeded the rate limit
// Returns true if the IP is allowed to make another attempt, false if rate limited
func (r *RateLimiter) CheckLimit(ip string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.windowPeriod)

	// Get attempts for this IP
	ipAttempts, exists := r.attempts[ip]
	if !exists {
		// First attempt for this IP
		r.attempts[ip] = []time.Time{now}
		return true
	}

	// Filter out attempts outside the window
	validAttempts := make([]time.Time, 0, len(ipAttempts))
	for _, attempt := range ipAttempts {
		if attempt.After(windowStart) {
			validAttempts = append(validAttempts, attempt)
		}
	}

	// Check if we've exceeded the limit
	if len(validAttempts) >= r.maxAttempts {
		// Rate limit exceeded
		r.attempts[ip] = validAttempts
		return false
	}

	// Add the current attempt and allow it
	r.attempts[ip] = append(validAttempts, now)
	return true
}

// RecordSuccess records a successful authentication, which clears the rate limit for the IP
func (r *RateLimiter) RecordSuccess(ip string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Clear attempts for this IP
	delete(r.attempts, ip)
}

// GetRemainingAttempts returns the number of attempts remaining for the IP
func (r *RateLimiter) GetRemainingAttempts(ip string) int {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.windowPeriod)

	// Get attempts for this IP
	ipAttempts, exists := r.attempts[ip]
	if !exists {
		return r.maxAttempts
	}

	// Count attempts within the window
	validAttempts := 0
	for _, attempt := range ipAttempts {
		if attempt.After(windowStart) {
			validAttempts++
		}
	}

	remaining := r.maxAttempts - validAttempts
	if remaining < 0 {
		remaining = 0
	}

	return remaining
}

// CleanupOldEntries removes expired entries to prevent memory leaks
// This should be called periodically, e.g., from a goroutine
func (r *RateLimiter) CleanupOldEntries() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.windowPeriod)

	for ip, attempts := range r.attempts {
		validAttempts := make([]time.Time, 0, len(attempts))
		for _, attempt := range attempts {
			if attempt.After(windowStart) {
				validAttempts = append(validAttempts, attempt)
			}
		}

		if len(validAttempts) == 0 {
			// No valid attempts, remove the entry
			delete(r.attempts, ip)
		} else {
			// Update with only valid attempts
			r.attempts[ip] = validAttempts
		}
	}
}
