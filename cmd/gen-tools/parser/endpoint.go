package parser

import (
	"fmt"
	"strings"
)

// HTTPMethod represents an HTTP method
type HTTPMethod string

// HTTP methods
const (
	GET     HTTPMethod = "GET"
	POST    HTTPMethod = "POST"
	PUT     HTTPMethod = "PUT"
	DELETE  HTTPMethod = "DELETE"
	PATCH   HTTPMethod = "PATCH"
	OPTIONS HTTPMethod = "OPTIONS"
	HEAD    HTTPMethod = "HEAD"
)

// ParameterLocation represents where a parameter is located in the request
type ParameterLocation string

// Parameter locations
const (
	PathParam   ParameterLocation = "path"
	QueryParam  ParameterLocation = "query"
	BodyParam   ParameterLocation = "body"
	HeaderParam ParameterLocation = "header"
)

// ParameterType represents the data type of a parameter
type ParameterType string

// Parameter types
const (
	StringType  ParameterType = "string"
	IntegerType ParameterType = "integer"
	NumberType  ParameterType = "number"
	BooleanType ParameterType = "boolean"
	ArrayType   ParameterType = "array"
	ObjectType  ParameterType = "object"
)

// Parameter represents a parameter for an API endpoint
type Parameter struct {
	Name        string            // Name of the parameter
	Description string            // Description of the parameter
	Type        ParameterType     // Data type of the parameter
	Location    ParameterLocation // Where the parameter is located
	Required    bool              // Whether the parameter is required
	Default     interface{}       // Default value for the parameter
	Enum        []interface{}     // Possible values for the parameter
}

// Response represents a response from an API endpoint
type Response struct {
	StatusCode  int               // HTTP status code
	Description string            // Description of the response
	Schema      map[string]string // Schema of the response
}

// Endpoint represents an API endpoint
type Endpoint struct {
	Path        string           // Path of the endpoint
	Method      HTTPMethod       // HTTP method of the endpoint
	Summary     string           // Summary of the endpoint
	Description string           // Description of the endpoint
	Parameters  []Parameter      // Parameters for the endpoint
	Responses   map[int]Response // Responses from the endpoint
	Tags        []string         // Tags for the endpoint
	OperationID string           // Unique identifier for the operation
}

// Validate validates the endpoint
func (e *Endpoint) Validate() error {
	if e.Path == "" {
		return fmt.Errorf("endpoint path cannot be empty")
	}
	if e.Method == "" {
		return fmt.Errorf("endpoint method cannot be empty")
	}
	return nil
}

// GenerateToolName generates a name for the tool based on the endpoint
func (e *Endpoint) GenerateToolName() string {
	// Remove leading and trailing slashes
	path := strings.Trim(e.Path, "/")

	// Replace slashes with underscores
	path = strings.ReplaceAll(path, "/", "_")

	// Replace curly braces with empty strings
	path = strings.ReplaceAll(path, "{", "")
	path = strings.ReplaceAll(path, "}", "")

	// Convert to lowercase
	path = strings.ToLower(path)

	// Add method prefix
	method := strings.ToLower(string(e.Method))

	// Combine method and path
	return fmt.Sprintf("maas_%s_%s", method, path)
}

// GenerateDescription generates a description for the tool based on the endpoint
func (e *Endpoint) GenerateDescription() string {
	if e.Description != "" {
		return e.Description
	}
	if e.Summary != "" {
		return e.Summary
	}
	return fmt.Sprintf("%s %s", e.Method, e.Path)
}
