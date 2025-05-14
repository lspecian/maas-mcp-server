package models

import (
	"fmt"
	"strings"
	"time"
)

// MCPConfig represents the configuration structure in .roo/mcp.json
type MCPConfig struct {
	MCPServers map[string]MCPServerConfig `json:"mcpServers"`
}

// MCPServerConfig represents the configuration for a single MCP server
type MCPServerConfig struct {
	Command     string            `json:"command"`
	Args        []string          `json:"args"`
	CWD         string            `json:"cwd,omitempty"`
	Protocol    string            `json:"protocol,omitempty"`
	Host        string            `json:"host,omitempty"`
	Port        int               `json:"port,omitempty"`
	Endpoint    string            `json:"endpoint,omitempty"`
	Env         map[string]string `json:"env,omitempty"`
	MaasConfig  *MaasServerConfig `json:"maasConfig,omitempty"`
	AlwaysAllow []string          `json:"alwaysAllow,omitempty"`
}

// MaasServerConfig represents the MAAS configuration within an MCP server config
type MaasServerConfig struct {
	APIURL string `json:"apiUrl"`
	APIKey string `json:"apiKey"`
}

// Validate checks if the MCPServerConfig has all required fields
func (c *MCPServerConfig) Validate() error {
	if c.Command == "" {
		return fmt.Errorf("command is required")
	}

	// If protocol, host, port, or endpoint are specified, all must be specified
	if c.Protocol != "" || c.Host != "" || c.Port != 0 || c.Endpoint != "" {
		if c.Protocol == "" {
			return fmt.Errorf("protocol is required when specifying server details")
		}
		if c.Host == "" {
			return fmt.Errorf("host is required when specifying server details")
		}
		if c.Port == 0 {
			return fmt.Errorf("port is required when specifying server details")
		}
		if c.Endpoint == "" {
			return fmt.Errorf("endpoint is required when specifying server details")
		}
	}

	// Validate MAAS config if present
	if c.MaasConfig != nil {
		if err := c.MaasConfig.Validate(); err != nil {
			return err
		}
	}

	return nil
}

// Validate checks if the MaasServerConfig has all required fields
func (c *MaasServerConfig) Validate() error {
	if c.APIURL == "" {
		return fmt.Errorf("apiUrl is required")
	}
	if c.APIKey == "" {
		return fmt.Errorf("apiKey is required")
	}
	return nil
}

// ServerConfig represents the server configuration
type ServerConfig struct {
	Host string `json:"host" mapstructure:"host" validate:"required"`
	Port int    `json:"port" mapstructure:"port" validate:"required,min=1,max=65535"`
}

// AuthConfig represents the authentication configuration
type AuthConfig struct {
	Enabled     bool             `json:"enabled" mapstructure:"enabled"`
	Type        string           `json:"type" mapstructure:"type" validate:"required_if=Enabled true,oneof=apikey basic oauth jwt"`
	APIKey      string           `json:"apiKey" mapstructure:"api_key" validate:"required_if=Type apikey"`
	UserStore   string           `json:"userStore" mapstructure:"user_store" validate:"required,oneof=memory file"`
	StoreFile   string           `json:"storeFile" mapstructure:"store_file" validate:"required_if=UserStore file"`
	RateLimit   RateLimitConfig  `json:"rateLimit" mapstructure:"rate_limit"`
	OAuth       OAuthConfig      `json:"oauth" mapstructure:"oauth"`
	JWT         JWTConfig        `json:"jwt" mapstructure:"jwt"`
	TokenConfig TokenStoreConfig `json:"tokenStore" mapstructure:"token_store"`
	IPWhitelist []string         `json:"ipWhitelist" mapstructure:"ip_whitelist"`
}

// OAuthConfig represents the OAuth authentication configuration
type OAuthConfig struct {
	Providers map[string]OAuthProviderConfig `json:"providers" mapstructure:"providers"`
}

