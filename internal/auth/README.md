# Authentication Middleware for MCP Server

This package provides authentication middleware for the MCP server, supporting API key and Basic authentication methods.

## Features

- API Key authentication via `X-API-Key` header
- HTTP Basic authentication
- User store interface with memory and file-based implementations
- Rate limiting for failed authentication attempts
- Logging of authentication events

## Configuration

Authentication is configured in the `auth` section of the config file:

```yaml
auth:
  enabled: false                # Set to true to enable authentication
  type: "apikey"                # Authentication type: "apikey" or "basic"
  api_key: "YOUR_MCP_API_KEY"   # Default API key (for apikey auth)
  user_store: "memory"          # User store type: "memory" or "file"
  store_file: "data/users.json" # Path to file store (for file store)
  rate_limit:
    enabled: true               # Enable rate limiting
    max_attempts: 5             # Maximum failed attempts
    window: 300                 # Time window in seconds (5 minutes)
```

## Environment Variables

The following environment variables can be used to configure authentication:

- `AUTH_ENABLED`: Enable/disable authentication
- `AUTH_TYPE`: Authentication type ("apikey" or "basic")
- `AUTH_API_KEY`: Default API key
- `AUTH_USER_STORE`: User store type ("memory" or "file")
- `AUTH_STORE_FILE`: Path to file store
- `AUTH_RATE_LIMIT_ENABLED`: Enable/disable rate limiting
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS`: Maximum failed attempts
- `AUTH_RATE_LIMIT_WINDOW`: Time window in seconds

## Usage

### API Key Authentication

When API key authentication is enabled, clients must include the `X-API-Key` header with a valid API key:

```
GET /mcp/maas_list_machines HTTP/1.1
Host: localhost:8080
X-API-Key: YOUR_MCP_API_KEY
```

### Basic Authentication

When Basic authentication is enabled, clients must include the `Authorization` header with valid credentials:

```
GET /mcp/maas_list_machines HTTP/1.1
Host: localhost:8080
Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

The value is a Base64-encoded string of `username:password`.

## User Store

The user store interface provides methods for managing users:

- `GetUserByAPIKey`: Retrieve a user by API key
- `GetUserByCredentials`: Retrieve a user by username and password
- `AddUser`: Add a new user
- `UpdateUser`: Update an existing user
- `DeleteUser`: Remove a user
- `ListUsers`: List all users

Two implementations are provided:

1. `MemoryStore`: In-memory user store (data is lost on restart)
2. `FileStore`: File-based user store (data is persisted to a JSON file)

## Rate Limiting

Rate limiting prevents brute force attacks by limiting the number of failed authentication attempts from a single IP address within a time window. When the limit is exceeded, the client receives a 429 Too Many Requests response.

A successful authentication resets the rate limit for the IP address.

## Logging

Authentication events are logged with the following fields:

- `ip`: Client IP address
- `path`: Request path
- `username`: Authenticated username (for successful authentication)
- `error`: Error message (for failed authentication)

Log levels:
- `INFO`: Successful authentication
- `WARN`: Failed authentication, rate limit exceeded
- `ERROR`: Configuration errors