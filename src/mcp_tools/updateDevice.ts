// src/mcp_tools/updateDevice.ts
import { z } from 'zod';
import { MaasApiClient } from '../maas/MaasApiClient.js';
import { MCPToolDefinition, MCPServer } from '@modelcontextprotocol/sdk'; // Added MCPServer
import { basePutRequestSchema, putSuccessResponseSchema } from './schemas/writeOps.js';
import { createRequestLogger, generateRequestId } from '../utils/logger.js';
import { Logger as PinoLogger } from 'pino';

// Define a local type for McpTool
interface McpTool extends MCPToolDefinition {
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  handler: (params: any, context: McpContext) => Promise<any>;
}

// Define McpContext
interface McpContext {
  log: PinoLogger;
  maasApiClient?: MaasApiClient;
}

// Helper function to format errors for MCP results (local implementation)
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

// Define the payload schema for updating a MAAS device.
// Fields are based on common updatable attributes for a MAAS device.
// Assuming partial updates are accepted.
const updateDevicePayloadSchema = z.object({
  name: z.string().optional().describe("New name for the device."),
  tags: z.array(z.string()).optional().describe("List of tags to assign to the device. Replaces existing tags."),
  zone: z.string().optional().describe("The zone to assign the device to."),
  // Add other updatable fields as per MAAS API documentation for devices
  // e.g., parent, interfaces, commission, etc.
}).describe("Payload for updating an existing MAAS device. Fields are optional for partial updates.");

// Define the full request schema for the maas_update_device tool.
export const updateDeviceRequestSchema = basePutRequestSchema(updateDevicePayloadSchema)
  .describe("Request schema for updating a MAAS device.");

// Define the MCP tool for updating a MAAS device.
const maasUpdateDeviceTool: McpTool = {
  name: 'maas_update_device',
  description: 'Updates an existing MAAS device with the provided parameters.',
  inputSchema: updateDeviceRequestSchema,
  outputSchema: putSuccessResponseSchema,
  schema: { type: 'object', properties: {} }, // Placeholder
  execute: async () => { throw new Error("execute should not be called directly if handler is used"); },
  async handler(params: z.infer<typeof updateDeviceRequestSchema>, context: McpContext) {
    const { id: deviceId, payload } = params;
    const requestId = params._meta?.progressToken?.toString() || generateRequestId();
    const log = createRequestLogger(requestId, 'maas_update_device', { deviceId });
    log.info({ payload }, 'Attempting to update MAAS device.');

    if (!context.maasApiClient) {
      log.error('MAAS API client is not available in the context.');
      return errorToMcpResult(params._meta, 'MAAS API client not configured.');
    }

    const apiClient = context.maasApiClient as MaasApiClient;

    try {
      // MAAS API endpoint for updating a device is typically PUT /MAAS/api/2.0/devices/{device_id}/
      // This example assumes MAAS accepts a partial update.
      const maasPayload: Record<string, unknown> = {};
      for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key) && (payload as any)[key] !== undefined) {
          (maasPayload as any)[key] = (payload as any)[key];
        }
      }

      log.debug({ deviceId, maasPayload }, 'Calling MAAS API to update device.');
      await apiClient.put(`/devices/${deviceId}`, maasPayload);

      log.info({ deviceId }, 'Successfully updated MAAS device.');
      return {
        _meta: params._meta,
        message: `Successfully updated device ${deviceId}.`,
        id: deviceId,
      };
    } catch (error) {
      log.error({ deviceId, error }, 'Error updating MAAS device.');
      return errorToMcpResult(params._meta, error, 'Failed to update MAAS device.');
    }
  },
};

// Function to register the maas_update_device tool.
export function registerUpdateDeviceTool(server: MCPServer, maasClient: MaasApiClient) {
  server.addTool(maasUpdateDeviceTool.name, maasUpdateDeviceTool as any);
}