// OAuthProviderConfig represents the configuration for an OAuth provider
type OAuthProviderConfig struct {
	ClientID     string   `json:"clientId" mapstructure:"client_id" validate:"required"`
	ClientSecret string   `json:"clientSecret" mapstructure:"client_secret" validate:"required"`
	AuthURL      string   `json:"authUrl" mapstructure:"auth_url" validate:"required,url"`
	TokenURL     string   `json:"tokenUrl" mapstructure:"token_url" validate:"required,url"`
	RedirectURL  string   `json:"redirectUrl" mapstructure:"redirect_url" validate:"required,url"`
	Scopes       []string `json:"scopes" mapstructure:"scopes"`
}

// JWTConfig represents the JWT authentication configuration
type JWTConfig struct {
	Secret            string   `json:"secret" mapstructure:"secret"`
	PublicKeyPath     string   `json:"publicKeyPath" mapstructure:"public_key_path"`
	PrivateKeyPath    string   `json:"privateKeyPath" mapstructure:"private_key_path"`
	Algorithm         string   `json:"algorithm" mapstructure:"algorithm" validate:"required,oneof=HS256 HS384 HS512 RS256 RS384 RS512 ES256 ES384 ES512"`
	Issuer            string   `json:"issuer" mapstructure:"issuer"`
	Audience          []string `json:"audience" mapstructure:"audience"`
	ExpirationMinutes int      `json:"expirationMinutes" mapstructure:"expiration_minutes" validate:"min=1"`
}

// TokenStoreConfig represents the configuration for token storage
type TokenStoreConfig struct {
	Type      string `json:"type" mapstructure:"type" validate:"required,oneof=memory file redis"`
	FilePath  string `json:"filePath" mapstructure:"file_path" validate:"required_if=Type file"`
	RedisURL  string `json:"redisUrl" mapstructure:"redis_url" validate:"required_if=Type redis,url"`
	RedisPass string `json:"redisPass" mapstructure:"redis_pass"`
}

// RateLimitConfig represents the rate limiting configuration
type RateLimitConfig struct {
	Enabled         bool                    `json:"enabled" mapstructure:"enabled"`
	Algorithm       string                  `json:"algorithm" mapstructure:"algorithm" validate:"required_if=Enabled true,oneof=counter token_bucket leaky_bucket"`
	MaxAttempts     int                     `json:"maxAttempts" mapstructure:"max_attempts" validate:"required_if=Enabled true,min=1"`
	Window          int                     `json:"window" mapstructure:"window" validate:"required_if=Enabled true,min=1"` // Time window in seconds
	BucketSize      int                     `json:"bucketSize" mapstructure:"bucket_size" validate:"required_if=Algorithm token_bucket,min=1"`
	RefillRate      float64                 `json:"refillRate" mapstructure:"refill_rate" validate:"required_if=Algorithm token_bucket,min=0.1"`
	IPBasedEnabled  bool                    `json:"ipBasedEnabled" mapstructure:"ip_based_enabled"`
	EndpointLimits  map[string]EndpointRate `json:"endpointLimits" mapstructure:"endpoint_limits"`
	GlobalRateLimit int                     `json:"globalRateLimit" mapstructure:"global_rate_limit" validate:"min=0"` // Requests per minute, 0 means unlimited
}

// EndpointRate represents rate limiting configuration for a specific endpoint
type EndpointRate struct {
	MaxRequests int `json:"maxRequests" mapstructure:"max_requests" validate:"min=1"`
	Window      int `json:"window" mapstructure:"window" validate:"min=1"` // Time window in seconds
}

// LogFormat represents the format of the logs
type LogFormat string

// Log formats
const (
	LogFormatJSON LogFormat = "json"
	LogFormatText LogFormat = "text"
)

// LoggingConfig represents the logging configuration
type LoggingConfig struct {
	Level      string    `json:"level" mapstructure:"level" validate:"required,oneof=debug info warn error"`
	Format     LogFormat `json:"format" mapstructure:"format" validate:"required,oneof=json text"`
	FilePath   string    `json:"filePath" mapstructure:"file_path"`
	MaxAge     int       `json:"maxAge" mapstructure:"max_age" validate:"min=1"`         // Max age in days
	RotateTime int       `json:"rotateTime" mapstructure:"rotate_time" validate:"min=1"` // Rotate time in hours
}

