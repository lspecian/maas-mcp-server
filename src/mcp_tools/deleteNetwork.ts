// src/mcp_tools/deleteNetwork.ts
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

// Define the MCP tool for deleting a MAAS network
const maasDeleteNetworkTool: McpTool = {
  name: 'maas_delete_network',
  description: 'Deletes a MAAS network (subnet) by its ID.',
  inputSchema: deleteRequestSchema,
  outputSchema: deleteSuccessResponseSchema,
  schema: { type: 'object', properties: {} }, // Placeholder for SDK's schema if needed
  execute: async (params: any) => { throw new Error("execute should not be called directly if handler is used"); },
  async handler(params: z.infer<typeof deleteRequestSchema>, context: McpContext) {
    const { id: networkId } = params;
    const requestId = params._meta?.progressToken?.toString() || generateRequestId();
    const log = createRequestLogger(requestId, 'maas_delete_network', { networkId });
    log.info('Attempting to delete MAAS network.');

    if (!context.maasApiClient) {
      log.error('MAAS API client is not available in the context.');
      return errorToMcpResult(params._meta, 'MAAS API client not configured.');
    }

    const apiClient = context.maasApiClient as MaasApiClient;

    try {
      // MAAS API endpoint for deleting a network/subnet is typically DELETE /MAAS/api/2.0/subnets/{subnet_id}/
      // Note: The actual endpoint might vary depending on MAAS API structure and what "network" refers to
      // (could be subnet, space, fabric, VLAN, etc.)
      log.debug({ networkId }, 'Calling MAAS API to delete network.');
      await apiClient.delete(`/subnets/${networkId}`);

      log.info({ networkId }, 'Successfully deleted MAAS network.');
      return {
        _meta: params._meta,
        message: `Successfully deleted network ${networkId}.`,
        id: networkId,
      };
    } catch (error) {
      log.error({ networkId, error }, 'Error deleting MAAS network.');
      return errorToMcpResult(params._meta, error, 'Failed to delete MAAS network.');
    }
  },
};

// Function to register the maas_delete_network tool
export function registerDeleteNetworkTool(server: MCPServer, maasClient: MaasApiClient) {
  server.addTool(maasDeleteNetworkTool.name, maasDeleteNetworkTool as any);
}