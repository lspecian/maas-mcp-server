package maas

import (
	"fmt"
	"time"
)

// ClientConfig represents the configuration for a MAAS client
type ClientConfig struct {
	// APIURL is the URL of the MAAS API
	APIURL string `json:"api_url"`

	// APIKey is the API key for authentication with MAAS
	// Format: <consumer-key>:<token-key>:<token-secret>
	APIKey string `json:"api_key"`

	// APIVersion is the version of the MAAS API to use
	// If empty, defaults to "2.0"
	APIVersion string `json:"api_version"`

	// InstanceName is a unique identifier for this MAAS instance
	InstanceName string `json:"instance_name"`

	// MaxRetries is the maximum number of retry attempts for API calls
	MaxRetries int `json:"max_retries"`

	// RetryDelay is the initial delay between retry attempts
	RetryDelay time.Duration `json:"retry_delay"`

	// RetryBackoffFactor is the multiplier for exponential backoff
	RetryBackoffFactor float64 `json:"retry_backoff_factor"`

	// RequestTimeout is the timeout for API requests
	RequestTimeout time.Duration `json:"request_timeout"`

	// UserAgent is the user agent string to use for API requests
	UserAgent string `json:"user_agent"`
}

// Validate checks if the ClientConfig has all required fields
func (c *ClientConfig) Validate() error {
	if c.APIURL == "" {
		return fmt.Errorf("MAAS API URL is required")
	}

	if c.APIKey == "" {
		return fmt.Errorf("MAAS API key is required")
	}

	// Set default values if not provided
	if c.APIVersion == "" {
		c.APIVersion = "2.0"
	}

	if c.InstanceName == "" {
		c.InstanceName = "default"
	}

	if c.MaxRetries <= 0 {
		c.MaxRetries = 3
	}

	if c.RetryDelay <= 0 {
		c.RetryDelay = 1 * time.Second
	}

	if c.RetryBackoffFactor <= 0 {
		c.RetryBackoffFactor = 2.0
	}

	if c.RequestTimeout <= 0 {
		c.RequestTimeout = 30 * time.Second
	}

	if c.UserAgent == "" {
		c.UserAgent = "MAAS-MCP-Server/1.0"
	}

	return nil
}

// NewDefaultConfig creates a new ClientConfig with default values
func NewDefaultConfig(apiURL, apiKey string) *ClientConfig {
	return &ClientConfig{
		APIURL:             apiURL,
		APIKey:             apiKey,
		APIVersion:         "2.0",
		InstanceName:       "default",
		MaxRetries:         3,
		RetryDelay:         1 * time.Second,
		RetryBackoffFactor: 2.0,
		RequestTimeout:     30 * time.Second,
		UserAgent:          "MAAS-MCP-Server/1.0",
	}
}

// RegistryConfig represents the configuration for the MAAS client registry
type RegistryConfig struct {
	// DefaultInstance is the name of the default MAAS instance
	DefaultInstance string `json:"default_instance"`

	// Instances is a map of instance names to client configurations
	Instances map[string]*ClientConfig `json:"instances"`
}

// Validate checks if the RegistryConfig has all required fields
func (c *RegistryConfig) Validate() error {
	if len(c.Instances) == 0 {
		return fmt.Errorf("at least one MAAS instance is required")
	}

	// Validate each instance configuration
	for name, config := range c.Instances {
		if err := config.Validate(); err != nil {
			return fmt.Errorf("invalid configuration for MAAS instance '%s': %w", name, err)
		}
	}

	// If DefaultInstance is not set, use the first instance
	if c.DefaultInstance == "" {
		for name := range c.Instances {
			c.DefaultInstance = name
			break
		}
	}

	// Check if the default instance exists
	if _, ok := c.Instances[c.DefaultInstance]; !ok {
		return fmt.Errorf("default MAAS instance '%s' not found in configuration", c.DefaultInstance)
	}

	return nil
}

// NewRegistryConfig creates a new RegistryConfig with a single instance
func NewRegistryConfig(instanceName string, config *ClientConfig) *RegistryConfig {
	return &RegistryConfig{
		DefaultInstance: instanceName,
		Instances: map[string]*ClientConfig{
			instanceName: config,
		},
	}
}

// GetDefaultInstance returns the configuration for the default MAAS instance
func (c *RegistryConfig) GetDefaultInstance() *ClientConfig {
	if config, ok := c.Instances[c.DefaultInstance]; ok {
		return config
	}

	// If no default instance is found, return the first instance
	for _, config := range c.Instances {
		return config
	}

	// Return nil if no instances are found
	return nil
}

// GetInstance returns the configuration for a specific MAAS instance
func (c *RegistryConfig) GetInstance(name string) (*ClientConfig, bool) {
	config, ok := c.Instances[name]
	return config, ok
}

// AddInstance adds a new MAAS instance to the registry
func (c *RegistryConfig) AddInstance(name string, config *ClientConfig) error {
	if _, ok := c.Instances[name]; ok {
		return fmt.Errorf("MAAS instance '%s' already exists in registry", name)
	}

	if err := config.Validate(); err != nil {
		return fmt.Errorf("invalid configuration for MAAS instance '%s': %w", name, err)
	}

	// Initialize the instances map if it's nil
	if c.Instances == nil {
		c.Instances = make(map[string]*ClientConfig)
	}

	c.Instances[name] = config

	// If this is the first instance, set it as the default
	if len(c.Instances) == 1 {
		c.DefaultInstance = name
	}

	return nil
}

// RemoveInstance removes a MAAS instance from the registry
func (c *RegistryConfig) RemoveInstance(name string) error {
	if _, ok := c.Instances[name]; !ok {
		return fmt.Errorf("MAAS instance '%s' not found in registry", name)
	}

	// Cannot remove the default instance
	if name == c.DefaultInstance {
		return fmt.Errorf("cannot remove the default MAAS instance '%s'", name)
	}

	delete(c.Instances, name)

	return nil
}

// SetDefaultInstance sets the default MAAS instance
func (c *RegistryConfig) SetDefaultInstance(name string) error {
	if _, ok := c.Instances[name]; !ok {
		return fmt.Errorf("MAAS instance '%s' not found in registry", name)
	}

	c.DefaultInstance = name

	return nil
}
