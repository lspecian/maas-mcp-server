// src/mcp_tools/deleteMachine.ts
import { z } from 'zod';
import { MaasApiClient } from '../maas/MaasApiClient.js';
import { MCPToolDefinition, MCPServer } from '@modelcontextprotocol/sdk';
import {
  errorToMcpResult,
  handleMaasApiError,
  handleValidationError,
  ErrorType,
  MaasServerError
} from '../utils/errorHandler.js';
import { ErrorMessages } from '../utils/errorMessages.js';
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

// Define the MCP tool for deleting a MAAS machine
const maasDeleteMachineTool: McpTool = {
  name: 'maas_delete_machine',
  description: 'Deletes a MAAS machine by its system ID.',
  inputSchema: deleteRequestSchema,
  outputSchema: deleteSuccessResponseSchema,
  schema: { type: 'object', properties: {} }, // Placeholder for SDK's schema if needed
  execute: async (params: any) => { throw new Error("execute should not be called directly if handler is used"); },
  async handler(params: z.infer<typeof deleteRequestSchema>, context: McpContext) {
    const { id: machineId } = params;
    const requestId = params._meta?.progressToken?.toString() || generateRequestId();
    const log = createRequestLogger(requestId, 'maas_delete_machine', { machineId });
    log.info('Attempting to delete MAAS machine.');

    if (!context.maasApiClient) {
      log.error('MAAS API client is not available in the context.');
      return errorToMcpResult(
        new MaasServerError(
          ErrorMessages.invalidConfiguration('MAAS API client not configured'),
          ErrorType.CONFIGURATION,
          500
        )
      );
    }

    const apiClient = context.maasApiClient as MaasApiClient;

    try {
      // MAAS API endpoint for deleting a machine is typically DELETE /MAAS/api/2.0/machines/{system_id}/
      log.debug({ machineId }, 'Calling MAAS API to delete machine.');
      await apiClient.delete(`/machines/${machineId}`);

      log.info({ machineId }, 'Successfully deleted MAAS machine.');
      return {
        _meta: params._meta,
        message: `Successfully deleted machine ${machineId}.`,
        id: machineId,
      };
    } catch (error: any) {
      log.error({ machineId, error }, 'Error deleting MAAS machine.');
      
      // Handle validation errors
      if (!machineId) {
        return errorToMcpResult(
          handleValidationError(
            ErrorMessages.missingParameter('id'),
            { parameter: 'id' }
          )
        );
      }
      
      // Handle specific error cases
      if (error.status === 404 || error.message?.includes('not found')) {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.resourceNotFound('Machine', machineId),
            ErrorType.NOT_FOUND,
            404
          )
        );
      }
      
      // Handle state errors
      if (error.message?.includes('cannot be deleted') || error.message?.includes('invalid state')) {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.invalidState('Machine', machineId, 'unknown', 'deletable'),
            ErrorType.INVALID_STATE,
            400
          )
        );
      }
      
      // Handle authentication errors
      if (error.status === 401 || error.message?.includes('auth') || error.message?.includes('unauthorized')) {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.authenticationFailed(error.message),
            ErrorType.AUTHENTICATION,
            401
          )
        );
      }
      
      // Handle permission errors
      if (error.status === 403 || error.message?.includes('permission') || error.message?.includes('forbidden')) {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.permissionDenied('delete', 'machine', machineId),
            ErrorType.PERMISSION_DENIED,
            403
          )
        );
      }
      
      // Handle resource busy errors
      if (error.message?.includes('busy') || error.message?.includes('in use') || error.message?.includes('locked')) {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.resourceBusy('Machine', machineId),
            ErrorType.RESOURCE_BUSY,
            423
          )
        );
      }
      
      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.networkError(error.message || error.code),
            ErrorType.NETWORK_ERROR,
            500
          )
        );
      }
      
      // Default to generic MAAS API error
      return errorToMcpResult(
        handleMaasApiError(error)
      );
    }
  },
};

// Function to register the maas_delete_machine tool
export function registerDeleteMachineTool(server: MCPServer, maasClient: MaasApiClient) {
  server.addTool(maasDeleteMachineTool.name, maasDeleteMachineTool as any);
}