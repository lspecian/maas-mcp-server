# Enhanced Authentication and Rate Limiting for MCP Server

This package provides advanced authentication and rate limiting capabilities for the MCP server, supporting multiple authentication methods and sophisticated rate limiting algorithms.

## Authentication Methods

### API Key Authentication
- API Key authentication via `X-API-Key` header
- Simple and efficient for machine-to-machine communication

### Basic Authentication
- HTTP Basic authentication via `Authorization` header
- Username and password-based authentication

### OAuth 2.0 Authentication
- OAuth 2.0 token-based authentication
- Support for multiple OAuth providers (Google, GitHub, etc.)
- Token exchange, validation, and refresh capabilities
- User information retrieval

### JWT Authentication
- JSON Web Token (JWT) based authentication
- Support for multiple signing algorithms (HMAC, RSA, ECDSA)
- Configurable token expiration, issuer, and audience validation
- Token generation and validation utilities

## Token Management

- In-memory and file-based token stores
- Token generation, validation, and revocation
- Support for access and refresh tokens
- Automatic cleanup of expired tokens

## Rate Limiting

### Algorithms

#### Counter-Based Rate Limiting
- Simple counter-based rate limiting
- Configurable maximum attempts and time window
- IP-based rate limiting

#### Token Bucket Algorithm
- More sophisticated rate limiting with token bucket algorithm
- Configurable bucket size and refill rate
- Smooth rate limiting with token replenishment

#### Leaky Bucket Algorithm
- Alternative rate limiting algorithm
- Constant outflow rate with configurable bucket size

### Features

- IP-based rate limiting
- Per-endpoint rate limiting
- Per-client rate limiting
- Global rate limiting
- IP whitelisting with CIDR support
- Configurable rate limits

## Configuration

Authentication and rate limiting are configured in the `auth` section of the config file:

```yaml
auth:
  enabled: true                  # Enable/disable authentication
  type: "jwt"                    # Authentication type: "apikey", "basic", "oauth", or "jwt"
  api_key: "YOUR_MCP_API_KEY"    # Default API key (for apikey auth)
  user_store: "file"             # User store type: "memory" or "file"
  store_file: "data/users.json"  # Path to file store (for file store)
  
  # IP whitelist (CIDR notation supported)
  ip_whitelist:
    - "127.0.0.1"
    - "192.168.1.0/24"
  
  # OAuth configuration
  oauth:
    providers:
      google:
        client_id: "YOUR_CLIENT_ID"
        client_secret: "YOUR_CLIENT_SECRET"
        auth_url: "https://accounts.google.com/o/oauth2/auth"
        token_url: "https://oauth2.googleapis.com/token"
        redirect_url: "http://localhost:8080/oauth/callback"
        scopes:
          - "openid"
          - "profile"
          - "email"
      github:
        client_id: "YOUR_CLIENT_ID"
        client_secret: "YOUR_CLIENT_SECRET"
        auth_url: "https://github.com/login/oauth/authorize"
        token_url: "https://github.com/login/oauth/access_token"
        redirect_url: "http://localhost:8080/oauth/callback"
        scopes:
          - "user:email"
  
  # JWT configuration
  jwt:
    secret: "YOUR_JWT_SECRET"    # Secret for HMAC algorithms
    public_key_path: "keys/public.pem"  # Path to public key for RSA/ECDSA algorithms
    private_key_path: "keys/private.pem"  # Path to private key for RSA/ECDSA algorithms
    algorithm: "HS256"           # Signing algorithm: HS256, HS384, HS512, RS256, RS384, RS512, ES256, ES384, ES512
    issuer: "mcp-server"         # Token issuer
    audience:                    # Token audience
      - "mcp-client"
    expiration_minutes: 60       # Token expiration time in minutes
  
  # Token store configuration
  token_store:
    type: "file"                 # Token store type: "memory", "file", or "redis"
    file_path: "data/tokens.json"  # Path to file store (for file store)
    redis_url: "redis://localhost:6379"  # Redis URL (for redis store)
    redis_pass: ""               # Redis password (for redis store)
  
  # Rate limiting configuration
  rate_limit:
    enabled: true                # Enable/disable rate limiting
    algorithm: "token_bucket"    # Rate limiting algorithm: "counter", "token_bucket", or "leaky_bucket"
    max_attempts: 5              # Maximum failed attempts (for counter algorithm)
    window: 300                  # Time window in seconds (5 minutes) (for counter algorithm)
    bucket_size: 10              # Bucket size (for token bucket algorithm)
    refill_rate: 1.0             # Refill rate in tokens per second (for token bucket algorithm)
    ip_based_enabled: true       # Enable/disable IP-based rate limiting
    global_rate_limit: 1000      # Global rate limit in requests per minute (0 means unlimited)
    
    # Per-endpoint rate limits
    endpoint_limits:
      "/api/v1/users":
        max_requests: 10
        window: 60               # Time window in seconds
      "/api/v1/orders":
        max_requests: 5
        window: 60
```

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

### OAuth Authentication

When OAuth authentication is enabled, clients must:

1. Redirect users to the authorization URL:
   ```
   GET /oauth/authorize?provider=google&redirect_uri=http://localhost:8080/oauth/callback
   ```

2. Exchange the authorization code for an access token:
   ```
   POST /oauth/token
   Content-Type: application/x-www-form-urlencoded
   
   code=AUTHORIZATION_CODE&provider=google
   ```

3. Use the access token for subsequent requests:
   ```
   GET /mcp/maas_list_machines HTTP/1.1
   Host: localhost:8080
   Authorization: Bearer ACCESS_TOKEN
   ```

### JWT Authentication

When JWT authentication is enabled, clients must include the `Authorization` header with a valid JWT token:

```
GET /mcp/maas_list_machines HTTP/1.1
Host: localhost:8080
Authorization: Bearer JWT_TOKEN
```

## Rate Limiting

Rate limiting prevents brute force attacks and abuse by limiting the number of requests from a single IP address, client, or to a specific endpoint within a time window. When the limit is exceeded, the client receives a 429 Too Many Requests response.

The rate limiting algorithm can be configured to use:

- **Counter**: Simple counter-based rate limiting
- **Token Bucket**: More sophisticated rate limiting with token replenishment
- **Leaky Bucket**: Alternative rate limiting with constant outflow rate

Rate limits can be applied at different levels:

- **Global**: Limit the total number of requests to the server
- **IP-based**: Limit requests from a single IP address
- **Client-based**: Limit requests from a specific client (identified by `X-Client-ID` header)
- **Endpoint-specific**: Limit requests to specific endpoints

IP whitelisting can be used to exempt certain IP addresses or ranges from rate limiting.

## Logging

Authentication events are logged with the following fields:

- `ip`: Client IP address
- `path`: Request path
- `username`: Authenticated username (for successful authentication)
- `role`: Authenticated user role (for successful authentication)
- `error`: Error message (for failed authentication)

Log levels:
- `INFO`: Successful authentication
- `WARN`: Failed authentication, rate limit exceeded
- `ERROR`: Configuration errors