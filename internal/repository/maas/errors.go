package maas

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// Common error types
var (
	// ErrNotFound is returned when a resource is not found
	ErrNotFound = errors.New("resource not found")

	// ErrUnauthorized is returned when authentication fails
	ErrUnauthorized = errors.New("unauthorized access")

	// ErrForbidden is returned when the user doesn't have permission
	ErrForbidden = errors.New("forbidden access")

	// ErrBadRequest is returned when the request is invalid
	ErrBadRequest = errors.New("bad request")

	// ErrConflict is returned when there's a conflict with the current state
	ErrConflict = errors.New("resource conflict")

	// ErrServerError is returned when the server encounters an error
	ErrServerError = errors.New("server error")

	// ErrTimeout is returned when a request times out
	ErrTimeout = errors.New("request timeout")

	// ErrConnectionFailed is returned when connection to the server fails
	ErrConnectionFailed = errors.New("connection failed")

	// ErrInvalidConfig is returned when the client configuration is invalid
	ErrInvalidConfig = errors.New("invalid configuration")

	// ErrNotImplemented is returned when a feature is not implemented
	ErrNotImplemented = errors.New("not implemented")
)

// Error represents a MAAS API error
type Error struct {
	// Original is the original error
	Original error

	// StatusCode is the HTTP status code
	StatusCode int

	// Message is a human-readable error message
	Message string

	// Details contains additional error details
	Details map[string]interface{}

	// Retryable indicates if the error is retryable
	Retryable bool
}

// Error returns a string representation of the error
func (e *Error) Error() string {
	if e.Original != nil {
		return fmt.Sprintf("%s: %s", e.Message, e.Original.Error())
	}
	return e.Message
}

// Unwrap returns the original error
func (e *Error) Unwrap() error {
	return e.Original
}

// NewError creates a new Error
func NewError(original error, statusCode int, message string) *Error {
	return &Error{
		Original:   original,
		StatusCode: statusCode,
		Message:    message,
		Details:    make(map[string]interface{}),
		Retryable:  isRetryable(statusCode),
	}
}

// WithDetails adds details to the error
func (e *Error) WithDetails(key string, value interface{}) *Error {
	e.Details[key] = value
	return e
}

// isRetryable determines if an error is retryable based on the HTTP status code
func isRetryable(statusCode int) bool {
	switch statusCode {
	case http.StatusTooManyRequests, // 429
		http.StatusInternalServerError, // 500
		http.StatusBadGateway,          // 502
		http.StatusServiceUnavailable,  // 503
		http.StatusGatewayTimeout:      // 504
		return true
	default:
		return false
	}
}

// TranslateError translates an error from the MAAS API to a more specific error
func TranslateError(err error, statusCode int) error {
	if err == nil {
		return nil
	}

	// Check if it's already a MAAS error
	var maasErr *Error
	if errors.As(err, &maasErr) {
		return maasErr
	}

	// Create a new error based on the status code
	message := err.Error()
	var baseErr error

	switch statusCode {
	case http.StatusNotFound: // 404
		baseErr = ErrNotFound
		message = "Resource not found: " + message
	case http.StatusUnauthorized: // 401
		baseErr = ErrUnauthorized
		message = "Unauthorized access: " + message
	case http.StatusForbidden: // 403
		baseErr = ErrForbidden
		message = "Forbidden access: " + message
	case http.StatusBadRequest: // 400
		baseErr = ErrBadRequest
		message = "Bad request: " + message
	case http.StatusConflict: // 409
		baseErr = ErrConflict
		message = "Resource conflict: " + message
	case http.StatusRequestTimeout: // 408
		baseErr = ErrTimeout
		message = "Request timeout: " + message
	case http.StatusInternalServerError, // 500
		http.StatusBadGateway,         // 502
		http.StatusServiceUnavailable, // 503
		http.StatusGatewayTimeout:     // 504
		baseErr = ErrServerError
		message = "Server error: " + message
	default:
		// For any other status code, use the original error
		baseErr = err
	}

	return NewError(baseErr, statusCode, message)
}

// IsNotFound checks if the error is a not found error
func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

// IsUnauthorized checks if the error is an unauthorized error
func IsUnauthorized(err error) bool {
	return errors.Is(err, ErrUnauthorized)
}

// IsForbidden checks if the error is a forbidden error
func IsForbidden(err error) bool {
	return errors.Is(err, ErrForbidden)
}

// IsBadRequest checks if the error is a bad request error
func IsBadRequest(err error) bool {
	return errors.Is(err, ErrBadRequest)
}

// IsConflict checks if the error is a conflict error
func IsConflict(err error) bool {
	return errors.Is(err, ErrConflict)
}

// IsServerError checks if the error is a server error
func IsServerError(err error) bool {
	return errors.Is(err, ErrServerError)
}

// IsTimeout checks if the error is a timeout error
func IsTimeout(err error) bool {
	return errors.Is(err, ErrTimeout)
}

// IsConnectionFailed checks if the error is a connection failed error
func IsConnectionFailed(err error) bool {
	return errors.Is(err, ErrConnectionFailed)
}

// IsRetryable checks if the error is retryable
func IsRetryable(err error) bool {
	var maasErr *Error
	if errors.As(err, &maasErr) {
		return maasErr.Retryable
	}

	// Check if it's a connection error or timeout
	if errors.Is(err, ErrConnectionFailed) || errors.Is(err, ErrTimeout) {
		return true
	}

	// Check if it's a server error
	if errors.Is(err, ErrServerError) {
		return true
	}

	// Check for common retryable error messages
	errMsg := strings.ToLower(err.Error())
	retryableStrings := []string{
		"connection reset",
		"connection refused",
		"temporary failure",
		"timeout",
		"too many requests",
		"service unavailable",
		"gateway timeout",
		"bad gateway",
	}

	for _, s := range retryableStrings {
		if strings.Contains(errMsg, s) {
			return true
		}
	}

	return false
}
