/**
 * MAAS MCP Server - Lightweight Implementation
 *
 * This is a refactored version that uses a lightweight approach
 * and properly handles API keys through environment variables.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get MAAS API credentials from environment variables only
const MAAS_API_URL = process.env.MAAS_API_URL;
const MAAS_API_KEY = process.env.MAAS_API_KEY;

// Validate environment variables
if (!MAAS_API_URL || !MAAS_API_KEY) {
  console.error('Error: MAAS_API_URL and MAAS_API_KEY environment variables must be set');
  process.exit(1);
}

// Create a simple MAAS API client
const maasApiClient = {
  async get(path, params = {}) {
    try {
      // Extract API key parts
      const [consumerKey, token, secret] = MAAS_API_KEY.split(':');
      
      // Construct the URL with the op parameter
      const url = new URL(`${MAAS_API_URL}/api/2.0${path}`);
      
      // MAAS API requires an 'op' parameter for most operations
      url.searchParams.append('op', 'list');
      
      // Add other query parameters
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
      
      // Create OAuth parameters
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create OAuth Authorization header
      const authParams = {
        oauth_consumer_key: consumerKey,
        oauth_token: token,
        oauth_signature_method: 'PLAINTEXT',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        oauth_signature: `${secret}&`
      };
      
      // Format OAuth header
      const authHeader = 'OAuth ' + Object.keys(authParams)
        .map(key => `${key}="${encodeURIComponent(authParams[key])}"`)
        .join(',');
      
      // Make the request
      console.log(`Making request to MAAS API: ${url.toString()}`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });
      
      // Log response status
      console.log(`MAAS API response status: ${response.status} ${response.statusText}`);
      
      // Get response text
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`MAAS API error: ${response.status} ${response.statusText} - ${responseText}`);
      }
      
      // Parse JSON response
      try {
        return JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse MAAS API response as JSON: ${e.message}`);
      }
    } catch (error) {
      console.error('Error calling MAAS API:', error);
      throw error;
    }
  }
};

// Create Express app
const app = express();
app.use(express.json({ limit: '10mb' }));

// Create the MCP server
const server = new McpServer({
  name: "MAAS-API-MCP-Server",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
  serverInfo: {
    name: "MAAS API Bridge for MCP",
    version: "0.1.0",
    instructions: "This MCP server provides access to MAAS API functionality."
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

// Register the listMachines tool
server.tool(
  "listMachines",
  {
  hostname: { type: "string", description: "Filter machines by hostname" },
  mac_address: { type: "string", description: "Filter machines by MAC address" },
  zone: { type: "string", description: "Filter machines by zone name" },
  pool: { type: "string", description: "Filter machines by pool name" },
  status: { type: "string", description: "Filter machines by status" },
  owner: { type: "string", description: "Filter machines by owner" },
  tags: { type: "string", description: "Filter machines by tag name (comma-separated)" },
  offset: { type: "number", description: "Skip the first N machines" },
  limit: { type: "number", description: "Limit the number of machines returned" },
}, async (params) => {
  console.log('Executing listMachines tool with params:', params);
  
  try {
    // Convert tool parameters to MAAS API parameters
    const apiParams = {};
    
    if (params.hostname) apiParams.hostname = params.hostname;
    if (params.mac_address) apiParams.mac_address = params.mac_address;
    if (params.zone) apiParams.zone = params.zone;
    if (params.pool) apiParams.pool = params.pool;
    if (params.status) apiParams.status = params.status;
    if (params.owner) apiParams.owner = params.owner;
    if (params.tags) apiParams.tags = params.tags;
    if (params.offset !== undefined) apiParams.offset = params.offset;
    if (params.limit !== undefined) apiParams.limit = params.limit;
    
    // Call the MAAS API to get machines
    const machines = await maasApiClient.get('/machines/', apiParams);
    
    // Transform the response to match the expected format
    const transformedMachines = machines.map(machine => ({
      system_id: machine.system_id,
      hostname: machine.hostname,
      status: machine.status_name,
      owner: machine.owner || null,
      architecture: machine.architecture,
      cpu_count: machine.cpu_count,
      memory: machine.memory,
      zone: {
        name: machine.zone.name
      },
      pool: {
        name: machine.pool.name
      },
      ip_addresses: machine.ip_addresses || [],
      tags: machine.tag_names || []
    }));
    
    console.log(`Retrieved ${transformedMachines.length} machines from MAAS API`);
    
    return {
      machines: transformedMachines,
      count: transformedMachines.length
    };
  } catch (error) {
    console.error('Error retrieving machines from MAAS API:', error);
    
    // Return empty result in case of error
    return {
      machines: [],
      count: 0,
      error: error.message
    };
  }
});

// MCP endpoint
app.post('/mcp', async (req, res) => {
  console.log('Received MCP request:', req.body);
  
  // Create a transport instance
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });
  
  // Assign the server instance to the transport
  (transport).mcpServer = server;
  
  try {
    // Process the MCP request
    await transport.handleRequest(req, res, req.body);
    console.log('MCP request handled successfully');
  } catch (error) {
    console.error('Error handling MCP request:', error);
    
    // Send a fallback error response if headers haven't been sent yet
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
    // Ensure proper cleanup of transport resources
    res.on('finish', () => transport.close());
    res.on('close', () => {
      if (!res.writableEnded) {
        transport.close();
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
const port = process.env.MCP_PORT || 3000;
app.listen(port, () => {
  console.log(`Lightweight MCP Server for MAAS API listening on http://localhost:${port}/mcp`);
  console.log(`Environment configured with MAAS API URL: ${MAAS_API_URL}`);
  console.log(`API key is ${MAAS_API_KEY ? 'set' : 'not set'}`);
});