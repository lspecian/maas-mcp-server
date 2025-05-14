package tools

import (
	"encoding/json"
	"errors" // Added standard errors package
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	ierrors "github.com/lspecian/maas-mcp-server/internal/errors" // Aliased to avoid conflict
)

// DefaultToolValidator is the default implementation of ToolValidator
type DefaultToolValidator struct {
	validator *validator.Validate
}

// NewToolValidator creates a new tool validator
func NewToolValidator() ToolValidator {
	return &DefaultToolValidator{
		validator: validator.New(),
	}
}

// Validate validates the given parameters against the tool's input schema
func (v *DefaultToolValidator) Validate(schema interface{}, params json.RawMessage) error {
	// Get schema type
	schemaType := reflect.TypeOf(schema)
	if schemaType.Kind() == reflect.Ptr {
		schemaType = schemaType.Elem()
	}

	// Create a new instance of the schema type
	schemaInstance := reflect.New(schemaType).Interface()

	// Unmarshal parameters into schema instance
	if err := json.Unmarshal(params, schemaInstance); err != nil {
		return ierrors.NewValidationError(fmt.Sprintf("Failed to parse parameters: %v", err), err) // Use aliased package
	}

	// Validate schema instance
	if err := v.validator.Struct(schemaInstance); err != nil {
		// Format validation errors
		var validationErrors validator.ValidationErrors
		// Use errors.As from the standard library
		if errors.As(err, &validationErrors) {
			errorMessages := make([]string, 0, len(validationErrors))
			for _, fieldError := range validationErrors {
				errorMessages = append(errorMessages, formatValidationError(fieldError))
			}
			return ierrors.NewValidationError(strings.Join(errorMessages, "; "), err) // Use aliased package
		}
		return ierrors.NewValidationError(fmt.Sprintf("Validation failed: %v", err), err) // Use aliased package
	}

	return nil
}

// formatValidationError formats a validation error into a human-readable message
func formatValidationError(fieldError validator.FieldError) string {
	switch fieldError.Tag() {
	case "required":
		return fmt.Sprintf("Field '%s' is required", fieldError.Field())
	case "min":
		return fmt.Sprintf("Field '%s' must be at least %s", fieldError.Field(), fieldError.Param())
	case "max":
		return fmt.Sprintf("Field '%s' must be at most %s", fieldError.Field(), fieldError.Param())
	case "email":
		return fmt.Sprintf("Field '%s' must be a valid email address", fieldError.Field())
	case "url":
		return fmt.Sprintf("Field '%s' must be a valid URL", fieldError.Field())
	case "oneof":
		return fmt.Sprintf("Field '%s' must be one of [%s]", fieldError.Field(), fieldError.Param())
	default:
		return fmt.Sprintf("Field '%s' failed validation: %s", fieldError.Field(), fieldError.Tag())
	}
}
