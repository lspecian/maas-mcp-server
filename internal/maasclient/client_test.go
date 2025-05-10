package maasclient

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/sirupsen/logrus"
)

// TestNewMaasClient tests the creation of a new MAAS client
func TestNewMaasClient(t *testing.T) {
	// Setup
	cfg := &config.Config{}
	cfg.MAASInstances = make(map[string]config.MAASInstanceConfig)
	cfg.MAASInstances["default"] = config.MAASInstanceConfig{
		APIURL: "http://maas.example.com/MAAS/api/2.0",
		APIKey: "consumer:token:secret",
	}
	logger := logrus.New()

	// Test valid configuration
	client, err := NewMaasClient(cfg, logger)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if client == nil {
		t.Error("Expected client to not be nil")
	}
	if client.config != cfg {
		t.Error("Expected client config to match input config")
	}
	if client.logger != logger {
		t.Error("Expected client logger to match input logger")
	}
	if client.client == nil {
		t.Error("Expected client.client to not be nil")
	}

	// Test invalid API key format
	cfg.MAASInstances["default"] = config.MAASInstanceConfig{
		APIURL: "http://maas.example.com/MAAS/api/2.0",
		APIKey: "invalid-format",
	}
	client, err = NewMaasClient(cfg, logger)
	if err == nil {
		t.Error("Expected error for invalid API key format, got nil")
	}
	if client != nil {
		t.Error("Expected client to be nil for invalid API key")
	}
	if err != nil && err.Error() != "invalid MAAS API key format" {
		t.Errorf("Expected error message 'invalid MAAS API key format', got '%s'", err.Error())
	}

	// Test specific instance
	cfg.MAASInstances["test"] = config.MAASInstanceConfig{
		APIURL: "http://test.maas.example.com/MAAS/api/2.0",
		APIKey: "test:token:secret",
	}
	client, err = NewMaasClientForInstance(cfg, "test", logger)
	if err != nil {
		t.Errorf("Expected no error for specific instance, got %v", err)
	}
	if client == nil {
		t.Error("Expected client to not be nil for specific instance")
	}

	// Test non-existent instance
	client, err = NewMaasClientForInstance(cfg, "nonexistent", logger)
	if err == nil {
		t.Error("Expected error for non-existent instance, got nil")
	}
	if client != nil {
		t.Error("Expected client to be nil for non-existent instance")
	}
}
