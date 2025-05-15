/**
 * MAAS MCP Server - Main Entry Point
 *
 * This file initializes and starts the MCP server that acts as a bridge between
 * the Model Context Protocol (MCP) and the Canonical MAAS API. It sets up the
 * Express application, registers all MCP tools and resources, and configures
 * request handling and error management.
 *
 * @module index
 */

const path = require('path');
const { FastMCP } = require('fastmcp');

// Import configuration and utilities
const config = require('./config');
const logger = require('./utils/logger');
const { generateRequestId } = logger;
const { initializeAuditLogger } = require('./utils/initAuditLogger');
const { MaasApiClient } = require('./maas/MaasApiClient');

/**
 * Initialize the audit logger for tracking API operations
 * This enables detailed logging of all resource access and modifications
 * for security and compliance purposes.
 */
initializeAuditLogger();

/**
 * Create the MAAS API client instance
 * This client handles all communication with the Canonical MAAS API,
 * including authentication, request formatting, and error handling.
 */
const maasApiClient = new MaasApiClient();

/**
 * Initialize the FastMCP Server
 *
 * This creates the main MCP server instance that will handle all client requests.
 * It's configured with server information and capabilities.
 * The server exposes MAAS functionality through MCP tools and resources.
 */
const server = new FastMCP({
  name: "MAAS-API-MCP-Server",
  version: "1.0.0",
  instructions: "This MCP server provides access to Canonical MAAS API functionality. Use the available tools to manage machines, tags, and other MAAS resources.",
  ping: {
    // Configure ping behavior
    intervalMs: 10000, // 10 seconds
    logLevel: "debug",
  },
  roots: {
    // Enable roots support
    enabled: true,
  },
});

/**
 * Import the registration functions for MCP tools and resources
 * These functions will register all available MAAS operations with the MCP server
 */
const { registerTools } = require('./mcp_tools/index');
const { registerMcpResources } = require('./mcp_resources/index');

/**
 * Register all MCP tools and resources with the server
 * - Tools: Active operations like creating tags, deploying machines, etc.
 * - Resources: Data access points like machine details, subnet information, etc.
 */
/**
 * Create an adapter for the MCP server to work with the existing code
 * This adapter converts FastMCP methods to the expected McpServer methods
 */
const serverAdapter = {
  // Original server instance
  _server: server,
  
  // Tool adapter - converts server.tool() to server.addTool()
  tool: function(name: string, description: string, inputSchema: any, callback: any) {
    this._server.addTool({
      name: name,
      description: description,
      parameters: inputSchema,
      execute: callback
    });
  },
  
  // Resource adapter - converts server.resource() to server.addResourceTemplate()
  resource: function(name: string, resourceTemplate: any) {
    this._server.addResourceTemplate({
      name: name,
      uriTemplate: resourceTemplate.uriPattern,
      mimeType: "application/json",
      arguments: [],
      async load(params: any) {
        return await resourceTemplate.handler(resourceTemplate.uriPattern, params, null);
      }
    });
  }
};

// Register tools and resources using the adapter
registerTools(serverAdapter, maasApiClient);
registerMcpResources(serverAdapter, maasApiClient);

/**
 * Add a health check tool
 * This allows clients to check if the server is running properly
 */
server.addTool({
  name: "health-check",
  description: "Check if the server is running properly",
  execute: async () => {
    return JSON.stringify({ status: 'ok' });
  },
});

/**
 * Set up audit logging for the server
 * This logs all tool executions and resource accesses
 */
if (config.auditLogEnabled) {
  const auditLogger = require('./utils/auditLogger');
  const { generateRequestId } = logger;
  
  // Listen for connect events to set up session-specific logging
  server.on('connect', (event: any) => {
    const session = event.session;
    
    // Log tool executions
    session.on('toolExecute', (event: any) => {
      const requestId = generateRequestId();
      const toolName = event.name;
      const toolArgs = event.arguments;
      const userId = 'anonymous'; // In a real implementation, you would get this from authentication
      const clientIp = '127.0.0.1'; // In a real implementation, you would get this from the request
      
      // Determine if this is a modification operation based on tool name
      const modificationTools = ['allocateMachine', 'deployMachine', 'createTag', 'updateMachine', 'deleteMachine'];
      const isModification = modificationTools.some(tool => toolName.includes(tool));
      
      if (isModification) {
        auditLogger.logResourceModification(
          'tool',
          toolName,
          'execute',
          requestId,
          undefined, // beforeState
          undefined, // afterState
          userId,
          clientIp,
          {
            toolName,
            arguments: toolArgs ? JSON.stringify(toolArgs).substring(0, 200) : undefined
          }
        );
      } else {
        auditLogger.logResourceAccess(
          'tool',
          toolName,
          'execute',
          requestId,
          userId,
          clientIp,
          {
            toolName,
            arguments: toolArgs ? JSON.stringify(toolArgs).substring(0, 200) : undefined
          }
        );
      }
    });
    
    // Log resource accesses
    session.on('resourceAccess', (event: any) => {
      const requestId = generateRequestId();
      const uri = new URL(event.uri);
      const resourceType = uri.pathname.split('/')[1] || 'unknown';
      const resourceId = uri.pathname.split('/')[2];
      const userId = 'anonymous'; // In a real implementation, you would get this from authentication
      const clientIp = '127.0.0.1'; // In a real implementation, you would get this from the request
      
      auditLogger.logResourceAccess(
        resourceType,
        resourceId,
        'access',
        requestId,
        userId,
        clientIp,
        {
          uri: event.uri
        }
      );
    });
    
    // Log errors
    session.on('error', (event: any) => {
      const requestId = generateRequestId();
      const error = event.error;
      const userId = 'anonymous'; // In a real implementation, you would get this from authentication
      const clientIp = '127.0.0.1'; // In a real implementation, you would get this from the request
      
      logger.error({
        err: error,
        errMsg: error.message,
        errStack: error.stack?.substring(0, 500),
        requestId
      }, 'Error handling MCP request');
      
      // Additional error logging could be added here
    });
  });
}

/**
 * Start the server with HTTP streaming transport
 * This allows clients to connect to the server over HTTP
 */
// Use the configured port from the environment
const port = config.mcpPort; // Use the port specified in MCP_PORT (3002)
server.start({
  transportType: "httpStream",
  httpStream: {
    endpoint: "/mcp",
    port: port,
  },
});

logger.info(`MCP Server for MAAS API listening on http://localhost:${port}/mcp`);
logger.info(`Audit logging ${config.auditLogEnabled ? 'enabled' : 'disabled'}`);