# MAAS MCP Server

A Model Context Protocol (MCP) server for interacting with MAAS (Metal as a Service) through a standardized JSON-RPC 2.0 interface.

[![Go](https://github.com/lspecian/maas-mcp-server/actions/workflows/go.yml/badge.svg)](https://github.com/lspecian/maas-mcp-server/actions/workflows/go.yml)
[![Go Report Card](https://goreportcard.com/badge/github.com/lspecian/maas-mcp-server)](https://goreportcard.com/report/github.com/lspecian/maas-mcp-server)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Introduction

The MAAS MCP Server implements the [Model Context Protocol](https://modelcontextprotocol.io/) specification to enable AI assistants to interact with MAAS (Metal as a Service) infrastructure. It provides a standardized interface for machine management, network configuration, storage management, and more through a JSON-RPC 2.0 API.

This server can operate in two transport modes:
1. **HTTP/HTTPS** - For web-based interactions and SSE (Server-Sent Events) streaming
2. **stdin/stdout** - For direct integration with AI assistants and CLI tools

## Installation

### Prerequisites

- Go 1.22 or later
- MAAS server with API access
- MAAS API key in the format "consumer:token:secret"

### With script from release

curl -sSL https://raw.githubusercontent.com/lspecian/maas-mcp-server/main/scripts/install.sh | bash


### From Source

1. Clone the repository:
   ```bash
   git clone https://github.com/lspecian/maas-mcp-server.git
   cd maas-mcp-server
   ```

2. Build the server:
   ```bash
   ./build.sh build
   ```

3. Configure the server:
   ```bash
   cp config/config.yaml.example config/config.yaml
   cp .env.example .env
   ```

4. Edit `config/config.yaml` and update:
   - MAAS API URL
   - MAAS API key
   - Server host/port
   - Logging configuration

### Environment Variables

The server requires the following environment variables:

- `MAAS_API_URL` - The URL of your MAAS API endpoint
- `MAAS_API_KEY` - Your MAAS API key in the format "consumer:token:secret"
- `LOG_LEVEL` - (Optional) The logging level (default: "info")
- `LOG_FORMAT` - (Optional) The logging format (default: "json")
- `AUTH_ENABLED` - (Optional) Whether authentication is enabled (default: "false")

These can be set in the `.env` file or directly in your environment.

### Roo Integration with .roo/mcp.json

For integration with Roo, you can configure the server using the `.roo/mcp.json` file. Here's an example configuration:

```json
{
  "mcpServers": {
    "maas-server": {
      "command": "./maas-mcp-server",
      "args": [
        "stdio"
      ],
      "protocol": "stdio",
      "jsonrpc": "2.0",
      "readyMessage": "MCP server ready",
      "env": {
        "MAAS_API_URL": "http://your-maas-server:5240/MAAS",
        "MAAS_API_KEY": "consumer:token:secret",
        "LOG_LEVEL": "debug",
        "LOG_FORMAT": "json",
        "AUTH_ENABLED": "false"
      },
      "disabled": false,
      "alwaysAllow": [
        "maas_list_machines",
        "maas_get_machine_details",
        "maas_power_on_machine",
        "maas_power_off_machine",
        "list_machines"
      ]
    }
  }
}
```

The environment variables in the `env` section are used to configure the server. The server will read these variables and use them to configure itself.

### Using Docker

1. Build the Docker image:
   ```bash
   ./build-docker.sh
   ```

2. Run the container:
   ```bash
   docker run -p 8081:8081 -v $(pwd)/config:/app/config maas-mcp-server
   ```

## Usage

### Starting the Server

#### HTTP Mode

```bash
./build.sh run
```

The server will be available at http://localhost:8081/mcp.

#### stdin/stdout Mode

```bash
./build.sh run-mcp-stdio
```

Or directly:

```bash
./maas-mcp-server stdio
```

In this mode, the server reads JSON-RPC requests from stdin and writes responses to stdout, making it suitable for integration with AI assistants.

### Version Information

To display the version information:

```bash
./maas-mcp-server --version
```

### JSON-RPC 2.0 Message Format

The server communicates using the JSON-RPC 2.0 protocol. Here's the basic message format:

#### Request

```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "params": {
    "param1": "value1",
    "param2": "value2"
  },
  "id": "request-id"
}
```

#### Response (Success)

```json
{
  "jsonrpc": "2.0",
  "result": {
    "key1": "value1",
    "key2": "value2"
  },
  "id": "request-id"
}
```

#### Response (Error)

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Error message",
    "data": {}
  },
  "id": "request-id"
}
```

### Discovery

To discover the capabilities of the MCP server, send a discovery request:

```json
{
  "jsonrpc": "2.0",
  "method": "discover",
  "params": {},
  "id": "1"
}
```

The server will respond with information about available tools and resources:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "name": "maas_list_machines",
      "description": "List all machines managed by MAAS with filtering and pagination",
      "parameters": {
        "type": "object",
        "properties": {
          "hostname": { "type": "string" },
          "zone": { "type": "string" },
          "pool": { "type": "string" },
          "status": { "type": "string" },
          "power_state": { "type": "string" },
          "system_id": { "type": "string" },
          "architecture": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } },
          "limit": { "type": "integer" },
    "page": { "type": "integer" } // Example parameter, actual parameters are dynamically generated
        }
      }
    }
    // ... (list of all dynamically generated tools)
  ],
  "id": "1"
}
```

The list of tools is dynamically generated based on the MAAS API documentation. This provides a comprehensive set of tools for interacting with various MAAS functionalities. For details on how these tools are generated and how to update them, please refer to the [MAAS API Tool Generation documentation](cmd/gen-tools/README.md).

## Example Workflows

### Listing Available Machines

```go
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
)

func main() {
	// Start the MCP server in stdio mode
	cmd := exec.Command("./build.sh", "run-mcp-stdio")
	
	stdin, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	
	cmd.Start()
	
	// Wait for server to start
	reader := bufio.NewReader(stdout)
	for {
		line, _ := reader.ReadString('\n')
		if line == "MCP server ready\n" {
			break
		}
	}
	
	// Send list machines request
	request := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "maas_list_machines",
		"params":  map[string]interface{}{},
		"id":      "1",
	}
	
	requestJSON, _ := json.Marshal(request)
	io.WriteString(stdin, string(requestJSON)+"\n")
	
	// Read response
	responseStr, _ := reader.ReadString('\n')
	
	var response map[string]interface{}
	json.Unmarshal([]byte(responseStr), &response)
	
	// Pretty print the response
	prettyJSON, _ := json.MarshalIndent(response, "", "  ")
	fmt.Println(string(prettyJSON))
	
	cmd.Process.Kill()
}
```

### Getting Machine Details and Powering On

```go
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
)

func main() {
	// Start the MCP server in stdio mode
	cmd := exec.Command("./build.sh", "run-mcp-stdio")
	
	stdin, _ := cmd.StdinPipe()
	stdout, _ := cmd.StdoutPipe()
	
	cmd.Start()
	
	// Wait for server to start
	reader := bufio.NewReader(stdout)
	for {
		line, _ := reader.ReadString('\n')
		if line == "MCP server ready\n" {
			break
		}
	}
	
	// Get machine details
	detailsRequest := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "maas_get_machine_details",
		"params":  map[string]string{"system_id": "abc123"},
		"id":      "1",
	}
	
	requestJSON, _ := json.Marshal(detailsRequest)
	io.WriteString(stdin, string(requestJSON)+"\n")
	
	// Read response
	responseStr, _ := reader.ReadString('\n')
	
	var response map[string]interface{}
	json.Unmarshal([]byte(responseStr), &response)
	
	// Check if machine is powered off
	result := response["result"].(map[string]interface{})
	if result["power_state"] == "off" {
		// Power on the machine
		powerRequest := map[string]interface{}{
			"jsonrpc": "2.0",
			"method":  "maas_power_on_machine",
			"params":  map[string]string{"system_id": "abc123"},
			"id":      "2",
		}
		
		requestJSON, _ = json.Marshal(powerRequest)
		io.WriteString(stdin, string(requestJSON)+"\n")
		
		// Read power on response
		powerResponseStr, _ := reader.ReadString('\n')
		fmt.Println(powerResponseStr)
	}
	
	cmd.Process.Kill()
}
```

## Building and Testing

### Building from Source

```bash
# Build the server
./build.sh build

# Build the clean architecture version
./build.sh build-mcp
```

### Running Tests

```bash
# Run all tests
./build.sh test

# Run specific tests
go test -v ./internal/service/...
```

### Integration Tests

```bash
# Run the test client
go run test/go/test-stdio-client.go
```

## Releases

The project uses GitHub Actions to automatically build and publish binaries for multiple platforms when a new tag is pushed to the repository.

### Automatic Release Process

1. Update the version in `internal/version/version.go`
2. Update the `CHANGELOG.md` with the changes in the new version
3. Commit the changes
4. Create and push a new tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
5. The GitHub Actions workflow will automatically:
   - Build binaries for Linux (amd64, arm64), macOS (amd64, arm64), and Windows (amd64)
   - Create a GitHub Release with the tag name
   - Upload the binaries as assets
   - Generate SHA256 checksums for all binaries
   - Add release notes based on the CHANGELOG.md

### Manual Release Process

You can also trigger a manual release using the GitHub Actions workflow:

1. Go to the GitHub repository
2. Click on the "Actions" tab
3. Select the "Manual Release" workflow
4. Click on "Run workflow"
5. Enter the version number (e.g., "1.1.0")
6. Select whether this is a pre-release
7. Click "Run workflow"

The workflow will:
- Build binaries for all supported platforms
- Create a GitHub Release with the specified version
- Upload the binaries as assets
- Generate SHA256 checksums for all binaries
- Add release notes from the CHANGELOG.md

### Binary Naming Convention

Binaries follow a consistent naming pattern:
- `maas-mcp-server-{version}-{os}-{arch}[.exe]`

For example:
- `maas-mcp-server-1.0.0-linux-amd64`
- `maas-mcp-server-1.0.0-linux-arm64`
- `maas-mcp-server-1.0.0-darwin-amd64`
- `maas-mcp-server-1.0.0-darwin-arm64`
- `maas-mcp-server-1.0.0-windows-amd64.exe`

### Building for Different Platforms

You can build the server for different platforms using the Go cross-compilation feature:

```bash
# Build for Linux AMD64
GOOS=linux GOARCH=amd64 go build -o maas-mcp-server-linux-amd64 pkg/mcp/cmd/main.go

# Build for Linux ARM64
GOOS=linux GOARCH=arm64 go build -o maas-mcp-server-linux-arm64 pkg/mcp/cmd/main.go

# Build for macOS AMD64
GOOS=darwin GOARCH=amd64 go build -o maas-mcp-server-darwin-amd64 pkg/mcp/cmd/main.go

# Build for macOS ARM64 (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o maas-mcp-server-darwin-arm64 pkg/mcp/cmd/main.go

# Build for Windows AMD64
GOOS=windows GOARCH=amd64 go build -o maas-mcp-server-windows-amd64.exe pkg/mcp/cmd/main.go
```

## API Reference

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON was received |
| -32600 | Invalid request | The JSON sent is not a valid Request object |
| -32601 | Method not found | The method does not exist / is not available |
| -32602 | Invalid params | Invalid method parameter(s) |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 | Authentication failed | Failed to authenticate with MAAS |
| -32001 | Rate limit exceeded | Too many requests |
| -32002 | Version not supported | The requested MCP version is not supported |
| -32003 | Resource not found | The requested resource was not found |
| -32004 | Operation failed | The requested operation failed |

### Available Methods

The available methods (tools) are discovered via the `discover` JSON-RPC method. The server dynamically registers a comprehensive set of tools based on the parsed MAAS API. Refer to the "Discovery" section above for an example of how to retrieve the list of available tools and their schemas.

## Tool Generation

The MAAS tools provided by this server are dynamically generated from the MAAS API documentation. This ensures that the server can adapt to a wide range of MAAS API functionalities. For detailed information on how these tools are parsed, generated, and how to update them if the MAAS API changes, please see the [MAAS API Tool Generation documentation in `cmd/gen-tools/README.md`](cmd/gen-tools/README.md).

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.