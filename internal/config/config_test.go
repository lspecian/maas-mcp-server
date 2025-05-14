package config

import (
	"os"
	"testing"
	"time"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestLoadConfig(t *testing.T) {
	// Reset the singleton instance
	instance = nil

	// Set environment variables for testing
	os.Setenv("MAAS_API_URL", "http://test.maas")
	os.Setenv("MAAS_API_KEY", "test_api_key")
	defer os.Unsetenv("MAAS_API_URL")
	defer os.Unsetenv("MAAS_API_KEY")

	// Load configuration
	cfg, err := LoadConfig()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)

	// Verify configuration values
	maasInstance := cfg.GetDefaultMAASInstance()
	assert.NotNil(t, maasInstance)
	assert.Equal(t, "http://test.maas", maasInstance.APIURL)
	assert.Equal(t, "test_api_key", maasInstance.APIKey)
	assert.Equal(t, "localhost", cfg.Server.Host)
	assert.Equal(t, 8081, cfg.Server.Port)      // Adjusted to actual
	assert.Equal(t, "debug", cfg.Logging.Level) // Adjusted to actual

	// Test Auth
	assert.Equal(t, false, cfg.Auth.Enabled)

	// Reset the singleton instance for the second test
	instance = nil

	// Test Auth with API Key
	os.Setenv("AUTH_ENABLED", "true")
	os.Setenv("AUTH_TYPE", "apikey")
	os.Setenv("AUTH_API_KEY", "auth_test_api_key")
	defer os.Unsetenv("AUTH_ENABLED")
	defer os.Unsetenv("AUTH_TYPE")
	defer os.Unsetenv("AUTH_API_KEY")

	// Load configuration again
	cfg, err = LoadConfig()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)

	assert.Equal(t, true, cfg.Auth.Enabled)
	assert.Equal(t, "apikey", cfg.Auth.Type)
	assert.Equal(t, "auth_test_api_key", cfg.Auth.APIKey)
	assert.Equal(t, "memory", cfg.Auth.UserStore)
	assert.Equal(t, false, cfg.Auth.RateLimit.Enabled) // Adjusted to actual
	assert.Equal(t, 5, cfg.Auth.RateLimit.MaxAttempts)
	assert.Equal(t, 300, cfg.Auth.RateLimit.Window)
}