// CORSConfig represents the CORS configuration
type CORSConfig struct {
	AllowOrigins     []string `json:"allowOrigins" mapstructure:"allow_origins"`
	AllowMethods     []string `json:"allowMethods" mapstructure:"allow_methods"`
	AllowHeaders     []string `json:"allowHeaders" mapstructure:"allow_headers"`
	ExposeHeaders    []string `json:"exposeHeaders" mapstructure:"expose_headers"`
	AllowCredentials bool     `json:"allowCredentials" mapstructure:"allow_credentials"`
	MaxAge           int      `json:"maxAge" mapstructure:"max_age" validate:"min=0"` // Max age in seconds
}

// AppConfig represents the complete application configuration
type AppConfig struct {
	Server        ServerConfig                  `json:"server" mapstructure:"server"`
	MAASInstances map[string]MAASInstanceConfig `json:"maasInstances" mapstructure:"maas_instances"`
	Auth          AuthConfig                    `json:"auth" mapstructure:"auth"`
	Logging       LoggingConfig                 `json:"logging" mapstructure:"logging"`
	CORS          CORSConfig                    `json:"cors" mapstructure:"cors"`
	LastUpdated   time.Time                     `json:"lastUpdated"`
}

// MAASInstanceConfig stores the configuration for a single MAAS instance.
type MAASInstanceConfig struct {
	APIURL string `json:"apiUrl" mapstructure:"api_url" validate:"required,url"`
	APIKey string `json:"apiKey" mapstructure:"api_key" validate:"required"`
}

