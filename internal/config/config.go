package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/go-playground/validator/v10"
	"github.com/spf13/viper"

	"github.com/lspecian/maas-mcp-server/internal/models/types"
)

const (
	// DefaultConfigPath is the default path to the MCP configuration file
	DefaultConfigPath = ".roo/mcp.json"
	// FallbackConfigPath is the fallback path to the legacy configuration file
	FallbackConfigPath = "config/config.yaml"
)

var (
	instance     *types.AppConfig
	instanceLock sync.RWMutex
	validate     = validator.New()
	configChan   = make(chan types.ConfigChangeEvent, 10)
)

// GetConfig returns the singleton instance of the Config.
func GetConfig() *types.AppConfig {
	instanceLock.RLock()
	defer instanceLock.RUnlock()
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

// GetLogFormat returns the logging format.
func GetLogFormat() types.LogFormat {
	cfg := GetConfig()
	return cfg.Logging.Format
}

// GetLogFilePath returns the logging file path.
func GetLogFilePath() string {
	cfg := GetConfig()
	return cfg.Logging.FilePath
}

// GetLogMaxAge returns the logging max age in days.
func GetLogMaxAge() time.Duration {
	cfg := GetConfig()
	return time.Duration(cfg.Logging.MaxAge) * 24 * time.Hour
}

// GetLogRotateTime returns the logging rotation time in hours.
func GetLogRotateTime() time.Duration {
	cfg := GetConfig()
	return time.Duration(cfg.Logging.RotateTime) * time.Hour
}

// StringToBool is a helper function to convert string to bool
func StringToBool(s string) (bool, error) {
	return strconv.ParseBool(s)
}

// LoadConfig loads the configuration from .roo/mcp.json, environment variables, and fallback to config.yaml if needed.
func LoadConfig() (*types.AppConfig, error) {
	fmt.Println("Starting configuration loading process...")
	instanceLock.Lock()
	defer instanceLock.Unlock()

	if instance != nil {
		fmt.Println("Using cached configuration instance")
		return instance, nil
	}

	fmt.Println("Attempting to load configuration from .roo/mcp.json at path:", DefaultConfigPath)
	// Try to load from .roo/mcp.json first
	config, err := loadFromMCPJson()
	if err != nil {
		// If .roo/mcp.json doesn't exist or has errors, fall back to config.yaml
		fmt.Printf("Failed to load from .roo/mcp.json: %v\n", err)
		fmt.Println("Falling back to config.yaml at path:", FallbackConfigPath)
		config, err = loadFromConfigYaml()
		if err != nil {
			fmt.Printf("Failed to load from config.yaml: %v\n", err)
			return nil, fmt.Errorf("failed to load configuration: %w", err)
		}
		fmt.Println("Successfully loaded configuration from config.yaml")
	} else {
		fmt.Println("Successfully loaded configuration from .roo/mcp.json")
	}

	// Apply environment variable overrides
	applyEnvironmentOverrides(config)

	// Validate the configuration
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	// Set the last updated time
	config.LastUpdated = time.Now()

	// Set the singleton instance
	instance = config

	return instance, nil
}

// loadFromMCPJson loads the configuration from .roo/mcp.json
func loadFromMCPJson() (*types.AppConfig, error) {
	// Check if .roo/mcp.json exists
	if _, err := os.Stat(DefaultConfigPath); os.IsNotExist(err) {
		fmt.Printf("Configuration file not found at path: %s\n", DefaultConfigPath)
		return nil, fmt.Errorf("configuration file not found: %s", DefaultConfigPath)
	}
	fmt.Printf("Found configuration file at path: %s\n", DefaultConfigPath)

	// Read the file
	data, err := os.ReadFile(DefaultConfigPath)
	if err != nil {
		fmt.Printf("Failed to read configuration file: %v\n", err)
		return nil, fmt.Errorf("failed to read configuration file: %w", err)
	}
	fmt.Printf("Successfully read configuration file, size: %d bytes\n", len(data))

	// Parse the JSON
	var mcpConfig types.MCPConfig
	if err := json.Unmarshal(data, &mcpConfig); err != nil {
		fmt.Printf("Failed to parse configuration file as JSON: %v\n", err)
		return nil, fmt.Errorf("failed to parse configuration file: %w", err)
	}
	fmt.Println("Successfully parsed configuration file as JSON")

	// Convert to AppConfig
	config := &types.AppConfig{
		Server: types.ServerConfig{
			Host: "localhost",
			Port: 8082,
		},
		MAASInstances: make(map[string]types.MAASInstanceConfig),
		Auth: types.AuthConfig{
			Enabled:   false,
			Type:      "apikey",
			UserStore: "memory",
			RateLimit: types.RateLimitConfig{
				Enabled:     true,
				MaxAttempts: 5,
				Window:      300, // 5 minutes
			},
		},
		Logging: types.LoggingConfig{
			Level:      "info",
			Format:     types.LogFormatJSON,
			FilePath:   "",
			MaxAge:     7,  // 7 days
			RotateTime: 24, // 24 hours
		},
	}

	// Extract MAAS configurations from MCP servers
	fmt.Printf("Found %d MCP servers in configuration\n", len(mcpConfig.MCPServers))
	for name, server := range mcpConfig.MCPServers {
		fmt.Printf("Processing MCP server: %s\n", name)

		// Check if the server has a MAAS configuration
		if server.MaasConfig != nil {
			fmt.Printf("Server %s has explicit MAAS configuration\n", name)
			config.MAASInstances[name] = types.MAASInstanceConfig{
				APIURL: server.MaasConfig.APIURL,
				APIKey: server.MaasConfig.APIKey,
			}
			fmt.Printf("Added MAAS instance from MaasConfig: %s with API URL: %s\n",
				name, server.MaasConfig.APIURL)
		}

		// Check if the server has MAAS configuration in environment variables
		if server.Env != nil {
			fmt.Printf("Server %s has environment variables\n", name)
			apiURL, hasAPIURL := server.Env["MAAS_API_URL"]
			apiKey, hasAPIKey := server.Env["MAAS_API_KEY"]

			fmt.Printf("Server %s environment has MAAS_API_URL: %v, MAAS_API_KEY: %v\n",
				name, hasAPIURL, hasAPIKey)

			if hasAPIURL && hasAPIKey {
				config.MAASInstances[name] = types.MAASInstanceConfig{
					APIURL: apiURL,
					APIKey: apiKey,
				}
				fmt.Printf("Added MAAS instance from Env: %s with API URL: %s\n",
					name, apiURL)
			}

			// Check for logging configuration
			if logLevel, hasLogLevel := server.Env["LOG_LEVEL"]; hasLogLevel {
				config.Logging.Level = logLevel
			}
			if logFormat, hasLogFormat := server.Env["LOG_FORMAT"]; hasLogFormat {
				config.Logging.Format = types.LogFormat(logFormat)
			}
			if logFilePath, hasLogFilePath := server.Env["LOG_FILE_PATH"]; hasLogFilePath {
				config.Logging.FilePath = logFilePath
			}
			if logMaxAge, hasLogMaxAge := server.Env["LOG_MAX_AGE"]; hasLogMaxAge {
				if maxAge, err := strconv.Atoi(logMaxAge); err == nil {
					config.Logging.MaxAge = maxAge
				}
			}
			if logRotateTime, hasLogRotateTime := server.Env["LOG_ROTATE_TIME"]; hasLogRotateTime {
				if rotateTime, err := strconv.Atoi(logRotateTime); err == nil {
					config.Logging.RotateTime = rotateTime
				}
			}
		}
	}

	// Check if we have any MAAS instances
	if len(config.MAASInstances) == 0 {
		fmt.Println("WARNING: No MAAS instances were found in the configuration")
	} else {
		fmt.Printf("Found %d MAAS instances in the configuration\n", len(config.MAASInstances))
		for name, instance := range config.MAASInstances {
			fmt.Printf("MAAS instance: %s, API URL: %s, API Key present: %v\n",
				name, instance.APIURL, instance.APIKey != "")
		}
	}

	return config, nil
}

// loadFromConfigYaml loads the configuration from config.yaml
func loadFromConfigYaml() (*types.AppConfig, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config/")
	viper.AddConfigPath("../config/")
	viper.AddConfigPath("../../config/")

	// Set default values
	viper.SetDefault("server.host", "localhost")
	viper.SetDefault("server.port", 8082)
	viper.SetDefault("auth.enabled", false)
	viper.SetDefault("auth.type", "apikey")
	viper.SetDefault("auth.user_store", "memory")
	viper.SetDefault("auth.rate_limit.enabled", true)
	viper.SetDefault("auth.rate_limit.max_attempts", 5)
	viper.SetDefault("auth.rate_limit.window", 300) // 5 minutes
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.format", "json")
	viper.SetDefault("logging.max_age", 7)      // 7 days
	viper.SetDefault("logging.rotate_time", 24) // 24 hours

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
	viper.BindEnv("logging.level", "LOG_LEVEL")
	viper.BindEnv("logging.format", "LOG_FORMAT")
	viper.BindEnv("logging.file_path", "LOG_FILE_PATH")
	viper.BindEnv("logging.max_age", "LOG_MAX_AGE")
	viper.BindEnv("logging.rotate_time", "LOG_ROTATE_TIME")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		fmt.Println("No config file found, using environment variables and defaults")
	}

	var config types.AppConfig
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Initialize the map if it's nil
	if config.MAASInstances == nil {
		config.MAASInstances = make(map[string]types.MAASInstanceConfig)
	}

	// Check if we have any MAAS instances defined
	if len(config.MAASInstances) == 0 {
		// Try to create a default instance from environment variables
		apiUrl := os.Getenv("MAAS_API_URL")
		apiKey := os.Getenv("MAAS_API_KEY")

		if apiUrl != "" && apiKey != "" {
			config.MAASInstances["default"] = types.MAASInstanceConfig{
				APIURL: apiUrl,
				APIKey: apiKey,
			}
		} else {
			// No instances defined and no environment variables, warn but don't error
			fmt.Println("Warning: No MAAS instances defined in config or environment variables")
		}
	}

	return &config, nil
}

