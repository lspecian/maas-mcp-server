# MCP-MAAS Server

A Model Context Protocol (MCP) server for interacting with MAAS (Metal as a Service).

[![Go](https://github.com/yourusername/maas-mcp-server/actions/workflows/go.yml/badge.svg)](https://github.com/yourusername/maas-mcp-server/actions/workflows/go.yml)
[![Go Report Card](https://goreportcard.com/badge/github.com/lspecian/maas-mcp-server)](https://goreportcard.com/report/github.com/lspecian/maas-mcp-server)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

This project provides an MCP server that allows AI assistants to interact with MAAS (Metal as a Service) through a standardized protocol. It implements the Model Context Protocol specification to enable seamless integration with AI assistants for infrastructure management.

### Key Features

- **Machine Management**: List, allocate, deploy, and release machines
- **Power Management**: Control machine power states (on, off, reboot)
- **Network Configuration**: Manage networks, subnets, and interfaces
- **Storage Management**: Configure storage devices and partitions
- **Tag Management**: Create, list, and apply tags to resources
- **Progress Notifications**: Real-time updates for long-running operations
- **Resource Access**: URI-based access to MAAS resources

## Architecture

This project follows clean architecture principles to ensure separation of concerns, testability, and maintainability:

- **Repository Layer**: Responsible for data access and external API integration
- **Service Layer**: Contains business logic and orchestration
- **Transport Layer**: Handles HTTP requests and responses
- **MCP Layer**: Implements the Model Context Protocol

For more details on the clean architecture implementation, see [pkg/mcp/README.md](pkg/mcp/README.md).

### Project Structure

```
.
├── cmd/                  # Application entry points
│   └── server/           # Main server executable
├── config/               # Configuration files
├── internal/             # Private application code
│   ├── auth/             # Authentication middleware
│   ├── config/           # Configuration handling
│   ├── errors/           # Error definitions and handling
│   ├── logging/          # Logging infrastructure
│   ├── maas/             # MAAS client wrapper
│   ├── maasclient/       # MAAS client implementation
│   ├── models/           # Domain models
│   ├── repository/       # Repository layer
│   ├── server/           # HTTP server implementation
│   ├── service/          # Business logic
│   └── transport/        # HTTP handlers
├── pkg/                  # Public libraries
│   └── mcp/              # MCP protocol implementation
├── test/                 # Integration tests
│   └── integration/      # Integration test suites
└── ts-wrapper/           # TypeScript wrapper
```

## Setup

### Prerequisites

- Go 1.22 or later
- Node.js 18 or later
- MAAS server with API access
- golangci-lint (for development)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/maas-mcp-server.git
   cd maas-mcp-server
   ```

2. Install development tools:
   ```
   ./build.sh install-tools
   ```

3. Build the server:
   ```
   ./build.sh build
   ```

4. Install TypeScript wrapper dependencies:
   ```
   cd ts-wrapper
   npm install
   npm run build
   cd ..
   ```

### Configuration

1. Copy the example configuration files:
   ```
   cp config/config.yaml.example config/config.yaml
   cp .env.example .env
   ```

2. Edit `config/config.yaml` and update:
   - MAAS API URL
   - MAAS API key (in format "consumer:token:secret")
   - Server host/port
   - Authentication settings
   - Logging configuration

3. Edit `.env` and update:
   - MAAS API URL
   - MAAS API key
   - Any AI service API keys if needed

### Running the Server

1. Start the server:
   ```
   ./build.sh run
   ```

2. Or start the clean architecture version:
   ```
   ./build.sh run-mcp
   ```

The server will be available at http://localhost:8081/mcp.

## Development

### Development Commands

The project includes a build script with common development commands:

- `./build.sh build`: Build the server
- `./build.sh build-mcp`: Build the clean architecture version
- `./build.sh run`: Build and run the server
- `./build.sh run-mcp`: Build and run the clean architecture version
- `./build.sh test`: Run tests
- `./build.sh lint`: Run linters
- `./build.sh help`: Show help

### Code Style

This project uses:
- golangci-lint for Go code linting
- EditorConfig for consistent code formatting
- Go modules for dependency management

### Testing

- Unit tests: `./build.sh test`
- Integration tests: `cd test/integration && go test -v ./...`
- Test script: `./test-mcp-clean.js`

## Usage

### Listing Machines

You can list machines using the `maas_list_machines` MCP tool:

```javascript
const response = await fetch('http://localhost:8081/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'maas_list_machines',
    params: {},
    id: '1',
  }),
});

const result = await response.json();
console.log(result);
```

See `test-mcp-clean.js` for more examples.

### Available MCP Tools

| Tool Name | Description |
|-----------|-------------|
| `maas_list_machines` | List all machines managed by MAAS |
| `maas_get_machine_details` | Get detailed information about a specific machine |
| `maas_allocate_machine` | Allocate a machine based on constraints |
| `maas_deploy_machine` | Deploy an operating system to a machine |
| `maas_release_machine` | Release a machine back to the available pool |
| `maas_get_machine_power_state` | Get the current power state of a machine |
| `maas_power_on_machine` | Power on a machine |
| `maas_power_off_machine` | Power off a machine |
| `maas_list_subnets` | List all subnets managed by MAAS |
| `maas_get_subnet_details` | Get detailed information about a specific subnet |

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `./build.sh test`
5. Run linters: `./build.sh lint`
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/my-feature`
8. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

[MIT License](LICENSE)