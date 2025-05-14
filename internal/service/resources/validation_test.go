package resources

import (
	"regexp"
	"testing"
)

func TestValidationResult(t *testing.T) {
	// Test creating a new validation result
	result := NewValidationResult()
	if !result.Valid {
		t.Errorf("NewValidationResult() should create a valid result")
	}
	if len(result.Errors) != 0 {
		t.Errorf("NewValidationResult() should create a result with no errors")
	}

	// Test adding an error
	result.AddError("field1", "error message", "error_code")
	if result.Valid {
		t.Errorf("AddError() should set Valid to false")
	}
	if len(result.Errors) != 1 {
		t.Errorf("AddError() should add an error to the result")
	}
	if result.Errors[0].Field != "field1" {
		t.Errorf("AddError() should set the field name")
	}
	if result.Errors[0].Message != "error message" {
		t.Errorf("AddError() should set the error message")
	}
	if result.Errors[0].Code != "error_code" {
		t.Errorf("AddError() should set the error code")
	}

	// Test error message formatting
	result.AddError("field2", "another error", "another_code")
	errorMsg := result.Error()
	if errorMsg != "field1: error message; field2: another error" {
		t.Errorf("Error() returned %q, want %q", errorMsg, "field1: error message; field2: another error")
	}

	// Test ToAppError
	appErr := result.ToAppError()
	if appErr == nil {
		t.Errorf("ToAppError() should return an error for invalid result")
	}
	if appErr.Message != errorMsg {
		t.Errorf("ToAppError() message = %q, want %q", appErr.Message, errorMsg)
	}

	// Test valid result
	validResult := NewValidationResult()
	if validResult.Error() != "" {
		t.Errorf("Error() should return empty string for valid result")
	}
	if validResult.ToAppError() != nil {
		t.Errorf("ToAppError() should return nil for valid result")
	}
}

func TestCompositeValidator(t *testing.T) {
	// Create mock validators
	validator1 := &mockValidator{valid: true}
	validator2 := &mockValidator{valid: false, errors: []ValidationError{
		{Field: "field1", Message: "error1", Code: "code1"},
	}}
	validator3 := &mockValidator{valid: false, errors: []ValidationError{
		{Field: "field2", Message: "error2", Code: "code2"},
	}}

	// Test with all valid validators
	composite := NewCompositeValidator(validator1)
	result := composite.Validate(&ResourceRequest{})
	if !result.Valid {
		t.Errorf("CompositeValidator.Validate() with valid validators should return valid result")
	}

	// Test with one invalid validator
	composite = NewCompositeValidator(validator1, validator2)
	result = composite.Validate(&ResourceRequest{})
	if result.Valid {
		t.Errorf("CompositeValidator.Validate() with invalid validator should return invalid result")
	}
	if len(result.Errors) != 1 {
		t.Errorf("CompositeValidator.Validate() should combine errors from all validators")
	}

	// Test with multiple invalid validators
	composite = NewCompositeValidator(validator1, validator2, validator3)
	result = composite.Validate(&ResourceRequest{})
	if result.Valid {
		t.Errorf("CompositeValidator.Validate() with invalid validators should return invalid result")
	}
	if len(result.Errors) != 2 {
		t.Errorf("CompositeValidator.Validate() should combine errors from all validators")
	}
}

