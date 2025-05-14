package mcp

import (
	"errors" // Added standard errors package
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/auth"
	ierrors "github.com/lspecian/maas-mcp-server/internal/errors" // Aliased to avoid conflict
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// Middleware contains middleware functions for the MCP protocol
type Middleware struct {
	logger      *logging.Logger
	config      *models.AppConfig
	authHandler *auth.Middleware
}

// NewMiddleware creates a new MCP middleware
func NewMiddleware(logger *logging.Logger, config *models.AppConfig, authHandler *auth.Middleware) *Middleware {
	return &Middleware{
		logger:      logger,
		config:      config,
		authHandler: authHandler,
	}
}

// CORSMiddleware returns a middleware for handling CORS
func (m *Middleware) CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set CORS headers
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With, X-API-Key, X-Correlation-ID, X-MCP-Version, X-MCP-Client-ID")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type, X-Correlation-ID, X-MCP-Version, X-MCP-Operation-ID")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// VersionNegotiationMiddleware handles protocol version negotiation
func (m *Middleware) VersionNegotiationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get client version from header
		clientVersion := c.GetHeader("X-MCP-Version")
		if clientVersion == "" {
			// Default to version 1.0 if not specified
			clientVersion = "1.0"
		}

		// Check if client version is supported
		// For now, we only support version 1.0
		if !strings.HasPrefix(clientVersion, "1.") {
			c.AbortWithStatusJSON(http.StatusBadRequest, NewMCPErrorResponse(
				NewMCPError(
					ErrorCodeVersionNotSupported,
					"Unsupported protocol version",
					map[string]interface{}{
						"client_version":     clientVersion,
						"supported_versions": []string{"1.0"},
					},
				),
				nil,
			))
			return
		}

		// Set server version in response header
		c.Header("X-MCP-Version", "1.0")

		c.Next()
	}
}

// ContentTypeMiddleware ensures the correct content type for MCP requests and responses
func (m *Middleware) ContentTypeMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check content type for non-GET requests
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodOptions {
			contentType := c.GetHeader("Content-Type")
			if contentType == "" {
				c.AbortWithStatusJSON(http.StatusBadRequest, NewMCPErrorResponse(
					NewMCPError(
						ErrorCodeInvalidRequest,
						"Content-Type header is required",
						nil,
					),
					nil,
				))
				return
			}

			// Check if content type is application/json
			if !strings.Contains(contentType, "application/json") {
				c.AbortWithStatusJSON(http.StatusUnsupportedMediaType, NewMCPErrorResponse(
					NewMCPError(
						ErrorCodeInvalidRequest,
						"Unsupported Content-Type",
						map[string]interface{}{
							"content_type":    contentType,
							"supported_types": []string{"application/json"},
						},
					),
					nil,
				))
				return
			}
		}

		// Set response content type
		c.Header("Content-Type", "application/json; charset=utf-8")

		c.Next()
	}
}

// RequestValidationMiddleware validates MCP requests
func (m *Middleware) RequestValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only validate POST requests to /mcp
		if c.Request.Method == http.MethodPost && c.FullPath() == "/mcp" {
			var request MCPRequest
			if err := c.ShouldBindJSON(&request); err != nil {
				c.AbortWithStatusJSON(http.StatusBadRequest, NewMCPErrorResponse(
					NewMCPError(
						ErrorCodeParseError,
						"Parse error: "+err.Error(),
						nil,
					),
					nil,
				))
				return
			}

			// Validate request
			if err := request.Validate(); err != nil {
				c.AbortWithStatusJSON(http.StatusBadRequest, NewMCPErrorResponse(
					NewMCPError(
						ErrorCodeInvalidRequest,
						"Invalid request: "+err.Error(),
						nil,
					),
					request.ID,
				))
				return
			}

			// Store request in context
			c.Set("mcp_request", &request)
		}

		c.Next()
	}
}

