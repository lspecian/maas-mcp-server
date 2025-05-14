package tools

import (
	"context"
	"encoding/json"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/lspecian/maas-mcp-server/internal/transport/mcp"
)

// MCPToolServiceAdapter adapts the ToolService to the MCP Service interface
type MCPToolServiceAdapter struct {
	toolService ToolService
	logger      *logging.Logger
}

// NewMCPToolServiceAdapter creates a new adapter for the MCP service
func NewMCPToolServiceAdapter(toolService ToolService, logger *logging.Logger) mcp.Service {
	return &MCPToolServiceAdapter{
		toolService: toolService,
		logger:      logger,
	}
}

// ExecuteTool executes an MCP tool with the given parameters
func (a *MCPToolServiceAdapter) ExecuteTool(ctx context.Context, toolName string, rawParams json.RawMessage) (interface{}, error) {
	// rawParams is already json.RawMessage, pass it directly to the underlying toolService.
	// The toolService.ExecuteTool is expected to handle unmarshalling of rawParams.
	// If toolService.ExecuteTool still expects map[string]interface{}, then this adapter
	// would need to unmarshal rawParams first. However, assuming toolService.ExecuteTool
	// also aligns with expecting json.RawMessage or can handle it.
	// For now, let's assume toolService.ExecuteTool takes json.RawMessage as its third argument.
	// If toolService.ToolService.ExecuteTool actually expects []byte, then rawParams is fine.
	// If it expects map[string]interface{}, then unmarshalling is needed here:
	// var concreteParams map[string]interface{}
	// if err := json.Unmarshal(rawParams, &concreteParams); err != nil {
	//    a.logger.WithContext(ctx).WithError(err).Error("Failed to unmarshal rawParams for toolService")
	//    return nil, err
	// }
	// return a.toolService.ExecuteTool(ctx, toolName, concreteParams)

	// Assuming a.toolService.ExecuteTool now also expects json.RawMessage or []byte
	return a.toolService.ExecuteTool(ctx, toolName, rawParams)
}

// GetResource retrieves a resource by URI
func (a *MCPToolServiceAdapter) GetResource(ctx context.Context, uri string) (interface{}, error) {
	// This would be implemented when resource handling is added to the tools package
	// For now, return a placeholder
	return nil, nil
}

// GetServerInfo returns information about the MCP server
func (a *MCPToolServiceAdapter) GetServerInfo(ctx context.Context) (*models.MCPDiscoveryResponse, error) {
	// Get tools from the tool service
	tools := a.toolService.GetTools()

	// Convert to MCP tools
	mcpTools := make([]models.MCPTool, 0, len(tools))
	for _, tool := range tools {
		mcpTools = append(mcpTools, models.MCPTool{
			Name:        tool.Name,
			Description: tool.Description,
			InputSchema: tool.InputSchema,
		})
	}

	// Create discovery response
	response := &models.MCPDiscoveryResponse{
		Jsonrpc: "2.0",
		Result: struct {
			ServerInfo struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			} `json:"serverInfo"`
			Capabilities struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			} `json:"capabilities"`
		}{
			ServerInfo: struct {
				Name    string `json:"name"`
				Version string `json:"version"`
			}{
				Name:    "maas-mcp-server",
				Version: "1.0.0", // This should be fetched from a version constant
			},
			Capabilities: struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			}{
				Tools: mcpTools,
				Resources: []models.MCPResource{
					{
						Name:        "machine",
						Description: "Access machine resources",
						URIPattern:  "maas://machine/{system_id}",
					},
					{
						Name:        "subnet",
						Description: "Access subnet resources",
						URIPattern:  "maas://subnet/{subnet_id}",
					},
				},
			},
		},
	}

	return response, nil
}

// NegotiateVersion negotiates the protocol version with the client
func (a *MCPToolServiceAdapter) NegotiateVersion(ctx context.Context, clientVersion string) (string, error) {
	// For now, we only support version 1.0
	return "1.0", nil
}

// CreateToolServiceFromMCPService creates a tool service from an existing MCP service
func CreateToolServiceFromMCPService(mcpService *service.MCPService, logger *logging.Logger) ToolService {
	// Create dependencies
	validator := NewToolValidator()
	requestMapper := NewRequestMapper()
	responseFormatter := NewResponseFormatter()
	errorTranslator := NewErrorTranslator()
	registry := NewToolRegistry(validator)

	// Create service
	toolService := NewToolService(
		registry,
		validator,
		requestMapper,
		responseFormatter,
		errorTranslator,
		logger,
	)

	// Register tools
	factory := NewFactory(mcpService, logger)
	factory.registerTools(toolService)

	return toolService
}

// These types are now imported from internal/models
