# MCP Inspector Testing Environment Setup Guide

This guide provides step-by-step instructions for setting up a development environment for testing the MAAS MCP Server using the MCP Inspector tool.

## Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v8.0.0 or higher)
- MAAS MCP Server repository cloned locally
- Access to a MAAS instance (real or mocked)

## Installation Steps

### 1. Install the MCP Inspector

The MCP Inspector is a tool for interactively testing MCP servers. Install it globally using npm:

```bash
npm install -g @modelcontextprotocol/inspector
```

### 2. Configure the MAAS MCP Server for Development

1. Navigate to the MAAS MCP Server repository:

```bash
cd /path/to/maas-mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Create a development environment file:

```bash
cp .env.example .env
```

4. Edit the `.env` file with appropriate MAAS API credentials:

```
MAAS_API_URL=http://your-maas-instance/MAAS/api/2.0
MAAS_API_KEY=your-maas-api-key
MCP_SERVER_PORT=3000
LOG_LEVEL=debug
```

### 3. Set Up Test Data and Fixtures

For effective testing, you'll need some test data in your MAAS instance:

1. Ensure you have at least 3 machines registered in your MAAS instance
2. Configure at least 2 subnets
3. Create a few tags for testing tag-related functionality

If you're using a mocked MAAS instance, you can use the mock data provided in the integration tests:

```bash
# Copy mock data for testing
cp -r src/integration_tests/mocks/data ./test-data
```

### 4. Start the MAAS MCP Server in Development Mode

Start the server with:

```bash
npm run dev
```

This will start the server in development mode with hot reloading enabled.

### 5. Launch the MCP Inspector

In a new terminal window, launch the MCP Inspector:

```bash
mcp-inspector
```

This will open the MCP Inspector in your default web browser.

### 6. Connect to the MAAS MCP Server

In the MCP Inspector:

1. Enter the server URL: `http://localhost:3000/mcp`
2. Click "Connect"

You should now see the available tools and resources provided by the MAAS MCP Server.

## Verifying the Setup

To verify that your setup is working correctly:

1. In the MCP Inspector, navigate to the "Tools" section
2. Select the `maas_list_machines` tool
3. Execute the tool without any parameters
4. You should receive a response with a list of machines from your MAAS instance

If you receive an error, check:
- The MAAS MCP Server is running
- Your `.env` file has the correct MAAS API credentials
- The connection between the MCP Inspector and the MAAS MCP Server

## Setting Up a Mock Environment (Optional)

If you don't have access to a real MAAS instance, you can set up a mock environment:

1. Edit your `.env` file to use the mock MAAS API client:

```
USE_MOCK_MAAS_API=true
```

2. Start the server as usual:

```bash
npm run dev
```

The server will now use mock data instead of connecting to a real MAAS instance.

## Next Steps

Once your environment is set up, proceed to the [Testing Procedures](testing_procedures.md) document for instructions on how to perform manual testing using the MCP Inspector.