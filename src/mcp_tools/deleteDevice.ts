// src/mcp_tools/deleteDevice.ts
import { z } from 'zod';
import { MaasApiClient } from '../maas/MaasApiClient.js';
import { MCPToolDefinition, MCPServer } from '@modelcontextprotocol/sdk';
import { deleteRequestSchema, deleteSuccessResponseSchema } from './schemas/writeOps.js';
import { createRequestLogger, generateRequestId } from '../utils/logger.js';
import { Logger as PinoLogger } from 'pino';

// Define a local type for McpTool if not available globally or from SDK
interface McpTool extends MCPToolDefinition {
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  handler: (params: any, context: McpContext) => Promise<any>;
}

// Define McpContext if it's not defined elsewhere
interface McpContext {
  log: PinoLogger;
  maasApiClient?: MaasApiClient;
}

// Helper function to format errors for MCP results
function errorToMcpResult(meta: any, error: any, defaultMessage: string = 'An unexpected error occurred.') {
  const message = error instanceof Error ? error.message : String(error);
  return {
    _meta: meta,
    error: {
      message: message || defaultMessage,
      code: (error as any).code || 'UNKNOWN_ERROR',
    },
  };
}

// Define the MCP tool for deleting a MAAS device
const maasDeleteDeviceTool: McpTool = {
  name: 'maas_delete_device',
  description: 'Deletes a MAAS device by its device ID.',
  inputSchema: deleteRequestSchema,
  outputSchema: deleteSuccessResponseSchema,
  schema: { type: 'object', properties: {} }, // Placeholder for SDK's schema if needed
  execute: async (params: any) => { throw new Error("execute should not be called directly if handler is used"); },
  async handler(params: z.infer<typeof deleteRequestSchema>, context: McpContext) {
    const { id: deviceId } = params;
    const requestId = params._meta?.progressToken?.toString() || generateRequestId();
    const log = createRequestLogger(requestId, 'maas_delete_device', { deviceId });
    log.info('Attempting to delete MAAS device.');

    if (!context.maasApiClient) {
      log.error('MAAS API client is not available in the context.');
      return errorToMcpResult(params._meta, 'MAAS API client not configured.');
    }

    const apiClient = context.maasApiClient as MaasApiClient;

    try {
      // MAAS API endpoint for deleting a device is typically DELETE /MAAS/api/2.0/devices/{device_id}/
      log.debug({ deviceId }, 'Calling MAAS API to delete device.');
      await apiClient.delete(`/devices/${deviceId}`);

      log.info({ deviceId }, 'Successfully deleted MAAS device.');
      return {
        _meta: params._meta,
        message: `Successfully deleted device ${deviceId}.`,
        id: deviceId,
      };
    } catch (error) {
      log.error({ deviceId, error }, 'Error deleting MAAS device.');
      return errorToMcpResult(params._meta, error, 'Failed to delete MAAS device.');
    }
  },
};

// Function to register the maas_delete_device tool
export function registerDeleteDeviceTool(server: MCPServer, maasClient: MaasApiClient) {
  server.addTool(maasDeleteDeviceTool.name, maasDeleteDeviceTool as any);
}