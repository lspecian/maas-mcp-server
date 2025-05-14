/**
 * MAAS MCP Server - FastMCP Implementation
 *
 * This file initializes and starts the MCP server using FastMCP framework
 * that acts as a bridge between the Model Context Protocol (MCP) and the
 * Canonical MAAS API.
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import path from 'path';
import config from './config.js';
import logger from './utils/logger.js';
import { MaasApiClient } from './maas/MaasApiClient.js';
import { initializeAuditLogger } from './utils/initAuditLogger.js';
import type { Context } from 'fastmcp';

// Import schemas for the listMachines tool
import {
  listMachinesParamsSchema,
  listMachinesOutputSchema,
  ListMachinesParams
} from './mcp_tools/schemas/listMachinesSchema.js';

// Initialize the audit logger
initializeAuditLogger();

// Create the MAAS API client instance
const maasApiClient = new MaasApiClient();

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

// Register the listMachines tool
server.addTool({
  name: "listMachines",
  description: "List machines from the MAAS API with optional filtering",
  parameters: listMachinesParamsSchema,
  execute: async (args: ListMachinesParams, context: any) => {
    const requestLogger = logger.child({
      toolName: 'listMachines'
    });
    
    requestLogger.info({ args }, 'Executing listMachines tool');

    try {
      // Convert parameters to MAAS API format
      const apiParams: Record<string, any> = {};
      
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
      const machines = response.map((machine: any) => ({
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
    const system_id = args.system_id as string;
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
    }
  });
  logger.info(`MCP Server for MAAS API listening on http://localhost:${port}/mcp`);
  logger.info(`Audit logging ${config.auditLogEnabled ? 'enabled' : 'disabled'}`);
  logger.info(`Using MCP protocol version: ${protocolVersion || 'default'}`);
  
  // Log available tools for Roo integration
  logger.info('Available tools:');
  logger.info('- listMachines: List machines from the MAAS API with optional filtering');
  logger.info('Available resources:');
  logger.info('- maas://machine/{system_id}/details: Get details for a specific machine');
}