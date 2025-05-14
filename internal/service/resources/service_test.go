package resources

import (
	"context"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// MockMCPService is a mock implementation of the MCPService for testing
type MockMCPService struct {
	// Add any fields needed for mocking
}

// Create a new mock MCPService
func NewMockMCPService() *service.MCPService {
	// Cast the mock to the required type
	return (*service.MCPService)(nil)
}

func TestNewResourceService(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	service, err := NewResourceService(mcpService, logger)
	if err != nil {
		t.Errorf("NewResourceService() error = %v, wantErr %v", err, false)
		return
	}

	if service == nil {
		t.Errorf("NewResourceService() = %v, want non-nil", service)
	}

	// Check if handlers are registered
	handlers := service.GetResourceHandlers()
	if len(handlers) != 4 {
		t.Errorf("NewResourceService() registered %d handlers, want %d", len(handlers), 4)
	}

	// Check handler types
	handlerTypes := make(map[string]bool)
	for _, handler := range handlers {
		handlerTypes[handler.GetName()] = true
	}

	expectedTypes := []string{"machine", "network", "storage", "tag"}
	for _, expectedType := range expectedTypes {
		if !handlerTypes[expectedType] {
			t.Errorf("NewResourceService() missing handler for %s", expectedType)
		}
	}
}

func TestResourceService_GetResourceURIPatterns(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	service, _ := NewResourceService(mcpService, logger)

	patterns := service.GetResourceURIPatterns()
	if len(patterns) == 0 {
		t.Errorf("ResourceService.GetResourceURIPatterns() = %v, want non-empty", patterns)
	}

	// Check for some expected patterns
	expectedPatterns := []string{
		"maas://machine/{system_id}",
		"maas://subnet/{subnet_id}",
		"maas://storage-pool/{pool_id}",
		"maas://tag/{tag_name}",
	}

	for _, expected := range expectedPatterns {
		found := false
		for _, pattern := range patterns {
			if pattern == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("ResourceService.GetResourceURIPatterns() missing pattern %s", expected)
		}
	}
}

func TestResourceService_ValidateURI(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	service, _ := NewResourceService(mcpService, logger)

	tests := []struct {
		name    string
		uri     string
		wantErr bool
	}{
		{
			name:    "Valid machine URI",
			uri:     "maas://machine/abc123",
			wantErr: false,
		},
		{
			name:    "Valid subnet URI",
			uri:     "maas://subnet/123",
			wantErr: false,
		},
		{
			name:    "Valid storage pool URI",
			uri:     "maas://storage-pool/pool1",
			wantErr: false,
		},
		{
			name:    "Valid tag URI",
			uri:     "maas://tag/web-server",
			wantErr: false,
		},
		{
			name:    "Invalid URI scheme",
			uri:     "invalid://machine/abc123",
			wantErr: true,
		},
		{
			name:    "Invalid URI format",
			uri:     "invalid-uri",
			wantErr: true,
		},
		{
			name:    "Unsupported resource type",
			uri:     "maas://unsupported/123",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.ValidateURI(tt.uri)
			if (err != nil) != tt.wantErr {
				t.Errorf("ResourceService.ValidateURI() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestResourceService_ParseURI(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	service, _ := NewResourceService(mcpService, logger)

	tests := []struct {
		name        string
		uri         string
		wantScheme  string
		wantResType string
		wantResID   string
		wantErr     bool
	}{
		{
			name:        "Valid machine URI",
			uri:         "maas://machine/abc123",
			wantScheme:  "maas",
			wantResType: "machine",
			wantResID:   "abc123",
			wantErr:     false,
		},
		{
			name:        "Valid subnet URI",
			uri:         "maas://subnet/123",
			wantScheme:  "maas",
			wantResType: "subnet",
			wantResID:   "123",
			wantErr:     false,
		},
		{
			name:    "Invalid URI format",
			uri:     "invalid-uri",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := service.ParseURI(tt.uri)
			if (err != nil) != tt.wantErr {
				t.Errorf("ResourceService.ParseURI() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}
			if got.Scheme != tt.wantScheme {
				t.Errorf("ResourceService.ParseURI() Scheme = %v, want %v", got.Scheme, tt.wantScheme)
			}
			if got.ResourceType != tt.wantResType {
				t.Errorf("ResourceService.ParseURI() ResourceType = %v, want %v", got.ResourceType, tt.wantResType)
			}
			if got.ResourceID != tt.wantResID {
				t.Errorf("ResourceService.ParseURI() ResourceID = %v, want %v", got.ResourceID, tt.wantResID)
			}
		})
	}
}

func TestResourceService_GetResource(t *testing.T) {
	// This test would normally use a mock registry to test the GetResource method
	// For simplicity, we'll just test that the method calls the registry's HandleRequest method
	// and returns the result or error

	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	service, _ := NewResourceService(mcpService, logger)

	// Test with a valid URI
	// Note: This will actually try to handle the request, which may fail
	// In a real test, we would mock the registry's HandleRequest method
	_, err := service.GetResource(context.Background(), "maas://machine/abc123")
	if err == nil {
		// We expect an error since we're using a mock MCPService that doesn't implement the required methods
		t.Errorf("ResourceService.GetResource() error = %v, wantErr %v", err, true)
	}
}
