/* eslint-disable */
// @ts-nocheck
import path from 'path';
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MaasApiClient } from "../maas/MaasApiClient.ts";
import { z } from "zod";
import { machineIdSchema, metaSchema } from "./schemas/common.ts";
import {
  withOperationHandler,
  OperationContext,
  handleOperationError
} from "../utils/operationHandlerUtils.ts";
import { MaasServerError, ErrorType } from "../utils/errorHandler.ts";
import { createRequestLogger } from "../utils/logger.ts";
import { createProgressSender } from "../utils/progressNotification.ts";

// Define schema for commission machine with progress tool
const commissionMachineWithProgressSchema = z.object({
  system_id: machineIdSchema,
  enable_ssh: z.boolean().optional().describe("Whether to enable SSH for the commissioning environment"),
  skip_networking: z.boolean().optional().describe("Whether to skip networking configuration during commissioning"),
  skip_storage: z.boolean().optional().describe("Whether to skip storage configuration during commissioning"),
  commissioning_scripts: z.array(z.string()).optional().describe("List of commissioning script names to run"),
  testing_scripts: z.array(z.string()).optional().describe("List of testing script names to run"),
  _meta: metaSchema
});

// Define schema for commission machine with progress output
const commissionMachineWithProgressOutputSchema = z.object({
  system_id: z.string().describe("System ID of the commissioned machine"),
  hostname: z.string().describe("Hostname of the commissioned machine"),
  status: z.string().describe("Status of the commissioned machine"),
  _meta: metaSchema
});

/**
 * Register the commission machine with progress tool with the MCP server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerCommissionMachineWithProgressTool(server, maasClient) {
  server.registerTool({
    name: "commissionMachineWithProgress",
    description: "Commission a machine with progress notifications",
    inputSchema: commissionMachineWithProgressSchema,
    outputSchema: commissionMachineWithProgressOutputSchema,
    execute: withOperationHandler(async (params, signal, context) => {
      const logger = createRequestLogger('commissionMachineWithProgress');
      const progressSender = createProgressSender(
        params._meta?.progressToken,
        context.sendNotification,
        'commissionMachineWithProgress',
        'commissionMachine'
      );
      
      logger.info({ params }, 'Executing commissionMachineWithProgress tool');
      
      try {
        // Start progress notification
        await progressSender(0, 'Preparing to commission machine');
        
        // Prepare parameters for MAAS API
        const apiParams = {};
        
        // Add parameters if provided
        if (params.enable_ssh !== undefined) apiParams.enable_ssh = params.enable_ssh;
        if (params.skip_networking !== undefined) apiParams.skip_networking = params.skip_networking;
        if (params.skip_storage !== undefined) apiParams.skip_storage = params.skip_storage;
        if (params.commissioning_scripts) apiParams.commissioning_scripts = params.commissioning_scripts;
        if (params.testing_scripts) apiParams.testing_scripts = params.testing_scripts;
        
        // Update progress
        await progressSender(25, 'Sending commission request to MAAS');
        
        // Call MAAS API to commission the machine
        const response = await maasClient.post(`/machines/${params.system_id}/?op=commission`, apiParams);
        
        // Register the operation for polling
        context.registerOperation({
          type: 'COMMISSION',
          resourceId: params.system_id,
          resourceType: 'machine',
          progressSender
        });
        
        logger.info({ machineId: response.system_id }, 'Successfully initiated machine commissioning');
        
        // Return the response
        return {
          system_id: response.system_id,
          hostname: response.hostname,
          status: response.status_name,
          _meta: params._meta || {}
        };
      } catch (error) {
        // Handle error and send error progress
        await progressSender(100, `Error commissioning machine: ${error instanceof Error ? error.message : String(error)}`, 100, true);
        logger.error({ error, machineId: params.system_id }, 'Error commissioning machine');
        
        throw handleOperationError(error, 'Failed to commission machine');
      }
    })
  });
}

export { registerCommissionMachineWithProgressTool };