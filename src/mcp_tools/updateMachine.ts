// src/mcp_tools/updateMachine.ts
import { z } from 'zod'; // Keep one import for z
import { MaasApiClient } from '../maas/MaasApiClient.js';
import { MCPToolDefinition, MCPServer } from '@modelcontextprotocol/sdk'; // Added MCPServer
import {
  errorToMcpResult,
  handleMaasApiError,
  handleValidationError,
  ErrorType,
  MaasServerError
} from '../utils/errorHandler.js';
import { ErrorMessages } from '../utils/errorMessages.js';
import { basePutRequestSchema, putSuccessResponseSchema } from './schemas/writeOps.js';
import { createRequestLogger, generateRequestId } from '../utils/logger.js'; // generateRequestId for fallback
import { Logger as PinoLogger } from 'pino'; // Import PinoLogger

// Define a local type for McpTool if not available globally or from SDK
// This matches the structure used in the maasUpdateMachineTool constant.
interface McpTool extends MCPToolDefinition {
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  handler: (params: any, context: McpContext) => Promise<any>;
}

// Define McpContext if it's not defined elsewhere
interface McpContext {
  log: PinoLogger; // Use PinoLogger type
  maasApiClient?: MaasApiClient;
  // Add other context properties if needed
}



// Define the payload schema for updating a MAAS machine.
// Fields are based on common updatable attributes for a MAAS machine.
// MAAS API typically expects only the fields to be changed for PUT, so most are optional.
const updateMachinePayloadSchema = z.object({
  description: z.string().optional().describe("New description for the machine."),
  power_type: z.string().optional().describe("New power type for the machine (e.g., 'ipmi')."),
  // power_parameters should be an object, but its structure can vary greatly.
  // For simplicity, allowing any object, but in a real scenario, this should be more specific.
  power_parameters: z.record(z.any()).optional().describe("New power parameters for the machine."),
  tags: z.array(z.string()).optional().describe("List of tags to assign to the machine. Replaces existing tags."),
  pool: z.string().optional().describe("The resource pool to assign the machine to."),
  zone: z.string().optional().describe("The zone to assign the machine to."),
  // interfaces might involve more complex structures if specific interface updates are needed.
  // For now, keeping it simple. MAAS might require specific sub-operations for interface changes.
  interfaces: z.string().optional().describe("Network interface configurations (simplified for this example)."),
  // Add other updatable fields as per MAAS API documentation
}).describe("Payload for updating an existing MAAS machine. Fields are optional for partial updates.");

// Define the full request schema for the maas_update_machine tool.
export const updateMachineRequestSchema = basePutRequestSchema(updateMachinePayloadSchema)
  .describe("Request schema for updating a MAAS machine.");

// Define the MCP tool for updating a MAAS machine.
const maasUpdateMachineTool: McpTool = {
  name: 'maas_update_machine',
  description: 'Updates an existing MAAS machine with the provided parameters.',
  inputSchema: updateMachineRequestSchema, // Zod schema for input
  outputSchema: putSuccessResponseSchema, // Zod schema for output
  // 'schema' from MCPToolDefinition is for general description, not Zod validation here.
  // We'll use inputSchema and outputSchema for Zod-based validation if the MCP server supports it,
  // or handle validation within the handler. The SDK's MCPToolDefinition might be more generic.
  schema: { type: 'object', properties: {} }, // Placeholder for SDK's schema if needed
  execute: async (params: any) => { throw new Error("execute should not be called directly if handler is used"); }, // Placeholder
  async handler(params: z.infer<typeof updateMachineRequestSchema>, context: McpContext) {
    const { id: machineId, payload } = params; // Type is inferred now
    // Use progressToken from _meta if available, otherwise generate a new requestId.
    const requestId = params._meta?.progressToken?.toString() || generateRequestId();
    // createRequestLogger takes requestId, method (optional), and params (optional)
    // It uses the global logger internally to create a child logger.
    const log = createRequestLogger(requestId, 'maas_update_machine', { machineId });
    log.info({ payload }, 'Attempting to update MAAS machine (payload details in params).');

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
      // MAAS API endpoint for updating a machine is typically PUT /MAAS/api/2.0/machines/{system_id}/
      // The payload for MAAS might need specific formatting.
      // For example, some APIs expect all fields, others only changed ones.
      // This example assumes MAAS accepts a partial update with only the fields to be changed.
      // If MAAS expects a full resource representation for PUT, this payload transformation would be more complex.

      // Transform payload if necessary. MAAS might have specific expectations.
      // For instance, empty strings might need to be omitted or tags handled specially.
      const maasPayload: Record<string, unknown> = {};
      for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key) && (payload as any)[key] !== undefined) {
          (maasPayload as any)[key] = (payload as any)[key];
        }
      }
      // If MAAS requires certain fields to be null explicitly to clear them, add that logic here.

      log.debug({ machineId, maasPayload }, 'Calling MAAS API to update machine.');
      await apiClient.put(`/machines/${machineId}`, maasPayload);

      log.info({ machineId }, 'Successfully updated MAAS machine.');
      return {
        _meta: params._meta,
        message: `Successfully updated machine ${machineId}.`,
        id: machineId,
      };
    } catch (error: any) {
      log.error({ machineId, error }, 'Error updating MAAS machine.');
      
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
      
      // Handle validation errors
      if (error.status === 400 || error.message?.includes('invalid') || error.message?.includes('required')) {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.operationFailed('update', 'machine', error.message || 'Invalid parameters'),
            ErrorType.VALIDATION,
            400,
            { originalError: error.message }
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
            ErrorMessages.permissionDenied('update', 'machine', machineId),
            ErrorType.PERMISSION_DENIED,
            403
          )
        );
      }
      
      // Handle state errors
      if (error.message?.includes('cannot be updated') || error.message?.includes('invalid state')) {
        return errorToMcpResult(
          new MaasServerError(
            ErrorMessages.invalidState('Machine', machineId, 'unknown', 'updatable'),
            ErrorType.INVALID_STATE,
            400
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

// Function to register the maas_update_machine tool.
export function registerUpdateMachineTool(server: MCPServer, maasClient: MaasApiClient) {
  // The handler in maasUpdateMachineTool expects a context with maasApiClient.
  // We need to ensure this context is properly passed or constructed by the MCPServer
  // when the tool handler is invoked. For now, we assume the MCPServer setup handles this.
  server.addTool(maasUpdateMachineTool.name, maasUpdateMachineTool as any); // Cast to any if McpTool and MCPToolDefinition are not perfectly compatible
}