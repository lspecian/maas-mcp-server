package parser

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

// EndpointParser is an interface for parsing API endpoints
type EndpointParser interface {
	// Parse parses API endpoints from a source
	Parse() ([]Endpoint, error)
}

// StaticEndpointParser parses API endpoints from a static list
type StaticEndpointParser struct {
	Source     string // Path to the source file or raw JSON string
	IsFilePath bool   // Whether the source is a file path
}

// NewStaticEndpointParser creates a new StaticEndpointParser
func NewStaticEndpointParser(source string, isFilePath bool) *StaticEndpointParser {
	return &StaticEndpointParser{
		Source:     source,
		IsFilePath: isFilePath,
	}
}

// Parse parses API endpoints from a static list
func (p *StaticEndpointParser) Parse() ([]Endpoint, error) {
	var data []byte
	var err error

	if p.IsFilePath {
		// Read from file
		data, err = os.ReadFile(p.Source)
		if err != nil {
			return nil, fmt.Errorf("failed to read file: %w", err)
		}
	} else {
		// Use raw JSON string
		data = []byte(p.Source)
	}

	// Parse JSON
	var rawEndpoints []map[string]interface{}
	err = json.Unmarshal(data, &rawEndpoints)
	if err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Convert to Endpoint structs
	endpoints := make([]Endpoint, 0, len(rawEndpoints))
	for i, rawEndpoint := range rawEndpoints {
		endpoint, err := parseRawEndpoint(rawEndpoint)
		if err != nil {
			return nil, fmt.Errorf("failed to parse endpoint at index %d: %w", i, err)
		}
		endpoints = append(endpoints, *endpoint)
	}

	return endpoints, nil
}

// parseRawEndpoint parses a raw endpoint from a map
func parseRawEndpoint(raw map[string]interface{}) (*Endpoint, error) {
	endpoint := &Endpoint{
		Responses: make(map[int]Response),
	}

	// Parse path
	path, ok := raw["path"].(string)
	if !ok {
		return nil, fmt.Errorf("path is required and must be a string")
	}
	endpoint.Path = path

	// Parse method
	method, ok := raw["method"].(string)
	if !ok {
		return nil, fmt.Errorf("method is required and must be a string")
	}
	endpoint.Method = HTTPMethod(strings.ToUpper(method))

	// Parse summary
	if summary, ok := raw["summary"].(string); ok {
		endpoint.Summary = summary
	}

	// Parse description
	if description, ok := raw["description"].(string); ok {
		endpoint.Description = description
	}

	// Parse operation ID
	if operationID, ok := raw["operationId"].(string); ok {
		endpoint.OperationID = operationID
	}

	// Parse tags
	if tags, ok := raw["tags"].([]interface{}); ok {
		for _, tag := range tags {
			if tagStr, ok := tag.(string); ok {
				endpoint.Tags = append(endpoint.Tags, tagStr)
			}
		}
	}

	// Parse parameters
	if params, ok := raw["parameters"].([]interface{}); ok {
		for i, param := range params {
			if paramMap, ok := param.(map[string]interface{}); ok {
				parameter, err := parseParameter(paramMap)
				if err != nil {
					return nil, fmt.Errorf("failed to parse parameter at index %d: %w", i, err)
				}
				endpoint.Parameters = append(endpoint.Parameters, *parameter)
			}
		}
	}

	// Parse responses
	if responses, ok := raw["responses"].(map[string]interface{}); ok {
		for code, resp := range responses {
			if respMap, ok := resp.(map[string]interface{}); ok {
				statusCode := 0
				if code != "default" {
					fmt.Sscanf(code, "%d", &statusCode)
				}
				response, err := parseResponse(statusCode, respMap)
				if err != nil {
					return nil, fmt.Errorf("failed to parse response for status code %s: %w", code, err)
				}
				endpoint.Responses[statusCode] = *response
			}
		}
	}

	// Validate the endpoint
	if err := endpoint.Validate(); err != nil {
		return nil, err
	}

	return endpoint, nil
}

// parseParameter parses a parameter from a map
func parseParameter(raw map[string]interface{}) (*Parameter, error) {
	parameter := &Parameter{}

	// Parse name
	name, ok := raw["name"].(string)
	if !ok {
		return nil, fmt.Errorf("parameter name is required and must be a string")
	}
	parameter.Name = name

	// Parse description
	if description, ok := raw["description"].(string); ok {
		parameter.Description = description
	}

	// Parse type
	if typeStr, ok := raw["type"].(string); ok {
		parameter.Type = ParameterType(typeStr)
	} else {
		parameter.Type = StringType // Default to string
	}

	// Parse location
	if in, ok := raw["in"].(string); ok {
		parameter.Location = ParameterLocation(in)
	} else {
		parameter.Location = QueryParam // Default to query
	}

	// Parse required
	if required, ok := raw["required"].(bool); ok {
		parameter.Required = required
	}

	// Parse default
	if defaultVal, ok := raw["default"]; ok {
		parameter.Default = defaultVal
	}

	// Parse enum
	if enum, ok := raw["enum"].([]interface{}); ok {
		parameter.Enum = enum
	}

	return parameter, nil
}

