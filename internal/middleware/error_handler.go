package middleware

import (
	"context"
	"errors" // Added standard errors package
	"fmt"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	ierrors "github.com/lspecian/maas-mcp-server/internal/errors" // Aliased to avoid conflict
	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// ErrorHandlerMiddleware is a middleware that catches and handles errors globally
func ErrorHandlerMiddleware(logger *logging.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get or generate correlation ID
		correlationID := c.GetHeader("X-Correlation-ID")
		if correlationID == "" {
			correlationID = logging.GenerateCorrelationID()
			c.Request.Header.Set("X-Correlation-ID", correlationID)
		}

		// Set correlation ID in context
		c.Set(string(logging.CorrelationIDKey), correlationID)

		// Add correlation ID to response headers
		c.Header("X-Correlation-ID", correlationID)

		// Create a context with correlation ID
		ctx := context.WithValue(c.Request.Context(), logging.CorrelationIDKey, correlationID)
		c.Request = c.Request.WithContext(ctx)

		// Recover from panics
		defer func() {
			if r := recover(); r != nil {
				// Log the panic with stack trace
				stackTrace := string(debug.Stack())
				logger.WithContext(ctx).WithField("stack_trace", stackTrace).WithField("panic", fmt.Sprintf("%v", r)).Error("Panic recovered")

				// Create an internal error
				err := ierrors.NewInternalError("Internal server error", fmt.Errorf("%v", r)) // Use aliased package

				// Add correlation ID to error details
				err.WithDetail("correlation_id", correlationID)

				// Respond with 500 Internal Server Error
				ierrors.GinAbortWithError(c, err) // Use aliased package
			}
		}()

		// Process request
		c.Next()

		// Check if there were any errors
		if len(c.Errors) > 0 {
			// Get the last error
			err := c.Errors.Last().Err

			// Log the error with context
			logger.WithContext(ctx).WithField("error", err.Error()).Error("Request error")

			// If the response has already been written, don't do anything
			if c.Writer.Written() {
				return
			}

			// Handle the error
			var appErr *ierrors.AppError  // Use aliased package
			if !errors.As(err, &appErr) { // This 'errors.As' is from the standard library
				// If it's not an AppError, wrap it
				err = ierrors.NewInternalError("Internal server error", err) // Use aliased package

				// Add correlation ID to error details
				appErr = err.(*ierrors.AppError) // Use aliased package
				appErr.WithDetail("correlation_id", correlationID)
			} else {
				// Add correlation ID to error details
				appErr.WithDetail("correlation_id", correlationID)
			}

			// Respond with error
			ierrors.GinAbortWithError(c, err) // Use aliased package
		}
	}
}

// NotFoundMiddleware handles 404 errors
func NotFoundMiddleware(logger *logging.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get or generate correlation ID
		correlationID := c.GetHeader("X-Correlation-ID")
		if correlationID == "" {
			correlationID = logging.GenerateCorrelationID()
		}

		// Create a context with correlation ID
		ctx := context.WithValue(context.Background(), logging.CorrelationIDKey, correlationID)

		// Log the 404 error
		logger.WithContext(ctx).WithFields(map[string]interface{}{
			"method":         c.Request.Method,
			"path":           c.Request.URL.Path,
			"client_ip":      c.ClientIP(),
			"correlation_id": correlationID,
		}).Warn("Resource not found")

		// Create a not found error
		err := ierrors.NewNotFoundError("Resource not found", nil) // Use aliased package

		// Add correlation ID to error details
		err.WithDetail("correlation_id", correlationID)
		err.WithDetail("path", c.Request.URL.Path)
		err.WithDetail("method", c.Request.Method)

		// Respond with 404 Not Found
		ierrors.GinErrorResponse(c, err) // Use aliased package
	}
}

// MethodNotAllowedMiddleware handles 405 errors
func MethodNotAllowedMiddleware(logger *logging.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get or generate correlation ID
		correlationID := c.GetHeader("X-Correlation-ID")
		if correlationID == "" {
			correlationID = logging.GenerateCorrelationID()
		}

		// Create a context with correlation ID
		ctx := context.WithValue(context.Background(), logging.CorrelationIDKey, correlationID)

		// Log the 405 error
		logger.WithContext(ctx).WithFields(map[string]interface{}{
			"method":         c.Request.Method,
			"path":           c.Request.URL.Path,
			"client_ip":      c.ClientIP(),
			"correlation_id": correlationID,
		}).Warn("Method not allowed")

		// Create a validation error
		err := ierrors.NewValidationErrorWithCode(ierrors.ErrorCodeInvalidInput, "Method not allowed", nil) // Use aliased package

		// Add correlation ID to error details
		err.WithDetail("correlation_id", correlationID)
		err.WithDetail("path", c.Request.URL.Path)
		err.WithDetail("method", c.Request.Method)

		// Respond with 405 Method Not Allowed
		ierrors.GinErrorResponseWithCode(c, err, 405) // Use aliased package
	}
}