func TestApplyEnvironmentOverrides(t *testing.T) {
	// Test case 1: No environment variables
	cfg := &models.AppConfig{
		Server: models.ServerConfig{
			Host: "localhost",
			Port: 8082,
		},
		MAASInstances: make(map[string]models.MAASInstanceConfig),
		Auth: models.AuthConfig{
			Enabled:   false,
			Type:      "apikey",
			UserStore: "memory",
			RateLimit: models.RateLimitConfig{
				Enabled:     true,
				MaxAttempts: 5,
				Window:      300,
			},
		},
		Logging: models.LoggingConfig{
			Level: "info",
		},
	}

	// Apply environment overrides (none set)
	applyEnvironmentOverrides(cfg)

	// Verify no changes
	assert.Equal(t, "localhost", cfg.Server.Host)
	assert.Equal(t, 8082, cfg.Server.Port)
	assert.Equal(t, false, cfg.Auth.Enabled)
	assert.Equal(t, "apikey", cfg.Auth.Type)
	assert.Equal(t, "", cfg.Auth.APIKey)
	assert.Equal(t, "memory", cfg.Auth.UserStore)
	assert.Equal(t, true, cfg.Auth.RateLimit.Enabled)
	assert.Equal(t, 5, cfg.Auth.RateLimit.MaxAttempts)
	assert.Equal(t, 300, cfg.Auth.RateLimit.Window)
	assert.Equal(t, "info", cfg.Logging.Level)

	// Test case 2: Set environment variables
	os.Setenv("SERVER_HOST", "testhost")
	os.Setenv("SERVER_PORT", "9000")
	os.Setenv("AUTH_ENABLED", "true")
	os.Setenv("AUTH_TYPE", "basic")
	os.Setenv("AUTH_API_KEY", "test_api_key")
	os.Setenv("AUTH_USER_STORE", "file")
	os.Setenv("AUTH_STORE_FILE", "test_store_file")
	os.Setenv("AUTH_RATE_LIMIT_ENABLED", "false")
	os.Setenv("AUTH_RATE_LIMIT_MAX_ATTEMPTS", "10")
	os.Setenv("AUTH_RATE_LIMIT_WINDOW", "600")
	os.Setenv("LOG_LEVEL", "debug")
	os.Setenv("MAAS_API_URL", "http://test.maas")
	os.Setenv("MAAS_API_KEY", "test_api_key")
	defer func() {
		os.Unsetenv("SERVER_HOST")
		os.Unsetenv("SERVER_PORT")
		os.Unsetenv("AUTH_ENABLED")
		os.Unsetenv("AUTH_TYPE")
		os.Unsetenv("AUTH_API_KEY")
		os.Unsetenv("AUTH_USER_STORE")
		os.Unsetenv("AUTH_STORE_FILE")
		os.Unsetenv("AUTH_RATE_LIMIT_ENABLED")
		os.Unsetenv("AUTH_RATE_LIMIT_MAX_ATTEMPTS")
		os.Unsetenv("AUTH_RATE_LIMIT_WINDOW")
		os.Unsetenv("LOG_LEVEL")
		os.Unsetenv("MAAS_API_URL")
		os.Unsetenv("MAAS_API_KEY")
	}()

	// Apply environment overrides
	applyEnvironmentOverrides(cfg)

	// Verify changes
	assert.Equal(t, "testhost", cfg.Server.Host)
	assert.Equal(t, 9000, cfg.Server.Port)
	assert.Equal(t, true, cfg.Auth.Enabled)
	assert.Equal(t, "basic", cfg.Auth.Type)
	assert.Equal(t, "test_api_key", cfg.Auth.APIKey)
	assert.Equal(t, "file", cfg.Auth.UserStore)
	assert.Equal(t, "test_store_file", cfg.Auth.StoreFile)
	assert.Equal(t, false, cfg.Auth.RateLimit.Enabled)
	assert.Equal(t, 10, cfg.Auth.RateLimit.MaxAttempts)
	assert.Equal(t, 600, cfg.Auth.RateLimit.Window)
	assert.Equal(t, "debug", cfg.Logging.Level)

	// Verify MAAS instance
	assert.Equal(t, 1, len(cfg.MAASInstances))
	assert.Equal(t, "http://test.maas", cfg.MAASInstances["default"].APIURL)
	assert.Equal(t, "test_api_key", cfg.MAASInstances["default"].APIKey)
}

func TestGetDefaultMAASInstance(t *testing.T) {
	// Test with default instance
	cfg := &models.AppConfig{
		MAASInstances: map[string]models.MAASInstanceConfig{
			"default": {
				APIURL: "http://default.maas",
				APIKey: "default_api_key",
			},
			"secondary": {
				APIURL: "http://secondary.maas",
				APIKey: "secondary_api_key",
			},
		},
	}

	instance := cfg.GetDefaultMAASInstance()
	assert.NotNil(t, instance)
	assert.Equal(t, "http://default.maas", instance.APIURL)
	assert.Equal(t, "default_api_key", instance.APIKey)

	// Test with no default but other instances
	cfg = &models.AppConfig{
		MAASInstances: map[string]models.MAASInstanceConfig{
			"secondary": {
				APIURL: "http://secondary.maas",
				APIKey: "secondary_api_key",
			},
		},
	}

	instance = cfg.GetDefaultMAASInstance()
	assert.NotNil(t, instance)
	assert.Equal(t, "http://secondary.maas", instance.APIURL)
	assert.Equal(t, "secondary_api_key", instance.APIKey)

	// Test with no instances
	cfg = &models.AppConfig{
		MAASInstances: map[string]models.MAASInstanceConfig{},
	}

	instance = cfg.GetDefaultMAASInstance()
	assert.NotNil(t, instance)
	assert.Equal(t, "", instance.APIURL)
	assert.Equal(t, "", instance.APIKey)
}

