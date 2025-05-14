package resources

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/errors"
)

func TestErrorHandler_HandleError(t *testing.T) {
	// Create logger
	logger := NewMockLogger()

	// Create formatter registry
	formatterRegistry := NewFormatterRegistry()

	// Create error handler
	errorHandler := NewErrorHandler(logger, formatterRegistry, true)

	// Test handling validation error
	ctx := context.Background()
	validationErr := errors.NewValidationError("Validation error", nil)
	data, contentType, statusCode := errorHandler.HandleError(ctx, validationErr, ContentTypeJSON)

	// Check status code
	if statusCode != 400 {
		t.Errorf("HandleError() with validation error statusCode = %v, want %v", statusCode, 400)
	}

	// Check content type
	if contentType != ContentTypeJSON {
		t.Errorf("HandleError() with validation error contentType = %v, want %v", contentType, ContentTypeJSON)
	}

	// Check response data
	if !strings.Contains(string(data), "validation") || !strings.Contains(string(data), "Validation error") {
		t.Errorf("HandleError() with validation error should include error type and message")
	}

	// Check stack trace inclusion
	if !strings.Contains(string(data), "Stack trace") {
		t.Errorf("HandleError() with includeStackTrace=true should include stack trace")
	}

	// Test handling not found error
	notFoundErr := errors.NewNotFoundError("Not found error", nil)
	data, contentType, statusCode = errorHandler.HandleError(ctx, notFoundErr, ContentTypeJSON)

	// Check status code
	if statusCode != 404 {
		t.Errorf("HandleError() with not found error statusCode = %v, want %v", statusCode, 404)
	}

	// Test handling internal error
	internalErr := errors.NewInternalError("Internal error", nil)
	data, contentType, statusCode = errorHandler.HandleError(ctx, internalErr, ContentTypeJSON)

	// Check status code
	if statusCode != 500 {
		t.Errorf("HandleError() with internal error statusCode = %v, want %v", statusCode, 500)
	}

	// Test handling standard error
	stdErr := fmt.Errorf("Standard error")
	data, contentType, statusCode = errorHandler.HandleError(ctx, stdErr, ContentTypeJSON)

	// Check status code
	if statusCode != 500 {
		t.Errorf("HandleError() with standard error statusCode = %v, want %v", statusCode, 500)
	}

	// Test without stack trace
	errorHandler = NewErrorHandler(logger, formatterRegistry, false)
	data, _, _ = errorHandler.HandleError(ctx, validationErr, ContentTypeJSON)

	// Check stack trace exclusion
	if strings.Contains(string(data), "Stack trace") {
		t.Errorf("HandleError() with includeStackTrace=false should not include stack trace")
	}

	// Test with XML content type
	data, contentType, _ = errorHandler.HandleError(ctx, validationErr, ContentTypeXML)

	// Check content type
	if contentType != ContentTypeXML {
		t.Errorf("HandleError() with XML accept type contentType = %v, want %v", contentType, ContentTypeXML)
	}

	// Check XML format
	if !strings.HasPrefix(string(data), "<?xml") {
		t.Errorf("HandleError() with XML accept type should return XML data")
	}
}

