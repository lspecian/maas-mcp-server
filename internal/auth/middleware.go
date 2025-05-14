package auth

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
)

// Middleware handles authentication for the MCP server
type Middleware struct {
	cfg          *models.AppConfig
	logger       *logrus.Logger
	store        Store
	rateLimiter  *EnhancedRateLimiter
	jwtManager   *JWTManager
	oauthManager *OAuthManager
	tokenStore   TokenStore
	cleanupOnce  sync.Once
}

// NewMiddleware creates a new authentication middleware
func NewMiddleware(cfg *models.AppConfig, logger *logrus.Logger) (*Middleware, error) {
	var store Store
	var tokenStore TokenStore
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

	// Initialize token store for OAuth and JWT
	if cfg.Auth.Type == "oauth" || cfg.Auth.Type == "jwt" {
		switch cfg.Auth.TokenConfig.Type {
		case "file":
			tokenStore, err = NewFileTokenStore(cfg.Auth.TokenConfig.FilePath)
			if err != nil {
				return nil, fmt.Errorf("failed to initialize file token store: %w", err)
			}
		default:
			// Default to memory token store
			tokenStore = NewMemoryTokenStore()
		}
	}

	// Initialize enhanced rate limiter
	rateLimitConfig := &EnhancedRateLimitConfig{
		Algorithm:       cfg.Auth.RateLimit.Algorithm,
		MaxAttempts:     cfg.Auth.RateLimit.MaxAttempts,
		Window:          cfg.Auth.RateLimit.Window,
		BucketSize:      cfg.Auth.RateLimit.BucketSize,
		RefillRate:      cfg.Auth.RateLimit.RefillRate,
		IPBasedEnabled:  cfg.Auth.RateLimit.IPBasedEnabled,
		EndpointLimits:  make(map[string]EndpointRateLimit),
		GlobalRateLimit: cfg.Auth.RateLimit.GlobalRateLimit,
		IPWhitelist:     cfg.Auth.IPWhitelist,
	}

	// Convert endpoint limits
	for endpoint, limit := range cfg.Auth.RateLimit.EndpointLimits {
		rateLimitConfig.EndpointLimits[endpoint] = EndpointRateLimit{
			MaxRequests: limit.MaxRequests,
			Window:      limit.Window,
		}
	}

	rateLimiter, err := NewEnhancedRateLimiter(rateLimitConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize rate limiter: %w", err)
	}

	middleware := &Middleware{
		cfg:         cfg,
		logger:      logger,
		store:       store,
		rateLimiter: rateLimiter,
		tokenStore:  tokenStore,
	}

	// Initialize JWT manager if JWT authentication is enabled
	if cfg.Auth.Type == "jwt" {
		jwtConfig := &JWTConfig{
			Secret:            cfg.Auth.JWT.Secret,
			PublicKeyPath:     cfg.Auth.JWT.PublicKeyPath,
			PrivateKeyPath:    cfg.Auth.JWT.PrivateKeyPath,
			Algorithm:         cfg.Auth.JWT.Algorithm,
			Issuer:            cfg.Auth.JWT.Issuer,
			Audience:          cfg.Auth.JWT.Audience,
			ExpirationMinutes: cfg.Auth.JWT.ExpirationMinutes,
		}

		middleware.jwtManager, err = NewJWTManager(jwtConfig, tokenStore)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize JWT manager: %w", err)
		}
	}

	// Initialize OAuth manager if OAuth authentication is enabled
	if cfg.Auth.Type == "oauth" {
		providers := make(map[string]*OAuthProvider)
		for name, providerCfg := range cfg.Auth.OAuth.Providers {
			providers[name] = &OAuthProvider{
				Name:         name,
				ClientID:     providerCfg.ClientID,
				ClientSecret: providerCfg.ClientSecret,
				AuthURL:      providerCfg.AuthURL,
				TokenURL:     providerCfg.TokenURL,
				RedirectURL:  providerCfg.RedirectURL,
				Scopes:       providerCfg.Scopes,
			}
		}

		middleware.oauthManager = NewOAuthManager(providers, tokenStore)
	}

	// Start a goroutine to periodically clean up old rate limit entries
	middleware.cleanupOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(time.Minute * 5)
			defer ticker.Stop()

			for range ticker.C {
				middleware.rateLimiter.CleanupOldEntries()
				if middleware.tokenStore != nil {
					middleware.tokenStore.CleanupExpiredTokens()
				}
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
		endpoint := c.Request.URL.Path
		clientID := c.GetHeader("X-Client-ID") // Optional client identifier

		// Check rate limiting
		if m.cfg.Auth.RateLimit.Enabled {
			// Check if IP is whitelisted before applying rate limiting
			isWhitelisted := false
			if m.rateLimiter != nil {
				isWhitelisted = m.rateLimiter.isIPWhitelisted(clientIP)
			}

			if !isWhitelisted && !m.rateLimiter.CheckLimit(clientIP, endpoint, clientID) {
				m.logger.WithFields(logrus.Fields{
					"ip":       clientIP,
					"path":     endpoint,
					"clientID": clientID,
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
		var role string

		// Handle authentication based on configured type
		switch m.cfg.Auth.Type {
		case "apikey":
			authenticated, username, role, err = m.handleAPIKeyAuth(c)
		case "basic":
			authenticated, username, role, err = m.handleBasicAuth(c)
		case "oauth":
			authenticated, username, role, err = m.handleOAuthAuth(c)
		case "jwt":
			authenticated, username, role, err = m.handleJWTAuth(c)
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
				"path":  endpoint,
				"error": err.Error(),
			}).Warn("Authentication error")
		}

		if !authenticated {
			// Authentication failed
			m.logger.WithFields(logrus.Fields{
				"ip":   clientIP,
				"path": endpoint,
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
			case "oauth":
				statusCode = http.StatusUnauthorized
				message = "Invalid OAuth token"
			case "jwt":
				statusCode = http.StatusUnauthorized
				message = "Invalid JWT token"
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
			"path":     endpoint,
			"username": username,
			"role":     role,
		}).Info("Authentication successful")

		// Record successful authentication to reset rate limiting
		if m.cfg.Auth.RateLimit.Enabled {
			m.rateLimiter.RecordSuccess(clientIP, clientID)
		}

		// Set authenticated user in context
		c.Set("authenticated_user", username)
		c.Set("authenticated_role", role)
		c.Next()
	}
}

// handleAPIKeyAuth handles API key authentication
func (m *Middleware) handleAPIKeyAuth(c *gin.Context) (bool, string, string, error) {
	apiKey := c.GetHeader("X-API-Key")
	if apiKey == "" {
		return false, "", "", nil
	}

	user, err := m.store.GetUserByAPIKey(apiKey)
	if err != nil {
		return false, "", "", err
	}

	return true, user.Username, user.Role, nil
}

// handleBasicAuth handles HTTP Basic authentication
func (m *Middleware) handleBasicAuth(c *gin.Context) (bool, string, string, error) {
	auth := c.GetHeader("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Basic ") {
		return false, "", "", nil
	}

	// Extract and decode the base64 credentials
	payload, err := base64.StdEncoding.DecodeString(auth[6:])
	if err != nil {
		return false, "", "", err
	}

	// Split into username and password
	pair := strings.SplitN(string(payload), ":", 2)
	if len(pair) != 2 {
		return false, "", "", nil
	}

	username := pair[0]
	password := pair[1]

	user, err := m.store.GetUserByCredentials(username, password)
	if err != nil {
		return false, "", "", err
	}

	return true, user.Username, user.Role, nil
}

// handleJWTAuth handles JWT authentication
func (m *Middleware) handleJWTAuth(c *gin.Context) (bool, string, string, error) {
	auth := c.GetHeader("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return false, "", "", nil
	}

	tokenString := auth[7:] // Remove "Bearer " prefix

	// Validate the token
	claims, err := m.jwtManager.ValidateToken(tokenString)
	if err != nil {
		return false, "", "", err
	}

	// Extract user information from claims
	userID, ok := claims["sub"].(string)
	if !ok {
		return false, "", "", fmt.Errorf("invalid subject claim in token")
	}

	// Extract role if available
	role := "user" // Default role
	if roleClaim, ok := claims["role"].(string); ok {
		role = roleClaim
	}

	return true, userID, role, nil
}

// handleOAuthAuth handles OAuth authentication
func (m *Middleware) handleOAuthAuth(c *gin.Context) (bool, string, string, error) {
	auth := c.GetHeader("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return false, "", "", nil
	}

	tokenString := auth[7:] // Remove "Bearer " prefix

	// Validate the token
	valid, err := m.oauthManager.ValidateToken(tokenString)
	if err != nil || !valid {
		return false, "", "", err
	}

	// Get the token from the store
	token, err := m.tokenStore.GetToken(tokenString)
	if err != nil {
		return false, "", "", err
	}

	// Default role for OAuth users
	role := "user"

	return true, token.UserID, role, nil
}

// GenerateJWTToken generates a new JWT token for a user
func (m *Middleware) GenerateJWTToken(userID string, role string) (string, error) {
	if m.jwtManager == nil {
		return "", fmt.Errorf("JWT manager not initialized")
	}

	claims := map[string]interface{}{
		"role": role,
	}

	return m.jwtManager.GenerateToken(userID, claims)
}

// GetOAuthAuthURL returns the authorization URL for the specified provider
func (m *Middleware) GetOAuthAuthURL(providerName string, state string) (string, error) {
	if m.oauthManager == nil {
		return "", fmt.Errorf("OAuth manager not initialized")
	}

	return m.oauthManager.GetAuthURL(providerName, state)
}

// HandleOAuthCallback handles the OAuth callback
func (m *Middleware) HandleOAuthCallback(ctx context.Context, providerName string, code string) (string, *OAuthUserInfo, error) {
	if m.oauthManager == nil {
		return "", nil, fmt.Errorf("OAuth manager not initialized")
	}

	// Exchange code for token
	tokenResp, err := m.oauthManager.ExchangeCodeForToken(providerName, code)
	if err != nil {
		return "", nil, err
	}

	// Get user info
	userInfo, err := m.oauthManager.GetUserInfo(ctx, providerName, tokenResp.AccessToken)
	if err != nil {
		return "", nil, err
	}

	// Update token with user ID
	token, err := m.tokenStore.GetToken(tokenResp.AccessToken)
	if err != nil {
		return "", nil, err
	}

	token.UserID = userInfo.ID
	if err := m.tokenStore.StoreToken(token); err != nil {
		return "", nil, err
	}

	// If refresh token was provided, update it too
	if tokenResp.RefreshToken != "" {
		tokens, _ := m.tokenStore.GetTokensByUserID("")
		for _, t := range tokens {
			if t.Type == TokenTypeRefresh && t.Value == tokenResp.RefreshToken {
				t.UserID = userInfo.ID
				m.tokenStore.StoreToken(t)
				break
			}
		}
	}

	return tokenResp.AccessToken, userInfo, nil
}

// RevokeToken revokes a token
func (m *Middleware) RevokeToken(tokenString string) error {
	if m.tokenStore == nil {
		return fmt.Errorf("token store not initialized")
	}

	return m.tokenStore.RevokeToken(tokenString)
}

// RevokeAllUserTokens revokes all tokens for a user
func (m *Middleware) RevokeAllUserTokens(userID string) error {
	if m.tokenStore == nil {
		return fmt.Errorf("token store not initialized")
	}

	return m.tokenStore.RevokeAllUserTokens(userID)
}