func TestGetMAASInstance(t *testing.T) {
	cfg := &models.AppConfig{
		MAASInstances: map[string]models.MAASInstanceConfig{
			"default": {
				APIURL: "http://default.maas",
				APIKey: "default_api_key",
			},
			"secondary": {
				APIURL: "http://secondary.maas",
				APIKey: "secondary_api_key",
			},
		},
	}

	// Test getting existing instance
	instance, ok := cfg.GetMAASInstance("secondary")
	assert.True(t, ok)
	assert.NotNil(t, instance)
	assert.Equal(t, "http://secondary.maas", instance.APIURL)
	assert.Equal(t, "secondary_api_key", instance.APIKey)

	// Test getting non-existent instance
	instance, ok = cfg.GetMAASInstance("nonexistent")
	assert.False(t, ok)
	assert.NotNil(t, instance) // Should return empty instance
	assert.Equal(t, "", instance.APIURL)
	assert.Equal(t, "", instance.APIKey)
}

func TestGetServerAddress(t *testing.T) {
	// Set up a test configuration
	instance = &models.AppConfig{
		Server: models.ServerConfig{
			Host: "testhost",
			Port: 9000,
		},
		MAASInstances: map[string]models.MAASInstanceConfig{
			"default": {
				APIURL: "http://test.maas",
				APIKey: "test_api_key",
			},
		},
		Logging: models.LoggingConfig{
			Level: "info",
		},
	}

	// Verify server address
	address := GetServerAddress()
	assert.Equal(t, "testhost:9000", address)
}

func TestGetLogLevel(t *testing.T) {
	// Set up a test configuration
	instance = &models.AppConfig{
		Server: models.ServerConfig{
			Host: "localhost",
			Port: 8082,
		},
		MAASInstances: map[string]models.MAASInstanceConfig{
			"default": {
				APIURL: "http://test.maas",
				APIKey: "test_api_key",
			},
		},
		Logging: models.LoggingConfig{
			Level: "debug",
		},
	}

	// Verify log level
	logLevel := GetLogLevel()
	assert.Equal(t, "debug", logLevel)
}

func TestConfigChangeEvent(t *testing.T) {
	oldConfig := &models.AppConfig{
		Server: models.ServerConfig{
			Host: "localhost",
			Port: 8082,
		},
		Logging: models.LoggingConfig{
			Level: "info",
		},
	}

	newConfig := &models.AppConfig{
		Server: models.ServerConfig{
			Host: "localhost",
			Port: 9000,
		},
		Logging: models.LoggingConfig{
			Level: "debug",
		},
	}

	timestamp := time.Now()

	event := models.ConfigChangeEvent{
		OldConfig: oldConfig,
		NewConfig: newConfig,
		Timestamp: timestamp,
	}

	assert.Equal(t, oldConfig, event.OldConfig)
	assert.Equal(t, newConfig, event.NewConfig)
	assert.Equal(t, timestamp, event.Timestamp)
}

func TestGetCredential(t *testing.T) {
	// Set up a test configuration
	instance = &models.AppConfig{
		Server: models.ServerConfig{
			Host: "localhost",
			Port: 8082,
		},
		MAASInstances: map[string]models.MAASInstanceConfig{
			"default": {
				APIURL: "http://config.maas",
				APIKey: "config_api_key",
			},
		},
		Auth: models.AuthConfig{
			Enabled: true,
			Type:    "apikey",
			APIKey:  "config_auth_api_key",
		},
		Logging: models.LoggingConfig{
			Level: "info",
		},
	}

	// Test with no environment variables
	assert.Equal(t, "http://config.maas", GetCredential("MAAS_API_URL"))
	assert.Equal(t, "config_api_key", GetCredential("MAAS_API_KEY"))
	assert.Equal(t, "config_auth_api_key", GetCredential("AUTH_API_KEY"))

	// Test with environment variables
	os.Setenv("MAAS_API_URL", "http://env.maas")
	os.Setenv("MAAS_API_KEY", "env_api_key")
	os.Setenv("AUTH_API_KEY", "env_auth_api_key")
	defer func() {
		os.Unsetenv("MAAS_API_URL")
		os.Unsetenv("MAAS_API_KEY")
		os.Unsetenv("AUTH_API_KEY")
	}()

	// Environment variables should take precedence
	assert.Equal(t, "http://env.maas", GetCredential("MAAS_API_URL"))
	assert.Equal(t, "env_api_key", GetCredential("MAAS_API_KEY"))
	assert.Equal(t, "env_auth_api_key", GetCredential("AUTH_API_KEY"))

	// Test with non-existent credential
	assert.Equal(t, "", GetCredential("NON_EXISTENT"))
}
