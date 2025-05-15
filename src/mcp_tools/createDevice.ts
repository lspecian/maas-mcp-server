const { z } = require('zod');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require('../maas/MaasApiClient');
const { basePostRequestSchema, postSuccessResponseSchema } = require('./schemas/writeOps');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');

const createDevicePayloadSchema = z.object({
  name: z.string().describe('The name of the device.'),
  parent: z.string().optional().describe('The system_id of the parent machine or device.'),
  domain: z.string().optional().describe('The domain name for the device.'),
  zone: z.string().optional().describe('The zone name for the device.'),
  mac_addresses: z.array(z.string()).min(1).describe('MAC addresses for the device interfaces.'),
  description: z.string().optional().describe('Optional description for the device.'),
  _meta: metaSchema
});

// Extend the base post request schema with our specific payload
const createDeviceRequestSchema = basePostRequestSchema.extend({
  ...createDevicePayloadSchema.shape
});

// Extend the post success response schema with device-specific fields
const createDeviceResponseSchema = postSuccessResponseSchema.extend({
  device_id: z.string().describe('The system_id of the created device.'),
  name: z.string().describe('The name of the created device.'),
  domain: z.string().describe('The domain of the created device.'),
  zone: z.string().describe('The zone of the created device.')
});

/**
 * Register the create device tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerCreateDeviceTool(server, maasClient) {
  server.tool(
    "createDevice",
    "Create a new device in MAAS",
    createDeviceRequestSchema,
    async (params) => {
      const logger = createRequestLogger('createDevice');
      logger.info({ params }, 'Executing createDevice tool');

      try {
        // Prepare parameters for MAAS API
        const apiParams = {
          name: params.name,
          mac_addresses: params.mac_addresses
        };

        // Add optional parameters if provided
        if (params.parent) apiParams.parent = params.parent;
        if (params.domain) apiParams.domain = params.domain;
        if (params.zone) apiParams.zone = params.zone;
        if (params.description) apiParams.description = params.description;

        // Call MAAS API to create the device
        const response = await maasClient.post('/devices/', apiParams);

        logger.info({ deviceId: response.system_id }, 'Successfully created device');

        // Return the response
        return {
          success: true,
          created: true,
          message: `Device '${response.hostname}' created successfully.`,
          resource_id: response.system_id,
          device_id: response.system_id,
          name: response.hostname,
          domain: response.domain.name,
          zone: response.zone.name,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error }, 'Error creating device');
        throw error;
      }
    }
  );
}

module.exports = { registerCreateDeviceTool };