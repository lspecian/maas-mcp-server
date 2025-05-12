// src/mcp_tools/updateDevice.ts
const { z } = require('zod');
const { MaasApiClient } = require('../maas/MaasApiClient');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { basePutRequestSchema, putSuccessResponseSchema } = require('./schemas/writeOps');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');

// Define schema for update device tool
const updateDeviceSchema = z.object({
  system_id: z.string().describe("System ID of the device to update"),
  hostname: z.string().optional().describe("New hostname for the device"),
  domain: z.string().optional().describe("New domain for the device"),
  zone: z.string().optional().describe("New zone for the device"),
  description: z.string().optional().describe("New description for the device"),
  _meta: metaSchema
});

// Define schema for update device output
const updateDeviceOutputSchema = z.object({
  system_id: z.string().describe("System ID of the updated device"),
  hostname: z.string().describe("Hostname of the updated device"),
  domain: z.string().describe("Domain of the updated device"),
  zone: z.string().describe("Zone of the updated device"),
  _meta: metaSchema
});

/**
 * Register the update device tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerUpdateDeviceTool(server, maasClient) {
  server.registerTool({
    name: "updateDevice",
    description: "Update a device in MAAS",
    inputSchema: updateDeviceSchema,
    outputSchema: updateDeviceOutputSchema,
    execute: async (params) => {
      const logger = createRequestLogger('updateDevice');
      logger.info({ params }, 'Executing updateDevice tool');

      try {
        // Prepare parameters for MAAS API
        const apiParams = {};

        // Add parameters if provided
        if (params.hostname) apiParams.hostname = params.hostname;
        if (params.domain) apiParams.domain = params.domain;
        if (params.zone) apiParams.zone = params.zone;
        if (params.description) apiParams.description = params.description;

        // Call MAAS API to update the device
        const response = await maasClient.put(`/devices/${params.system_id}/`, apiParams);

        logger.info({ deviceId: response.system_id }, 'Successfully updated device');

        // Return the response
        return {
          system_id: response.system_id,
          hostname: response.hostname,
          domain: response.domain.name,
          zone: response.zone.name,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error, deviceId: params.system_id }, 'Error updating device');
        throw error;
      }
    }
  });
}

module.exports = { registerUpdateDeviceTool };