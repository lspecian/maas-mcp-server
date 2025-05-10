package errors

import (
	"errors"
	"net/http"
	"testing"
)

func TestErrorCreation(t *testing.T) {
	// Test basic error creation
	err := NewValidationError("invalid input", nil)
	if err.Type != ErrorTypeValidation {
		t.Errorf("Expected error type %s, got %s", ErrorTypeValidation, err.Type)
	}
	if err.Message != "invalid input" {
		t.Errorf("Expected message 'invalid input', got '%s'", err.Message)
	}
	if err.Cause != nil {
		t.Errorf("Expected nil cause, got %v", err.Cause)
	}

	// Test error with cause
	cause := New("original error")
	err = NewNotFoundError("resource not found", cause)
	if err.Type != ErrorTypeNotFound {
		t.Errorf("Expected error type %s, got %s", ErrorTypeNotFound, err.Type)
	}
	if err.Message != "resource not found" {
		t.Errorf("Expected message 'resource not found', got '%s'", err.Message)
	}
	if err.Cause != cause {
		t.Errorf("Expected cause %v, got %v", cause, err.Cause)
	}
}

func TestErrorWrapping(t *testing.T) {
	// Create a chain of errors
	originalErr := New("original error")
	validationErr := NewValidationError("validation failed", originalErr)
	internalErr := NewInternalError("operation failed", validationErr)

	// Test Unwrap
	if Unwrap(internalErr) != validationErr {
		t.Errorf("Expected Unwrap to return validationErr, got %v", Unwrap(internalErr))
	}
	if Unwrap(validationErr) != originalErr {
		t.Errorf("Expected Unwrap to return originalErr, got %v", Unwrap(validationErr))
	}

	// Test Is
	if !Is(internalErr, internalErr) {
		t.Error("Expected Is(internalErr, internalErr) to be true")
	}

	// Test As
	var appErr *AppError
	if !As(internalErr, &appErr) {
		t.Error("Expected As(internalErr, &appErr) to be true")
	}
	if appErr.Type != ErrorTypeInternal {
		t.Errorf("Expected appErr.Type to be %s, got %s", ErrorTypeInternal, appErr.Type)
	}
}

func TestErrorString(t *testing.T) {
	// Test error without cause
	err := NewValidationError("invalid input", nil)
	expected := "validation_error: invalid input"
	if err.Error() != expected {
		t.Errorf("Expected error string '%s', got '%s'", expected, err.Error())
	}

	// Test error with cause
	cause := New("original error")
	err = NewNotFoundError("resource not found", cause)
	expected = "not_found: resource not found (caused by: original error)"
	if err.Error() != expected {
		t.Errorf("Expected error string '%s', got '%s'", expected, err.Error())
	}
}

func TestHTTPStatusCodeForError(t *testing.T) {
	testCases := []struct {
		name         string
		err          error
		expectedCode int
	}{
		{
			name:         "ValidationError",
			err:          NewValidationError("invalid input", nil),
			expectedCode: http.StatusBadRequest,
		},
		{
			name:         "NotFoundError",
			err:          NewNotFoundError("resource not found", nil),
			expectedCode: http.StatusNotFound,
		},
		{
			name:         "AuthenticationError",
			err:          NewAuthenticationError("unauthorized", nil),
			expectedCode: http.StatusUnauthorized,
		},
		{
			name:         "MaasClientError",
			err:          NewMaasClientError("client error", nil),
			expectedCode: http.StatusBadGateway,
		},
		{
			name:         "InternalError",
			err:          NewInternalError("internal error", nil),
			expectedCode: http.StatusInternalServerError,
		},
		{
			name:         "StandardError",
			err:          errors.New("standard error"),
			expectedCode: http.StatusInternalServerError,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			code := HTTPStatusCodeForError(tc.err)
			if code != tc.expectedCode {
				t.Errorf("Expected status code %d, got %d", tc.expectedCode, code)
			}
		})
	}
}

func TestNewErrorResponse(t *testing.T) {
	// Test with AppError
	appErr := NewValidationError("invalid input", nil)
	resp := NewErrorResponse(appErr)
	if resp.Error.Type != string(ErrorTypeValidation) {
		t.Errorf("Expected error type %s, got %s", ErrorTypeValidation, resp.Error.Type)
	}
	if resp.Error.Message != "invalid input" {
		t.Errorf("Expected message 'invalid input', got '%s'", resp.Error.Message)
	}

	// Test with standard error
	stdErr := errors.New("standard error")
	resp = NewErrorResponse(stdErr)
	if resp.Error.Type != "unknown_error" {
		t.Errorf("Expected error type 'unknown_error', got '%s'", resp.Error.Type)
	}
	if resp.Error.Message != "standard error" {
		t.Errorf("Expected message 'standard error', got '%s'", resp.Error.Message)
	}
}
