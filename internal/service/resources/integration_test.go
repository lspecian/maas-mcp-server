package resources

import (
	"context"
	"encoding/json" // Added for json.RawMessage
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// MockMCPServiceImpl is a mock implementation of the mcp.Service interface for testing
type MockMCPServiceImpl struct {
	GetResourceFunc      func(ctx context.Context, uri string) (interface{}, error)
	GetServerInfoFunc    func(ctx context.Context) (*models.MCPDiscoveryResponse, error)
	ExecuteToolFunc      func(ctx context.Context, toolName string, rawParams json.RawMessage) (interface{}, error) // Changed params type
	NegotiateVersionFunc func(ctx context.Context, clientVersion string) (string, error)
}

// GetResource implements the mcp.Service interface
func (m *MockMCPServiceImpl) GetResource(ctx context.Context, uri string) (interface{}, error) {
	if m.GetResourceFunc != nil {
		return m.GetResourceFunc(ctx, uri)
	}
	return nil, nil
}

// GetServerInfo implements the mcp.Service interface
func (m *MockMCPServiceImpl) GetServerInfo(ctx context.Context) (*models.MCPDiscoveryResponse, error) {
	if m.GetServerInfoFunc != nil {
		return m.GetServerInfoFunc(ctx)
	}
	return &models.MCPDiscoveryResponse{}, nil
}

// ExecuteTool implements the mcp.Service interface
func (m *MockMCPServiceImpl) ExecuteTool(ctx context.Context, toolName string, rawParams json.RawMessage) (interface{}, error) { // Changed params type
	if m.ExecuteToolFunc != nil {
		return m.ExecuteToolFunc(ctx, toolName, rawParams)
	}
	return nil, nil
}

// NegotiateVersion implements the mcp.Service interface
func (m *MockMCPServiceImpl) NegotiateVersion(ctx context.Context, clientVersion string) (string, error) {
	if m.NegotiateVersionFunc != nil {
		return m.NegotiateVersionFunc(ctx, clientVersion)
	}
	return "1.0", nil
}

func TestNewResourceServiceProvider(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService() // Using the existing function from service_test.go

	provider, err := NewResourceServiceProvider(mcpService, logger)
	if err != nil {
		t.Errorf("NewResourceServiceProvider() error = %v, wantErr %v", err, false)
		return
	}

	if provider == nil {
		t.Errorf("NewResourceServiceProvider() = %v, want non-nil", provider)
	}
}

func TestResourceServiceProvider_GetResource(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService() // Using the existing function from service_test.go

	provider, _ := NewResourceServiceProvider(mcpService, logger)

	// Test with a valid URI
	// Note: This will actually try to handle the request, which may fail
	// In a real test, we would mock the resource service's GetResource method
	_, err := provider.GetResource(context.Background(), "maas://machine/abc123")
	if err == nil {
		// We expect an error since we're using a mock MCPService that doesn't implement the required methods
		t.Errorf("ResourceServiceProvider.GetResource() error = %v, wantErr %v", err, true)
	}
}

func TestResourceHandlerService(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	provider, _ := NewResourceServiceProvider(mcpService, logger)

	// Create a mock MCP service
	mockService := &MockMCPServiceImpl{
		GetResourceFunc: func(ctx context.Context, uri string) (interface{}, error) {
			return map[string]interface{}{
				"id":   "abc123",
				"name": "test-machine",
			}, nil
		},
		GetServerInfoFunc: func(ctx context.Context) (*models.MCPDiscoveryResponse, error) {
			return &models.MCPDiscoveryResponse{
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
						Name:    "test-server",
						Version: "1.0.0",
					},
					Capabilities: struct {
						Tools     []models.MCPTool     `json:"tools,omitempty"`
						Resources []models.MCPResource `json:"resources,omitempty"`
					}{
						Resources: []models.MCPResource{
							{
								Name:        "machine",
								Description: "Access machine resources",
								URIPattern:  "maas://machine/{system_id}",
							},
						},
					},
				},
			}, nil
		},
	}

	// Create the resource handler service
	service := NewResourceHandlerService(provider, mockService, logger)

	// Test GetResource
	result, err := service.GetResource(context.Background(), "maas://machine/abc123")
	if err != nil {
		t.Errorf("ResourceHandlerService.GetResource() error = %v, wantErr %v", err, false)
		return
	}

	// Check the result
	if result == nil {
		t.Errorf("ResourceHandlerService.GetResource() = %v, want non-nil", result)
	}

	// Test GetServerInfo
	serverInfo, err := service.GetServerInfo(context.Background())
	if err != nil {
		t.Errorf("ResourceHandlerService.GetServerInfo() error = %v, wantErr %v", err, false)
		return
	}

	// Check the server info
	if serverInfo == nil {
		t.Errorf("ResourceHandlerService.GetServerInfo() = %v, want non-nil", serverInfo)
	}

	// Test ExecuteTool
	_, err = service.ExecuteTool(context.Background(), "test-tool", map[string]interface{}{})
	if err != nil {
		t.Errorf("ResourceHandlerService.ExecuteTool() error = %v, wantErr %v", err, false)
	}

	// Test NegotiateVersion
	version, err := service.NegotiateVersion(context.Background(), "1.0")
	if err != nil {
		t.Errorf("ResourceHandlerService.NegotiateVersion() error = %v, wantErr %v", err, false)
		return
	}

	if version != "1.0" {
		t.Errorf("ResourceHandlerService.NegotiateVersion() = %v, want %v", version, "1.0")
	}
}
