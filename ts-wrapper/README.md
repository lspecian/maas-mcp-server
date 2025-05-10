# MAAS MCP Server TypeScript Wrapper

This is a TypeScript wrapper for the MAAS MCP server that provides a fully compliant implementation of the Model Context Protocol (MCP) specification.

## Features

- Implements the MCP specification according to the [official documentation](https://modelcontextprotocol.io/specification/2025-03-26)
- Provides Server-Sent Events (SSE) transport for real-time communication
- Proxies requests to the underlying Go MAAS server
- Handles JSON-RPC 2.0 message format
- Supports session management
- Includes proper protocol version and tools format for Roo compatibility

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

## Running

```bash
npm start
```

By default, the server will:
1. Start on port 8081
2. Launch the Go server on port 8082
3. Proxy requests to the Go server

## Environment Variables

- `PORT`: The port to run the TypeScript wrapper on (default: 8081)
- `GO_SERVER_PORT`: The port to run the Go server on (default: 8082)
- `GO_SERVER_URL`: The URL of the Go server (default: http://localhost:8082)
- `GO_BINARY_PATH`: The path to the Go binary (default: ../../mcp-server)

## Usage with Roo

To use this server with Roo, configure the MCP server in `.roo/mcp.json`:

```json
{
  "mcpServers": {
    "maas-server": {
      "url": "http://localhost:8081/mcp",
      "disabled": false,
      "alwaysAllow": ["*"],
      "timeout": 30000,
      "stream": true
    }
  }
}
```

## Architecture

This wrapper acts as a bridge between Roo and the Go MAAS server:

1. The TypeScript wrapper implements the MCP protocol with proper SSE support
2. It receives requests from Roo via the MCP protocol
3. It proxies these requests to the Go server's REST API
4. It formats the responses according to the MCP protocol and sends them back to Roo

## Development

For development, you can use:

```bash
npm run dev
```

This will watch for changes and restart the server automatically.