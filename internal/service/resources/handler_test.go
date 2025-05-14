package resources

import (
	"context"
	"reflect"
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
)

// MockResourceHandler is a mock implementation of ResourceHandler for testing
type MockResourceHandler struct {
	name        string
	uriPatterns []string
	canHandle   bool
	result      interface{}
	err         error
}

func (h *MockResourceHandler) GetName() string {
	return h.name
}

func (h *MockResourceHandler) GetURIPatterns() []string {
	return h.uriPatterns
}

func (h *MockResourceHandler) CanHandle(uri string) bool {
	return h.canHandle
}

func (h *MockResourceHandler) HandleRequest(ctx context.Context, request *ResourceRequest) (interface{}, error) {
	return h.result, h.err
}

func TestBaseResourceHandler_GetName(t *testing.T) {
	handler := &BaseResourceHandler{
		Name: "test-handler",
	}

	if got := handler.GetName(); got != "test-handler" {
		t.Errorf("BaseResourceHandler.GetName() = %v, want %v", got, "test-handler")
	}
}

func TestBaseResourceHandler_GetURIPatterns(t *testing.T) {
	patterns := []string{
		"maas://machine/{system_id}",
		"maas://machine/{system_id}/power",
	}

	handler := &BaseResourceHandler{
		URIPatterns: patterns,
	}

	if got := handler.GetURIPatterns(); !reflect.DeepEqual(got, patterns) {
		t.Errorf("BaseResourceHandler.GetURIPatterns() = %v, want %v", got, patterns)
	}
}

func TestBaseResourceHandler_CanHandle(t *testing.T) {
	handler := &BaseResourceHandler{
		URIPatterns: []string{
			"maas://machine/{system_id}",
			"maas://machine/{system_id}/power",
		},
	}

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
			name: "Cannot handle subnet URI",
			uri:  "maas://subnet/123",
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := handler.CanHandle(tt.uri); got != tt.want {
				t.Errorf("BaseResourceHandler.CanHandle() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBaseResourceHandler_HandleRequest(t *testing.T) {
	handler := &BaseResourceHandler{}

	_, err := handler.HandleRequest(context.Background(), &ResourceRequest{})
	if err == nil {
		t.Errorf("BaseResourceHandler.HandleRequest() error = %v, wantErr %v", err, true)
	}
}

func TestRegistry_RegisterHandler(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	registry := NewRegistry(logger)

	handler := &MockResourceHandler{
		name: "test-handler",
		uriPatterns: []string{
			"maas://machine/{system_id}",
		},
	}

	if err := registry.RegisterHandler(handler); err != nil {
		t.Errorf("Registry.RegisterHandler() error = %v, wantErr %v", err, false)
	}

	// Try to register the same handler again
	if err := registry.RegisterHandler(handler); err == nil {
		t.Errorf("Registry.RegisterHandler() error = %v, wantErr %v", err, true)
	}
}

func TestRegistry_GetHandler(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	registry := NewRegistry(logger)

	handler1 := &MockResourceHandler{
		name: "machine-handler",
		uriPatterns: []string{
			"maas://machine/{system_id}",
		},
		canHandle: true,
	}

	handler2 := &MockResourceHandler{
		name: "subnet-handler",
		uriPatterns: []string{
			"maas://subnet/{subnet_id}",
		},
		canHandle: false,
	}

	_ = registry.RegisterHandler(handler1)
	_ = registry.RegisterHandler(handler2)

	tests := []struct {
		name    string
		uri     string
		want    ResourceHandler
		wantErr bool
	}{
		{
			name:    "Get machine handler",
			uri:     "maas://machine/abc123",
			want:    handler1,
			wantErr: false,
		},
		{
			name:    "No handler for URI",
			uri:     "maas://unknown/123",
			want:    nil,
			wantErr: true,
		},
		{
			name:    "Invalid URI",
			uri:     "invalid-uri",
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := registry.GetHandler(tt.uri)
			if (err != nil) != tt.wantErr {
				t.Errorf("Registry.GetHandler() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("Registry.GetHandler() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRegistry_HandleRequest(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	registry := NewRegistry(logger)

	expectedResult := map[string]interface{}{"id": "abc123", "name": "test-machine"}

	handler := &MockResourceHandler{
		name: "machine-handler",
		uriPatterns: []string{
			"maas://machine/{system_id}",
		},
		canHandle: true,
		result:    expectedResult,
		err:       nil,
	}

	errorHandler := &MockResourceHandler{
		name: "error-handler",
		uriPatterns: []string{
			"maas://error/{id}",
		},
		canHandle: true,
		result:    nil,
		err:       errors.NewNotFoundError("Resource not found", nil),
	}

	_ = registry.RegisterHandler(handler)
	_ = registry.RegisterHandler(errorHandler)

	tests := []struct {
		name    string
		uri     string
		want    interface{}
		wantErr bool
	}{
		{
			name:    "Handle machine request",
			uri:     "maas://machine/abc123",
			want:    expectedResult,
			wantErr: false,
		},
		{
			name:    "Handle error request",
			uri:     "maas://error/123",
			want:    nil,
			wantErr: true,
		},
		{
			name:    "No handler for URI",
			uri:     "maas://unknown/123",
			want:    nil,
			wantErr: true,
		},
		{
			name:    "Invalid URI",
			uri:     "invalid-uri",
			want:    nil,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			response, err := registry.HandleRequest(context.Background(), tt.uri, ContentTypeJSON, ContentTypeJSON, nil)
			if (err != nil) != tt.wantErr {
				t.Errorf("Registry.HandleRequest() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Check if response is a ResourceResponse
				if response == nil {
					t.Errorf("Registry.HandleRequest() returned nil response")
					return
				}

				// Check if the data matches the expected result
				if !reflect.DeepEqual(response.Data, tt.want) {
					t.Errorf("Registry.HandleRequest() data = %v, want %v", response.Data, tt.want)
				}
			}
		})
	}
}

func TestRegistry_GetHandlers(t *testing.T) {
	config := logging.DefaultLoggerConfig()
	logger, _ := logging.NewEnhancedLogger(config)
	registry := NewRegistry(logger)

	handler1 := &MockResourceHandler{name: "handler1"}
	handler2 := &MockResourceHandler{name: "handler2"}

	_ = registry.RegisterHandler(handler1)
	_ = registry.RegisterHandler(handler2)

	handlers := registry.GetHandlers()
	if len(handlers) != 2 {
		t.Errorf("Registry.GetHandlers() returned %d handlers, want %d", len(handlers), 2)
	}

	// Check if both handlers are in the result
	found1, found2 := false, false
	for _, h := range handlers {
		if h.GetName() == "handler1" {
			found1 = true
		}
		if h.GetName() == "handler2" {
			found2 = true
		}
	}

	if !found1 || !found2 {
		t.Errorf("Registry.GetHandlers() did not return all registered handlers")
	}
}
