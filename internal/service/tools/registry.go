package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/lspecian/maas-mcp-server/internal/errors"
)

// DefaultToolRegistry is the default implementation of ToolRegistry
type DefaultToolRegistry struct {
	tools     map[string]ToolDefinition
	mutex     sync.RWMutex
	validator ToolValidator
}

// NewToolRegistry creates a new tool registry
func NewToolRegistry(validator ToolValidator) ToolRegistry {
	return &DefaultToolRegistry{
		tools:     make(map[string]ToolDefinition),
		validator: validator,
	}
}

// RegisterTool registers a tool with the registry
func (r *DefaultToolRegistry) RegisterTool(name string, description string, inputSchema interface{}, handler ToolHandler) error {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	// Check if tool already exists
	if _, exists := r.tools[name]; exists {
		return fmt.Errorf("tool '%s' already registered", name)
	}

	// Create tool definition
	toolDef := ToolDefinition{
		Schema: ToolSchema{
			Name:        name,
			Description: description,
			InputSchema: inputSchema,
		},
		Handler: handler,
	}

	// Register tool
	r.tools[name] = toolDef
	return nil
}

// GetTool returns a tool by name
func (r *DefaultToolRegistry) GetTool(name string) (*ToolDefinition, bool) {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	tool, exists := r.tools[name]
	if !exists {
		return nil, false
	}
	return &tool, true
}

// GetTools returns all registered tools
func (r *DefaultToolRegistry) GetTools() []ToolSchema {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	tools := make([]ToolSchema, 0, len(r.tools))
	for _, tool := range r.tools {
		tools = append(tools, tool.Schema)
	}
	return tools
}

// ExecuteTool executes a tool by name with the given parameters
func (r *DefaultToolRegistry) ExecuteTool(ctx context.Context, name string, params json.RawMessage) (interface{}, error) {
	// Get tool
	tool, exists := r.GetTool(name)
	if !exists {
		return nil, errors.NewNotFoundError(fmt.Sprintf("Tool '%s' not found", name), nil)
	}

	// Validate parameters
	if r.validator != nil && tool.Schema.InputSchema != nil {
		if err := r.validator.Validate(tool.Schema.InputSchema, params); err != nil {
			return nil, errors.NewValidationError(fmt.Sprintf("Invalid parameters for tool '%s': %v", name, err), err)
		}
	}

	// Execute tool
	return tool.Handler(ctx, params)
}
