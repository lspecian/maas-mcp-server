package errors

import (
	"errors"
	"fmt"
	"net/http"
)

// Standard errors package errors are re-exported
var (
	As     = errors.As
	Is     = errors.Is
	New    = errors.New
	Unwrap = errors.Unwrap
)

// ErrorType represents the type of an error
type ErrorType string

// Error types
const (
	ErrorTypeValidation     ErrorType = "validation_error"
	ErrorTypeNotFound       ErrorType = "not_found"
	ErrorTypeAuthentication ErrorType = "authentication_error"
	ErrorTypeMaasClient     ErrorType = "maas_client_error"
	ErrorTypeInternal       ErrorType = "internal_error"
)

// AppError represents an application error with type information
type AppError struct {
	Type    ErrorType
	Message string
	Cause   error
}

// Error returns the error message
func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s (caused by: %v)", e.Type, e.Message, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

// Unwrap returns the underlying cause of the error
func (e *AppError) Unwrap() error {
	return e.Cause
}

// Is checks if the target error is of the same type as this error
func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return e.Type == t.Type
}

// Error constructors

// NewValidationError creates a new validation error
func NewValidationError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeValidation,
		Message: message,
		Cause:   cause,
	}
}

// NewNotFoundError creates a new not found error
func NewNotFoundError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeNotFound,
		Message: message,
		Cause:   cause,
	}
}

// NewAuthenticationError creates a new authentication error
func NewAuthenticationError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeAuthentication,
		Message: message,
		Cause:   cause,
	}
}

// NewMaasClientError creates a new MAAS client error
func NewMaasClientError(message string, cause error) *AppError {
	return &AppError{
		Type:    ErrorTypeMaasClient,
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

// HTTPStatusCodeForError returns the appropriate HTTP status code for an error
func HTTPStatusCodeForError(err error) int {
	var appErr *AppError
	if As(err, &appErr) {
		switch appErr.Type {
		case ErrorTypeValidation:
			return http.StatusBadRequest
		case ErrorTypeNotFound:
			return http.StatusNotFound
		case ErrorTypeAuthentication:
			return http.StatusUnauthorized
		case ErrorTypeMaasClient:
			return http.StatusBadGateway
		default:
			return http.StatusInternalServerError
		}
	}
	return http.StatusInternalServerError
}

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	} `json:"error"`
}

// NewErrorResponse creates a new error response from an error
func NewErrorResponse(err error) ErrorResponse {
	var resp ErrorResponse
	var appErr *AppError

	if As(err, &appErr) {
		resp.Error.Type = string(appErr.Type)
		resp.Error.Message = appErr.Message
	} else {
		resp.Error.Type = "unknown_error"
		resp.Error.Message = err.Error()
	}

	return resp
}
