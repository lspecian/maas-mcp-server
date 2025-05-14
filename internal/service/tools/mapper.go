package tools

import (
	"encoding/json"
	"errors" // Added standard errors package
	"fmt"
	"reflect"

	ierrors "github.com/lspecian/maas-mcp-server/internal/errors" // Aliased to avoid conflict
)

// DefaultRequestMapper is the default implementation of RequestMapper
type DefaultRequestMapper struct{}

// NewRequestMapper creates a new request mapper
func NewRequestMapper() RequestMapper {
	return &DefaultRequestMapper{}
}

// Map maps the given parameters to the given request type
func (m *DefaultRequestMapper) Map(params json.RawMessage, requestType reflect.Type) (interface{}, error) {
	// Create a new instance of the request type
	if requestType.Kind() == reflect.Ptr {
		requestType = requestType.Elem()
	}
	request := reflect.New(requestType).Interface()

	// Unmarshal parameters into request
	if err := json.Unmarshal(params, request); err != nil {
		// It's possible json.Unmarshal itself returns an error that could be an ierrors.AppError
		// or a standard error. We should handle it appropriately.
		// For now, wrapping as a validation error.
		return nil, ierrors.NewValidationError(fmt.Sprintf("Failed to parse parameters: %v", err), err) // Use aliased package
	}

	return request, nil
}

// DefaultResponseFormatter is the default implementation of ResponseFormatter
type DefaultResponseFormatter struct{}

// NewResponseFormatter creates a new response formatter
func NewResponseFormatter() ResponseFormatter {
	return &DefaultResponseFormatter{}
}

// Format formats the given response
func (f *DefaultResponseFormatter) Format(response interface{}) (interface{}, error) {
	// For now, just return the response as-is
	// In the future, we might want to add more formatting options
	return response, nil
}

// DefaultErrorTranslator is the default implementation of ErrorTranslator
type DefaultErrorTranslator struct{}

// NewErrorTranslator creates a new error translator
func NewErrorTranslator() ErrorTranslator {
	return &DefaultErrorTranslator{}
}

// Translate translates the given error to a standard format
func (t *DefaultErrorTranslator) Translate(err error) error {
	// Check if the error is already an AppError
	var appErr *ierrors.AppError // Use aliased package
	// Use errors.As from the standard library
	if errors.As(err, &appErr) {
		return appErr
	}

	// Translate common error types
	if err == nil {
		return nil
	}

	// Default to internal error
	return ierrors.NewInternalError(err.Error(), err) // Use aliased package
}
