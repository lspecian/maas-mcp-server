# Configuration System

This package provides a centralized configuration system for the MAAS MCP server. It reads configuration from `.roo/mcp.json` and falls back to `config/config.yaml` if needed.

## Features

- **Centralized Configuration**: All configuration is read from `.roo/mcp.json`, providing a single source of truth.
- **Environment Variable Overrides**: Environment variables can override configuration values.
- **Dynamic Configuration Updates**: The configuration can be reloaded without restarting the server.
- **Secure Credential Handling**: Sensitive information like API keys are handled securely.
- **Configuration Validation**: Configuration values are validated to ensure they meet requirements.
- **Default Configuration**: A default configuration is provided if no configuration file exists.

## Configuration Sources

The configuration system reads from the following sources, in order of precedence:

1. Environment variables
2. `.roo/mcp.json`
3. `config/config.yaml` (fallback)

## Configuration Structure

The configuration is structured as follows:

```json
{
  "mcpServers": {
    "maas-server": {
      "command": "./build.sh",
      "args": ["run-mcp"],
      "cwd": ".",
      "protocol": "http",
      "host": "localhost",
      "port": 8081,
      "endpoint": "/mcp",
      "alwaysAllow": [
        "maas_list_machines",
        "maas_get_machine_details",
        "maas_power_on_machine",
        "maas_power_off_machine"
      ],
      "env": {
        "MAAS_API_URL": "http://your-maas-server:5240/MAAS",
        "MAAS_API_KEY": "consumer:token:secret",
        "LOG_LEVEL": "info",
        "SERVER_HOST": "localhost",
        "SERVER_PORT": "8082",
        "AUTH_ENABLED": "false"
      },
      "maasConfig": {
        "apiUrl": "http://your-maas-server:5240/MAAS",
        "apiKey": "consumer:token:secret"
      }
    }
  }
}
```

## Environment Variables

The following environment variables can be used to override configuration values:

- `MAAS_API_URL`: The URL of the MAAS API.
- `MAAS_API_KEY`: The API key for the MAAS API.
- `SERVER_HOST`: The host to bind the server to.
- `SERVER_PORT`: The port to bind the server to.
- `AUTH_ENABLED`: Whether authentication is enabled.
- `AUTH_TYPE`: The type of authentication to use.
- `AUTH_API_KEY`: The API key for authentication.
- `AUTH_USER_STORE`: The type of user store to use.
- `AUTH_STORE_FILE`: The path to the user store file.
- `AUTH_RATE_LIMIT_ENABLED`: Whether rate limiting is enabled.
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS`: The maximum number of authentication attempts.
- `AUTH_RATE_LIMIT_WINDOW`: The time window for rate limiting.
- `LOG_LEVEL`: The logging level.

## Usage

To use the configuration system, import the package and call `LoadConfig()`:

```go
import "github.com/lspecian/maas-mcp-server/internal/config"

func main() {
    cfg, err := config.LoadConfig()
    if err != nil {
        // Handle error
    }

    // Use configuration
    fmt.Println(cfg.Server.Host)
    fmt.Println(cfg.Server.Port)
}
```

To get the current configuration without loading it again, use `GetConfig()`:

```go
cfg := config.GetConfig()
```

To reload the configuration, use `ReloadConfig()`:

```go
err := config.ReloadConfig()
if err != nil {
    // Handle error
}
```

To listen for configuration changes, use `GetConfigChangeChannel()`:

```go
configChan := config.GetConfigChangeChannel()
for event := range configChan {
    // Handle configuration change
    fmt.Println("Configuration changed:", event.Timestamp)
}
```

## Default Configuration

If no configuration file exists, a default configuration is created. You can also create a default configuration manually using `CreateDefaultConfig()`:

```go
err := config.CreateDefaultConfig()
if err != nil {
    // Handle error
}
```

## Secure Credential Handling

Sensitive information like API keys are handled securely. Environment variables take precedence over configuration files for sensitive information. Use `GetCredential()` to get a credential:

```go
apiKey := config.GetCredential("MAAS_API_KEY")