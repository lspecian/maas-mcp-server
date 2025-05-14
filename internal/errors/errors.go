package errors

import (
	"errors"
	"fmt"
	"net/http"
)

// ErrorType represents the type of error
type ErrorType string

const (
	// ErrorTypeValidation represents a validation error
	ErrorTypeValidation ErrorType = "validation"
	// ErrorTypeNotFound represents a not found error
	ErrorTypeNotFound ErrorType = "not_found"
	// ErrorTypeUnauthorized represents an unauthorized error
	ErrorTypeUnauthorized ErrorType = "unauthorized"
	// ErrorTypeForbidden represents a forbidden error
	ErrorTypeForbidden ErrorType = "forbidden"
	// ErrorTypeInternal represents an internal error
	ErrorTypeInternal ErrorType = "internal"
	// ErrorTypeUnsupportedOperation represents an unsupported operation error
	ErrorTypeUnsupportedOperation ErrorType = "unsupported_operation"
	// ErrorTypeMapping represents a mapping error
	ErrorTypeMapping ErrorType = "mapping"
	// ErrorTypeConflict represents a conflict error (e.g., resource already exists, state conflict)
	ErrorTypeConflict ErrorType = "conflict"
	// ErrorTypeAuthentication represents an authentication error (distinct from unauthorized)
	ErrorTypeAuthentication ErrorType = "authentication"
	// ErrorTypeMaasClient represents an error originating from the MAAS client itself
	ErrorTypeMaasClient ErrorType = "maas_client_error"
	// ErrorTypeRateLimit represents a rate limit error
	ErrorTypeRateLimit ErrorType = "rate_limit"
	// ErrorTypeTimeout represents a timeout error
	ErrorTypeTimeout ErrorType = "timeout"
	// ErrorTypeBadGateway represents a bad gateway error
	ErrorTypeBadGateway ErrorType = "bad_gateway"
)

// ErrorCode provides a more specific error code, often within a given ErrorType
type ErrorCode string

const (
	// ErrorCodeInvalidInput indicates an invalid input validation error.
	// Used when input fails validation checks.
	ErrorCodeInvalidInput ErrorCode = "INVALID_INPUT"
	// ErrorCodeResourceNotFound indicates a resource was not found.
	ErrorCodeResourceNotFound ErrorCode = "RESOURCE_NOT_FOUND"
	// ErrorCodeUnauthorized indicates an unauthorized access attempt.
	ErrorCodeUnauthorized ErrorCode = "UNAUTHORIZED"
	// ErrorCodeForbidden indicates a forbidden access attempt.
	ErrorCodeForbidden ErrorCode = "FORBIDDEN"
	// ErrorCodeResourceExists indicates a resource already exists.
	ErrorCodeResourceExists ErrorCode = "RESOURCE_EXISTS"
)

// AppError represents an application error
type AppError struct {
	Type    ErrorType         `json:"type"`
	Message string            `json:"message"`
	Code    *ErrorCode        `json:"code,omitempty"`
	Details map[string]string `json:"details,omitempty"` // Changed Details to map
	Cause   error             `json:"-"`
}

// Error returns the error message
func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s", e.Message, e.Cause.Error())
	}
	return e.Message
}

// WithDetail adds a key-value pair to the error's details.
// It initializes the Details map if it's nil.
func (e *AppError) WithDetail(key string, value string) *AppError {
	if e.Details == nil {
		e.Details = make(map[string]string)
	}
	e.Details[key] = value
	return e
}

// Unwrap returns the cause of the error
func (e *AppError) Unwrap() error {
	return e.Cause
}

// NewValidationError creates a new validation error
func NewValidationError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
		Cause:   cause,
	}
}

// NewValidationErrorWithCode creates a new validation error with a specific error code
func NewValidationErrorWithCode(code ErrorCode, message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
		Code:    &code,
		Cause:   cause,
	}
}

// NewNotFoundError creates a new not found error
func NewNotFoundError(message string, cause error) *AppError {
	code := ErrorCodeResourceNotFound // Default code for not found errors
	return &AppError{
		Type:    ErrorTypeNotFound,
		Message: message,
		Code:    &code,
		Cause:   cause,
	}
}