// ErrorHandlerMiddleware handles MCP-specific errors
func (m *Middleware) ErrorHandlerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if there were any errors
		if len(c.Errors) > 0 {
			// Get the last error
			err := c.Errors.Last().Err

			// Get request ID if available
			var id interface{}
			if mcpRequest, exists := c.Get("mcp_request"); exists {
				id = mcpRequest.(*MCPRequest).ID
			}

			// Convert to MCP error
			var mcpError *MCPError
			var appErr *ierrors.AppError // Use aliased package

			// Use errors.As for robust type checking (this 'errors.As' is from the standard library)
			if errors.As(err, &appErr) {
				// Convert AppError to MCPError
				mcpError = convertAppErrorToMCPError(appErr)
			} else {
				// Create a generic internal error
				mcpError = NewMCPError(
					ErrorCodeInternalError,
					"Internal error: "+err.Error(),
					nil,
				)
			}

			// Respond with error
			c.JSON(http.StatusOK, NewMCPErrorResponse(mcpError, id))
		}
	}
}

// AuthMiddleware handles authentication for MCP requests
func (m *Middleware) AuthMiddleware() gin.HandlerFunc {
	// If auth is not enabled, return a pass-through middleware
	if !m.config.Auth.Enabled {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	// Otherwise, use the auth middleware
	return m.authHandler.Handler()
}

// RateLimitMiddleware handles rate limiting for MCP requests
func (m *Middleware) RateLimitMiddleware() gin.HandlerFunc {
	// If rate limiting is not enabled, return a pass-through middleware
	if !m.config.Auth.RateLimit.Enabled {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	// Create a rate limiter
	limiter := auth.NewRateLimiter(
		m.config.Auth.RateLimit.MaxAttempts,
		m.config.Auth.RateLimit.Window,
	)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		// Check rate limiting
		if !limiter.CheckLimit(clientIP) {
			// Get request ID if available
			var id interface{}
			if mcpRequest, exists := c.Get("mcp_request"); exists {
				id = mcpRequest.(*MCPRequest).ID
			}

			c.AbortWithStatusJSON(http.StatusTooManyRequests, NewMCPErrorResponse(
				NewMCPError(
					ErrorCodeRateLimitExceeded,
					"Rate limit exceeded",
					map[string]interface{}{
						"retry_after": m.config.Auth.RateLimit.Window,
					},
				),
				id,
			))
			return
		}

		c.Next()

		// Record successful request
		limiter.RecordSuccess(clientIP)
	}
}

// LoggingMiddleware logs MCP requests and responses
func (m *Middleware) LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()

		// Get correlation ID
		correlationID := c.GetHeader("X-Correlation-ID")
		if correlationID == "" {
			correlationID = logging.GenerateCorrelationID()
			c.Request.Header.Set("X-Correlation-ID", correlationID)
		}

		// Set correlation ID in response header
		c.Header("X-Correlation-ID", correlationID)

		// Create a context with correlation ID
		ctx := c.Request.Context()

		// Log request
		m.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"method":         c.Request.Method,
			"path":           c.Request.URL.Path,
			"client_ip":      c.ClientIP(),
			"correlation_id": correlationID,
		}).Info("MCP request received")

		// Process request
		c.Next()

		// Calculate request duration
		duration := time.Since(start)

		// Log response
		m.logger.WithContext(ctx).WithFields(map[string]interface{}{
			"method":         c.Request.Method,
			"path":           c.Request.URL.Path,
			"status":         c.Writer.Status(),
			"duration_ms":    duration.Milliseconds(),
			"client_ip":      c.ClientIP(),
			"correlation_id": correlationID,
		}).Info("MCP response sent")
	}
}

// Helper function to check if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Helper function to convert AppError to MCPError
func convertAppErrorToMCPError(appErr *ierrors.AppError) *MCPError { // Use aliased package
	var code int

	// Map AppError codes to MCP error codes
	if appErr.Code != nil { // Check if Code is not nil before dereferencing
		switch *appErr.Code { // Dereference appErr.Code here
		case ierrors.ErrorCodeResourceNotFound: // Use aliased package
			code = ErrorCodeResourceNotFound
		case ierrors.ErrorCodeInvalidInput: // Use aliased package
			code = ErrorCodeInvalidParams
		case ierrors.ErrorCodeUnauthorized: // Use aliased package
			code = ErrorCodeAuthenticationFailed
		case ierrors.ErrorCodeForbidden: // Use aliased package
			code = ErrorCodeAuthenticationFailed
		case ierrors.ErrorCodeResourceExists: // Use aliased package
			code = ErrorCodeOperationFailed
		default:
			code = ErrorCodeInternalError
		}
	} else {
		// Default if appErr.Code is nil
		code = ErrorCodeInternalError
	}

	return NewMCPError(
		code,
		appErr.Message,
		appErr.Details,
	)
}