// applyEnvironmentOverrides applies environment variable overrides to the configuration
func applyEnvironmentOverrides(config *types.AppConfig) {
	// Server configuration
	if host := os.Getenv("SERVER_HOST"); host != "" {
		config.Server.Host = host
	}
	if portStr := os.Getenv("SERVER_PORT"); portStr != "" {
		if port, err := strconv.Atoi(portStr); err == nil {
			config.Server.Port = port
		}
	}

	// Auth configuration
	if enabledStr := os.Getenv("AUTH_ENABLED"); enabledStr != "" {
		if enabled, err := strconv.ParseBool(enabledStr); err == nil {
			config.Auth.Enabled = enabled
		}
	}
	if authType := os.Getenv("AUTH_TYPE"); authType != "" {
		config.Auth.Type = authType
	}
	if apiKey := os.Getenv("AUTH_API_KEY"); apiKey != "" {
		config.Auth.APIKey = apiKey
	}
	if userStore := os.Getenv("AUTH_USER_STORE"); userStore != "" {
		config.Auth.UserStore = userStore
	}
	if storeFile := os.Getenv("AUTH_STORE_FILE"); storeFile != "" {
		config.Auth.StoreFile = storeFile
	}

	// Rate limit configuration
	if enabledStr := os.Getenv("AUTH_RATE_LIMIT_ENABLED"); enabledStr != "" {
		if enabled, err := strconv.ParseBool(enabledStr); err == nil {
			config.Auth.RateLimit.Enabled = enabled
		}
	}
	if maxAttemptsStr := os.Getenv("AUTH_RATE_LIMIT_MAX_ATTEMPTS"); maxAttemptsStr != "" {
		if maxAttempts, err := strconv.Atoi(maxAttemptsStr); err == nil {
			config.Auth.RateLimit.MaxAttempts = maxAttempts
		}
	}
	if windowStr := os.Getenv("AUTH_RATE_LIMIT_WINDOW"); windowStr != "" {
		if window, err := strconv.Atoi(windowStr); err == nil {
			config.Auth.RateLimit.Window = window
		}
	}

	// Logging configuration
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		config.Logging.Level = level
	}
	if format := os.Getenv("LOG_FORMAT"); format != "" {
		config.Logging.Format = types.LogFormat(format)
	}
	if filePath := os.Getenv("LOG_FILE_PATH"); filePath != "" {
		config.Logging.FilePath = filePath
	}
	if maxAgeStr := os.Getenv("LOG_MAX_AGE"); maxAgeStr != "" {
		if maxAge, err := strconv.Atoi(maxAgeStr); err == nil {
			config.Logging.MaxAge = maxAge
		}
	}
	if rotateTimeStr := os.Getenv("LOG_ROTATE_TIME"); rotateTimeStr != "" {
		if rotateTime, err := strconv.Atoi(rotateTimeStr); err == nil {
			config.Logging.RotateTime = rotateTime
		}
	}

	// MAAS configuration
	apiUrl := os.Getenv("MAAS_API_URL")
	apiKey := os.Getenv("MAAS_API_KEY")
	if apiUrl != "" && apiKey != "" {
		// Update the default instance if it exists
		if _, ok := config.MAASInstances["default"]; ok {
			instance := config.MAASInstances["default"]
			if apiUrl != "" {
				instance.APIURL = apiUrl
			}
			if apiKey != "" {
				instance.APIKey = apiKey
			}
			config.MAASInstances["default"] = instance
		} else if len(config.MAASInstances) == 0 {
			// Create a new default instance if none exists
			config.MAASInstances["default"] = types.MAASInstanceConfig{
				APIURL: apiUrl,
				APIKey: apiKey,
			}
		}
	}
}

