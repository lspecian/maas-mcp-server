package resources

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"strings"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/errors"
)

func TestJSONFormatter(t *testing.T) {
	// Create test data
	response := &ResourceResponse{
		Data: map[string]interface{}{
			"id":   "123",
			"name": "test",
		},
		Metadata: map[string]interface{}{
			"version": "1.0",
		},
		Links: map[string]string{
			"self": "maas://test/123",
		},
		Timestamp: 1620000000000,
	}

	// Test JSON formatter without pretty print
	formatter := NewJSONFormatter(false)
	data, contentType, err := formatter.Format(response)
	if err != nil {
		t.Errorf("JSONFormatter.Format() error = %v", err)
	}
	if contentType != ContentTypeJSON {
		t.Errorf("JSONFormatter.Format() contentType = %v, want %v", contentType, ContentTypeJSON)
	}

	// Verify JSON data
	var parsedResponse map[string]interface{}
	if err := json.Unmarshal(data, &parsedResponse); err != nil {
		t.Errorf("Failed to parse JSON: %v", err)
	}

	// Check data field
	dataField, ok := parsedResponse["data"].(map[string]interface{})
	if !ok {
		t.Errorf("JSON data field is not a map")
	} else {
		if dataField["id"] != "123" || dataField["name"] != "test" {
			t.Errorf("JSON data field has incorrect values")
		}
	}

	// Check metadata field
	metadataField, ok := parsedResponse["metadata"].(map[string]interface{})
	if !ok {
		t.Errorf("JSON metadata field is not a map")
	} else {
		if metadataField["version"] != "1.0" {
			t.Errorf("JSON metadata field has incorrect values")
		}
	}

	// Check links field
	linksField, ok := parsedResponse["links"].(map[string]interface{})
	if !ok {
		t.Errorf("JSON links field is not a map")
	} else {
		if linksField["self"] != "maas://test/123" {
			t.Errorf("JSON links field has incorrect values")
		}
	}

	// Check timestamp field
	if parsedResponse["timestamp"] != float64(1620000000000) {
		t.Errorf("JSON timestamp field has incorrect value")
	}

	// Test JSON formatter with pretty print
	formatter = NewJSONFormatter(true)
	data, _, err = formatter.Format(response)
	if err != nil {
		t.Errorf("JSONFormatter.Format() with pretty print error = %v", err)
	}

	// Verify pretty printed JSON has newlines and indentation
	if !strings.Contains(string(data), "\n") || !strings.Contains(string(data), "  ") {
		t.Errorf("JSONFormatter.Format() with pretty print should include newlines and indentation")
	}

	// Test error formatting
	testErr := errors.NewValidationError("Test error", nil)
	data, contentType, err = formatter.FormatError(testErr)
	if err != nil {
		t.Errorf("JSONFormatter.FormatError() error = %v", err)
	}
	if contentType != ContentTypeJSON {
		t.Errorf("JSONFormatter.FormatError() contentType = %v, want %v", contentType, ContentTypeJSON)
	}

	// Verify error JSON
	var parsedError map[string]interface{}
	if err := json.Unmarshal(data, &parsedError); err != nil {
		t.Errorf("Failed to parse error JSON: %v", err)
	}
	if parsedError["type"] != "validation" {
		t.Errorf("Error JSON type = %v, want %v", parsedError["type"], "validation")
	}
	if parsedError["message"] != "Test error" {
		t.Errorf("Error JSON message = %v, want %v", parsedError["message"], "Test error")
	}
}

