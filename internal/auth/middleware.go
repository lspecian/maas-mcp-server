package auth

import (
	"encoding/base64"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/sirupsen/logrus"
)

// Middleware handles authentication for the MCP server
type Middleware struct {
	cfg         *config.Config
	logger      *logrus.Logger
	store       Store
	rateLimiter *RateLimiter
	cleanupOnce sync.Once
}

// NewMiddleware creates a new authentication middleware
func NewMiddleware(cfg *config.Config, logger *logrus.Logger) (*Middleware, error) {
	var store Store
	var err error

	// Initialize the appropriate store based on configuration
	if cfg.Auth.UserStore == "file" {
		store, err = NewFileStore(cfg.Auth.StoreFile)
		if err != nil {
			return nil, err
		}
	} else {
		// Default to memory store
		store = NewMemoryStore()

		// Add default API key if configured
		if cfg.Auth.APIKey != "" {
			defaultUser := &User{
				Username: "admin",
				APIKey:   cfg.Auth.APIKey,
				Role:     "admin",
				Created:  time.Now(),
			}
			if err := store.AddUser(defaultUser); err != nil {
				return nil, err
			}
		}
	}

	// Initialize rate limiter
	rateLimiter := NewRateLimiter(
		cfg.Auth.RateLimit.MaxAttempts,
		cfg.Auth.RateLimit.Window,
	)

	middleware := &Middleware{
		cfg:         cfg,
		logger:      logger,
		store:       store,
		rateLimiter: rateLimiter,
	}

	// Start a goroutine to periodically clean up old rate limit entries
	middleware.cleanupOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(time.Minute * 5)
			defer ticker.Stop()

			for range ticker.C {
				middleware.rateLimiter.CleanupOldEntries()
			}
		}()
	})

	return middleware, nil
}

// Handler returns a Gin middleware function for authentication
func (m *Middleware) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip authentication if disabled
		if !m.cfg.Auth.Enabled {
			c.Next()
			return
		}

		clientIP := c.ClientIP()

		// Check rate limiting
		if m.cfg.Auth.RateLimit.Enabled {
			if !m.rateLimiter.CheckLimit(clientIP) {
				m.logger.WithFields(logrus.Fields{
					"ip":   clientIP,
					"path": c.Request.URL.Path,
				}).Warn("Rate limit exceeded for authentication attempts")

				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"error": "Too many authentication attempts, please try again later",
				})
				return
			}
		}

		var authenticated bool
		var username string
		var err error

		// Handle authentication based on configured type
		switch m.cfg.Auth.Type {
		case "apikey":
			authenticated, username, err = m.handleAPIKeyAuth(c)
		case "basic":
			authenticated, username, err = m.handleBasicAuth(c)
		default:
			m.logger.WithFields(logrus.Fields{
				"auth_type": m.cfg.Auth.Type,
			}).Error("Invalid authentication type configured")

			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid authentication configuration",
			})
			return
		}

		// Handle authentication result
		if err != nil {
			m.logger.WithFields(logrus.Fields{
				"ip":    clientIP,
				"path":  c.Request.URL.Path,
				"error": err.Error(),
			}).Warn("Authentication error")
		}

		if !authenticated {
			// Authentication failed
			m.logger.WithFields(logrus.Fields{
				"ip":   clientIP,
				"path": c.Request.URL.Path,
			}).Warn("Authentication failed")

			var statusCode int
			var message string

			switch m.cfg.Auth.Type {
			case "apikey":
				statusCode = http.StatusUnauthorized
				message = "Invalid API key"
			case "basic":
				statusCode = http.StatusUnauthorized
				message = "Invalid credentials"
				c.Header("WWW-Authenticate", `Basic realm="MCP Server"`)
			default:
				statusCode = http.StatusInternalServerError
				message = "Authentication error"
			}

			c.AbortWithStatusJSON(statusCode, gin.H{
				"error": message,
			})
			return
		}

		// Authentication succeeded
		m.logger.WithFields(logrus.Fields{
			"ip":       clientIP,
			"path":     c.Request.URL.Path,
			"username": username,
		}).Info("Authentication successful")

		// Record successful authentication to reset rate limiting
		if m.cfg.Auth.RateLimit.Enabled {
			m.rateLimiter.RecordSuccess(clientIP)
		}

		// Set authenticated user in context
		c.Set("authenticated_user", username)
		c.Next()
	}
}

// handleAPIKeyAuth handles API key authentication
func (m *Middleware) handleAPIKeyAuth(c *gin.Context) (bool, string, error) {
	apiKey := c.GetHeader("X-API-Key")
	if apiKey == "" {
		return false, "", nil
	}

	user, err := m.store.GetUserByAPIKey(apiKey)
	if err != nil {
		return false, "", err
	}

	return true, user.Username, nil
}

// handleBasicAuth handles HTTP Basic authentication
func (m *Middleware) handleBasicAuth(c *gin.Context) (bool, string, error) {
	auth := c.GetHeader("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Basic ") {
		return false, "", nil
	}

	// Extract and decode the base64 credentials
	payload, err := base64.StdEncoding.DecodeString(auth[6:])
	if err != nil {
		return false, "", err
	}

	// Split into username and password
	pair := strings.SplitN(string(payload), ":", 2)
	if len(pair) != 2 {
		return false, "", nil
	}

	username := pair[0]
	password := pair[1]

	user, err := m.store.GetUserByCredentials(username, password)
	if err != nil {
		return false, "", err
	}

	return true, user.Username, nil
}
