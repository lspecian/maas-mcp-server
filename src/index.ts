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

import express from 'express';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import config from './config.js';
import logger, { generateRequestId } from './utils/logger.js';
import { MaasApiClient } from './maas/MaasApiClient.js';
import { initializeAuditLogger } from './utils/initAuditLogger.js';

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
 * Initialize the MCP Server
 *
 * This creates the main MCP server instance that will handle all client requests.
 * It's configured with server information, protocol version, and capabilities.
 * The server exposes MAAS functionality through MCP tools and resources.
 */
const server = new McpServer({
  name: "MAAS-API-MCP-Server",
  version: "1.0.0",
  protocolVersion: LATEST_PROTOCOL_VERSION,
  serverInfo: {
    name: "Canonical MAAS API Bridge for MCP",
    version: "0.1.0",
    instructions: "This MCP server provides access to Canonical MAAS API functionality. Use the available tools to manage machines, tags, and other MAAS resources."
  },
  capabilities: {
    resources: {
      listChanged: false, // Resource list doesn't change during server lifetime
    },
    tools: {
      listChanged: false, // Tool list doesn't change during server lifetime
    },
  },
});

/**
 * Import the registration functions for MCP tools and resources
 * These functions will register all available MAAS operations with the MCP server
 */
import { registerTools } from './mcp_tools/index.js';
import { registerResources } from './mcp_resources/index.js';

/**
 * Register all MCP tools and resources with the server
 * - Tools: Active operations like creating tags, deploying machines, etc.
 * - Resources: Data access points like machine details, subnet information, etc.
 */
registerTools(server, maasApiClient);
registerResources(server, maasApiClient);

/**
 * Create the Express application to handle HTTP requests
 * This app will serve as the web server for the MCP server
 */
const app = express();

/**
 * Configure middleware for request processing
 * - JSON body parser with 10MB limit for handling large request payloads
 */
app.use(express.json({ limit: '10mb' }));

/**
 * Health check endpoint
 *
 * This endpoint allows monitoring systems to verify that the server is running.
 * It returns a simple JSON response with status "ok" and a 200 status code.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * MCP endpoint
 *
 * This is the main endpoint that handles all MCP protocol requests.
 * It processes incoming requests, routes them to the appropriate handlers,
 * and returns the results according to the MCP protocol specification.
 *
 * The endpoint also handles:
 * - Request logging
 * - Audit logging
 * - Error handling
 * - Client information extraction
 * - Transport lifecycle management
 */
