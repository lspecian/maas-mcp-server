// src/mcp_tools/deleteMachine.ts
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

// Define schema for delete machine tool
const deleteMachineSchema = z.object({
  system_id: z.string().describe("System ID of the machine to delete"),
  _meta: metaSchema
});

// Define schema for delete machine output
const deleteMachineOutputSchema = z.object({
  success: z.boolean().describe("Whether the deletion was successful"),
  system_id: z.string().describe("System ID of the deleted machine"),
  _meta: metaSchema
});

/**
 * Register the delete machine tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDeleteMachineTool(server, maasClient) {
  server.registerTool({
    name: "deleteMachine",
    description: "Delete a machine from MAAS",
    inputSchema: deleteMachineSchema,
    outputSchema: deleteMachineOutputSchema,
    execute: async (params) => {
      const logger = createRequestLogger('deleteMachine');
      logger.info({ params }, 'Executing deleteMachine tool');

      try {
        // Call MAAS API to delete the machine
        await maasClient.delete(`/machines/${params.system_id}/`);

        logger.info({ machineId: params.system_id }, 'Successfully deleted machine');

        // Return success response
        return {
          success: true,
          system_id: params.system_id,
          _meta: params._meta || {}
        };
      } catch (error) {
        logger.error({ error, machineId: params.system_id }, 'Error deleting machine');
        
        // Handle different types of errors
        if (error.name === 'ValidationError') {
          throw handleValidationError(error);
        } else if (error.statusCode || error.status) {
          throw handleMaasApiError(error);
        } else {
          throw new MaasServerError(
            'Failed to delete machine: ' + error.message,
            ErrorType.INTERNAL,
            { originalError: error.message }
          );
        }
      }
    }
  });
}

module.exports = { registerDeleteMachineTool };