// StartConfigWatcher starts a watcher for the configuration file
func StartConfigWatcher() error {
	// Create a new watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("failed to create watcher: %w", err)
	}

	// Start watching in a goroutine
	go func() {
		defer watcher.Close()

		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Op&fsnotify.Write == fsnotify.Write {
					fmt.Println("Configuration file modified, reloading...")
					if err := ReloadConfig(); err != nil {
						fmt.Printf("Failed to reload configuration: %v\n", err)
					}
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				fmt.Printf("Watcher error: %v\n", err)
			}
		}
	}()

	// Add the configuration file to the watcher
	configPath := DefaultConfigPath
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		configPath = FallbackConfigPath
	}

	// Ensure the directory exists
	configDir := filepath.Dir(configPath)
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		if err := os.MkdirAll(configDir, 0755); err != nil {
			return fmt.Errorf("failed to create configuration directory: %w", err)
		}
	}

	// Watch the configuration file
	if err := watcher.Add(configPath); err != nil {
		return fmt.Errorf("failed to watch configuration file: %w", err)
	}

	fmt.Printf("Watching configuration file: %s\n", configPath)
	return nil
}

// ReloadConfig reloads the configuration from the file
func ReloadConfig() error {
	instanceLock.Lock()
	defer instanceLock.Unlock()

	oldConfig := instance

	// Load the new configuration
	newConfig, err := loadFromMCPJson()
	if err != nil {
		// If .roo/mcp.json doesn't exist or has errors, fall back to config.yaml
		newConfig, err = loadFromConfigYaml()
		if err != nil {
			return fmt.Errorf("failed to reload configuration: %w", err)
		}
	}

	// Apply environment variable overrides
	applyEnvironmentOverrides(newConfig)

	// Validate the configuration
	if err := newConfig.Validate(); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	// Set the last updated time
	newConfig.LastUpdated = time.Now()

	// Create a change event
	event := types.ConfigChangeEvent{
		OldConfig: oldConfig,
		NewConfig: newConfig,
		Timestamp: time.Now(),
	}

	// Send the event to the channel
	select {
	case configChan <- event:
		// Event sent successfully
	default:
		// Channel is full, log a warning
		fmt.Println("Warning: config change event channel is full, event dropped")
	}

	// Set the new instance
	instance = newConfig

	fmt.Println("Configuration reloaded successfully")
	return nil
}

