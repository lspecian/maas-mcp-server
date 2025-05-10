package config

import (
	"os"
	"testing"

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
	assert.Equal(t, 8080, cfg.Server.Port)
	assert.Equal(t, "info", cfg.Logging.Level)

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
	assert.Equal(t, true, cfg.Auth.RateLimit.Enabled)
	assert.Equal(t, 5, cfg.Auth.RateLimit.MaxAttempts)
	assert.Equal(t, 300, cfg.Auth.RateLimit.Window)
}

func TestValidateConfig(t *testing.T) {
	// Test case 1: No MAAS instances but environment variables set
	os.Setenv("MAAS_API_URL", "http://env.test.maas")
	os.Setenv("MAAS_API_KEY", "env_test_api_key")
	defer os.Unsetenv("MAAS_API_URL")
	defer os.Unsetenv("MAAS_API_KEY")

	cfg := &Config{}
	err := validateConfig(cfg)
	assert.NoError(t, err)
	assert.NotNil(t, cfg.MAASInstances)
	assert.Equal(t, 1, len(cfg.MAASInstances))
	assert.Equal(t, "http://env.test.maas", cfg.MAASInstances["default"].APIURL)
	assert.Equal(t, "env_test_api_key", cfg.MAASInstances["default"].APIKey)

	// Test case 2: MAAS instance with missing API URL
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
			"test": {
				APIKey: "test_api_key",
			},
		},
	}
	err = validateConfig(cfg)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing API URL")

	// Test case 3: MAAS instance with missing API Key
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
			"test": {
				APIURL: "http://test.maas",
			},
		},
	}
	err = validateConfig(cfg)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing API Key")

	// Test case 4: Auth enabled but missing auth type
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
			"default": {
				APIURL: "http://test.maas",
				APIKey: "test_api_key",
			},
		},
		Auth: struct {
			Enabled   bool   `mapstructure:"enabled"`
			Type      string `mapstructure:"type"`
			APIKey    string `mapstructure:"api_key"`
			UserStore string `mapstructure:"user_store"`
			StoreFile string `mapstructure:"store_file"`
			RateLimit struct {
				Enabled     bool `mapstructure:"enabled"`
				MaxAttempts int  `mapstructure:"max_attempts"`
				Window      int  `mapstructure:"window"`
			} `mapstructure:"rate_limit"`
		}{
			Enabled: true,
			RateLimit: struct {
				Enabled     bool `mapstructure:"enabled"`
				MaxAttempts int  `mapstructure:"max_attempts"`
				Window      int  `mapstructure:"window"`
			}{
				Enabled:     true,
				MaxAttempts: 5,
				Window:      300,
			},
		},
	}
	err = validateConfig(cfg)
	assert.Error(t, err)
	assert.EqualError(t, err, "auth type is required when auth is enabled")

	// Test case 4: Auth enabled with apikey type but missing auth API key
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
			"default": {
				APIURL: "http://test.maas",
				APIKey: "test_api_key",
			},
		},
		Auth: struct {
			Enabled   bool   `mapstructure:"enabled"`
			Type      string `mapstructure:"type"`
			APIKey    string `mapstructure:"api_key"`
			UserStore string `mapstructure:"user_store"`
			StoreFile string `mapstructure:"store_file"`
			RateLimit struct {
				Enabled     bool `mapstructure:"enabled"`
				MaxAttempts int  `mapstructure:"max_attempts"`
				Window      int  `mapstructure:"window"`
			} `mapstructure:"rate_limit"`
		}{
			Enabled: true,
			Type:    "apikey",
			RateLimit: struct {
				Enabled     bool `mapstructure:"enabled"`
				MaxAttempts int  `mapstructure:"max_attempts"`
				Window      int  `mapstructure:"window"`
			}{
				Enabled:     true,
				MaxAttempts: 5,
				Window:      300,
			},
		},
	}
	err = validateConfig(cfg)
	assert.Error(t, err)
	assert.EqualError(t, err, "auth API key is required when auth type is apikey")

	// Test case 6: Auth enabled with file store but missing store file path
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
			"default": {
				APIURL: "http://test.maas",
				APIKey: "test_api_key",
			},
		},
		Auth: struct {
			Enabled   bool   `mapstructure:"enabled"`
			Type      string `mapstructure:"type"`
			APIKey    string `mapstructure:"api_key"`
			UserStore string `mapstructure:"user_store"`
			StoreFile string `mapstructure:"store_file"`
			RateLimit struct {
				Enabled     bool `mapstructure:"enabled"`
				MaxAttempts int  `mapstructure:"max_attempts"`
				Window      int  `mapstructure:"window"`
			} `mapstructure:"rate_limit"`
		}{
			Enabled:   true,
			Type:      "apikey",
			APIKey:    "test_api_key",
			UserStore: "file",
			RateLimit: struct {
				Enabled     bool `mapstructure:"enabled"`
				MaxAttempts int  `mapstructure:"max_attempts"`
				Window      int  `mapstructure:"window"`
			}{
				Enabled:     true,
				MaxAttempts: 5,
				Window:      300,
			},
		},
	}
	err = validateConfig(cfg)
	assert.Error(t, err)
	assert.EqualError(t, err, "store file path is required when user store is file")

	// Test case 5: Valid configuration
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
			"default": {
				APIURL: "http://test.maas",
				APIKey: "test_api_key",
			},
		},
	}
	err = validateConfig(cfg)
	assert.NoError(t, err)

	// Test case 6: Multiple valid MAAS instances
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
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
	err = validateConfig(cfg)
	assert.NoError(t, err)
}

func TestGetServerAddress(t *testing.T) {
	// Set environment variables for testing
	os.Setenv("MAAS_API_URL", "http://test.maas")
	os.Setenv("MAAS_API_KEY", "test_api_key")
	defer os.Unsetenv("MAAS_API_URL")
	defer os.Unsetenv("MAAS_API_KEY")

	// Load configuration
	cfg, err := LoadConfig()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)

	// Verify server address
	address := GetServerAddress()
	assert.Equal(t, "localhost:8080", address)

}

func TestGetLogLevel(t *testing.T) {
	// Set environment variables for testing
	os.Setenv("MAAS_API_URL", "http://test.maas")
	os.Setenv("MAAS_API_KEY", "test_api_key")
	defer os.Unsetenv("MAAS_API_URL")
	defer os.Unsetenv("MAAS_API_KEY")

	// Load configuration
	cfg, err := LoadConfig()
	assert.NoError(t, err)
	assert.NotNil(t, cfg)

	// Verify log level
	logLevel := GetLogLevel()
	assert.Equal(t, "info", logLevel)

}

func TestGetDefaultMAASInstance(t *testing.T) {
	// Test with default instance
	cfg := &Config{
		MAASInstances: map[string]MAASInstanceConfig{
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
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{
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
	cfg = &Config{
		MAASInstances: map[string]MAASInstanceConfig{},
	}

	instance = cfg.GetDefaultMAASInstance()
	assert.NotNil(t, instance)
	assert.Equal(t, "", instance.APIURL)
	assert.Equal(t, "", instance.APIKey)
}

func TestGetMAASInstance(t *testing.T) {
	cfg := &Config{
		MAASInstances: map[string]MAASInstanceConfig{
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
