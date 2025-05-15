/* eslint-disable */
// @ts-nocheck
import path from 'path';
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from "../maas/MaasApiClient.ts";
import { z } from "zod";
import { machineIdSchema, osSystemSchema, distroSeriesSchema, metaSchema } from "./schemas/common.ts";
import {
  withOperationHandler,
  OperationContext,
  handleOperationError
} from "../utils/operationHandlerUtils.ts";
import { MaasServerError, ErrorType } from "../utils/errorHandler.ts";
import { createRequestLogger } from "../utils/logger.ts";
import { createProgressSender } from "../utils/progressNotification.ts";

// Define schema for deploy machine with progress tool
const deployMachineWithProgressSchema = z.object({
  system_id: machineIdSchema,
  osystem: osSystemSchema.optional(),
  distro_series: distroSeriesSchema.optional(),
  user_data: z.string().optional().describe("Cloud-init user data to use when deploying this machine"),
  _meta: metaSchema
});

// Define schema for deploy machine with progress output
const deployMachineWithProgressOutputSchema = z.object({
  system_id: z.string().describe("System ID of the deployed machine"),
  hostname: z.string().describe("Hostname of the deployed machine"),
  status: z.string().describe("Status of the deployed machine"),
  _meta: metaSchema
});

/**
 * Register the deploy machine with progress tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerDeployMachineWithProgressTool(server, maasClient) {
  server.tool(
    "deployMachineWithProgress",
    "Deploy a machine with progress notifications",
    deployMachineWithProgressSchema,
    withOperationHandler(async (params, signal, context) => {
      const logger = createRequestLogger('deployMachineWithProgress');
      const progressSender = createProgressSender(
        params._meta?.progressToken,
        context.sendNotification,
        'deployMachineWithProgress',
        'deployMachine'
      );
      
      logger.info({ params }, 'Executing deployMachineWithProgress tool');
      
      try {
        // Start progress notification
        await progressSender(0, 'Preparing to deploy machine');
        
        // Prepare parameters for MAAS API
        const apiParams = {};
        
        // Add parameters if provided
        if (params.osystem) apiParams.osystem = params.osystem;
        if (params.distro_series) apiParams.distro_series = params.distro_series;
        if (params.user_data) apiParams.user_data = params.user_data;
        
        // Update progress
        await progressSender(25, 'Sending deploy request to MAAS');
        
        // Call MAAS API to deploy the machine
        const response = await maasClient.post(`/machines/${params.system_id}/?op=deploy`, apiParams);
        
        // Register the operation for polling
        context.registerOperation({
          type: 'DEPLOY',
          resourceId: params.system_id,
          resourceType: 'machine',
          progressSender
        });
        
        logger.info({ machineId: response.system_id }, 'Successfully initiated machine deployment');
        
        // Return the response
        return {
          system_id: response.system_id,
          hostname: response.hostname,
          status: response.status_name,
          _meta: params._meta || {}
        };
      } catch (error) {
        // Handle error and send error progress
        await progressSender(100, `Error deploying machine: ${error instanceof Error ? error.message : String(error)}`, 100, true);
        logger.error({ error, machineId: params.system_id }, 'Error deploying machine');
        
        throw handleOperationError(error, 'Failed to deploy machine');
      }
    })
  );
}

export { registerDeployMachineWithProgressTool };