// GetConfigChangeChannel returns the channel for configuration change events
func GetConfigChangeChannel() <-chan types.ConfigChangeEvent {
	return configChan
}

// CreateDefaultConfig creates a default configuration file if it doesn't exist
func CreateDefaultConfig() error {
	configPath := DefaultConfigPath

	// Check if the file already exists
	if _, err := os.Stat(configPath); err == nil {
		return nil // File already exists
	}

	// Ensure the directory exists
	configDir := filepath.Dir(configPath)
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		if err := os.MkdirAll(configDir, 0755); err != nil {
			return fmt.Errorf("failed to create configuration directory: %w", err)
		}
	}

	// Create a default configuration
	defaultConfig := types.MCPConfig{
		MCPServers: map[string]types.MCPServerConfig{
			"maas-server": {
				Command:  "./build.sh",
				Args:     []string{"run-mcp"},
				CWD:      ".",
				Protocol: "http",
				Host:     "localhost",
				Port:     8081,
				Endpoint: "/mcp",
				AlwaysAllow: []string{
					"maas_list_machines",
					"maas_get_machine_details",
					"maas_power_on_machine",
					"maas_power_off_machine",
				},
				Env: map[string]string{
					"MAAS_API_URL": "http://your-maas-server:5240/MAAS",
					"MAAS_API_KEY": "consumer:token:secret",
					"LOG_LEVEL":    "info",
					"LOG_FORMAT":   "json",
				},
			},
		},
	}

	// Marshal to JSON with indentation
	data, err := json.MarshalIndent(defaultConfig, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal default configuration: %w", err)
	}

	// Write to file
	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write default configuration: %w", err)
	}

	fmt.Printf("Created default configuration file: %s\n", configPath)
	return nil
}

// GetCredential returns a credential from the configuration, prioritizing environment variables
func GetCredential(name string) string {
	// Check environment variables first
	if value := os.Getenv(name); value != "" {
		return value
	}

	// Check configuration
	cfg := GetConfig()
	switch name {
	case "MAAS_API_URL":
		maasInstance := cfg.GetDefaultMAASInstance()
		return maasInstance.APIURL
	case "MAAS_API_KEY":
		maasInstance := cfg.GetDefaultMAASInstance()
		return maasInstance.APIKey
	case "AUTH_API_KEY":
		return cfg.Auth.APIKey
	}

	return ""
}
