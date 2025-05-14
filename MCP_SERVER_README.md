# MAAS MCP Server

This document provides instructions on how to set up, use, and troubleshoot the MAAS MCP Server.

## Overview

The MAAS MCP Server is a bridge between the Model Context Protocol (MCP) and the Canonical MAAS API. It allows AI assistants to interact with MAAS through the MCP protocol.

## Configuration

### Environment Variables

The server requires the following environment variables:

- `MAAS_API_URL`: The URL of your MAAS instance (e.g., `http://your-maas-instance/MAAS`)
- `MAAS_API_KEY`: Your MAAS API key in the format `consumer_key:token:secret`
- `MCP_PORT`: The port on which the MCP server will listen (default: 3000)

Optional environment variables:

- `NODE_ENV`: The environment mode (`development`, `production`, or `test`)
- `LOG_LEVEL`: The logging level (`trace`, `debug`, `info`, `warn`, `error`, or `fatal`)
- `MCP_PROTOCOL_VERSION`: The MCP protocol version to use
- `MCP_USE_LATEST_PROTOCOL`: Whether to use the latest protocol version (`true` or `false`)
- `CACHE_ENABLED`: Whether to enable caching (`true` or `false`)
- `AUDIT_LOG_ENABLED`: Whether to enable audit logging (`true` or `false`)

### MCP Server Configuration

The MCP server is configured in the `.roo/mcp.json` file. Here's an example configuration:

```json
{
  "mcpServers": {
    "maas-server": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": ".",
      "env": {
        "MAAS_API_URL": "http://your-maas-instance/MAAS",
        "MAAS_API_KEY": "consumer_key:token:secret",
        "MCP_PORT": "3001",
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "MCP_PROTOCOL_VERSION": "2024-11-05",
        "MCP_USE_LATEST_PROTOCOL": "false",
        "CACHE_ENABLED": "true",
        "AUDIT_LOG_ENABLED": "true"
      }
    }
  }
}
```

## Starting the Server

There are two ways to start the server:

### Development Mode

```bash
npm run dev
```

This will start the server using ts-node-dev, which watches for file changes and restarts the server automatically.

### Production Mode

```bash
npm run build
node dist/index.js
```

This will build the TypeScript code and run the compiled JavaScript directly.

## Testing the Connection

To test the connection to the MCP server, run:

```bash
node scripts/test-mcp-connection.mjs
```

This script sends a simple JSON-RPC request to the MCP server to get the server information.

Alternatively, you can use one of the start-and-test scripts to start the server and test the connection in one go:

```bash
# Basic connection test
./scripts/start-and-test-mcp.sh

# Comprehensive Roo integration test
./scripts/start-and-test-roo-integration.sh
```

The Roo integration test script tests all the MCP methods that Roo uses to interact with the server, which can help diagnose issues with the Roo integration.

## Troubleshooting

### Connection Closed Error

If you encounter a "MCP error -32000: Connection closed" error, try the following solutions:

1. **Use Production Mode**:
   - Build the project with `npm run build`
   - Run the server directly with `node dist/index.js`
   - This avoids potential issues with the development server

2. **Change the Port**:
   - Try using a different port (e.g., 3002 instead of 3001)
   - Update the `MCP_PORT` environment variable in both the .env file and the mcp.json file

3. **Update Protocol Version Settings**:
   - Set `MCP_USE_LATEST_PROTOCOL` to `true`
   - This ensures compatibility with the latest MCP clients

4. **Check Environment Variables**:
   - Ensure all required environment variables are set correctly
   - Create a .env file with all the necessary variables

5. **Run the Integration Test**:
   - Use `./scripts/start-and-test-roo-integration.sh` to test all MCP methods
   - This can help identify which specific method is causing the issue

6. **Check Server Logs**:
   - Look for error messages in the server logs
   - Increase log verbosity by setting `LOG_LEVEL` to `debug`

### Invalid Protocol Version

If you encounter an "Invalid protocol version" error, check the following:

1. Make sure the `MCP_PROTOCOL_VERSION` environment variable is set to a valid version.
2. If using the latest protocol version, set `MCP_USE_LATEST_PROTOCOL` to `true`.
3. Ensure the client and server are using compatible protocol versions.

### MAAS API Authentication Errors

If you encounter MAAS API authentication errors, check the following:

1. Verify that the `MAAS_API_KEY` is in the correct format (`consumer_key:token:secret`).
2. Ensure that the MAAS API key has the necessary permissions.
3. Check that the `MAAS_API_URL` is correct and accessible.
4. Try accessing the MAAS API directly to confirm the credentials are valid.

## Logs

The server logs are output to the console by default. You can adjust the log level using the `LOG_LEVEL` environment variable.

Audit logs are enabled by default and record all resource access and modifications. You can disable audit logging by setting `AUDIT_LOG_ENABLED` to `false`.

## Additional Resources

- [MAAS API Documentation](https://maas.io/docs/api)
- [MCP Protocol Documentation](https://github.com/modelcontextprotocol/mcp)