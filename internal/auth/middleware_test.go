package auth

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter(cfg *config.Config) (*gin.Engine, *logrus.Logger, error) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	middleware, err := NewMiddleware(cfg, logger)
	if err != nil {
		return nil, nil, err
	}

	router.Use(middleware.Handler())

	router.GET("/test", func(c *gin.Context) {
		username, exists := c.Get("authenticated_user")
		if exists {
			c.JSON(http.StatusOK, gin.H{
				"status":   "authenticated",
				"username": username,
			})
		} else {
			c.JSON(http.StatusOK, gin.H{
				"status": "no auth required",
			})
		}
	})

	return router, logger, nil
}

func TestAuthDisabled(t *testing.T) {
	cfg := &config.Config{}
	cfg.Auth.Enabled = false

	router, _, err := setupTestRouter(cfg)
	assert.NoError(t, err)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "no auth required")
}

func TestAPIKeyAuth(t *testing.T) {
	// Setup config with API key auth
	cfg := &config.Config{}
	cfg.Auth.Enabled = true
	cfg.Auth.Type = "apikey"
	cfg.Auth.APIKey = "test-api-key"
	cfg.Auth.UserStore = "memory"
	cfg.Auth.RateLimit.Enabled = true
	cfg.Auth.RateLimit.MaxAttempts = 3
	cfg.Auth.RateLimit.Window = 60

	router, _, err := setupTestRouter(cfg)
	assert.NoError(t, err)

	// Test with valid API key
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-API-Key", "test-api-key")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "authenticated")
	assert.Contains(t, w.Body.String(), "admin")

	// Test with invalid API key
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-API-Key", "invalid-key")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid API key")

	// Test with missing API key
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid API key")
}

func TestBasicAuth(t *testing.T) {
	// Setup config with basic auth
	cfg := &config.Config{}
	cfg.Auth.Enabled = true
	cfg.Auth.Type = "basic"
	cfg.Auth.UserStore = "memory"

	router, logger, err := setupTestRouter(cfg)
	assert.NoError(t, err)

	// Add a test user to the store
	store := NewMemoryStore()
	store.AddUser(&User{
		Username: "testuser",
		Password: "testpass",
		Role:     "user",
		Created:  time.Now(),
	})

	// Replace the middleware's store with our test store
	middleware, err := NewMiddleware(cfg, logger)
	assert.NoError(t, err)
	middleware.store = store

	// Update the router with the new middleware
	router = gin.New()
	router.Use(middleware.Handler())
	router.GET("/test", func(c *gin.Context) {
		username, exists := c.Get("authenticated_user")
		if exists {
			c.JSON(http.StatusOK, gin.H{
				"status":   "authenticated",
				"username": username,
			})
		} else {
			c.JSON(http.StatusOK, gin.H{
				"status": "no auth required",
			})
		}
	})

	// Test with valid credentials
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	auth := base64.StdEncoding.EncodeToString([]byte("testuser:testpass"))
	req.Header.Set("Authorization", fmt.Sprintf("Basic %s", auth))
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "authenticated")
	assert.Contains(t, w.Body.String(), "testuser")

	// Test with invalid credentials
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	auth = base64.StdEncoding.EncodeToString([]byte("testuser:wrongpass"))
	req.Header.Set("Authorization", fmt.Sprintf("Basic %s", auth))
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid credentials")

	// Test with missing auth header
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid credentials")
}

func TestRateLimiting(t *testing.T) {
	// Setup config with API key auth and rate limiting
	cfg := &config.Config{}
	cfg.Auth.Enabled = true
	cfg.Auth.Type = "apikey"
	cfg.Auth.APIKey = "test-api-key"
	cfg.Auth.UserStore = "memory"
	cfg.Auth.RateLimit.Enabled = true
	cfg.Auth.RateLimit.MaxAttempts = 2 // Set low for testing
	cfg.Auth.RateLimit.Window = 60

	router, _, err := setupTestRouter(cfg)
	assert.NoError(t, err)

	// Make multiple failed attempts
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.Header.Set("X-API-Key", "invalid-key")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	}

	// The next attempt should be rate limited
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-API-Key", "invalid-key")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "Too many authentication attempts")

	// A successful authentication should reset the rate limit
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-API-Key", "test-api-key")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Now we should be able to make failed attempts again
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-API-Key", "invalid-key")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
