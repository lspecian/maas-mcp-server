const express = require('express');
const path = require('path');

// Import MCP SDK modules using direct paths
const sdkPath = path.join(__dirname, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { StreamableHTTPServerTransport } = require(path.join(sdkPath, 'server', 'streamableHttp.js'));
const { LATEST_PROTOCOL_VERSION } = require(path.join(sdkPath, 'types.js'));

// Create Express app
const app = express();

// Initialize MCP Server
const server = new McpServer({
  name: "Test-MCP-Server",
  version: "1.0.0",
  protocolVersion: LATEST_PROTOCOL_VERSION,
  serverInfo: {
    name: "Test MCP Server",
    version: "0.1.0",
    instructions: "This is a test MCP server."
  },
  capabilities: {
    resources: {
      listChanged: false,
    },
    tools: {
      listChanged: false,
    },
  },
});

// Register a simple tool
server.registerTool({
  name: "hello",
  description: "Say hello",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Your name"
      }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Greeting message"
      }
    }
  },
  execute: async (params) => {
    return {
      message: `Hello, ${params.name || 'World'}!`
    };
  }
});

// Configure middleware
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  // Create transport
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });
  
  // Assign server to transport
  transport.mcpServer = server;

  try {
    // Process request
    await transport.handleRequest(req, res, req.body);
    console.log('MCP request handled successfully');
  } catch (error) {
    console.error('Error handling MCP request:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Internal server error during MCP request processing.',
        },
        id: req.body?.id || null
      });
    }
  } finally {
    res.on('finish', () => transport.close());
    res.on('close', () => {
      if (!res.writableEnded) {
        transport.close();
      }
    });
  }
});

// Start server
const port = 3001;
app.listen(port, () => {
  console.log(`Test MCP Server listening on http://localhost:${port}/mcp`);
});