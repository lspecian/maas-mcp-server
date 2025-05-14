package resources

import (
	"context"
	"reflect"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/logging"
)

func TestNewMachineResourceHandler(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	handler := NewMachineResourceHandler(mcpService, logger)

	if handler == nil {
		t.Errorf("NewMachineResourceHandler() = %v, want non-nil", handler)
	}

	if handler.GetName() != "machine" {
		t.Errorf("handler.GetName() = %v, want %v", handler.GetName(), "machine")
	}

	// Check URI patterns
	patterns := handler.GetURIPatterns()
	expectedPatterns := []string{
		"maas://machine/{system_id}",
		"maas://machine/{system_id}/power",
		"maas://machine/{system_id}/interfaces",
		"maas://machine/{system_id}/storage",
		"maas://machine/{system_id}/tags",
	}

	if !reflect.DeepEqual(patterns, expectedPatterns) {
		t.Errorf("handler.GetURIPatterns() = %v, want %v", patterns, expectedPatterns)
	}
}

func TestMachineResourceHandler_CanHandle(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	handler := NewMachineResourceHandler(mcpService, logger)

	tests := []struct {
		name string
		uri  string
		want bool
	}{
		{
			name: "Can handle machine URI",
			uri:  "maas://machine/abc123",
			want: true,
		},
		{
			name: "Can handle machine power URI",
			uri:  "maas://machine/abc123/power",
			want: true,
		},
		{
			name: "Can handle machine interfaces URI",
			uri:  "maas://machine/abc123/interfaces",
			want: true,
		},
		{
			name: "Can handle machine storage URI",
			uri:  "maas://machine/abc123/storage",
			want: true,
		},
		{
			name: "Can handle machine tags URI",
			uri:  "maas://machine/abc123/tags",
			want: true,
		},
		{
			name: "Cannot handle subnet URI",
			uri:  "maas://subnet/123",
			want: false,
		},
		{
			name: "Cannot handle storage URI",
			uri:  "maas://storage-pool/pool1",
			want: false,
		},
		{
			name: "Cannot handle tag URI",
			uri:  "maas://tag/web-server",
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := handler.CanHandle(tt.uri); got != tt.want {
				t.Errorf("MachineResourceHandler.CanHandle() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMachineResourceHandler_HandleRequest(t *testing.T) {
	// This test would normally use a mock MCPService to test the HandleRequest method
	// For simplicity, we'll just test that the method handles different URI patterns correctly
	// and returns the expected errors for invalid URIs

	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	mcpService := NewMockMCPService()

	handler := NewMachineResourceHandler(mcpService, logger)

	tests := []struct {
		name    string
		uri     string
		wantErr bool
	}{
		{
			name:    "Invalid URI",
			uri:     "invalid-uri",
			wantErr: true,
		},
		{
			name:    "Missing system_id",
			uri:     "maas://machine/",
			wantErr: true,
		},
		{
			name:    "Invalid sub-resource",
			uri:     "maas://machine/abc123/invalid",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Parse the URI
			parsedURI, err := ParseURI(tt.uri)
			if err != nil {
				if !tt.wantErr {
					t.Errorf("ParseURI() error = %v, wantErr %v", err, tt.wantErr)
				}
				return
			}

			// Create a request
			request := &ResourceRequest{
				URI:        tt.uri,
				Parameters: make(map[string]string),
			}

			// Add parameters from the parsed URI
			if parsedURI.ResourceID != "" {
				request.Parameters["system_id"] = parsedURI.ResourceID
			}
			if parsedURI.SubResourceID != "" {
				request.Parameters["sub_resource_id"] = parsedURI.SubResourceID
			}

			// Handle the request
			_, err = handler.HandleRequest(context.Background(), request)
			if (err != nil) != tt.wantErr {
				t.Errorf("MachineResourceHandler.HandleRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
