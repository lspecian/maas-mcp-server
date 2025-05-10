package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/spf13/viper"
)

// Config stores the application configuration.
type Config struct {
	Server struct {
		Host string `mapstructure:"host"`
		Port int    `mapstructure:"port"`
	} `mapstructure:"server"`
	MAASInstances map[string]MAASInstanceConfig `mapstructure:"maas_instances"`
	Auth          struct {
		Enabled   bool   `mapstructure:"enabled"`
		Type      string `mapstructure:"type"` // "apikey" or "basic"
		APIKey    string `mapstructure:"api_key"`
		UserStore string `mapstructure:"user_store"` // "memory" or "file"
		StoreFile string `mapstructure:"store_file"` // Path to file store if using file store
		RateLimit struct {
			Enabled     bool `mapstructure:"enabled"`
			MaxAttempts int  `mapstructure:"max_attempts"`
			Window      int  `mapstructure:"window"` // Time window in seconds
		} `mapstructure:"rate_limit"`
	} `mapstructure:"auth"`
	Logging struct {
		Level string `mapstructure:"level"`
	} `mapstructure:"logging"`
}

// MAASInstanceConfig stores the configuration for a single MAAS instance.
type MAASInstanceConfig struct {
	APIURL string `mapstructure:"api_url"`
	APIKey string `mapstructure:"api_key"`
}

var instance *Config

// GetDefaultMAASInstance returns the default MAAS instance configuration.
func (c *Config) GetDefaultMAASInstance() *MAASInstanceConfig {
	if instance, ok := c.MAASInstances["default"]; ok {
		return &instance
	}

	// If no default instance is found, check if there's any instance
	for _, instance := range c.MAASInstances {
		return &instance
	}

	// Return empty config if no instances are found
	return &MAASInstanceConfig{}
}

// GetMAASInstance returns the configuration for a specific MAAS instance.
func (c *Config) GetMAASInstance(name string) (*MAASInstanceConfig, bool) {
	instance, ok := c.MAASInstances[name]
	return &instance, ok
}

// LoadConfig loads the configuration from environment variables, config file, and command-line flags.
func LoadConfig() (*Config, error) {
	if instance != nil {
		return instance, nil
	}

	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config/")
	viper.AddConfigPath("../config/")
	viper.AddConfigPath("../../config/")

	// Set default values
	viper.SetDefault("server.host", "localhost")
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("auth.enabled", false)
	viper.SetDefault("auth.type", "apikey")
	viper.SetDefault("auth.user_store", "memory")
	viper.SetDefault("auth.rate_limit.enabled", true)
	viper.SetDefault("auth.rate_limit.max_attempts", 5)
	viper.SetDefault("auth.rate_limit.window", 300) // 5 minutes
	viper.SetDefault("logging.level", "info")

	// Bind environment variables
	viper.SetEnvPrefix("")
	viper.AutomaticEnv()
	viper.BindEnv("maas.api_url", "MAAS_API_URL")
	viper.BindEnv("maas.api_key", "MAAS_API_KEY")
	viper.BindEnv("auth.api_key", "AUTH_API_KEY")
	viper.BindEnv("auth.enabled", "AUTH_ENABLED")
	viper.BindEnv("auth.type", "AUTH_TYPE")
	viper.BindEnv("auth.user_store", "AUTH_USER_STORE")
	viper.BindEnv("auth.store_file", "AUTH_STORE_FILE")
	viper.BindEnv("auth.rate_limit.enabled", "AUTH_RATE_LIMIT_ENABLED")
	viper.BindEnv("auth.rate_limit.max_attempts", "AUTH_RATE_LIMIT_MAX_ATTEMPTS")
	viper.BindEnv("auth.rate_limit.window", "AUTH_RATE_LIMIT_WINDOW")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		fmt.Println("No config file found, using environment variables and defaults")
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	if err := validateConfig(&config); err != nil {
		return nil, err
	}

	instance = &config
	return instance, nil
}

func validateConfig(config *Config) error {
	// Initialize the map if it's nil
	if config.MAASInstances == nil {
		config.MAASInstances = make(map[string]MAASInstanceConfig)
	}

	// Check if we have any MAAS instances defined
	if len(config.MAASInstances) == 0 {
		// Try to create a default instance from environment variables
		apiUrl := os.Getenv("MAAS_API_URL")
		apiKey := os.Getenv("MAAS_API_KEY")

		if apiUrl != "" && apiKey != "" {
			config.MAASInstances["default"] = MAASInstanceConfig{
				APIURL: apiUrl,
				APIKey: apiKey,
			}
		} else {
			// No instances defined and no environment variables, warn but don't error
			fmt.Println("Warning: No MAAS instances defined in config or environment variables")
		}
	}

	// Validate each MAAS instance
	for name, instance := range config.MAASInstances {
		if instance.APIURL == "" {
			return fmt.Errorf("MAAS instance '%s' is missing API URL", name)
		}
		if instance.APIKey == "" {
			return fmt.Errorf("MAAS instance '%s' is missing API Key", name)
		}
	}

	if config.Auth.Enabled && config.Auth.Type == "" {
		return fmt.Errorf("auth type is required when auth is enabled")
	}

	if config.Auth.Enabled && config.Auth.Type == "apikey" && config.Auth.APIKey == "" {
		authApiKey := os.Getenv("AUTH_API_KEY")
		if authApiKey == "" {
			return fmt.Errorf("auth API key is required when auth type is apikey")
		}
		config.Auth.APIKey = authApiKey
	}

	if config.Auth.Enabled && config.Auth.UserStore == "file" && config.Auth.StoreFile == "" {
		storeFile := os.Getenv("AUTH_STORE_FILE")
		if storeFile == "" {
			return fmt.Errorf("store file path is required when user store is file")
		}
		config.Auth.StoreFile = storeFile
	}

	return nil
}

// GetConfig returns the singleton instance of the Config.
func GetConfig() *Config {
	return instance
}

// GetServerAddress returns the server address.
func GetServerAddress() string {
	cfg := GetConfig()
	return fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
}

// GetLogLevel returns the logging level.
func GetLogLevel() string {
	cfg := GetConfig()
	return cfg.Logging.Level
}

// StringToBool is a helper function to convert string to bool
func StringToBool(s string) (bool, error) {
	return strconv.ParseBool(s)
}
