/**
 * Simple MCP Server for MAAS API
 * 
 * This is a minimal implementation of an MCP server using Express
 * that connects to the MAAS API.
 */

const express = require('express');
const nodeFetch = require('node-fetch');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const fs = require('fs');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

// In CommonJS, node-fetch is not a global function, so we need to use it as a module
const fetch = nodeFetch.default || nodeFetch;

// Set up logging to file
const logFile = 'mcp-server-debug.log';
fs.writeFileSync(logFile, `MCP Server Debug Log - ${new Date().toISOString()}\n`, { flag: 'w' });

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
}

// Load environment variables
dotenv.config();
logToFile('Environment variables loaded');

// Create Express app
const app = express();
app.use(bodyParser.json());

// Configuration
const config = {
  maasApiUrl: process.env.MAAS_API_URL || 'http://localhost:5240/MAAS',
  maasApiKey: process.env.MAAS_API_KEY || '',
  port: process.env.MCP_PORT || process.env.PORT || 3002 // Use port 3002 to match the mcp.json configuration
};

// Simple MAAS API client
const maasApiClient = {
  async get(endpoint, params = {}) {
    try {
      // Extract API key parts
      const [consumerKey, token, secret] = config.maasApiKey.split(':');
      
      // Create OAuth 1.0a instance
      const oauth = OAuth({
        consumer: { key: consumerKey, secret: '' },
        signature_method: 'PLAINTEXT',
        hash_function(base_string, key) {
          return key; // PLAINTEXT signature just returns the key
        }
      });
      
      // Construct the URL with the op parameter
      const baseUrl = `${config.maasApiUrl}/api/2.0${endpoint}`;
      const url = new URL(baseUrl);
      
      // Add op=list parameter
      url.searchParams.append('op', 'list');
      
      // Add other query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
      
      const apiUrl = url.toString();
      logToFile(`Making request to MAAS API: ${apiUrl}`);
      
      // Prepare the request data for OAuth signing
      const requestData = {
        url: apiUrl,
        method: 'GET'
      };
      
      // Get authorization header
      const authData = oauth.authorize(requestData, {
        key: token,
        secret: secret
      });
      
      // Convert OAuth data to header
      const authHeader = oauth.toHeader(authData);
      
      logToFile(`Using OAuth header: ${JSON.stringify(authHeader)}`);
      
      // Make the request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          ...authHeader,
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

// MCP endpoint
app.post('/mcp', async (req, res) => {
  console.log('Received MCP request:', req.body);
  
  try {
    const { jsonrpc, method, params, id } = req.body;
    
    // Validate JSON-RPC request
    if (jsonrpc !== '2.0' || !method || !params) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request'
        },
        id: id || null
      });
    }
    
    // Handle executeTool method
    if (method === 'executeTool') {
      const { name, arguments: args } = params;
      
      // Handle listMachines tool
      if (name === 'listMachines') {
        try {
          // Call MAAS API to get machines
          const response = await maasApiClient.get('/machines/', args || {});
          
          // Transform response to match output schema
          const machines = response.map((machine) => ({
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
            ip_addresses: machine.ip_addresses,
            tags: machine.tag_names || []
          }));
          
          console.log(`Successfully retrieved ${machines.length} machines`);
          
          // Return success response
          return res.json({
            jsonrpc: '2.0',
            result: JSON.stringify({
              machines,
              count: machines.length
            }),
            id
          });
        } catch (error) {
          console.error('Error listing machines:', error);
          
          // Return error response
          return res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: `Error listing machines: ${error.message}`
            },
            id
          });
        }
      } else {
        // Unknown tool
        return res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${name}`
          },
          id
        });
      }
    } else {
      // Unknown method
      return res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        },
        id
      });
    }
  } catch (error) {
    console.error('Error handling MCP request:', error);
    
    // Return internal error response
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`
      },
      id: req.body.id || null
    });
  }
});

// Start server
const port = config.port;
try {
  logToFile(`Attempting to start server on port ${port}`);
  logToFile(`MAAS API URL: ${config.maasApiUrl}`);
  logToFile(`API Key: ${config.maasApiKey ? '********' : 'Not set'}`);
  
  const server = app.listen(port, () => {
    logToFile(`Simple MCP Server for MAAS API listening on http://localhost:${port}`);
  });
  
  server.on('error', (error) => {
    logToFile(`Server error: ${error.message}`);
    if (error.code === 'EADDRINUSE') {
      logToFile(`Port ${port} is already in use. Please use a different port.`);
    }
  });
} catch (error) {
  logToFile(`Failed to start server: ${error.message}`);
  logToFile(error.stack);
}