// NewUnauthorizedError creates a new unauthorized error
func NewUnauthorizedError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeUnauthorized,
		Message: message,
		Cause:   cause,
	}
}

// NewForbiddenError creates a new forbidden error
func NewForbiddenError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeForbidden,
		Message: message,
		Cause:   cause,
	}
}

// NewInternalError creates a new internal error
func NewInternalError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeInternal,
		Message: message,
		Cause:   cause,
	}
}

// NewUnsupportedOperationError creates a new unsupported operation error
func NewUnsupportedOperationError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeUnsupportedOperation,
		Message: message,
		Cause:   cause,
	}
}

// NewMappingError creates a new mapping error
func NewMappingError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeMapping,
		Message: message,
		Cause:   cause,
	}
}

// NewConflictError creates a new conflict error
func NewConflictError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeConflict,
		Message: message,
		Cause:   cause,
	}
}

// NewAuthenticationError creates a new authentication error.
// This is typically for issues during the authentication process itself,
// rather than a general lack of authorization for an action.
func NewAuthenticationError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeAuthentication,
		Message: message,
		Cause:   cause,
	}
}

// NewBadGatewayError creates a new bad gateway error
func NewBadGatewayError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeBadGateway,
		Message: message,
		Cause:   cause,
	}
}

// NewMaasClientError creates a new error representing an issue from the MAAS client.
func NewMaasClientError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeMaasClient,
		Message: message,
		Cause:   cause,
	}
}

// NewRateLimitError creates a new rate limit error
func NewRateLimitError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeRateLimit,
		Message: message,
		Cause:   cause,
	}
}

// NewTimeoutError creates a new timeout error
func NewTimeoutError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeTimeout,
		Message: message,
		Cause:   cause,
	}
}

// HTTPStatusCode returns the HTTP status code for the error
func (e *AppError) HTTPStatusCode() int {
	switch e.Type {
	case ErrorTypeValidation:
		return http.StatusBadRequest
	case ErrorTypeNotFound:
		return http.StatusNotFound
	case ErrorTypeAuthentication: // Typically results in an unauthorized response
		return http.StatusUnauthorized
	case ErrorTypeUnauthorized: // General lack of permission
		return http.StatusUnauthorized
	case ErrorTypeForbidden:
		return http.StatusForbidden
	case ErrorTypeUnsupportedOperation:
		return http.StatusMethodNotAllowed
	case ErrorTypeMapping:
		return http.StatusUnprocessableEntity
	case ErrorTypeConflict:
		return http.StatusConflict
	case ErrorTypeMaasClient: // Errors from MAAS client could be various, often server-side or gateway issues
		return http.StatusBadGateway // 502 if MAAS is an upstream service
	case ErrorTypeRateLimit:
		return http.StatusTooManyRequests
	case ErrorTypeTimeout:
		return http.StatusGatewayTimeout // Or http.StatusRequestTimeout if more appropriate
	case ErrorTypeBadGateway:
		return http.StatusBadGateway
	default: // ErrorTypeInternal and any other unknown types
		return http.StatusInternalServerError
	}
}

// HTTPStatusCodeForError determines the HTTP status code for a given error.
// It checks if the error is an *AppError and uses its HTTPStatusCode method.
// Otherwise, it defaults to http.StatusInternalServerError.
func HTTPStatusCodeForError(err error) int {
	var appErr *AppError
	// Use errors.As for robust type checking, accommodating wrapped errors.
	if errors.As(err, &appErr) {
		return appErr.HTTPStatusCode()
	}
	// Fallback for non-AppError types. Consider logging unknown error types here.
	return http.StatusInternalServerError
}

// NewErrorResponse creates a structured error response suitable for JSON marshalling.
// If the error is an *AppError, it's returned directly.
// Otherwise, a generic AppError with ErrorTypeInternal is created.
func NewErrorResponse(err error) interface{} {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr // AppError is already JSON-taggable
	}
	// For generic errors, wrap them in a basic AppError structure.
	return &AppError{
		Type:    ErrorTypeInternal, // Default to internal for unknown errors
		Message: err.Error(),       // Preserve the original error message
		// Code will be nil
		// Cause could be set to err here if desired, but AppError.Error() handles it.
	}
}
