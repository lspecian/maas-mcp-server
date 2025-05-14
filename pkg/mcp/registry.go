package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

// ToolFunc is a function that implements an MCP tool
type ToolFunc func(ctx context.Context, input json.RawMessage) (json.RawMessage, error)

// ToolInfo contains metadata about an MCP tool
type ToolInfo struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"input_schema"`
	Handler     ToolFunc        `json:"-"`
}

// ResourceInfo contains metadata about an MCP resource
type ResourceInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	URIPattern  string `json:"uri_pattern"`
}

// Registry manages MCP tools and resources
type Registry struct {
	tools     map[string]ToolInfo
	resources map[string]ResourceInfo
	mu        sync.RWMutex
}

// NewRegistry creates a new MCP registry
func NewRegistry() *Registry {
	return &Registry{
		tools:     make(map[string]ToolInfo),
		resources: make(map[string]ResourceInfo),
	}
}

// RegisterTool registers an MCP tool
func (r *Registry) RegisterTool(info ToolInfo) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if info.Name == "" {
		return fmt.Errorf("tool name is required")
	}

	if info.Handler == nil {
		return fmt.Errorf("tool handler is required")
	}

	r.tools[info.Name] = info
	return nil
}

// RegisterResource registers an MCP resource
func (r *Registry) RegisterResource(info ResourceInfo) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if info.Name == "" {
		return fmt.Errorf("resource name is required")
	}

	if info.URIPattern == "" {
		return fmt.Errorf("resource URI pattern is required")
	}

	r.resources[info.Name] = info
	return nil
}

// GetTool returns an MCP tool by name
func (r *Registry) GetTool(name string) (ToolInfo, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tool, ok := r.tools[name]
	return tool, ok
}

// GetResource returns an MCP resource by name
func (r *Registry) GetResource(name string) (ResourceInfo, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	resource, ok := r.resources[name]
	return resource, ok
}

// ListTools returns all registered MCP tools
func (r *Registry) ListTools() []ToolInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tools := make([]ToolInfo, 0, len(r.tools))
	for _, tool := range r.tools {
		tools = append(tools, tool)
	}

	return tools
}

// ListResources returns all registered MCP resources
func (r *Registry) ListResources() []ResourceInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	resources := make([]ResourceInfo, 0, len(r.resources))
	for _, resource := range r.resources {
		resources = append(resources, resource)
	}

	return resources
}

// ExecuteTool executes an MCP tool by name
func (r *Registry) ExecuteTool(ctx context.Context, name string, input json.RawMessage) (json.RawMessage, error) {
	tool, ok := r.GetTool(name)
	if !ok {
		return nil, fmt.Errorf("tool not found: %s", name)
	}

	return tool.Handler(ctx, input)
}
