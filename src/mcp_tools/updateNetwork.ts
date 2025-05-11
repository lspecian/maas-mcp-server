// src/mcp_tools/updateNetwork.ts
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

// Define the payload schema for updating a MAAS network/subnet.
// Fields are based on common updatable attributes.
const updateNetworkPayloadSchema = z.object({
  name: z.string().optional().describe("New name for the network or subnet."),
  description: z.string().optional().describe("New description for the network/subnet."),
  gateway_ip: z.string().ip({ version: 'v4' }).optional().describe("New gateway IP address for the subnet."),
  dns_servers: z.array(z.string().ip({ version: 'v4' })).optional().describe("List of new DNS servers for the subnet."),
  // MAAS API might have specific fields for fabric, vlan, space if updating subnets through complex paths.
  // For simplicity, this schema assumes direct update or these are part of the 'id' or context.
  // Add other updatable fields like 'vid' (VLAN ID), 'mtu', 'rdns_mode', etc.
}).describe("Payload for updating an existing MAAS network or subnet. Fields are optional for partial updates.");

// Define the full request schema for the maas_update_network tool.
// The 'id' here could be a simple network ID or a composite ID for subnets (e.g., fabric:vlan:space:subnet_cidr).
// The handler will need to parse this ID if it's composite.
export const updateNetworkRequestSchema = basePutRequestSchema(updateNetworkPayloadSchema)
  .describe("Request schema for updating a MAAS network or subnet. The 'id' might be simple or composite.");

// Define the MCP tool for updating a MAAS network/subnet.
const maasUpdateNetworkTool: McpTool = {
  name: 'maas_update_network',
  description: 'Updates an existing MAAS network or subnet with the provided parameters.',
  inputSchema: updateNetworkRequestSchema,
  outputSchema: putSuccessResponseSchema,
  schema: { type: 'object', properties: {} }, // Placeholder
  execute: async () => { throw new Error("execute should not be called directly if handler is used"); },
  async handler(params: z.infer<typeof updateNetworkRequestSchema>, context: McpContext) {
    const { id: networkId, payload } = params; // networkId could be simple or composite
    const requestId = params._meta?.progressToken?.toString() || generateRequestId();
    const log = createRequestLogger(requestId, 'maas_update_network', { networkId });
    log.info({ payload }, 'Attempting to update MAAS network/subnet.');

    if (!context.maasApiClient) {
      log.error('MAAS API client is not available in the context.');
      return errorToMcpResult(params._meta, 'MAAS API client not configured.');
    }

    const apiClient = context.maasApiClient as MaasApiClient;

    try {
      // Determine the correct API endpoint based on the nature of 'networkId'.
      // If 'networkId' is simple, it might be /networks/{networkId} or /subnets/{networkId}.
      // If composite, parse it to construct path like /fabrics/.../subnets/{subnet_cidr}.
      // This example assumes a simple ID for a subnet for now: /MAAS/api/2.0/subnets/{subnet_id}/
      // A more robust solution would involve checking the format of 'networkId'.
      const endpoint = `/subnets/${networkId}`; // Simplified assumption
      // Or, if it's a network: const endpoint = `/networks/${networkId}`;

      const maasPayload: Record<string, unknown> = {};
      for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key) && (payload as any)[key] !== undefined) {
          (maasPayload as any)[key] = (payload as any)[key];
        }
      }

      log.debug({ networkId, endpoint, maasPayload }, 'Calling MAAS API to update network/subnet.');
      await apiClient.put(endpoint, maasPayload);

      log.info({ networkId }, 'Successfully updated MAAS network/subnet.');
      return {
        _meta: params._meta,
        message: `Successfully updated network/subnet ${networkId}.`,
        id: networkId,
      };
    } catch (error) {
      log.error({ networkId, error }, 'Error updating MAAS network/subnet.');
      return errorToMcpResult(params._meta, error, 'Failed to update MAAS network/subnet.');
    }
  },
};

// Function to register the maas_update_network tool.
export function registerUpdateNetworkTool(server: MCPServer, maasClient: MaasApiClient) {
  server.addTool(maasUpdateNetworkTool.name, maasUpdateNetworkTool as any);
}