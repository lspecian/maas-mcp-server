// src/mcp_tools/updateNetwork.ts
const { z } = require('zod');
const { MaasApiClient } = require('../maas/MaasApiClient');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { basePutRequestSchema, putSuccessResponseSchema } = require('./schemas/writeOps');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');

// Define schema for update network tool
const updateNetworkSchema = z.object({
  id: z.string().describe("ID of the network to update"),
  name: z.string().optional().describe("New name for the network"),
  fabric: z.string().optional().describe("New fabric for the network"),
  vlan: z.string().optional().describe("New VLAN for the network"),
  description: z.string().optional().describe("New description for the network"),
  _meta: metaSchema
});

// Define schema for update network output
const updateNetworkOutputSchema = z.object({
  id: z.string().describe("ID of the updated network"),
  name: z.string().describe("Name of the updated network"),
  fabric: z.string().describe("Fabric of the updated network"),
  vlan: z.string().describe("VLAN of the updated network"),
  _meta: metaSchema
});

/**
 * Register the update network tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerUpdateNetworkTool(server, maasClient) {
  server.registerTool({
    name: "updateNetwork",
    description: "Update a network in MAAS",
    inputSchema: updateNetworkSchema,
    outputSchema: updateNetworkOutputSchema,
    execute: async (params) => {
      const logger = createRequestLogger('updateNetwork');
      logger.info({ params }, 'Executing updateNetwork tool');

      try {
        // Prepare parameters for MAAS API
        const apiParams = {};

        // Add parameters if provided
        if (params.name) apiParams.name = params.name;
        if (params.fabric) apiParams.fabric = params.fabric;
        if (params.vlan) apiParams.vlan = params.vlan;
        if (params.description) apiParams.description = params.description;

        // Call MAAS API to update the network
        const response = await maasClient.put(`/networks/${params.id}/`, apiParams);

        logger.info({ networkId: response.id }, 'Successfully updated network');

        // Return the response
        return {
          id: response.id,
          name: response.name,
          fabric: response.fabric,
          vlan: response.vlan,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error, networkId: params.id }, 'Error updating network');
        throw error;
      }
    }
  });
}

module.exports = { registerUpdateNetworkTool };