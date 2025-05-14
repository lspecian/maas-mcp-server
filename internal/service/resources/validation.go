package resources

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/lspecian/maas-mcp-server/internal/errors"
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

// ValidationResult represents the result of a validation operation
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors"`
}

// NewValidationResult creates a new validation result
func NewValidationResult() *ValidationResult {
	return &ValidationResult{
		Valid:  true,
		Errors: []ValidationError{},
	}
}

// AddError adds an error to the validation result
func (r *ValidationResult) AddError(field, message, code string) {
	r.Valid = false
	r.Errors = append(r.Errors, ValidationError{
		Field:   field,
		Message: message,
		Code:    code,
	})
}

// Error returns a formatted error message
func (r *ValidationResult) Error() string {
	if r.Valid {
		return ""
	}

	messages := make([]string, 0, len(r.Errors))
	for _, err := range r.Errors {
		messages = append(messages, fmt.Sprintf("%s: %s", err.Field, err.Message))
	}

	return strings.Join(messages, "; ")
}

// ToAppError converts the validation result to an AppError
func (r *ValidationResult) ToAppError() *errors.AppError {
	if r.Valid {
		return nil
	}

	return errors.NewValidationError(
		r.Error(),
		nil,
	)
}

// Validator defines the interface for request validators
type Validator interface {
	// Validate validates a request
	Validate(request *ResourceRequest) *ValidationResult
}

// CompositeValidator combines multiple validators
type CompositeValidator struct {
	validators []Validator
}

// NewCompositeValidator creates a new composite validator
func NewCompositeValidator(validators ...Validator) *CompositeValidator {
	return &CompositeValidator{
		validators: validators,
	}
}

// Validate runs all validators and combines their results
func (v *CompositeValidator) Validate(request *ResourceRequest) *ValidationResult {
	result := NewValidationResult()

	for _, validator := range v.validators {
		validationResult := validator.Validate(request)
		if !validationResult.Valid {
			result.Valid = false
			result.Errors = append(result.Errors, validationResult.Errors...)
		}
	}

	return result
}

// URIValidator validates resource URIs
type URIValidator struct {
	registry *Registry
}

// NewURIValidator creates a new URI validator
func NewURIValidator(registry *Registry) *URIValidator {
	return &URIValidator{
		registry: registry,
	}
}

// Validate validates a resource URI
func (v *URIValidator) Validate(request *ResourceRequest) *ValidationResult {
	result := NewValidationResult()

	// Check if URI is empty
	if request.URI == "" {
		result.AddError("uri", "URI cannot be empty", "empty_uri")
		return result
	}

	// Check if URI has a valid format
	if !strings.Contains(request.URI, "://") {
		result.AddError("uri", "Invalid URI format, missing scheme", "invalid_uri_format")
		return result
	}

	// Parse the URI
	_, err := ParseURI(request.URI)
	if err != nil {
		result.AddError("uri", fmt.Sprintf("Invalid URI: %s", err.Error()), "invalid_uri")
		return result
	}

	// Check if a handler exists for this URI
	handler, err := v.registry.GetHandler(request.URI)
	if err != nil {
		result.AddError("uri", fmt.Sprintf("No handler found for URI: %s", request.URI), "no_handler")
		return result
	}

	// Validate URI against handler patterns
	valid := false
	for _, pattern := range handler.GetURIPatterns() {
		if err := ValidateURI(request.URI, pattern); err == nil {
			valid = true
			break
		}
	}

	if !valid {
		result.AddError("uri", fmt.Sprintf("URI does not match any supported pattern: %s", request.URI), "pattern_mismatch")
	}

	return result
}

// QueryParamValidator validates query parameters
type QueryParamValidator struct {
	paramRules map[string]ParamRule
}

// ParamRule defines validation rules for a parameter
type ParamRule struct {
	Required    bool
	Pattern     *regexp.Regexp
	Enum        []string
	Validator   func(string) bool
	Description string
}

// NewQueryParamValidator creates a new query parameter validator
func NewQueryParamValidator(paramRules map[string]ParamRule) *QueryParamValidator {
	return &QueryParamValidator{
		paramRules: paramRules,
	}
}

