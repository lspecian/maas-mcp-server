// src/mcp_tools/deleteNetwork.ts
const { z } = require('zod');
const { MaasApiClient } = require('../maas/MaasApiClient');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { baseDeleteRequestSchema, deleteSuccessResponseSchema } = require('./schemas/writeOps');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');

// Define schema for delete network tool
const deleteNetworkSchema = z.object({
  id: z.string().describe("ID of the network to delete"),
  _meta: metaSchema
});

// Define schema for delete network output
const deleteNetworkOutputSchema = z.object({
  success: z.boolean().describe("Whether the deletion was successful"),
  id: z.string().describe("ID of the deleted network"),
  _meta: metaSchema
});

/**
 * Register the delete network tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDeleteNetworkTool(server, maasClient) {
  server.tool(
    "deleteNetwork",
    "Delete a network from MAAS",
    deleteNetworkSchema,
    async (params) => {
      const logger = createRequestLogger('deleteNetwork');
      logger.info({ params }, 'Executing deleteNetwork tool');

      try {
        // Call MAAS API to delete the network
        await maasClient.delete(`/networks/${params.id}/`);

        logger.info({ networkId: params.id }, 'Successfully deleted network');

        // Return success response
        return {
          success: true,
          id: params.id,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error, networkId: params.id }, 'Error deleting network');
        throw error;
      }
    }
  );
}

module.exports = { registerDeleteNetworkTool };