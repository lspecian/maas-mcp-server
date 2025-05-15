package mcp

import (
	"context"
	"encoding/json" // Added for param parsing
	"fmt"           // Added for errors

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/version"
	// Added for StorageConstraintsServiceInterface
)

// Service defines the interface for MCP service operations
type Service interface {
	// Tool operations
	ExecuteTool(ctx context.Context, toolName string, params json.RawMessage) (interface{}, error)

	// Resource operations
	GetResource(ctx context.Context, uri string) (interface{}, error)

	// Discovery operations
	GetServerInfo(ctx context.Context) (*models.MCPDiscoveryResponse, error)

	// Version negotiation
	NegotiateVersion(ctx context.Context, clientVersion string) (string, error)
}

// DefaultService is a basic implementation of the Service interface.
// The primary implementation used by the server is likely ServiceImpl.
type DefaultService struct {
	// This can hold a generic service or be left empty if DefaultService is a stub.
	genericService interface{}
}

// NewService creates a new basic MCP service.
// The main NewServiceImpl should be used for full functionality.
func NewService(genericServ interface{}) Service {
	return &DefaultService{
		genericService: genericServ,
	}
}

// ExecuteTool is a placeholder in DefaultService.
// The actual dispatch logic is expected in ServiceImpl.ExecuteTool.
func (s *DefaultService) ExecuteTool(ctx context.Context, toolName string, rawParams json.RawMessage) (interface{}, error) {
	// Placeholder implementation
	return nil, fmt.Errorf("DefaultService: tool '%s' execution not implemented here, check ServiceImpl", toolName)
}

// GetResource retrieves a resource by URI
func (s *DefaultService) GetResource(ctx context.Context, uri string) (interface{}, error) {
	// This would delegate to the appropriate business logic service
	// For now, return a placeholder
	return nil, nil
}

// GetServerInfo returns information about the MCP server
func (s *DefaultService) GetServerInfo(ctx context.Context) (*models.MCPDiscoveryResponse, error) {
	// Create a discovery response
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
				Version: version.GetVersion(),
			},
			Capabilities: struct {
				Tools     []models.MCPTool     `json:"tools,omitempty"`
				Resources []models.MCPResource `json:"resources,omitempty"`
			}{
				// Tools list might be minimal here or also point to ServiceImpl for canonical list.
				// For simplicity, keeping it minimal in DefaultService.
				// The canonical list of tools should be in ServiceImpl.GetServerInfo.
				Tools: []models.MCPTool{},
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
func (s *DefaultService) NegotiateVersion(ctx context.Context, clientVersion string) (string, error) {
	// For now, we only support version 1.0
	return "1.0", nil
}

// Helper methods for specific tools will be implemented in ServiceImpl.
