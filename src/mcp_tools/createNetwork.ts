const { z } = require('zod');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require('../maas/MaasApiClient');
const { basePostRequestSchema, postSuccessResponseSchema } = require('./schemas/writeOps');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');

const createNetworkPayloadSchema = z.object({
  name: z.string().describe('The name of the network.'),
  fabric: z.string().describe('The name or ID of the fabric this network belongs to.'),
  vlan: z.string().optional().describe('The VLAN tag for this network.'),
  description: z.string().optional().describe('Optional description for the network.'),
  _meta: metaSchema
});

// Extend the base post request schema with our specific payload
const createNetworkRequestSchema = basePostRequestSchema.extend({
  ...createNetworkPayloadSchema.shape
});

// Extend the post success response schema with network-specific fields
const createNetworkResponseSchema = postSuccessResponseSchema.extend({
  network_id: z.string().describe('The ID of the created network.'),
  name: z.string().describe('The name of the created network.'),
  fabric: z.string().describe('The fabric of the created network.'),
  vlan: z.string().describe('The VLAN of the created network.')
});

/**
 * Register the create network tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerCreateNetworkTool(server, maasClient) {
  server.registerTool({
    name: "createNetwork",
    description: "Create a new network in MAAS",
    inputSchema: createNetworkRequestSchema,
    outputSchema: createNetworkResponseSchema,
    execute: async (params) => {
      const logger = createRequestLogger('createNetwork');
      logger.info({ params }, 'Executing createNetwork tool');

      try {
        // Prepare parameters for MAAS API
        const apiParams = {
          name: params.name,
          fabric: params.fabric
        };

        // Add optional parameters if provided
        if (params.vlan) apiParams.vlan = params.vlan;
        if (params.description) apiParams.description = params.description;

        // Call MAAS API to create the network
        const response = await maasClient.post('/networks/', apiParams);

        logger.info({ networkId: response.id }, 'Successfully created network');

        // Return the response
        return {
          success: true,
          created: true,
          message: `Network '${response.name}' created successfully.`,
          resource_id: response.id,
          network_id: response.id,
          name: response.name,
          fabric: response.fabric,
          vlan: response.vlan,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error }, 'Error creating network');
        throw error;
      }
    }
  });
}

module.exports = { registerCreateNetworkTool };