package resources

import (
	"context"
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// ErrorCode represents an error code
type ErrorCode string

const (
	// ErrorCodeInvalidURI represents an invalid URI error
	ErrorCodeInvalidURI ErrorCode = "invalid_uri"
	// ErrorCodeInvalidParameter represents an invalid parameter error
	ErrorCodeInvalidParameter ErrorCode = "invalid_parameter"
	// ErrorCodeInvalidPayload represents an invalid payload error
	ErrorCodeInvalidPayload ErrorCode = "invalid_payload"
	// ErrorCodeResourceNotFound represents a resource not found error
	ErrorCodeResourceNotFound ErrorCode = "resource_not_found"
	// ErrorCodeUnsupportedContentType represents an unsupported content type error
	ErrorCodeUnsupportedContentType ErrorCode = "unsupported_content_type"
	// ErrorCodeUnsupportedAcceptType represents an unsupported accept type error
	ErrorCodeUnsupportedAcceptType ErrorCode = "unsupported_accept_type"
	// ErrorCodeInternalError represents an internal error
	ErrorCodeInternalError ErrorCode = "internal_error"
)

// ErrorHandler handles errors for resource requests
type ErrorHandler struct {
	Logger            *logging.Logger
	FormatterRegistry *FormatterRegistry
	IncludeStackTrace bool
}

// NewErrorHandler creates a new error handler
func NewErrorHandler(logger *logging.Logger, formatterRegistry *FormatterRegistry, includeStackTrace bool) *ErrorHandler {
	return &ErrorHandler{
		Logger:            logger,
		FormatterRegistry: formatterRegistry,
		IncludeStackTrace: includeStackTrace,
	}
}

// HandleError handles an error
func (h *ErrorHandler) HandleError(ctx context.Context, err error, acceptType string) ([]byte, string, int) {
	// Log the error
	h.Logger.WithContext(ctx).WithError(err).Error("Resource error")

	// Get HTTP status code
	statusCode := getHTTPStatusCodeForError(err)

	// Add stack trace to error details in development mode
	var errorWithDetails error
	if h.IncludeStackTrace {
		stackTrace := string(debug.Stack())
		errorWithDetails = fmt.Errorf("%w\nStack trace:\n%s", err, stackTrace)
	} else {
		errorWithDetails = err
	}

	// Format the error response
	data, contentType, formatErr := h.FormatterRegistry.FormatError(errorWithDetails, acceptType)
	if formatErr != nil {
		// If formatting fails, return a simple error message
		h.Logger.WithContext(ctx).WithError(formatErr).Error("Failed to format error response")
		return []byte(`{"type":"internal_error","message":"Failed to format error response"}`), ContentTypeJSON, http.StatusInternalServerError
	}

	return data, contentType, statusCode
}

// NewResourceError creates a new resource error
func NewResourceError(code ErrorCode, message string, cause error) error {
	switch code {
	case ErrorCodeInvalidURI, ErrorCodeInvalidParameter, ErrorCodeInvalidPayload:
		return errors.NewValidationError(message, cause)
	case ErrorCodeResourceNotFound:
		return errors.NewNotFoundError(message, cause)
	case ErrorCodeUnsupportedContentType, ErrorCodeUnsupportedAcceptType:
		return errors.NewUnsupportedOperationError(message, cause)
	default:
		return errors.NewInternalError(message, cause)
	}
}

// getHTTPStatusCodeForError returns the HTTP status code for an error
func getHTTPStatusCodeForError(err error) int {
	if appErr, ok := err.(*errors.AppError); ok {
		return appErr.HTTPStatusCode()
	}
	return http.StatusInternalServerError
}

// WrapError wraps an error with additional context
func WrapError(err error, message string) error {
	if appErr, ok := err.(*errors.AppError); ok {
		// Create a new error of the same type
		switch appErr.Type {
		case errors.ErrorTypeValidation:
			return errors.NewValidationError(message, err)
		case errors.ErrorTypeNotFound:
			return errors.NewNotFoundError(message, err)
		case errors.ErrorTypeUnauthorized:
			return errors.NewUnauthorizedError(message, err)
		case errors.ErrorTypeForbidden:
			return errors.NewForbiddenError(message, err)
		case errors.ErrorTypeUnsupportedOperation:
			return errors.NewUnsupportedOperationError(message, err)
		case errors.ErrorTypeMapping:
			return errors.NewMappingError(message, err)
		default:
			return errors.NewInternalError(message, err)
		}
	}

	// For standard errors, wrap as internal error
	return errors.NewInternalError(message, err)
}
