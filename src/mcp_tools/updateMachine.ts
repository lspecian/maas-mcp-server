// src/mcp_tools/updateMachine.ts
const { z } = require('zod');
const { MaasApiClient } = require('../maas/MaasApiClient');
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const {
  errorToMcpResult,
  handleMaasApiError,
  handleValidationError,
  ErrorType,
  MaasServerError
} = require('../utils/errorHandler');
const { createRequestLogger } = require('../utils/logger');
const { metaSchema } = require('./schemas/common');

// Define schema for update machine tool
const updateMachineSchema = z.object({
  system_id: z.string().describe("System ID of the machine to update"),
  hostname: z.string().optional().describe("New hostname for the machine"),
  domain: z.string().optional().describe("New domain for the machine"),
  zone: z.string().optional().describe("New zone for the machine"),
  pool: z.string().optional().describe("New resource pool for the machine"),
  power_type: z.string().optional().describe("New power type for the machine"),
  power_parameters: z.record(z.string()).optional().describe("New power parameters for the machine"),
  _meta: metaSchema
});

// Define schema for update machine output
const updateMachineOutputSchema = z.object({
  system_id: z.string().describe("System ID of the updated machine"),
  hostname: z.string().describe("Hostname of the updated machine"),
  status: z.string().describe("Status of the updated machine"),
  _meta: metaSchema
});

/**
 * Register the update machine tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerUpdateMachineTool(server, maasClient) {
  server.registerTool({
    name: "updateMachine",
    description: "Update a machine in MAAS",
    inputSchema: updateMachineSchema,
    outputSchema: updateMachineOutputSchema,
    execute: async (params) => {
      const logger = createRequestLogger('updateMachine');
      logger.info({ params }, 'Executing updateMachine tool');

      try {
        // Prepare parameters for MAAS API
        const apiParams = {};

        // Add parameters if provided
        if (params.hostname) apiParams.hostname = params.hostname;
        if (params.domain) apiParams.domain = params.domain;
        if (params.zone) apiParams.zone = params.zone;
        if (params.pool) apiParams.pool = params.pool;
        if (params.power_type) apiParams.power_type = params.power_type;
        if (params.power_parameters) apiParams.power_parameters = params.power_parameters;

        // Call MAAS API to update the machine
        const response = await maasClient.put(`/machines/${params.system_id}/`, apiParams);

        logger.info({ machineId: response.system_id }, 'Successfully updated machine');

        // Return the response
        return {
          system_id: response.system_id,
          hostname: response.hostname,
          status: response.status_name,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error, machineId: params.system_id }, 'Error updating machine');
        
        // Handle different types of errors
        if (error.name === 'ValidationError') {
          throw handleValidationError(error);
        } else if (error.statusCode || error.status) {
          throw handleMaasApiError(error);
        } else {
          throw new MaasServerError(
            'Failed to update machine: ' + error.message,
            ErrorType.INTERNAL,
            { originalError: error.message }
          );
        }
      }
    }
  });
}

module.exports = { registerUpdateMachineTool };