const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { z } = require('zod');
const { MaasApiClient } = require("../maas/MaasApiClient");
const { listSubnetsSchema, listSubnetsOutputSchema } = require('./schemas/listSubnetsSchema');
const { createRequestLogger } = require("../utils/logger");
const { createProgressSender } = require("../utils/progressNotification");

/**
 * Registers the list subnets tool with the MCP server.
 * This tool retrieves a list of subnets from the MAAS API with optional filtering parameters.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {MaasApiClient} maasClient - The MAAS API client instance
 */
function registerListSubnetsTool(server, maasClient) {
  server.registerTool({
    name: "listSubnets",
    description: "List subnets from MAAS with optional filtering",
    inputSchema: listSubnetsSchema,
    outputSchema: listSubnetsOutputSchema,
    execute: async (params) => {
      const logger = createRequestLogger('listSubnets');
      const progressSender = createProgressSender(params._meta?.requestId);
      
      logger.info({ params }, 'Executing listSubnets tool');
      
      try {
        // Start progress notification
        progressSender.start('Retrieving subnets from MAAS');
        
        // Build query parameters for MAAS API
        const queryParams = {};
        if (params.cidr) queryParams.cidr = params.cidr;
        if (params.name) queryParams.name = params.name;
        if (params.vlan) queryParams.vlan = params.vlan;
        if (params.fabric) queryParams.fabric = params.fabric;
        if (params.space) queryParams.space = params.space;
        
        // Update progress
        progressSender.update('Fetching subnets data');
        
        // Call MAAS API to get subnets
        const subnets = await maasClient.get('/subnets/', queryParams);
        
        // Transform the response to match our schema
        const transformedSubnets = subnets.map(subnet => ({
          id: subnet.id,
          name: subnet.name,
          cidr: subnet.cidr,
          vlan: {
            id: subnet.vlan.id,
            name: subnet.vlan.name,
            fabric: subnet.vlan.fabric_name
          },
          space: subnet.space,
          gateway_ip: subnet.gateway_ip,
          dns_servers: subnet.dns_servers,
          managed: subnet.managed,
          active_discovery: subnet.active_discovery,
          allow_dns: subnet.allow_dns,
          allow_proxy: subnet.allow_proxy,
          rdns_mode: subnet.rdns_mode,
          description: subnet.description || ''
        }));
        
        // Complete progress
        progressSender.complete('Successfully retrieved subnets');
        
        logger.info({ count: transformedSubnets.length }, 'Successfully retrieved subnets');
        
        // Return the response
        return {
          subnets: transformedSubnets,
          _meta: params._meta || {}
        };
      } catch (error) {
        // Handle error and send error progress
        progressSender.error(`Error retrieving subnets: ${error.message}`);
        logger.error({ error }, 'Error retrieving subnets');
        throw error;
      }
    }
  });
}

module.exports = { registerListSubnetsTool };