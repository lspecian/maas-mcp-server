# Testing the MAAS MCP Server

This document provides instructions on how to test the MAAS MCP Server using the provided scripts and tools.

## Prerequisites

- Node.js 18 or later
- npm
- A running MAAS MCP Server instance

## Quick Start Guide

1. **Set up the server**

   First, make sure you have set up the MAAS MCP Server according to the instructions in [project-guide.md](project-guide.md).

2. **Start the server**

   ```bash
   npm run dev
   ```

3. **Run the list-machines script**

   ```bash
   # Using the direct API endpoint
   ./run-list-machines.sh
   
   # Using the MCP protocol endpoint
   ./run-list-machines.sh --mcp
   
   # Specify a different port
   ./run-list-machines.sh --port=3001
   ```

## Available Testing Scripts

### 1. list-machines.js

This script tests the server's ability to list machines. It can use either the direct API endpoint or the MCP protocol endpoint.

```bash
# Install dependencies
npm install node-fetch

# Run with direct API endpoint
node list-machines.js

# Run with MCP protocol endpoint
node list-machines.js --mcp

# Specify a different port
node list-machines.js --port=3001
```

### 2. run-list-machines.sh

This is a convenience script that handles installing dependencies and running the list-machines.js script.

```bash
# Make executable if needed
chmod +x run-list-machines.sh

# Run with direct API endpoint
./run-list-machines.sh

# Run with MCP protocol endpoint
./run-list-machines.sh --mcp

# Specify a different port
./run-list-machines.sh --port=3001
```

### 3. test-mcp-connection.js

This script tests the basic connection to the MCP server.

```bash
node test-mcp-connection.js
```

## Running Automated Tests

The project includes comprehensive test suites:

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### All Tests

```bash
npm run test:all
```

## Using MCP Inspector

For interactive testing with a UI:

```bash
# Start the server
npm run dev

# In a separate terminal, launch the MCP Inspector
npm run inspector
```

## Troubleshooting

If you encounter issues while testing, refer to the troubleshooting section in [project-guide.md](project-guide.md).

## Common Test Scenarios

### 1. Test Server Information

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "getServerInfo",
    "params": {},
    "id": 1
  }'
```

### 2. Test List Machines

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

### 3. Test List Subnets

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

### 4. Test Get Machine Details

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

## Next Steps

After confirming that the server is working correctly, you can:

1. Explore more complex operations like creating and deploying machines
2. Test the progress notification system for long-running operations
3. Implement custom tools or resources for your specific needs