/**
 * MCP Resources for MAAS API
 *
 * This module provides MCP resources for accessing MAAS API data.
 * It defines URI patterns, resource templates, and handlers for each resource type.
 */
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient");
const logger = require("../utils/logger");

// Import resource handlers
const { registerTagsResource } = require('./tagsResource');
const { registerDomainResource } = require('./domainResource');
const { registerZoneResource } = require('./zoneResource');
const { registerDeviceResource } = require('./deviceResource');
const { registerMachineDetailsResource } = require('./machineDetails');
const { registerSubnetDetailsResource } = require('./subnetDetails');

/**
 * Register all MCP resources with the MCP server
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {MaasApiClient} maasClient - The MAAS API client instance
 */
function registerMcpResources(server, maasClient) {
  logger.info('Registering MCP resources');
  
  // Register all resources
  registerTagsResource(server, maasClient);
  registerDomainResource(server, maasClient);
  registerZoneResource(server, maasClient);
  registerDeviceResource(server, maasClient);
  registerMachineDetailsResource(server, maasClient);
  registerSubnetDetailsResource(server, maasClient);
  
  logger.info('MCP resources registered');
}

module.exports = { registerMcpResources };