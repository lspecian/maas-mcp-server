package resources

import (
	"encoding/json"
	"encoding/xml"
	"strings"

	"github.com/lspecian/maas-mcp-server/internal/errors"
)

// ContentType constants
const (
	ContentTypeJSON      = "application/json"
	ContentTypeXML       = "application/xml"
	ContentTypeTextHTML  = "text/html"
	ContentTypeTextPlain = "text/plain"
)

// ResponseFormatter formats responses based on content type
type ResponseFormatter interface {
	// Format formats a response
	Format(response *ResourceResponse) ([]byte, string, error)
	// FormatError formats an error response
	FormatError(err error) ([]byte, string, error)
}

// JSONFormatter formats responses as JSON
type JSONFormatter struct {
	PrettyPrint bool
}

// NewJSONFormatter creates a new JSON formatter
func NewJSONFormatter(prettyPrint bool) *JSONFormatter {
	return &JSONFormatter{
		PrettyPrint: prettyPrint,
	}
}

// Format formats a response as JSON
func (f *JSONFormatter) Format(response *ResourceResponse) ([]byte, string, error) {
	var data []byte
	var err error

	if f.PrettyPrint {
		data, err = json.MarshalIndent(response, "", "  ")
	} else {
		data, err = json.Marshal(response)
	}

	if err != nil {
		return nil, "", errors.NewInternalError("Failed to marshal response to JSON", err)
	}

	return data, ContentTypeJSON, nil
}

// FormatError formats an error response as JSON
func (f *JSONFormatter) FormatError(err error) ([]byte, string, error) {
	errorResponse := NewErrorResponse(err)

	var data []byte
	var marshalErr error

	if f.PrettyPrint {
		data, marshalErr = json.MarshalIndent(errorResponse, "", "  ")
	} else {
		data, marshalErr = json.Marshal(errorResponse)
	}

	if marshalErr != nil {
		return nil, "", errors.NewInternalError("Failed to marshal error response to JSON", marshalErr)
	}

	return data, ContentTypeJSON, nil
}

// XMLFormatter formats responses as XML
type XMLFormatter struct {
	PrettyPrint bool
}

// NewXMLFormatter creates a new XML formatter
func NewXMLFormatter(prettyPrint bool) *XMLFormatter {
	return &XMLFormatter{
		PrettyPrint: prettyPrint,
	}
}

// Format formats a response as XML
func (f *XMLFormatter) Format(response *ResourceResponse) ([]byte, string, error) {
	// Create XML wrapper
	wrapper := struct {
		XMLName    xml.Name               `xml:"response"`
		Data       interface{}            `xml:"data"`
		Metadata   map[string]interface{} `xml:"metadata,omitempty"`
		Links      map[string]string      `xml:"links>link,omitempty"`
		Pagination *PaginationMetadata    `xml:"pagination,omitempty"`
		Timestamp  int64                  `xml:"timestamp"`
	}{
		Data:       response.Data,
		Metadata:   response.Metadata,
		Links:      response.Links,
		Pagination: response.Pagination,
		Timestamp:  response.Timestamp,
	}

	var data []byte
	var err error

	if f.PrettyPrint {
		data, err = xml.MarshalIndent(wrapper, "", "  ")
	} else {
		data, err = xml.Marshal(wrapper)
	}

	if err != nil {
		return nil, "", errors.NewInternalError("Failed to marshal response to XML", err)
	}

	// Add XML header
	data = append([]byte(xml.Header), data...)

	return data, ContentTypeXML, nil
}

// FormatError formats an error response as XML
func (f *XMLFormatter) FormatError(err error) ([]byte, string, error) {
	errorResponse := NewErrorResponse(err)

	// Create XML wrapper
	wrapper := struct {
		XMLName xml.Name    `xml:"error"`
		Type    string      `xml:"type"`
		Message string      `xml:"message"`
		Code    string      `xml:"code,omitempty"`
		Details interface{} `xml:"details,omitempty"`
	}{
		Type:    errorResponse.Type,
		Message: errorResponse.Message,
		Code:    errorResponse.Code,
		Details: errorResponse.Details,
	}

	var data []byte
	var marshalErr error

	if f.PrettyPrint {
		data, marshalErr = xml.MarshalIndent(wrapper, "", "  ")
	} else {
		data, marshalErr = xml.Marshal(wrapper)
	}

	if marshalErr != nil {
		return nil, "", errors.NewInternalError("Failed to marshal error response to XML", marshalErr)
	}

	// Add XML header
	data = append([]byte(xml.Header), data...)

	return data, ContentTypeXML, nil
}

// FormatterRegistry manages response formatters
type FormatterRegistry struct {
	formatters map[string]ResponseFormatter
	default_   ResponseFormatter
}

// NewFormatterRegistry creates a new formatter registry
func NewFormatterRegistry() *FormatterRegistry {
	registry := &FormatterRegistry{
		formatters: make(map[string]ResponseFormatter),
	}

	// Register default formatters
	jsonFormatter := NewJSONFormatter(false)
	xmlFormatter := NewXMLFormatter(false)

	registry.Register(ContentTypeJSON, jsonFormatter)
	registry.Register(ContentTypeXML, xmlFormatter)

	// Set default formatter
	registry.default_ = jsonFormatter

	return registry
}

// Register registers a formatter for a content type
func (r *FormatterRegistry) Register(contentType string, formatter ResponseFormatter) {
	r.formatters[contentType] = formatter
}

// GetFormatter returns a formatter for a content type
func (r *FormatterRegistry) GetFormatter(contentType string) ResponseFormatter {
	// Normalize content type (remove charset, etc.)
	normalizedType := strings.Split(contentType, ";")[0]
	normalizedType = strings.TrimSpace(normalizedType)

	if formatter, ok := r.formatters[normalizedType]; ok {
		return formatter
	}

	// Try to match by prefix
	for registeredType, formatter := range r.formatters {
		if strings.HasPrefix(normalizedType, registeredType) {
			return formatter
		}
	}

	// Return default formatter
	return r.default_
}

// FormatResponse formats a response based on the accept type
func (r *FormatterRegistry) FormatResponse(response *ResourceResponse, acceptType string) ([]byte, string, error) {
	formatter := r.GetFormatter(acceptType)
	return formatter.Format(response)
}

// FormatError formats an error response based on the accept type
func (r *FormatterRegistry) FormatError(err error, acceptType string) ([]byte, string, error) {
	formatter := r.GetFormatter(acceptType)
	return formatter.FormatError(err)
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Type    string      `json:"type" xml:"type"`
	Message string      `json:"message" xml:"message"`
	Code    string      `json:"code,omitempty" xml:"code,omitempty"`
	Details interface{} `json:"details,omitempty" xml:"details,omitempty"`
}

// NewErrorResponse creates a new error response from an error
func NewErrorResponse(err error) *ErrorResponse {
	response := &ErrorResponse{
		Type:    "unknown_error",
		Message: err.Error(),
	}

	// Check if it's an AppError
	if appErr, ok := err.(*errors.AppError); ok {
		response.Type = string(appErr.Type)
		response.Message = appErr.Message
	}

	return response
}