// parseResponse parses a response from a map
func parseResponse(statusCode int, raw map[string]interface{}) (*Response, error) {
	response := &Response{
		StatusCode: statusCode,
		Schema:     make(map[string]string),
	}

	// Parse description
	if description, ok := raw["description"].(string); ok {
		response.Description = description
	}

	// Parse schema
	if schema, ok := raw["schema"].(map[string]interface{}); ok {
		for key, value := range schema {
			if strValue, ok := value.(string); ok {
				response.Schema[key] = strValue
			}
		}
	}

	return response, nil
}

// EndpointWriter is an interface for writing API endpoints
type EndpointWriter interface {
	// Write writes API endpoints to a destination
	Write(endpoints []Endpoint) error
}

// JSONEndpointWriter writes API endpoints to a JSON file
type JSONEndpointWriter struct {
	Destination string // Path to the destination file
}

// NewJSONEndpointWriter creates a new JSONEndpointWriter
func NewJSONEndpointWriter(destination string) *JSONEndpointWriter {
	return &JSONEndpointWriter{
		Destination: destination,
	}
}

// Write writes API endpoints to a JSON file
func (w *JSONEndpointWriter) Write(endpoints []Endpoint) error {
	// Marshal to JSON
	data, err := json.MarshalIndent(endpoints, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal endpoints to JSON: %w", err)
	}

	// Write to file
	err = os.WriteFile(w.Destination, data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write to file: %w", err)
	}

	return nil
}

// EndpointFilter is an interface for filtering API endpoints
type EndpointFilter interface {
	// Filter filters API endpoints
	Filter(endpoints []Endpoint) []Endpoint
}

// TagEndpointFilter filters endpoints by tag
type TagEndpointFilter struct {
	Tags []string // Tags to filter by
}

// NewTagEndpointFilter creates a new TagEndpointFilter
func NewTagEndpointFilter(tags []string) *TagEndpointFilter {
	return &TagEndpointFilter{
		Tags: tags,
	}
}

// Filter filters endpoints by tag
func (f *TagEndpointFilter) Filter(endpoints []Endpoint) []Endpoint {
	if len(f.Tags) == 0 {
		return endpoints
	}

	filtered := make([]Endpoint, 0)
	for _, endpoint := range endpoints {
		for _, tag := range endpoint.Tags {
			for _, filterTag := range f.Tags {
				if tag == filterTag {
					filtered = append(filtered, endpoint)
					break
				}
			}
		}
	}

	return filtered
}

// MethodEndpointFilter filters endpoints by HTTP method
type MethodEndpointFilter struct {
	Methods []HTTPMethod // Methods to filter by
}

// NewMethodEndpointFilter creates a new MethodEndpointFilter
func NewMethodEndpointFilter(methods []HTTPMethod) *MethodEndpointFilter {
	return &MethodEndpointFilter{
		Methods: methods,
	}
}

// Filter filters endpoints by HTTP method
func (f *MethodEndpointFilter) Filter(endpoints []Endpoint) []Endpoint {
	if len(f.Methods) == 0 {
		return endpoints
	}

	filtered := make([]Endpoint, 0)
	for _, endpoint := range endpoints {
		for _, method := range f.Methods {
			if endpoint.Method == method {
				filtered = append(filtered, endpoint)
				break
			}
		}
	}

	return filtered
}

// PathEndpointFilter filters endpoints by path
type PathEndpointFilter struct {
	PathPrefix string // Path prefix to filter by
}

// NewPathEndpointFilter creates a new PathEndpointFilter
func NewPathEndpointFilter(pathPrefix string) *PathEndpointFilter {
	return &PathEndpointFilter{
		PathPrefix: pathPrefix,
	}
}

// Filter filters endpoints by path
func (f *PathEndpointFilter) Filter(endpoints []Endpoint) []Endpoint {
	if f.PathPrefix == "" {
		return endpoints
	}

	filtered := make([]Endpoint, 0)
	for _, endpoint := range endpoints {
		if strings.HasPrefix(endpoint.Path, f.PathPrefix) {
			filtered = append(filtered, endpoint)
		}
	}

	return filtered
}

// LoadEndpointsFromFile loads endpoints from a JSON file
func LoadEndpointsFromFile(filePath string) ([]Endpoint, error) {
	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read file
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Parse JSON
	var endpoints []Endpoint
	err = json.Unmarshal(data, &endpoints)
	if err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return endpoints, nil
}

// SaveEndpointsToFile saves endpoints to a JSON file
func SaveEndpointsToFile(endpoints []Endpoint, filePath string) error {
	// Marshal to JSON
	data, err := json.MarshalIndent(endpoints, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal endpoints to JSON: %w", err)
	}

	// Write to file
	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write to file: %w", err)
	}

	return nil
}
