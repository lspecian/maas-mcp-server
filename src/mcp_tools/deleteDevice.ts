// src/mcp_tools/deleteDevice.ts
const { z } = require('zod');
const { MaasApiClient } = require('../maas/MaasApiClient');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { baseDeleteRequestSchema, deleteSuccessResponseSchema } = require('./schemas/writeOps');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');

// Define schema for delete device tool
const deleteDeviceSchema = z.object({
  system_id: z.string().describe("System ID of the device to delete"),
  _meta: metaSchema
});

// Define schema for delete device output
const deleteDeviceOutputSchema = z.object({
  success: z.boolean().describe("Whether the deletion was successful"),
  system_id: z.string().describe("System ID of the deleted device"),
  _meta: metaSchema
});

/**
 * Register the delete device tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDeleteDeviceTool(server, maasClient) {
  server.tool(
    "deleteDevice",
    "Delete a device from MAAS",
    deleteDeviceSchema,
    async (params) => {
      const logger = createRequestLogger('deleteDevice');
      logger.info({ params }, 'Executing deleteDevice tool');

      try {
        // Call MAAS API to delete the device
        await maasClient.delete(`/devices/${params.system_id}/`);

        logger.info({ deviceId: params.system_id }, 'Successfully deleted device');

        // Return success response
        return {
          success: true,
          system_id: params.system_id,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error, deviceId: params.system_id }, 'Error deleting device');
        throw error;
      }
    }
  );
}

module.exports = { registerDeleteDeviceTool };