func TestXMLFormatter(t *testing.T) {
	// Create test data
	response := &ResourceResponse{
		Data: map[string]interface{}{
			"id":   "123",
			"name": "test",
		},
		Metadata: map[string]interface{}{
			"version": "1.0",
		},
		Links: map[string]string{
			"self": "maas://test/123",
		},
		Timestamp: 1620000000000,
	}

	// Test XML formatter without pretty print
	formatter := NewXMLFormatter(false)
	data, contentType, err := formatter.Format(response)
	if err != nil {
		t.Errorf("XMLFormatter.Format() error = %v", err)
	}
	if contentType != ContentTypeXML {
		t.Errorf("XMLFormatter.Format() contentType = %v, want %v", contentType, ContentTypeXML)
	}

	// Verify XML data starts with XML header
	if !strings.HasPrefix(string(data), "<?xml") {
		t.Errorf("XML data should start with XML header")
	}

	// Test XML formatter with pretty print
	formatter = NewXMLFormatter(true)
	data, _, err = formatter.Format(response)
	if err != nil {
		t.Errorf("XMLFormatter.Format() with pretty print error = %v", err)
	}

	// Verify pretty printed XML has newlines and indentation
	if !strings.Contains(string(data), "\n") || !strings.Contains(string(data), "  ") {
		t.Errorf("XMLFormatter.Format() with pretty print should include newlines and indentation")
	}

	// Test error formatting
	testErr := errors.NewValidationError("Test error", nil)
	data, contentType, err = formatter.FormatError(testErr)
	if err != nil {
		t.Errorf("XMLFormatter.FormatError() error = %v", err)
	}
	if contentType != ContentTypeXML {
		t.Errorf("XMLFormatter.FormatError() contentType = %v, want %v", contentType, ContentTypeXML)
	}

	// Verify error XML
	var parsedError struct {
		XMLName xml.Name `xml:"error"`
		Type    string   `xml:"type"`
		Message string   `xml:"message"`
	}
	if err := xml.Unmarshal(data, &parsedError); err != nil {
		t.Errorf("Failed to parse error XML: %v", err)
	}
	if parsedError.Type != "validation" {
		t.Errorf("Error XML type = %v, want %v", parsedError.Type, "validation")
	}
	if parsedError.Message != "Test error" {
		t.Errorf("Error XML message = %v, want %v", parsedError.Message, "Test error")
	}
}

func TestFormatterRegistry(t *testing.T) {
	// Create formatter registry
	registry := NewFormatterRegistry()

	// Test getting formatter for JSON content type
	formatter := registry.GetFormatter(ContentTypeJSON)
	if _, ok := formatter.(*JSONFormatter); !ok {
		t.Errorf("GetFormatter(%q) returned %T, want *JSONFormatter", ContentTypeJSON, formatter)
	}

	// Test getting formatter for XML content type
	formatter = registry.GetFormatter(ContentTypeXML)
	if _, ok := formatter.(*XMLFormatter); !ok {
		t.Errorf("GetFormatter(%q) returned %T, want *XMLFormatter", ContentTypeXML, formatter)
	}

	// Test getting formatter for unknown content type
	formatter = registry.GetFormatter("application/unknown")
	if _, ok := formatter.(*JSONFormatter); !ok {
		t.Errorf("GetFormatter(unknown) should return default formatter (*JSONFormatter)")
	}

	// Test getting formatter for content type with parameters
	formatter = registry.GetFormatter("application/json; charset=utf-8")
	if _, ok := formatter.(*JSONFormatter); !ok {
		t.Errorf("GetFormatter() should handle content type with parameters")
	}

	// Test formatting response
	response := NewResourceResponse(map[string]string{"test": "value"})
	data, contentType, err := registry.FormatResponse(response, ContentTypeJSON)
	if err != nil {
		t.Errorf("FormatResponse() error = %v", err)
	}
	if contentType != ContentTypeJSON {
		t.Errorf("FormatResponse() contentType = %v, want %v", contentType, ContentTypeJSON)
	}
	if !strings.Contains(string(data), "test") || !strings.Contains(string(data), "value") {
		t.Errorf("FormatResponse() data should contain the response values")
	}

	// Test formatting error
	testErr := errors.NewValidationError("Test error", nil)
	data, contentType, err = registry.FormatError(testErr, ContentTypeJSON)
	if err != nil {
		t.Errorf("FormatError() error = %v", err)
	}
	if contentType != ContentTypeJSON {
		t.Errorf("FormatError() contentType = %v, want %v", contentType, ContentTypeJSON)
	}
	if !strings.Contains(string(data), "validation") || !strings.Contains(string(data), "Test error") {
		t.Errorf("FormatError() data should contain the error type and message")
	}
}

func TestErrorResponse(t *testing.T) {
	// Test with standard error
	stdErr := fmt.Errorf("standard error")
	response := NewErrorResponse(stdErr)
	if response.Type != "unknown_error" {
		t.Errorf("NewErrorResponse() with standard error type = %v, want %v", response.Type, "unknown_error")
	}
	if response.Message != "standard error" {
		t.Errorf("NewErrorResponse() with standard error message = %v, want %v", response.Message, "standard error")
	}

	// Test with app error
	appErr := errors.NewValidationError("validation error", nil)
	response = NewErrorResponse(appErr)
	if response.Type != "validation" {
		t.Errorf("NewErrorResponse() with app error type = %v, want %v", response.Type, "validation")
	}
	if response.Message != "validation error" {
		t.Errorf("NewErrorResponse() with app error message = %v, want %v", response.Message, "validation error")
	}
}