func TestNewResourceError(t *testing.T) {
	// Test creating validation error
	err := NewResourceError(ErrorCodeInvalidURI, "Invalid URI", nil)
	appErr, ok := err.(*errors.AppError)
	if !ok {
		t.Errorf("NewResourceError() should return *errors.AppError")
	}
	if appErr.Type != errors.ErrorTypeValidation {
		t.Errorf("NewResourceError() with ErrorCodeInvalidURI should return validation error")
	}

	// Test creating not found error
	err = NewResourceError(ErrorCodeResourceNotFound, "Resource not found", nil)
	appErr, ok = err.(*errors.AppError)
	if !ok {
		t.Errorf("NewResourceError() should return *errors.AppError")
	}
	if appErr.Type != errors.ErrorTypeNotFound {
		t.Errorf("NewResourceError() with ErrorCodeResourceNotFound should return not found error")
	}

	// Test creating unsupported operation error
	err = NewResourceError(ErrorCodeUnsupportedContentType, "Unsupported content type", nil)
	appErr, ok = err.(*errors.AppError)
	if !ok {
		t.Errorf("NewResourceError() should return *errors.AppError")
	}
	if appErr.Type != errors.ErrorTypeUnsupportedOperation {
		t.Errorf("NewResourceError() with ErrorCodeUnsupportedContentType should return unsupported operation error")
	}

	// Test creating internal error
	err = NewResourceError(ErrorCodeInternalError, "Internal error", nil)
	appErr, ok = err.(*errors.AppError)
	if !ok {
		t.Errorf("NewResourceError() should return *errors.AppError")
	}
	if appErr.Type != errors.ErrorTypeInternal {
		t.Errorf("NewResourceError() with ErrorCodeInternalError should return internal error")
	}
}

func TestWrapError(t *testing.T) {
	// Test wrapping validation error
	originalErr := errors.NewValidationError("Original error", nil)
	wrappedErr := WrapError(originalErr, "Wrapped error")
	appErr, ok := wrappedErr.(*errors.AppError)
	if !ok {
		t.Errorf("WrapError() should return *errors.AppError")
	}
	if appErr.Type != errors.ErrorTypeValidation {
		t.Errorf("WrapError() with validation error should preserve error type")
	}
	if appErr.Message != "Wrapped error" {
		t.Errorf("WrapError() should set new message")
	}
	if appErr.Cause != originalErr {
		t.Errorf("WrapError() should set original error as cause")
	}

	// Test wrapping not found error
	originalErr = errors.NewNotFoundError("Original error", nil)
	wrappedErr = WrapError(originalErr, "Wrapped error")
	appErr, ok = wrappedErr.(*errors.AppError)
	if !ok {
		t.Errorf("WrapError() should return *errors.AppError")
	}
	if appErr.Type != errors.ErrorTypeNotFound {
		t.Errorf("WrapError() with not found error should preserve error type")
	}

	// Test wrapping standard error
	stdErr := fmt.Errorf("Standard error")
	wrappedErr = WrapError(stdErr, "Wrapped error")
	appErr, ok = wrappedErr.(*errors.AppError)
	if !ok {
		t.Errorf("WrapError() should return *errors.AppError")
	}
	if appErr.Type != errors.ErrorTypeInternal {
		t.Errorf("WrapError() with standard error should return internal error")
	}
	if appErr.Message != "Wrapped error" {
		t.Errorf("WrapError() should set new message")
	}
	if appErr.Cause != stdErr {
		t.Errorf("WrapError() should set original error as cause")
	}
}

func TestGetHTTPStatusCodeForError(t *testing.T) {
	// Test with validation error
	validationErr := errors.NewValidationError("Validation error", nil)
	statusCode := getHTTPStatusCodeForError(validationErr)
	if statusCode != 400 {
		t.Errorf("getHTTPStatusCodeForError() with validation error = %v, want %v", statusCode, 400)
	}

	// Test with not found error
	notFoundErr := errors.NewNotFoundError("Not found error", nil)
	statusCode = getHTTPStatusCodeForError(notFoundErr)
	if statusCode != 404 {
		t.Errorf("getHTTPStatusCodeForError() with not found error = %v, want %v", statusCode, 404)
	}

	// Test with internal error
	internalErr := errors.NewInternalError("Internal error", nil)
	statusCode = getHTTPStatusCodeForError(internalErr)
	if statusCode != 500 {
		t.Errorf("getHTTPStatusCodeForError() with internal error = %v, want %v", statusCode, 500)
	}

	// Test with standard error
	stdErr := fmt.Errorf("Standard error")
	statusCode = getHTTPStatusCodeForError(stdErr)
	if statusCode != 500 {
		t.Errorf("getHTTPStatusCodeForError() with standard error = %v, want %v", statusCode, 500)
	}
}
