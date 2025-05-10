import express from 'express';
import { randomUUID } from 'crypto';
import { MCPServer } from './server.js';
import { SSEServerTransport } from './transport.js';
import { isInitializeRequest, MaasConfig } from './types.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axios from 'axios';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const PORT = process.env.PORT || 8081;
const GO_SERVER_PORT = process.env.GO_SERVER_PORT || 8082;
const GO_SERVER_URL = process.env.GO_SERVER_URL || `http://localhost:${GO_SERVER_PORT}`;
const GO_BINARY_PATH = process.env.GO_BINARY_PATH || path.resolve(__dirname, '../../mcp-server');

// Read MAAS configuration from mcp.json
let maasConfig: MaasConfig | undefined;
try {
  const mcpJsonPath = path.resolve(__dirname, '../../../.roo/mcp.json');
  if (fs.existsSync(mcpJsonPath)) {
    const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8'));
    if (mcpJson.mcpServers && mcpJson.mcpServers['maas-server'] && mcpJson.mcpServers['maas-server'].maasConfig) {
      maasConfig = mcpJson.mcpServers['maas-server'].maasConfig;
      console.log('Loaded MAAS configuration from .roo/mcp.json');
    }
  }
} catch (error) {
  console.error('Error loading MAAS configuration from .roo/mcp.json:', error);
}

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

// Create Express application
const app = express();
app.use(express.json());

// Create MCP server
const server = new MCPServer({
  name: 'maas-mcp-server',
  version: '1.0.0',
  goServerUrl: GO_SERVER_URL,
  maasConfig: maasConfig,
});

// Start the Go server
let goServer: ReturnType<typeof spawn> | null = null;

function startGoServer() {
  console.log(`Starting Go server from: ${GO_BINARY_PATH}`);
  
  goServer = spawn(GO_BINARY_PATH, [], {
    stdio: 'inherit',
    env: {
      ...process.env,
      SERVER_PORT: GO_SERVER_PORT.toString(),
    },
  });

  goServer.on('error', (err) => {
    console.error('Failed to start Go server:', err);
  });

  goServer.on('exit', (code, signal) => {
    console.log(`Go server exited with code ${code} and signal ${signal}`);
    goServer = null;
  });
}

// Handle GET requests for SSE connections
app.get('/mcp', async (req, res) => {
  console.log('Received GET request to /mcp (SSE connection)');
  
  const transport = new SSEServerTransport('/mcp', res);
  transports[transport.sessionId] = transport;
  
  res.on('close', () => {
    delete transports[transport.sessionId];
  });
  
  await transport.start();
  await server.connect(transport);
});

// Handle POST requests for JSON-RPC messages
app.post('/mcp', async (req, res) => {
  console.log('Received POST request to /mcp');
  
  // Log the full request for debugging
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Handle direct MAAS tool calls
    if (req.body.method && req.body.method.startsWith('maas_')) {
      const toolName = req.body.method;
      const toolArgs = req.body.params || {};
      
      console.log(`Direct MAAS tool call: ${toolName}`, JSON.stringify(toolArgs, null, 2));
      
      try {
        // Add MAAS configuration to the request if available
        const requestParams = {
          ...toolArgs,
          _maasConfig: maasConfig,
        };
        
        // Make a direct request to the Go server
        const response = await axios.post(
          `${GO_SERVER_URL}/mcp/${toolName}`,
          requestParams,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
        
        console.log("Go server response:", JSON.stringify(response.data, null, 2));
        
        // Send the response back to the client
        res.json({
          jsonrpc: '2.0',
          result: response.data,
          id: req.body.id,
        });
        return;
      } catch (error) {
        console.error(`Error calling ${toolName}:`, error);
        
        // Send error response
        res.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: `Error calling ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
          },
          id: req.body.id,
        });
        return;
      }
    }
    
    // Handle tools/call method
    if (req.body.method === 'tools/call' && req.body.params && req.body.params.name) {
      const toolName = req.body.params.name;
      const toolArgs = req.body.params.arguments || {};
      
      console.log(`Direct tool call: ${toolName}`, JSON.stringify(toolArgs, null, 2));
      
      // Handle MAAS tools called via tools/call
      if (toolName.startsWith('maas_')) {
        try {
          // Add MAAS configuration to the request if available
          const requestParams = {
            ...toolArgs,
            _maasConfig: maasConfig,
          };
          
          // Make a direct request to the Go server
          const response = await axios.post(
            `${GO_SERVER_URL}/mcp/${toolName}`,
            requestParams,
            {
              headers: {
                'Content-Type': 'application/json',
              },
            },
          );
          
          console.log("Go server response:", JSON.stringify(response.data, null, 2));
          
          // Format the response for Roo with explicit text content
          const formattedResponse = {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.data, null, 2)
              }
            ]
          };
          
          // Send the response back to the client
          res.json({
            jsonrpc: '2.0',
            result: formattedResponse,
            id: req.body.id,
          });
          return;
        } catch (error) {
          console.error(`Error calling ${toolName}:`, error);
          
          // Send error response
          res.json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: `Error calling ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
            },
            id: req.body.id,
          });
          return;
        }
      }
    }
    
    // Fall back to the normal flow for unsupported methods
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Unsupported method or missing parameters',
      },
      id: req.body.id || null,
    });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      },
      id: req.body.id || null,
    });
  }
  
  // The rest of the code is not needed for testing
});

// Add CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  
  next();
});

// Start the server
app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
  console.log(`Go server URL: ${GO_SERVER_URL}`);
  
  // Start the Go server
  startGoServer();
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  // Close all active transports
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  // Kill the Go server
  if (goServer) {
    console.log('Killing Go server...');
    goServer.kill();
  }
  
  console.log('Server shutdown complete');
  process.exit(0);
});