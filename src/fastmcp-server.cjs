/**
 * MAAS MCP Server - FastMCP Implementation (CommonJS version)
 *
 * This file initializes and starts the MCP server using FastMCP framework
 * that acts as a bridge between the Model Context Protocol (MCP) and the 
 * Canonical MAAS API.
 */

const { FastMCP } = require('fastmcp');
const z = require('zod');
const path = require('path');
const config = require('./config.cjs');
const logger = require('./utils/logger.cjs');
const { initializeAuditLogger } = require('./utils/initAuditLogger.cjs');

// Create a simple MAAS API client
const maasApiClient = {
  async get(endpoint, params = {}) {
    try {
      // Extract API key parts
      const [consumerKey, token, secret] = config.maasApiKey.split(':');
      
      // Construct the URL with the op parameter
      const url = new URL(`${config.maasApiUrl}/api/2.0${endpoint}`);
      
      // MAAS API requires an 'op' parameter for most operations
      url.searchParams.append('op', 'list');
      
      // Add other query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
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

// Initialize the audit logger
initializeAuditLogger();

// Use the MAAS API client defined above

// Determine which protocol version to use
const PROTOCOL_VERSION_2024_11_05 = '2024-11-05';
const protocolVersion = config.mcpUseLatestProtocol
  ? undefined // Use default in FastMCP
  : (config.mcpProtocolVersion || PROTOCOL_VERSION_2024_11_05);

// Log protocol version information
console.log('=== MCP Protocol Version Information ===');
console.log(`Using protocol version: ${protocolVersion || 'default'}`);
console.log('=======================================');

// Create the FastMCP server
const server = new FastMCP({
  name: "MAAS-API-MCP-Server",
  version: "1.0.0",
  instructions: "This MCP server provides access to Canonical MAAS API functionality. Use the available tools to manage machines, tags, and other MAAS resources."
});

// Define schema for list machines tool parameters
const listMachinesParamsSchema = z.object({
  hostname: z.string().optional().describe("Filter machines by hostname (supports globbing)."),
  mac_address: z.string().optional().describe("Filter machines by a MAC address."),
  zone: z.string().optional().describe("Filter machines by zone name."),
  pool: z.string().optional().describe("Filter machines by pool name."),
  status: z.string().optional().describe("Filter machines by status."),
  owner: z.string().optional().describe("Filter machines by owner."),
  tags: z.string().optional().describe("Filter machines by tag name (comma-separated)."),
  offset: z.number().nonnegative().optional().describe("Skip the first N machines in the result set."),
  limit: z.number().positive().optional().describe("Limit the number of machines returned."),
});

// Register the listMachines tool
server.addTool({
  name: "listMachines",
  description: "List machines from the MAAS API with optional filtering",
  parameters: listMachinesParamsSchema,
  execute: async (args, context) => {
    const requestLogger = logger.child({ 
      toolName: 'listMachines'
    });
    
    requestLogger.info({ args }, 'Executing listMachines tool');

    try {
      // Convert parameters to MAAS API format
      const apiParams = {};
      
      // Map tool parameters to MAAS API parameters
      if (args.hostname) apiParams.hostname = args.hostname;
      if (args.mac_address) apiParams.mac_address = args.mac_address;
      if (args.zone) apiParams.zone = args.zone;
      if (args.pool) apiParams.pool = args.pool;
      if (args.status) apiParams.status = args.status;
      if (args.owner) apiParams.owner = args.owner;
      if (args.tags) apiParams.tags = args.tags;
      
      // Add pagination parameters
      if (args.offset !== undefined) apiParams.offset = args.offset;
      if (args.limit !== undefined) apiParams.limit = args.limit;

      // Call MAAS API to get machines
      const response = await maasApiClient.get('/machines/', apiParams);
      
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

      requestLogger.info({ machineCount: machines.length }, 'Successfully retrieved machines');
      
      // Return as JSON string for FastMCP
      return JSON.stringify({
        machines,
        count: machines.length
      });
    } catch (error) {
      requestLogger.error({ error }, 'Error listing machines');
      throw error;
    }
  }
});

// Add machine details resource
server.addResourceTemplate({
  uriTemplate: "maas://machine/{system_id}/details",
  name: "Machine Details",
  mimeType: "application/json",
  arguments: [
    {
      name: "system_id",
      description: "System ID of the machine",
      required: true,
    },
  ],
  async load(args) {
    const system_id = args.system_id;
    logger.info(`Fetching details for MAAS machine: ${system_id}`);
    
    try {
      // Call MAAS API to get machine details
      const machineDetails = await maasApiClient.get(`/machines/${system_id}/`);
      
      // Return the machine details
      return {
        text: JSON.stringify(machineDetails)
      };
    } catch (error) {
      logger.error(`Error fetching machine details: ${error}`);
      throw error;
    }
  }
});

// Start the server
// Use port 3002 to match the mcp.json configuration
const portValue = process.env.MCP_PORT || process.env.PORT || config.mcpPort || 3002;
const port = typeof portValue === 'string' ? parseInt(portValue, 10) : portValue;

// Determine the transport type based on environment
const isCliEnvironment = process.env.NODE_ENV === 'cli' || process.argv.includes('--cli');

if (isCliEnvironment) {
  // Use stdio transport for CLI usage
  server.start({
    transportType: "stdio"
  });
  logger.info('MCP Server started with stdio transport');
} else {
  // Use httpStream transport for normal operation
  server.start({
    transportType: "httpStream",
    httpStream: {
      endpoint: "/mcp",
      port: port
    },
    authentication: {
      enabled: false, // Disable authentication for testing
      sessionIdGenerator: () => null // Don't require session ID
    }
  });
  logger.info(`MCP Server for MAAS API listening on http://localhost:${port}/mcp`);
  logger.info(`Audit logging ${config.auditLogEnabled ? 'enabled' : 'disabled'}`);
  logger.info(`Using MCP protocol version: ${protocolVersion || 'default'}`);
}