func TestURIValidator(t *testing.T) {
	// Create a registry with a mock handler
	logger := NewMockLogger()
	registry := NewRegistry(logger)
	handler := &MockResourceHandler{
		name:        "test-handler",
		uriPatterns: []string{"maas://test/{id}"},
		canHandle:   true,
	}
	_ = registry.RegisterHandler(handler)

	// Create a URI validator
	validator := NewURIValidator(registry)

	// Test valid URI
	result := validator.Validate(&ResourceRequest{URI: "maas://test/123"})
	if !result.Valid {
		t.Errorf("URIValidator.Validate() with valid URI should return valid result")
	}

	// Test empty URI
	result = validator.Validate(&ResourceRequest{URI: ""})
	if result.Valid {
		t.Errorf("URIValidator.Validate() with empty URI should return invalid result")
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "empty_uri" {
		t.Errorf("URIValidator.Validate() with empty URI should return empty_uri error")
	}

	// Test invalid URI format
	result = validator.Validate(&ResourceRequest{URI: "invalid-uri"})
	if result.Valid {
		t.Errorf("URIValidator.Validate() with invalid URI format should return invalid result")
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "invalid_uri_format" {
		t.Errorf("URIValidator.Validate() with invalid URI format should return invalid_uri_format error")
	}

	// Test URI with no handler
	result = validator.Validate(&ResourceRequest{URI: "maas://unknown/123"})
	if result.Valid {
		t.Errorf("URIValidator.Validate() with URI having no handler should return invalid result")
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "no_handler" {
		t.Errorf("URIValidator.Validate() with URI having no handler should return no_handler error")
	}
}

func TestQueryParamValidator(t *testing.T) {
	// Create parameter rules
	paramRules := map[string]ParamRule{
		"required_param": {
			Required:    true,
			Description: "Required parameter",
		},
		"pattern_param": {
			Required:    false,
			Pattern:     regexp.MustCompile(`^[0-9]+$`),
			Description: "Parameter with pattern",
		},
		"enum_param": {
			Required:    false,
			Enum:        []string{"value1", "value2", "value3"},
			Description: "Parameter with enum values",
		},
		"custom_param": {
			Required:    false,
			Validator:   func(value string) bool { return len(value) > 3 },
			Description: "Parameter with custom validator",
		},
	}

	// Create a query parameter validator
	validator := NewQueryParamValidator(paramRules)

	// Test with all valid parameters
	request := &ResourceRequest{
		QueryParams: map[string]string{
			"required_param": "value",
			"pattern_param":  "12345",
			"enum_param":     "value2",
			"custom_param":   "longvalue",
		},
	}
	result := validator.Validate(request)
	if !result.Valid {
		t.Errorf("QueryParamValidator.Validate() with valid parameters should return valid result")
	}

	// Test with missing required parameter
	request = &ResourceRequest{
		QueryParams: map[string]string{},
	}
	result = validator.Validate(request)
	if result.Valid {
		t.Errorf("QueryParamValidator.Validate() with missing required parameter should return invalid result")
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "missing_required_param" {
		t.Errorf("QueryParamValidator.Validate() with missing required parameter should return missing_required_param error")
	}

	// Test with invalid pattern
	request = &ResourceRequest{
		QueryParams: map[string]string{
			"required_param": "value",
			"pattern_param":  "abc",
		},
	}
	result = validator.Validate(request)
	if result.Valid {
		t.Errorf("QueryParamValidator.Validate() with invalid pattern should return invalid result")
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "invalid_pattern" {
		t.Errorf("QueryParamValidator.Validate() with invalid pattern should return invalid_pattern error")
	}

	// Test with invalid enum value
	request = &ResourceRequest{
		QueryParams: map[string]string{
			"required_param": "value",
			"enum_param":     "invalid",
		},
	}
	result = validator.Validate(request)
	if result.Valid {
		t.Errorf("QueryParamValidator.Validate() with invalid enum value should return invalid result")
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "invalid_enum" {
		t.Errorf("QueryParamValidator.Validate() with invalid enum value should return invalid_enum error")
	}

	// Test with invalid custom validator
	request = &ResourceRequest{
		QueryParams: map[string]string{
			"required_param": "value",
			"custom_param":   "abc",
		},
	}
	result = validator.Validate(request)
	if result.Valid {
		t.Errorf("QueryParamValidator.Validate() with invalid custom validator should return invalid result")
	}
	if len(result.Errors) != 1 || result.Errors[0].Code != "invalid_value" {
		t.Errorf("QueryParamValidator.Validate() with invalid custom validator should return invalid_value error")
	}
}

// Mock validator for testing
type mockValidator struct {
	valid  bool
	errors []ValidationError
}

func (v *mockValidator) Validate(request *ResourceRequest) *ValidationResult {
	result := NewValidationResult()
	if !v.valid {
		result.Valid = false
		result.Errors = v.errors
	}
	return result
}
