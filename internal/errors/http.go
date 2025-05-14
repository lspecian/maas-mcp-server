package errors

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// GinErrorResponse sends a standardized error response through a Gin context
func GinErrorResponse(c *gin.Context, err error) {
	statusCode := HTTPStatusCodeForError(err)
	response := NewErrorResponse(err)
	c.JSON(statusCode, response)
}

// GinErrorResponseWithCode sends a standardized error response with a specific status code
func GinErrorResponseWithCode(c *gin.Context, err error, statusCode int) {
	response := NewErrorResponse(err)
	c.JSON(statusCode, response)
}

// GinAbortWithError aborts the request with a standardized error response
func GinAbortWithError(c *gin.Context, err error) {
	statusCode := HTTPStatusCodeForError(err)
	response := NewErrorResponse(err)
	c.AbortWithStatusJSON(statusCode, response)
}

// GinNotFound handles 404 errors with a standardized response
func GinNotFound(c *gin.Context) {
	err := NewNotFoundError("Resource not found", nil)
	GinErrorResponse(c, err)
}

// GinMethodNotAllowed handles 405 errors with a standardized response
func GinMethodNotAllowed(c *gin.Context) {
	err := NewValidationErrorWithCode(ErrorCodeInvalidInput, "Method not allowed", nil)
	GinErrorResponseWithCode(c, err, http.StatusMethodNotAllowed)
}

// GinInternalServerError handles 500 errors with a standardized response
func GinInternalServerError(c *gin.Context, err error) {
	internalErr := NewInternalError("Internal server error", err)
	GinErrorResponse(c, internalErr)
}

// GinBadRequest handles 400 errors with a standardized response
func GinBadRequest(c *gin.Context, message string, err error) {
	validationErr := NewValidationError(message, err)
	GinErrorResponse(c, validationErr)
}

// GinUnauthorized handles 401 errors with a standardized response
func GinUnauthorized(c *gin.Context, message string, err error) {
	authErr := NewAuthenticationError(message, err)
	GinErrorResponse(c, authErr)
}

// GinForbidden handles 403 errors with a standardized response
func GinForbidden(c *gin.Context, message string, err error) {
	authErr := NewForbiddenError(message, err)
	GinErrorResponseWithCode(c, authErr, http.StatusForbidden)
}

// GinNotFoundWithMessage handles 404 errors with a custom message
func GinNotFoundWithMessage(c *gin.Context, message string, err error) {
	notFoundErr := NewNotFoundError(message, err)
	GinErrorResponse(c, notFoundErr)
}

// GinMaasClientError handles MAAS client errors with a standardized response
func GinMaasClientError(c *gin.Context, message string, err error) {
	maasErr := NewMaasClientError(message, err)
	GinErrorResponse(c, maasErr)
}

// GinRateLimitError handles rate limit errors with a standardized response
func GinRateLimitError(c *gin.Context, message string, err error) {
	rateLimitErr := NewRateLimitError(message, err)
	GinErrorResponse(c, rateLimitErr)
}

// GinTimeoutError handles timeout errors with a standardized response
func GinTimeoutError(c *gin.Context, message string, err error) {
	timeoutErr := NewTimeoutError(message, err)
	GinErrorResponse(c, timeoutErr)
}

// GinConflictError handles conflict errors with a standardized response
func GinConflictError(c *gin.Context, message string, err error) {
	conflictErr := NewConflictError(message, err)
	GinErrorResponse(c, conflictErr)
}

// GinUnsupportedOperationError handles unsupported operation errors with a standardized response
func GinUnsupportedOperationError(c *gin.Context, message string, err error) {
	unsupportedErr := NewUnsupportedOperationError(message, err)
	GinErrorResponse(c, unsupportedErr)
}

// GinBadGatewayError handles bad gateway errors with a standardized response
func GinBadGatewayError(c *gin.Context, message string, err error) {
	badGatewayErr := NewBadGatewayError(message, err)
	GinErrorResponse(c, badGatewayErr)
}

// GlobalErrorHandler is a middleware that catches and handles errors globally
func GlobalErrorHandler(logger *logging.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get correlation ID from context
		correlationID := c.GetString(string(logging.CorrelationIDKey))

		// Create a context with correlation ID
		ctx := context.Background()
		if correlationID != "" {
			ctx = context.WithValue(ctx, logging.CorrelationIDKey, correlationID)
		}

		// Process request
		c.Next()

		// Check if there were any errors
		if len(c.Errors) > 0 {
			// Get the last error
			err := c.Errors.Last().Err

			// Log the error with context
			logger.WithContext(ctx).WithField("error", err.Error()).Error("Request error")

			// Handle the error
			GinAbortWithError(c, err)
		}
	}
}
