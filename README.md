# MCP-MAAS Server

A Model Context Protocol (MCP) server for interacting with MAAS (Metal as a Service).

## Overview

This project provides an MCP server that allows AI assistants to interact with MAAS through a standardized protocol. It enables operations such as:

- Listing machines
- Getting machine details
- Allocating machines
- Deploying machines
- Managing power state
- And more

## Project Structure

- `cmd/server`: Main server entry point
- `config`: Configuration files
- `internal`: Internal packages
  - `auth`: Authentication middleware
  - `config`: Configuration handling
  - `maas`: MAAS client wrapper
  - `maasclient`: MAAS client implementation
  - `models`: Data models
  - `server`: HTTP server implementation
  - `service`: Business logic
- `ts-wrapper`: TypeScript wrapper for the Go server

## Setup

### Prerequisites

- Go 1.20 or later
- Node.js 18 or later
- MAAS server with API access

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mcp-maas.git
   cd mcp-maas
   ```

2. Build the Go server:
   ```
   go build -o mcp-server ./cmd/server
   ```

3. Install TypeScript wrapper dependencies:
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
   cp .roo/mcp.json.example .roo/mcp.json
   ```

2. Edit `config/config.yaml` and update:
   - MAAS API URL
   - MAAS API key (in format "consumer:token:secret")
   - Server host/port
   - Authentication settings

3. Edit `.roo/mcp.json` and update:
   - MAAS API URL
   - MAAS API key
   - Any AI service API keys if needed

### Running the Server

1. Start the Go server:
   ```
   ./mcp-server
   ```

2. Start the TypeScript wrapper:
   ```
   cd ts-wrapper
   npm run start
   ```

The server will be available at http://localhost:8081/mcp.

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

See `test-mcp-tool.js` for more examples.

## Development

### Git Workflow

This repository uses `.gitignore` to exclude sensitive files:
- `config/config.yaml` (contains credentials)
- `.roo/mcp.json` (contains credentials)
- `mcp-server` (binary file)
- `ts-wrapper/dist/` (compiled JavaScript)

Always use the example files as templates and never commit real credentials.

## License

[Your license here]