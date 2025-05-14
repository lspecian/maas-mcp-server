package tools

import (
	"context"
	"encoding/json"
	"reflect"
)

// ToolSchema defines the structure of a tool, including its name, description, and input schema
type ToolSchema struct {
	Name        string
	Description string
	InputSchema interface{}
}

// ToolHandler is a function that handles a tool call
type ToolHandler func(ctx context.Context, params json.RawMessage) (interface{}, error)

// ToolDefinition combines a tool's schema with its handler
type ToolDefinition struct {
	Schema  ToolSchema
	Handler ToolHandler
}

// ToolRegistry is a registry of tools
type ToolRegistry interface {
	// RegisterTool registers a tool with the registry
	RegisterTool(name string, description string, inputSchema interface{}, handler ToolHandler) error

	// GetTool returns a tool by name
	GetTool(name string) (*ToolDefinition, bool)

	// GetTools returns all registered tools
	GetTools() []ToolSchema

	// ExecuteTool executes a tool by name with the given parameters
	ExecuteTool(ctx context.Context, name string, params json.RawMessage) (interface{}, error)
}

// ToolValidator validates tool inputs against their schema
type ToolValidator interface {
	// Validate validates the given parameters against the tool's input schema
	Validate(schema interface{}, params json.RawMessage) error
}

// RequestMapper maps raw JSON parameters to a structured request object
type RequestMapper interface {
	// Map maps the given parameters to the given request type
	Map(params json.RawMessage, requestType reflect.Type) (interface{}, error)
}

// ResponseFormatter formats a response for a tool call
type ResponseFormatter interface {
	// Format formats the given response
	Format(response interface{}) (interface{}, error)
}

// ErrorTranslator translates errors to a standard format
type ErrorTranslator interface {
	// Translate translates the given error to a standard format
	Translate(err error) error
}

// ToolService is the main service for handling tool calls
type ToolService interface {
	// ExecuteTool executes a tool by name with the given parameters
	ExecuteTool(ctx context.Context, name string, params json.RawMessage) (interface{}, error)

	// GetTools returns all registered tools
	GetTools() []ToolSchema

	// RegisterTool registers a tool with the service
	RegisterTool(name string, description string, inputSchema interface{}, handler ToolHandler) error
}