// Validate validates query parameters
func (v *QueryParamValidator) Validate(request *ResourceRequest) *ValidationResult {
	result := NewValidationResult()

	// Check required parameters
	for param, rule := range v.paramRules {
		value, exists := request.QueryParams[param]

		// Check if required parameter is missing
		if rule.Required && !exists {
			result.AddError(param, fmt.Sprintf("Required parameter '%s' is missing", param), "missing_required_param")
			continue
		}

		// Skip validation if parameter is not provided
		if !exists {
			continue
		}

		// Validate against pattern
		if rule.Pattern != nil && !rule.Pattern.MatchString(value) {
			result.AddError(param, fmt.Sprintf("Parameter '%s' does not match required pattern", param), "invalid_pattern")
		}

		// Validate against enum
		if len(rule.Enum) > 0 {
			valid := false
			for _, enumValue := range rule.Enum {
				if value == enumValue {
					valid = true
					break
				}
			}
			if !valid {
				result.AddError(param, fmt.Sprintf("Parameter '%s' must be one of: %s", param, strings.Join(rule.Enum, ", ")), "invalid_enum")
			}
		}

		// Custom validator
		if rule.Validator != nil && !rule.Validator(value) {
			result.AddError(param, fmt.Sprintf("Parameter '%s' is invalid", param), "invalid_value")
		}
	}

	return result
}

// PayloadValidator validates request payloads
type PayloadValidator struct {
	schemaValidators map[string]func(interface{}) *ValidationResult
}

// NewPayloadValidator creates a new payload validator
func NewPayloadValidator(schemaValidators map[string]func(interface{}) *ValidationResult) *PayloadValidator {
	return &PayloadValidator{
		schemaValidators: schemaValidators,
	}
}

// Validate validates a request payload
func (v *PayloadValidator) Validate(request *ResourceRequest) *ValidationResult {
	result := NewValidationResult()

	// Skip validation if no payload
	if request.Payload == nil {
		return result
	}

	// Get resource type from URI
	parsedURI, err := ParseURI(request.URI)
	if err != nil {
		result.AddError("payload", "Cannot validate payload: invalid URI", "invalid_uri")
		return result
	}

	// Get validator for resource type
	validator, exists := v.schemaValidators[parsedURI.ResourceType]
	if !exists {
		// No validator for this resource type, skip validation
		return result
	}

	// Validate payload
	payloadResult := validator(request.Payload)
	if !payloadResult.Valid {
		result.Valid = false
		result.Errors = append(result.Errors, payloadResult.Errors...)
	}

	return result
}

// ValidateStruct validates a struct against field tags
func ValidateStruct(obj interface{}) *ValidationResult {
	result := NewValidationResult()

	// Get type and value of the struct
	val := reflect.ValueOf(obj)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	// Only validate structs
	if val.Kind() != reflect.Struct {
		result.AddError("", "Cannot validate non-struct type", "invalid_type")
		return result
	}

	typ := val.Type()

	// Iterate over struct fields
	for i := 0; i < val.NumField(); i++ {
		field := typ.Field(i)
		fieldValue := val.Field(i)
		fieldName := field.Name

		// Get validation tags
		required := field.Tag.Get("required") == "true"
		pattern := field.Tag.Get("pattern")
		enum := field.Tag.Get("enum")

		// Skip if field is not exported
		if !fieldValue.CanInterface() {
			continue
		}

		// Check required fields
		if required {
			isZero := false
			switch fieldValue.Kind() {
			case reflect.String:
				isZero = fieldValue.String() == ""
			case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
				isZero = fieldValue.Int() == 0
			case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
				isZero = fieldValue.Uint() == 0
			case reflect.Float32, reflect.Float64:
				isZero = fieldValue.Float() == 0
			case reflect.Bool:
				isZero = !fieldValue.Bool()
			case reflect.Slice, reflect.Map:
				isZero = fieldValue.Len() == 0
			case reflect.Ptr, reflect.Interface:
				isZero = fieldValue.IsNil()
			}

			if isZero {
				result.AddError(fieldName, fmt.Sprintf("Field '%s' is required", fieldName), "required_field")
			}
		}

		// Check pattern for string fields
		if pattern != "" && fieldValue.Kind() == reflect.String {
			re, err := regexp.Compile(pattern)
			if err != nil {
				// Skip invalid patterns
				continue
			}

			if !re.MatchString(fieldValue.String()) {
				result.AddError(fieldName, fmt.Sprintf("Field '%s' does not match required pattern", fieldName), "invalid_pattern")
			}
		}

		// Check enum for string fields
		if enum != "" && fieldValue.Kind() == reflect.String {
			enumValues := strings.Split(enum, ",")
			valid := false
			for _, enumValue := range enumValues {
				if fieldValue.String() == enumValue {
					valid = true
					break
				}
			}
			if !valid {
				result.AddError(fieldName, fmt.Sprintf("Field '%s' must be one of: %s", fieldName, enum), "invalid_enum")
			}
		}

		// Recursively validate nested structs
		if fieldValue.Kind() == reflect.Struct {
			nestedResult := ValidateStruct(fieldValue.Interface())
			if !nestedResult.Valid {
				for _, err := range nestedResult.Errors {
					result.AddError(fmt.Sprintf("%s.%s", fieldName, err.Field), err.Message, err.Code)
				}
			}
		}
	}

	return result
}
