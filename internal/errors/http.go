package errors

import (
	"net/http"

	"github.com/gin-gonic/gin"
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
	err := NewValidationError("Method not allowed", nil)
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
	authErr := NewAuthenticationError(message, err)
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
