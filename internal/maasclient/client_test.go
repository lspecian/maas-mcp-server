package maasclient

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestNewMaasClient(t *testing.T) {
	// Create a test configuration
	cfg := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}
	cfg.MAASInstances["default"] = models.MAASInstanceConfig{
		APIURL: "http://test.maas",
		APIKey: "consumer:token:secret",
	}

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Test creating a new client
	client, err := NewMaasClient(cfg, logger)
	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, cfg, client.config)
	assert.Equal(t, logger, client.logger)
	assert.NotNil(t, client.client)
}

func TestNewMaasClientInvalidAPIKey(t *testing.T) {
	// Create a test configuration with invalid API key
	cfg := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}
	cfg.MAASInstances["default"] = models.MAASInstanceConfig{
		APIURL: "http://test.maas",
		APIKey: "invalid-key", // Not in the format consumer:token:secret
	}

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Test creating a new client with invalid API key
	client, err := NewMaasClient(cfg, logger)
	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "invalid MAAS API key format")
}

func TestNewMaasClientForInstance(t *testing.T) {
	// Create a test configuration with multiple instances
	cfg := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}
	cfg.MAASInstances["default"] = models.MAASInstanceConfig{
		APIURL: "http://default.maas",
		APIKey: "consumer:token:secret",
	}
	cfg.MAASInstances["test"] = models.MAASInstanceConfig{
		APIURL: "http://test.maas",
		APIKey: "consumer:token:secret",
	}

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Test creating a client for a specific instance
	client, err := NewMaasClientForInstance(cfg, "test", logger)
	assert.NoError(t, err)
	assert.NotNil(t, client)
	assert.Equal(t, cfg, client.config)
	assert.Equal(t, logger, client.logger)
	assert.NotNil(t, client.client)
}

func TestNewMaasClientForInstanceNotFound(t *testing.T) {
	// Create a test configuration
	cfg := &models.AppConfig{
		MAASInstances: make(map[string]models.MAASInstanceConfig),
	}
	cfg.MAASInstances["default"] = models.MAASInstanceConfig{
		APIURL: "http://default.maas",
		APIKey: "consumer:token:secret",
	}

	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Test creating a client for a non-existent instance
	client, err := NewMaasClientForInstance(cfg, "nonexistent", logger)
	assert.Error(t, err)
	assert.Nil(t, client)
	assert.Contains(t, err.Error(), "not found in configuration")
}
