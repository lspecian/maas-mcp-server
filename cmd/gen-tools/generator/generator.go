package generator

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/lspecian/maas-mcp-server/cmd/gen-tools/parser"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// ToolDefinitionGenerator generates MCP tool definitions from parsed API endpoints
type ToolDefinitionGenerator struct {
	Endpoints []parser.Endpoint
}

// NewToolDefinitionGenerator creates a new ToolDefinitionGenerator
func NewToolDefinitionGenerator(endpoints []parser.Endpoint) *ToolDefinitionGenerator {
	return &ToolDefinitionGenerator{
		Endpoints: endpoints,
	}
}

// Generate generates MCP tool definitions from the parsed endpoints
func (g *ToolDefinitionGenerator) Generate() ([]models.MCPTool, error) {
	if len(g.Endpoints) == 0 {
		return nil, fmt.Errorf("no endpoints to generate tools from")
	}

	tools := make([]models.MCPTool, 0, len(g.Endpoints))

	for _, endpoint := range g.Endpoints {
		tool, err := g.generateToolFromEndpoint(endpoint)
		if err != nil {
			return nil, fmt.Errorf("failed to generate tool from endpoint %s %s: %w", endpoint.Method, endpoint.Path, err)
		}
		tools = append(tools, tool)
	}

	return tools, nil
}

// generateToolFromEndpoint generates an MCP tool definition from a single endpoint
func (g *ToolDefinitionGenerator) generateToolFromEndpoint(endpoint parser.Endpoint) (models.MCPTool, error) {
	// Generate tool name
	toolName := endpoint.GenerateToolName()

	// Generate tool description
	description := endpoint.GenerateDescription()

	// Generate input schema
	inputSchema, err := g.generateInputSchema(endpoint)
	if err != nil {
		return models.MCPTool{}, fmt.Errorf("failed to generate input schema: %w", err)
	}

	// Create the tool definition
	tool := models.MCPTool{
		Name:        toolName,
		Description: description,
		InputSchema: inputSchema,
	}

	return tool, nil
}

// generateInputSchema generates a JSON Schema for the tool's input parameters
func (g *ToolDefinitionGenerator) generateInputSchema(endpoint parser.Endpoint) (map[string]interface{}, error) {
	// Create a JSON Schema object
	schema := map[string]interface{}{
		"type":       "object",
		"properties": map[string]interface{}{},
		"required":   []string{},
	}

	properties := schema["properties"].(map[string]interface{})
	required := schema["required"].([]string)

	// Add parameters to the schema
	for _, param := range endpoint.Parameters {
		// Skip parameters that are not in the body or query
		if param.Location != parser.BodyParam && param.Location != parser.QueryParam && param.Location != parser.PathParam {
			continue
		}

		// Create property definition
		property := map[string]interface{}{
			"type":        g.convertParameterType(param.Type),
			"description": param.Description,
		}

		// Add enum if available
		if len(param.Enum) > 0 {
			property["enum"] = param.Enum
		}

		// Add default value if available
		if param.Default != nil {
			property["default"] = param.Default
		}

		// Add property to schema
		properties[param.Name] = property

		// Add to required list if parameter is required
		if param.Required {
			required = append(required, param.Name)
		}
	}

	// Update required list in schema
	schema["required"] = required

	// If there are no required parameters, remove the required field
	if len(required) == 0 {
		delete(schema, "required")
	}

	return schema, nil
}

// convertParameterType converts a parameter type to a JSON Schema type
func (g *ToolDefinitionGenerator) convertParameterType(paramType parser.ParameterType) string {
	switch paramType {
	case parser.StringType:
		return "string"
	case parser.IntegerType:
		return "integer"
	case parser.NumberType:
		return "number"
	case parser.BooleanType:
		return "boolean"
	case parser.ArrayType:
		return "array"
	case parser.ObjectType:
		return "object"
	default:
		return "string" // Default to string for unknown types
	}
}

// GenerateToolName generates a standardized tool name from an endpoint
// This is a utility function that can be used outside the generator
func GenerateToolName(method string, path string) string {
	// Remove leading and trailing slashes
	path = strings.Trim(path, "/")

	// Replace slashes with underscores
	path = strings.ReplaceAll(path, "/", "_")

	// Replace curly braces with empty strings
	path = strings.ReplaceAll(path, "{", "")
	path = strings.ReplaceAll(path, "}", "")

	// Convert to lowercase
	path = strings.ToLower(path)
	method = strings.ToLower(method)

	// Combine method and path
	return fmt.Sprintf("maas_%s_%s", method, path)
}

// GenerateDescription generates a standardized description from an endpoint
// This is a utility function that can be used outside the generator
func GenerateDescription(method string, path string, summary string, description string) string {
	if description != "" {
		return description
	}
	if summary != "" {
		return summary
	}
	return fmt.Sprintf("%s %s", method, path)
}

// SaveToolDefinitions saves the generated tool definitions to a file
func SaveToolDefinitions(tools []models.MCPTool, filePath string) error {
	// Create a struct to hold the tools
	type ToolsOutput struct {
		Tools []models.MCPTool `json:"tools"`
	}

	output := ToolsOutput{
		Tools: tools,
	}

	// Use standard JSON marshaling and file writing
	data, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal tool definitions to JSON: %w", err)
	}

	// Write to file
	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write tool definitions to file: %w", err)
	}

	return nil
}

// LoadToolDefinitions loads tool definitions from a file
func LoadToolDefinitions(filePath string) ([]models.MCPTool, error) {
	// Read the file
	data, err := parser.LoadEndpointsFromFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load tool definitions: %w", err)
	}

	// Convert to MCPTool
	tools := make([]models.MCPTool, 0, len(data))
	for _, endpoint := range data {
		tool := models.MCPTool{
			Name:        endpoint.GenerateToolName(),
			Description: endpoint.GenerateDescription(),
			InputSchema: map[string]interface{}{}, // This would need to be populated
		}
		tools = append(tools, tool)
	}

	return tools, nil
}