app.post('/mcp', async (req, res) => {
  const requestId = generateRequestId();
  // Use a more specific logger name if possible, or ensure logger is configured to show context
  const requestLogger = logger.child({ requestId, mcpMethod: req.body?.method });

  // Extract client information
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userId = req.headers['x-user-id'] || 'anonymous';

  requestLogger.info({
    params: req.body?.params ? JSON.stringify(req.body.params).substring(0, 200) : undefined,
    clientIp,
    userId
  }, 'Received MCP request');

  // Audit log the MCP request if audit logging is enabled
  if (config.auditLogEnabled) {
    const auditLogger = await import('./utils/auditLogger.js');
    
    // Determine if this is a resource access or modification
    const isResourceRequest = req.body?.params?.uri && typeof req.body.params.uri === 'string';
    const isToolRequest = req.body?.method === 'executeTool' && req.body?.params?.name;
    
    if (isResourceRequest) {
      // This is a resource request
      const uri = new URL(req.body.params.uri);
      const resourceType = uri.pathname.split('/')[1] || 'unknown';
      const resourceId = uri.pathname.split('/')[2];
      
      auditLogger.logResourceAccess(
        resourceType,
        resourceId,
        'access',
        requestId,
        userId as string,
        clientIp as string,
        {
          uri: req.body.params.uri,
          method: req.body.method
        }
      );
    } else if (isToolRequest) {
      // This is a tool request
      const toolName = req.body.params.name;
      const toolArgs = req.body.params.arguments;
      
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
          userId as string,
          clientIp as string,
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
          userId as string,
          clientIp as string,
          {
            toolName,
            arguments: toolArgs ? JSON.stringify(toolArgs).substring(0, 200) : undefined
          }
        );
      }
    }
  }

  /**
   * Create a transport instance to handle the MCP protocol
   *
   * The StreamableHTTPServerTransport handles the low-level details of
   * the MCP protocol over HTTP, including request parsing, response formatting,
   * and streaming for long-running operations.
   */
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined // Stateless operation - we don't maintain session state
  });
  
  // Assign the server instance to the transport
  // Note: This is a workaround for the current SDK design
  (transport as any).mcpServer = server;

  try {
    /**
     * Process the MCP request
     *
     * This delegates the request handling to the transport, which will:
     * 1. Parse the request according to the MCP protocol
     * 2. Route it to the appropriate handler in the MCP server
     * 3. Format the response according to the protocol
     * 4. Send the response back to the client
     */
    await transport.handleRequest(req, res, req.body);
    requestLogger.info('MCP request handled successfully');
    
    // Audit log the successful response if audit logging is enabled
    if (config.auditLogEnabled) {
      const auditLogger = await import('./utils/auditLogger.js');
      
      // Log success based on request type
      const isResourceRequest = req.body?.params?.uri && typeof req.body.params.uri === 'string';
      const isToolRequest = req.body?.method === 'executeTool' && req.body?.params?.name;
      
      if (isToolRequest) {
        const toolName = req.body.params.name;
        const modificationTools = ['allocateMachine', 'deployMachine', 'createTag', 'updateMachine', 'deleteMachine'];
        const isModification = modificationTools.some(tool => toolName.includes(tool));
        
        if (isModification) {
          auditLogger.logResourceModification(
            'tool',
            toolName,
            'execute_success',
            requestId,
            undefined, // beforeState
            undefined, // afterState
            userId as string,
            clientIp as string
          );
        }
      }
    }
  } catch (error: any) {
    requestLogger.error({ err: error, errMsg: error.message, errStack: error.stack?.substring(0, 500) }, 'Error handling MCP request');
    
    // Audit log the error if audit logging is enabled
    if (config.auditLogEnabled) {
      const auditLogger = await import('./utils/auditLogger.js');
      
      // Determine request type for error logging
      const isResourceRequest = req.body?.params?.uri && typeof req.body.params.uri === 'string';
      const isToolRequest = req.body?.method === 'executeTool' && req.body?.params?.name;
      
      if (isResourceRequest) {
        // This is a resource request
        const uri = new URL(req.body.params.uri);
        const resourceType = uri.pathname.split('/')[1] || 'unknown';
        const resourceId = uri.pathname.split('/')[2];
        
        auditLogger.logResourceAccessFailure(
          resourceType,
          resourceId,
          'access_failure',
          requestId,
          error,
          userId as string,
          clientIp as string,
          {
            uri: req.body.params.uri,
            method: req.body.method
          }
        );
      } else if (isToolRequest) {
        // This is a tool request
        const toolName = req.body.params.name;
        const modificationTools = ['allocateMachine', 'deployMachine', 'createTag', 'updateMachine', 'deleteMachine'];
        const isModification = modificationTools.some(tool => toolName.includes(tool));
        
        if (isModification) {
          auditLogger.logResourceModificationFailure(
            'tool',
            toolName,
            'execute_failure',
            requestId,
            error,
            undefined, // beforeState
            userId as string,
            clientIp as string,
            {
              toolName,
              arguments: req.body.params.arguments ? JSON.stringify(req.body.params.arguments).substring(0, 200) : undefined
            }
          );
        } else {
          auditLogger.logResourceAccessFailure(
            'tool',
            toolName,
            'execute_failure',
            requestId,
            error,
            userId as string,
            clientIp as string,
            {
              toolName,
              arguments: req.body.params.arguments ? JSON.stringify(req.body.params.arguments).substring(0, 200) : undefined
            }
          );
        }
      }
    }
    /**
     * Send a fallback error response if headers haven't been sent yet
     *
     * This ensures that clients always receive a proper JSON-RPC error response
     * even if the error occurred before the transport could send a response.
     */
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32000, // Standard JSON-RPC Internal error
          message: 'Internal server error during MCP request processing.',
        },
        id: req.body?.id || null
      });
    }
  } finally {
    /**
     * Ensure proper cleanup of transport resources
     *
     * This guarantees that the transport is closed and resources are released
     * in all scenarios, including:
     * - Normal request completion
     * - Error during processing
     * - Client disconnection
     */
    res.on('finish', () => transport.close());
    res.on('close', () => {
      if (!res.writableEnded) { // If 'finish' wasn't called (e.g. client disconnected)
          transport.close();
      }
    });
  }
});

/**
 * Start the HTTP server
 *
 * This starts the Express application listening on the configured port.
 * Once started, the server will accept MCP requests and process them.
 */
const port = config.mcpPort;
app.listen(port, () => {
  logger.info(`MCP Server for MAAS API listening on http://localhost:${port}/mcp`);
  logger.info(`Audit logging ${config.auditLogEnabled ? 'enabled' : 'disabled'}`);
});