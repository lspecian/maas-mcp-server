# MAAS MCP Server Guide

## What is MAAS MCP Server?

The MAAS MCP Server is a bridge between the Model Context Protocol (MCP) and the Canonical MAAS (Metal as a Service) API. It allows AI assistants and other MCP-compliant clients to interact with MAAS through a standardized interface.

Key features:
- MCP v2024-11-05 compliant server
- Tools for common MAAS operations (listing machines, creating/updating/deleting resources)
- Resources for accessing MAAS data (machine details, subnet details)
- Progress notification system for long-running operations
- Caching system with configurable strategies
- Comprehensive error handling and audit logging

## Quick Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a .env file**
   ```bash
   cp .env.example .env
   ```

3. **Edit the .env file with your MAAS API credentials**
   ```
   MAAS_API_URL=https://your-maas-instance/MAAS
   MAAS_API_KEY=consumer_key:token:secret
   MCP_PORT=3000
   NODE_ENV=development
   LOG_LEVEL=debug
   ```

## Running the Server

### Development Mode (with auto-reloading)
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## Testing the Server

### 1. Basic Connection Test

To test if the server is running and responding to MCP requests:

```bash
node test-mcp-connection.js
```

This script sends a simple JSON-RPC request to get the server information.

### 2. Listing Machines

There are multiple ways to list machines:

#### Using Direct API Endpoint

The server provides a direct endpoint for listing machines without using the MCP protocol:

```bash
curl http://localhost:3000/api/machines
```

#### Using MCP Protocol

To list machines using the MCP protocol, send a POST request to the `/mcp` endpoint:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "executeTool",
    "params": {
      "name": "maas_list_machines",
      "arguments": {}
    },
    "id": 1
  }'
```

### 3. Running Tests

#### Unit Tests
```bash
npm test
```

#### Integration Tests
```bash
npm run test:integration
```

#### All Tests
```bash
npm run test:all
```

### 4. Using MCP Inspector

For interactive testing with a UI:

```bash
# Start the server
npm run dev

# In a separate terminal, launch the MCP Inspector
npm run inspector
```

The MCP Inspector provides a graphical interface for testing MCP tools and resources.

## Common Operations

### List Machines
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "executeTool",
    "params": {
      "name": "listMachines",
      "arguments": {}
    },
    "id": 1
  }'
```

### Get Machine Details
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "accessResource",
    "params": {
      "uri": "maas://machine/your-machine-id/details"
    },
    "id": 1
  }'
```

### List Subnets
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "executeTool",
    "params": {
      "name": "listSubnets",
      "arguments": {}
    },
    "id": 1
  }'
```

## Troubleshooting

### Connection Closed Error

If you encounter a "MCP error -32000: Connection closed" error:

1. **Use Production Mode**:
   - Build the project with `npm run build`
   - Run the server directly with `node dist/index.js`

2. **Change the Port**:
   - Try using a different port (e.g., 3002 instead of 3001)
   - Update the `MCP_PORT` environment variable

3. **Update Protocol Version Settings**:
   - Set `MCP_USE_LATEST_PROTOCOL` to `true` in your .env file

4. **Check Environment Variables**:
   - Ensure all required environment variables are set correctly

5. **Check Server Logs**:
   - Look for error messages in the server logs
   - Increase log verbosity by setting `LOG_LEVEL` to `debug`

### MAAS API Authentication Errors

If you encounter MAAS API authentication errors:

1. Verify that the `MAAS_API_KEY` is in the correct format (`consumer_key:token:secret`)
2. Ensure that the MAAS API key has the necessary permissions
3. Check that the `MAAS_API_URL` is correct and accessible
4. Try accessing the MAAS API directly to confirm the credentials are valid

## Project Structure

Key directories and files:

- **src/index.ts**: Main entry point
- **src/config.ts**: Configuration management
- **src/maas/MaasApiClient.ts**: MAAS API client implementation
- **src/mcp_tools/**: MCP tool implementations
- **src/mcp_resources/**: MCP resource implementations
- **src/utils/**: Utility functions and helpers

## Available MCP Tools

- **listMachines**: List machines from the MAAS API
- **listSubnets**: List subnets from the MAAS API
- **maas_create_machine**: Create a new machine in MAAS
- **maas_create_device**: Create a new device in MAAS
- **maas_create_network**: Create a new network in MAAS
- **maas_create_tag**: Create a new tag in MAAS
- **maas_update_machine**: Update an existing machine in MAAS
- **maas_update_device**: Update an existing device in MAAS
- **maas_update_network**: Update an existing network in MAAS
- **maas_delete_machine**: Delete a machine from MAAS
- **maas_delete_device**: Delete a device from MAAS
- **maas_delete_network**: Delete a network from MAAS
- **maas_upload_script**: Upload a script to MAAS
- **maas_upload_image**: Upload an image to MAAS
- **maas_deploy_machine_with_progress**: Deploy an OS to a machine with progress notifications
- **maas_commission_machine_with_progress**: Commission a machine with progress notifications

## Available MCP Resources

- **machineDetails**: Get detailed information about a specific machine
  - URI pattern: `maas://machine/{system_id}/details`
- **subnetDetails**: Get detailed information about a specific subnet
  - URI pattern: `maas://subnet/{subnet_id}/details`

## Helper Scripts

I've created several helper scripts to make it easier to work with the MAAS MCP Server:

### 1. maas-mcp-server.sh - All-in-One Script

This is an all-in-one script that provides a unified interface for setting up, starting, and testing the server.

```bash
# Make executable
chmod +x maas-mcp-server.sh

# Show help
./maas-mcp-server.sh help

# Set up the environment
./maas-mcp-server.sh setup

# Use default values for setup
./maas-mcp-server.sh setup --defaults

# Start the server in development mode
./maas-mcp-server.sh start --dev

# Start the server in production mode on a specific port
./maas-mcp-server.sh start --prod --port=3001

# Test the server
./maas-mcp-server.sh test

# Test the server using MCP protocol on a specific port
./maas-mcp-server.sh test --mcp --port=3001
```

### 2. setup-env.sh - Environment Setup Script

This script helps set up the environment variables needed to run the server.

```bash
# Make executable
chmod +x setup-env.sh

# Interactive setup
./setup-env.sh

# Use default values
./setup-env.sh --defaults
```

### 3. run-list-machines.sh - List Machines Script

This script tests the server by listing machines.

```bash
# Make executable
chmod +x run-list-machines.sh

# Using the direct API endpoint
./run-list-machines.sh

# Using the MCP protocol endpoint
./run-list-machines.sh --mcp

# Specify a different port
./run-list-machines.sh --port=3001
```

For more detailed testing information, see [TESTING.md](TESTING.md).