// Validate checks if the AppConfig has all required fields
func (c *AppConfig) Validate() error {
	// Validate server config
	if c.Server.Host == "" {
		return fmt.Errorf("server host is required")
	}
	if c.Server.Port <= 0 || c.Server.Port > 65535 {
		return fmt.Errorf("server port must be between 1 and 65535")
	}

	// Validate MAAS instances
	if len(c.MAASInstances) == 0 {
		return fmt.Errorf("at least one MAAS instance is required")
	}
	for name, instance := range c.MAASInstances {
		if instance.APIURL == "" {
			return fmt.Errorf("MAAS instance '%s' is missing API URL", name)
		}
		if instance.APIKey == "" {
			return fmt.Errorf("MAAS instance '%s' is missing API Key", name)
		}
	}

	// Validate auth config
	if c.Auth.Enabled {
		if c.Auth.Type == "" {
			return fmt.Errorf("auth type is required when auth is enabled")
		}
		if c.Auth.Type == "apikey" && c.Auth.APIKey == "" {
			return fmt.Errorf("auth API key is required when auth type is apikey")
		}
		if c.Auth.UserStore == "file" && c.Auth.StoreFile == "" {
			return fmt.Errorf("store file path is required when user store is file")
		}

		// Validate OAuth config if OAuth is enabled
		if c.Auth.Type == "oauth" {
			if len(c.Auth.OAuth.Providers) == 0 {
				return fmt.Errorf("at least one OAuth provider is required when auth type is oauth")
			}
			for name, provider := range c.Auth.OAuth.Providers {
				if provider.ClientID == "" {
					return fmt.Errorf("OAuth provider '%s' is missing client ID", name)
				}
				if provider.ClientSecret == "" {
					return fmt.Errorf("OAuth provider '%s' is missing client secret", name)
				}
				if provider.AuthURL == "" {
					return fmt.Errorf("OAuth provider '%s' is missing auth URL", name)
				}
				if provider.TokenURL == "" {
					return fmt.Errorf("OAuth provider '%s' is missing token URL", name)
				}
				if provider.RedirectURL == "" {
					return fmt.Errorf("OAuth provider '%s' is missing redirect URL", name)
				}
			}
		}

		// Validate JWT config if JWT is enabled
		if c.Auth.Type == "jwt" {
			if c.Auth.JWT.Algorithm == "" {
				return fmt.Errorf("JWT algorithm is required when auth type is jwt")
			}

			// Validate key configuration based on algorithm
			if strings.HasPrefix(c.Auth.JWT.Algorithm, "HS") {
				if c.Auth.JWT.Secret == "" {
					return fmt.Errorf("JWT secret is required for HMAC algorithms")
				}
			} else {
				// RS or ES algorithms require key files
				if c.Auth.JWT.PublicKeyPath == "" {
					return fmt.Errorf("JWT public key path is required for RSA/ECDSA algorithms")
				}
				if c.Auth.JWT.PrivateKeyPath == "" {
					return fmt.Errorf("JWT private key path is required for RSA/ECDSA algorithms")
				}
			}

			if c.Auth.JWT.ExpirationMinutes <= 0 {
				c.Auth.JWT.ExpirationMinutes = 60 // Default to 1 hour
			}
		}

		// Validate token store config if OAuth or JWT is enabled
		if c.Auth.Type == "oauth" || c.Auth.Type == "jwt" {
			if c.Auth.TokenConfig.Type == "" {
				c.Auth.TokenConfig.Type = "memory" // Default to memory store
			}
			if c.Auth.TokenConfig.Type == "file" && c.Auth.TokenConfig.FilePath == "" {
				return fmt.Errorf("token store file path is required when token store type is file")
			}
			if c.Auth.TokenConfig.Type == "redis" && c.Auth.TokenConfig.RedisURL == "" {
				return fmt.Errorf("Redis URL is required when token store type is redis")
			}
		}

		// Set default values for rate limiting
		if c.Auth.RateLimit.Enabled {
			if c.Auth.RateLimit.Algorithm == "" {
				c.Auth.RateLimit.Algorithm = "counter" // Default to counter algorithm
			}
			if c.Auth.RateLimit.Algorithm == "token_bucket" {
				if c.Auth.RateLimit.BucketSize <= 0 {
					c.Auth.RateLimit.BucketSize = 10 // Default bucket size
				}
				if c.Auth.RateLimit.RefillRate <= 0 {
					c.Auth.RateLimit.RefillRate = 1.0 // Default refill rate (1 token per second)
				}
			}
		}
	}

	// Validate logging config
	if c.Logging.Level == "" {
		return fmt.Errorf("logging level is required")
	}

	// Set default values for logging if not provided
	if c.Logging.Format == "" {
		c.Logging.Format = LogFormatJSON
	}
	if c.Logging.FilePath != "" {
		if c.Logging.MaxAge <= 0 {
			c.Logging.MaxAge = 7 // Default to 7 days
		}
		if c.Logging.RotateTime <= 0 {
			c.Logging.RotateTime = 24 // Default to 24 hours
		}
	}

	// Set default values for CORS if not provided
	if len(c.CORS.AllowOrigins) == 0 {
		c.CORS.AllowOrigins = []string{"*"}
	}
	if len(c.CORS.AllowMethods) == 0 {
		c.CORS.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	}
	if len(c.CORS.AllowHeaders) == 0 {
		c.CORS.AllowHeaders = []string{
			"Origin", "Content-Type", "Accept", "Authorization",
			"X-Requested-With", "X-API-Key", "X-Correlation-ID",
			"X-MCP-Version", "X-MCP-Client-ID",
		}
	}
	if len(c.CORS.ExposeHeaders) == 0 {
		c.CORS.ExposeHeaders = []string{
			"Content-Length", "Content-Type", "X-Correlation-ID",
			"X-MCP-Version", "X-MCP-Operation-ID",
		}
	}
	if c.CORS.MaxAge <= 0 {
		c.CORS.MaxAge = 86400 // Default to 24 hours
	}

	return nil
}

// GetDefaultMAASInstance returns the default MAAS instance configuration.
func (c *AppConfig) GetDefaultMAASInstance() *MAASInstanceConfig {
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
func (c *AppConfig) GetMAASInstance(name string) (*MAASInstanceConfig, bool) {
	instance, ok := c.MAASInstances[name]
	return &instance, ok
}

// ConfigChangeEvent represents a configuration change event
type ConfigChangeEvent struct {
	OldConfig *AppConfig
	NewConfig *AppConfig
	Timestamp time.Time
}
